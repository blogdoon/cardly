/**
 * Payment: Stripe Checkout, hosted by Stripe.
 *
 * The browser never sees a card number, a CVC or a PaymentIntent — it posts
 * what the customer picked to the `create-checkout` Edge Function, which
 * recomputes the total from the database and returns a hosted checkout URL to
 * redirect to (`src/pages/Checkout.tsx`). The order is written as
 * `pending_payment`; the signed `stripe-webhook` is what makes it real.
 *
 * Stashing the server-built order across the redirect: Stripe comes back on
 * `/checkout/success/` in the same tab, so `sessionStorage` is enough to render
 * the confirmation with the amounts actually charged, for guests and signed-in
 * customers alike. It is a display record — the database row is the source of
 * truth for admin and fulfilment.
 */

import { db, isSupabaseConfigured } from './supabase';
import { rowToOrder } from './orderRows';
import type { Order } from '../types/order';
import type { DeliveryAddress } from '../types/user';

const PENDING_KEY = 'cardly_checkout_pending';

export interface CheckoutRequest {
  /** Cart items. Prices in them are ignored — the server recomputes them. */
  items: unknown[];
  deliveryMethodId: string;
  deliveryType: 'direct_to_recipient' | 'back_to_me';
  promoCode?: string | null;
  address: DeliveryAddress;
}

interface StartCheckoutResult {
  url: string;
  order: Order;
}

/**
 * Create the order server-side and get the hosted checkout URL to redirect to.
 * Throws a message safe to show the customer.
 */
export async function startCheckout(body: CheckoutRequest): Promise<StartCheckoutResult> {
  if (!isSupabaseConfigured) {
    throw new Error('Checkout is unavailable: Supabase is not configured in this environment.');
  }

  let data: Record<string, unknown> | null;
  let error: { message?: string; context?: Response } | null;
  try {
    ({ data, error } = await db().functions.invoke('create-checkout', { body }));
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : 'Could not reach checkout.');
  }

  if (error) {
    const status = error.context?.status;
    // A 4xx from the function carries the reason ("Unknown card size", an
    // address we cannot post to); read it instead of the generic wrapper text.
    let serverMessage: string | undefined;
    if (status && typeof error.context?.json === 'function') {
      try {
        serverMessage = ((await error.context.json()) as { error?: string }).error;
      } catch {
        /* body already consumed or not JSON */
      }
    }
    if (status === 404) {
      throw new Error(
        'Payments are not deployed on this environment yet (the create-checkout function is missing).'
      );
    }
    throw new Error(serverMessage || error.message || 'Could not start checkout.');
  }
  if (!data) throw new Error('Could not start checkout.');

  const failure = data.error as string | undefined;
  if (failure) throw new Error(failure);

  const url = data.url as string | undefined;
  const row = data.order as Record<string, unknown> | undefined;
  if (!url || !row) throw new Error('Could not start checkout.');

  return { url, order: rowToOrder(row) };
}

/** Carry the paid order across the Stripe redirect (same tab → same storage). */
export function stashPendingOrder(order: Order): void {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ order, at: Date.now() }));
  } catch {
    /* storage disabled: the success page falls back to a generic message */
  }
}

/** The order awaiting confirmation, or null if there isn't one. */
export function readPendingOrder(): Order | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { order?: Order; at?: number };
    // A stale stash from an abandoned session should not read as a paid order.
    if (!parsed.order || Date.now() - (parsed.at ?? 0) > 1000 * 60 * 60 * 6) return null;
    return parsed.order;
  } catch {
    return null;
  }
}
