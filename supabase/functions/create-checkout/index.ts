/**
 * create-checkout — the only place an order's money is decided.
 *
 * The browser sends what the customer picked (which template, which size,
 * which envelope, how many, which delivery tier, which promo, where it goes).
 * It does NOT send a price: every amount below is recomputed from the
 * `templates` table plus `_shared/pricing.ts`, because a client total is a
 * display value (AGENTS.md production blocker #1).
 *
 * Flow: recompute → insert the order as `pending_payment` → create a Stripe
 * Checkout Session for that total → hand back the hosted URL. The order flips
 * to `processing` only when `stripe-webhook` sees the payment succeed, so a
 * client that redirects and lies about the outcome changes nothing.
 *
 * Secrets (function secrets, never in the bundle):
 *   STRIPE_SECRET_KEY   sk_test_… / sk_live_…
 *   SITE_ORIGIN         optional; canonical origin for the return URLs
 * Deploy: supabase functions deploy create-checkout
 */

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@18';
import { computeTotals, findDelivery, findEnvelope, findFinish, findSize } from '../_shared/pricing.ts';
import { json, preflight } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? '';

interface BodyItem {
  id?: string;
  templateId: string;
  cardSize: string;
  envelopeColor: string;
  finish: string;
  quantity: number;
  designId?: string;
  designSnapshot?: unknown;
  customSummary?: unknown;
}

interface CheckoutBody {
  items: BodyItem[];
  deliveryMethodId: string;
  deliveryType?: 'direct_to_recipient' | 'back_to_me';
  promoCode?: string | null;
  address: Record<string, unknown>;
}

/** ISO window the customer was quoted, derived exactly like utils/delivery.ts. */
function arrivalWindow(deliveryId: string): { dispatch: Date; arrival: Date } {
  const method = findDelivery(deliveryId);
  const dispatch = new Date();
  dispatch.setDate(dispatch.getDate() + (method?.productionDays ?? 1));
  const arrival = new Date(dispatch);
  arrival.setDate(arrival.getDate() + (method?.transitDays ?? 4));
  return { dispatch, arrival };
}

function newOrderNumber(): string {
  // 8 base36 chars ≈ 2.8e12 combinations per year — no retry loop needed for
  // the `order_number unique` constraint.
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase().padEnd(8, '0');
  return `CRD-${new Date().getFullYear()}-${rand}`;
}

