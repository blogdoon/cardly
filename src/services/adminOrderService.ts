/**
 * Admin order management — `public.orders` in Postgres.
 *
 * Orders are one flat table now (was a per-user document subcollection), so
 * the admin list is a plain SELECT that RLS scopes to admins —
 * no collectionGroup query. `updateOrderStatus` and friends touch only
 * fulfilment columns; the `guard_order_columns()` trigger in
 * `supabase/migrations/0002_rls.sql` blocks an admin from rewriting the total,
 * items or address through any path.
 *
 * Guest orders used to be localStorage-only and invisible here. They are now
 * written server-side by `create-checkout` with `user_id = null`, so every
 * paid order — guest or signed-in — shows up in this list.
 */

import { db } from './supabase';
import type { Order, OrderStatus, RefundRecord } from '../types/order';
import { rowToOrder } from './orderRows';

const TABLE = 'orders';

/** Newest first. Admin only (RLS). */
export async function fetchAllOrders(limit = 200): Promise<Order[]> {
  const { data, error } = await db()
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToOrder);
}

async function patchOrder(order: Order, patch: Record<string, unknown>): Promise<void> {
  const { error } = await db().from(TABLE).update(patch).eq('id', order.id);
  if (error) throw new Error(error.message);
}

/**
 * Move an order to a new status. Stamps `dispatched_at` the first time it goes
 * out, so the tracking bar has a real event. RLS + the guard trigger restrict
 * admin writes to fulfilment columns only.
 */
export async function updateOrderStatus(
  order: Order,
  status: OrderStatus,
  actorEmail: string
): Promise<void> {
  const patch: Record<string, unknown> = { status };
  if (status === 'dispatched' && !order.dispatchedAt) {
    patch.dispatched_at = new Date().toISOString();
  }
  if (status === 'cancelled') {
    patch.cancel_reason = order.cancelReason || `Cancelled by ${actorEmail}`;
  }
  await patchOrder(order, patch);
}

/** Attach a carrier tracking reference. */
export async function setOrderTracking(
  order: Order,
  trackingNumber: string,
  carrier?: string
): Promise<void> {
  await patchOrder(order, {
    tracking_number: trackingNumber.trim(),
    carrier: carrier?.trim() || order.deliveryMethod?.name,
  });
}

/**
 * Record a refund and move the order to `refunded`. This only records it — it
 * does not move money (payments are still simulated); once Stripe is wired up
 * this has to call the refund API and be driven by its webhook.
 */
export async function refundOrder(
  order: Order,
  input: { amount?: number; reason: string },
  actorEmail: string
): Promise<RefundRecord> {
  const amount =
    input.amount === undefined ? order.total : Math.min(Math.max(0, input.amount), order.total);
  const refund: RefundRecord = {
    amount,
    reason: input.reason.trim() || 'Refund requested by customer',
    at: new Date().toISOString(),
    by: actorEmail,
  };
  await patchOrder(order, { refund, status: 'refunded' });
  return refund;
}

/** Cancel without refunding (e.g. the card could not be produced). */
export async function cancelOrder(
  order: Order,
  reason: string,
  actorEmail: string
): Promise<void> {
  await patchOrder(order, {
    status: 'cancelled',
    cancel_reason: reason.trim() || `Cancelled by ${actorEmail}`,
  });
}

/** An internal note. Never shown to the customer. */
export async function setOrderNote(order: Order, note: string): Promise<void> {
  await patchOrder(order, { admin_note: note.trim() || null });
}

/** Orders eligible for a refund: paid and not already refunded or cancelled. */
export const isRefundable = (order: Order): boolean =>
  order.status !== 'refunded' && order.status !== 'cancelled' && order.total > 0;
