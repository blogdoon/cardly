/**
 * stripe-webhook — the only thing allowed to say an order was paid.
 *
 * The client never reports payment: it redirects to Stripe's hosted checkout
 * and comes back with a `session_id`, which proves nothing on its own. This
 * function verifies the Stripe signature and moves the order forward:
 *
 *   checkout.session.completed → status `processing`, `paid_at` stamped
 *   checkout.session.expired    → status `cancelled`, reason recorded
 *
 * Stripe cannot present a Supabase JWT, so deploy this one open:
 *   supabase functions deploy stripe-webhook --no-verify-jwt
 * Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (Dashboard → Developers →
 * Webhooks → endpoint signing secret).
 *
 * A replayed or mis-signed event changes nothing: `constructEventAsync`
 * verifies HMAC over the raw body before we touch the database.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@18';
import { json } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
    return json({ error: 'Webhook is not configured.' }, 503);
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) return json({ error: 'Missing signature' }, 400);

  const payload = await req.text();
  const stripe = new Stripe(STRIPE_SECRET_KEY);
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, STRIPE_WEBHOOK_SECRET);
  } catch {
    return json({ error: 'Invalid signature' }, 400);
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const orderId = session.metadata?.orderId ?? session.client_reference_id;
  if (!orderId) return json({ received: true });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const now = new Date().toISOString();

  if (event.type === 'checkout.session.completed') {
    const { error } = await admin
      .from('orders')
      .update({
        status: 'processing',
        paid_at: now,
        updated_at: now,
        // Card details stay in Stripe; the order only records how it was paid.
        payment_summary: { method: 'card' },
      })
      .eq('id', orderId)
      .eq('status', 'pending_payment'); // idempotent: a duplicate event is a no-op
    if (error) return json({ error: error.message }, 500);

    // The money landed, so the order now needs producing (AGENTS.md blocker 2).
    //
    // Deliberately NOT awaited into the response and deliberately not fatal. The
    // order is already paid and recorded at this point, so a fulfilment failure is
    // an operational problem to retry — not a reason to tell Stripe the payment
    // failed. Stripe retries the whole event on a non-2xx, which would re-run this
    // branch and re-enter fulfilment; `print_files_ready_at` plus the
    // `.eq('status','pending_payment')` guard above keep that harmless.
    //
    // Fire-and-forget here, but do await the call inside its own async handler so
    // the isolate is not torn down mid-request, which would drop the fetch.
    const fulfilUrl = `${SUPABASE_URL}/functions/v1/fulfil-order`;
    void (async () => {
      try {
        const res = await fetch(fulfilUrl, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            // The service role key: fulfil-order treats this as an internal call,
            // and it bypasses its own authorisation (see its header).
            authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({ orderId }),
        });
        if (!res.ok) {
          console.error(`fulfil-order returned ${res.status} for ${orderId}`);
        }
      } catch (e) {
        console.error('fulfil-order call failed:', e);
      }
    })();
  } else if (event.type === 'checkout.session.expired') {
    const { error } = await admin
      .from('orders')
      .update({
        status: 'cancelled',
        cancel_reason: 'Payment was not completed',
        updated_at: now,
      })
      .eq('id', orderId)
      .eq('status', 'pending_payment');
    if (error) return json({ error: error.message }, 500);
  }

  return json({ received: true });
});