Deno.serve(async (req) => {
  const early = preflight(req);
  if (early) return early;
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!STRIPE_SECRET_KEY) return json({ error: 'Payments are not configured on this deployment.' }, 503);

  const admin: SupabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const stripe = new Stripe(STRIPE_SECRET_KEY);

  let body: CheckoutBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid request body.' }, 400);
  }

  const items = Array.isArray(body?.items) ? body.items : [];
  if (!items.length) return json({ error: 'Your basket is empty.' }, 400);
  const address = (body?.address ?? {}) as Record<string, unknown>;
  if (!address.name || !address.line1 || !address.postcode) {
    return json({ error: 'Please fill in the recipient name, street address and postcode.' }, 400);
  }
  if (!body?.deliveryMethodId) return json({ error: 'Pick a delivery option.' }, 400);

  // --- prices: database template prices, server-side option prices ------------
  const templateIds = [...new Set(items.map((i) => String(i.templateId ?? '')))].filter(Boolean);
  if (!templateIds.length) return json({ error: 'Basket has no cards.' }, 400);
  const { data: templates, error: tplError } = await admin
    .from('templates')
    .select('id, title, thumbnail, price')
    .in('id', templateIds);
  if (tplError) return json({ error: tplError.message }, 500);
  const byId = new Map((templates ?? []).map((t) => [t.id as string, t]));
  for (const id of templateIds) {
    if (!byId.has(id)) return json({ error: `Card "${id}" is no longer available.` }, 400);
  }

  let totals;
  try {
    totals = computeTotals({
      items: items.map((i) => ({
        templatePrice: Number(byId.get(String(i.templateId))!.price),
        sizeId: String(i.cardSize ?? ''),
        envelopeId: String(i.envelopeColor ?? ''),
        finishId: String(i.finish ?? ''),
        quantity: Number(i.quantity ?? 1),
      })),
      deliveryMethodId: String(body.deliveryMethodId),
      promoCode: body.promoCode,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Could not price this order.' }, 400);
  }

  const delivery = findDelivery(String(body.deliveryMethodId))!;
  const deliveryMethod = {
    id: delivery.id,
    name: delivery.name,
    price: delivery.price,
    estimatedDelivery: '',
    description: '',
    transitDays: delivery.transitDays,
  };
  const { dispatch, arrival } = arrivalWindow(delivery.id);
  const now = new Date().toISOString();

  // --- who is buying (guest orders carry user_id = null) ---------------------
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  let userId: string | null = null;
  let userEmail: string | undefined;
  if (token) {
    const { data: userData } = await admin.auth.getUser(token).catch(() => ({ data: { user: null } }));
    if (userData?.user) {
      userId = userData.user.id;
      userEmail = userData.user.email ?? undefined;
      // The client normally upserts this row on sign-in; make the FK safe even
      // when the order arrives before it did (or from another device).
      await admin
        .from('profiles')
        .upsert(
          { id: userId, email: userEmail ?? null },
          { onConflict: 'id', ignoreDuplicates: true }
        );
    }
  }

  const orderId = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const orderItems = items.map((i, index) => {
    const tpl = byId.get(String(i.templateId))!;
    const sizeId = String(i.cardSize ?? '');
    const envelopeId = String(i.envelopeColor ?? '');
    const finishId = String(i.finish ?? '');
    // Same decomposition the cart shows: unit price + priced add-ons, both
    // from the shared price list `computeTotals` already validated against.
    const sizeMultiplier = findSize(sizeId)!.priceMultiplier;
    const envelopePrice = findEnvelope(envelopeId)!.price;
    const finishPrice = findFinish(finishId)!.price;
    return {
      id: i.id ?? `cart_${index}`,
      templateId: i.templateId,
      designId: i.designId,
      title: tpl.title,
      thumbnail: tpl.thumbnail,
      cardSize: sizeId,
      envelopeColor: envelopeId,
      finish: finishId,
      quantity: Math.max(1, Math.floor(Number(i.quantity ?? 1))),
      unitPrice: Math.round(Number(tpl.price) * sizeMultiplier * 100) / 100,
      addons: [
        ...(envelopePrice > 0
          ? [{ id: envelopeId, name: 'Luxury Envelope', price: envelopePrice, description: 'Luxury Envelope' }]
          : []),
        ...(finishPrice > 0
          ? [{ id: finishId, name: 'Paper Finish', price: finishPrice, description: 'Paper Finish' }]
          : []),
      ],
      designSnapshot: i.designSnapshot,
      customSummary: i.customSummary,
    };
  });

  const order = {
    id: orderId,
    order_number: newOrderNumber(),
    user_id: userId,
    items: orderItems,
    subtotal: totals.subtotal,
    delivery_fee: totals.deliveryFee,
    discount: totals.discount,
    total: totals.total,
    status: 'pending_payment',
    shipping_address: address,
    delivery_method: deliveryMethod,
    delivery_type: body.deliveryType === 'back_to_me' ? 'back_to_me' : 'direct_to_recipient',
    dispatch_date: dispatch.toISOString(),
    estimated_arrival: arrival.toISOString(),
    payment_summary: { method: 'card' },
    stripe_session_id: null,
    created_at: now,
    updated_at: now,
  };

  const { error: insertError } = await admin.from('orders').insert(order);
  if (insertError) return json({ error: insertError.message }, 500);

  const configuredOrigin = (Deno.env.get('SITE_ORIGIN') ?? '').replace(/\/$/, '');
  const origin = configuredOrigin || req.headers.get('origin') || 'http://localhost:3000';

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: 'payment',
      // One line for the whole order: the number above already is the total.
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'eur',
            unit_amount: Math.round(totals.total * 100),
            product_data: {
              name: `Cardly order ${order.order_number}`,
              description: `${items.length} card(s), delivery via ${delivery.name}`,
            },
          },
        },
      ],
      client_reference_id: orderId,
      metadata: { orderId, orderNumber: order.order_number },
      ...(userEmail ? { customer_email: userEmail } : {}),
      success_url: `${origin}/checkout/success/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout/`,
    });
  } catch (e) {
    await admin.from('orders').delete().eq('id', orderId);
    return json({ error: e instanceof Error ? e.message : 'Could not start checkout.' }, 502);
  }

  const { error: linkError } = await admin
    .from('orders')
    .update({ stripe_session_id: session.id, updated_at: new Date().toISOString() })
    .eq('id', orderId);
  if (linkError) return json({ error: linkError.message }, 500);

  return json({
    url: session.url,
    // The order as the database has it, so the client can show the customer the
    // server's numbers (not its own display totals) once Stripe sends them back.
    order,
  });
});
