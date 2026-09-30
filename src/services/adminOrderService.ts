/**
 * Admin order management.
 *
 * The admin console used to read `getLocalOrders()` — whatever happened to be in
 * the operator's own browser — so it could only ever show that browser's orders
 * and the revenue cards were structurally incapable of reporting real money.
 * Orders actually live at `users/{uid}/orders/{orderId}`, so this module lists
 * them with a `collectionGroup` query, which `firestore.rules` allows for admins.
 *
 * KNOWN LIMITATION: guest checkout writes orders to localStorage only (see
 * `createOrder`), so guest orders are invisible here. They need to be posted
 * server-side, which needs the payments work.
 */

import {
  collectionGroup,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Order, OrderStatus, RefundRecord } from '../types/order';

const toOrder = (snap: QueryDocumentSnapshot<DocumentData>): Order =>
  ({ id: snap.id, ...snap.data() }) as Order;

/** Newest first. Admin only. */
export async function fetchAllOrders(limit = 200): Promise<Order[]> {
  const snap = await getDocs(
    query(collectionGroup(db, 'orders'), orderBy('createdAt', 'desc'))
  );
  return snap.docs.slice(0, limit).map(toOrder);
}

/**
 * Move an order to a new status. Also stamps `dispatchedAt` the first time it
 * goes out for delivery, so the tracking bar has a real event to hang off.
 *
 * `firestore.rules` restricts admin updates to fulfilment fields only — the
 * total, items and address are immutable even for admins.
 */
export async function updateOrderStatus(
  order: Order,
  status: OrderStatus,
  actorEmail: string
): Promise<void> {
  const patch: Record<string, unknown> = {
    status,
    updatedAt: new Date().toISOString(),
  };
  if (status === 'dispatched' && !order.dispatchedAt) {
    patch.dispatchedAt = new Date().toISOString();
  }
  if (status === 'cancelled') {
    patch.cancelReason = order.cancelReason || `Cancelled by ${actorEmail}`;
  }
  await setDoc(orderDoc(order), patch, { merge: true });
}

/** Attach a carrier tracking reference. */
export async function setOrderTracking(
  order: Order,
  trackingNumber: string,
  carrier?: string
): Promise<void> {
  await setDoc(
    orderDoc(order),
    {
      trackingNumber: trackingNumber.trim(),
      carrier: carrier?.trim() || order.deliveryMethod?.name,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

/**
 * Record a refund against an order and move it to `refunded`.
 *
 * This only records the refund — it does not move money. Payments are still
 * simulated, so there is nothing to transfer yet; once Stripe is wired up this
 * has to call the refund API and be driven by its webhook, not by the client.
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
  await setDoc(
    orderDoc(order),
    { refund, status: 'refunded', updatedAt: new Date().toISOString() },
    { merge: true }
  );
  return refund;
}

/** Cancel without refunding (e.g. the card could not be produced). */
export async function cancelOrder(
  order: Order,
  reason: string,
  actorEmail: string
): Promise<void> {
  await setDoc(
    orderDoc(order),
    {
      status: 'cancelled',
      cancelReason: reason.trim() || `Cancelled by ${actorEmail}`,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

/** An internal note. Never shown to the customer. */
export async function setOrderNote(order: Order, note: string): Promise<void> {
  await setDoc(
    orderDoc(order),
    { adminNote: note.trim() || null, updatedAt: new Date().toISOString() },
    { merge: true }
  );
}

const orderDoc = (order: Order) => {
  if (!order.userId) {
    throw new Error('This order has no customer id, so it cannot be updated.');
  }
  return doc(db, 'users', order.userId, 'orders', order.id);
};

/** Orders eligible for a refund: paid and not already refunded or cancelled. */
export const isRefundable = (order: Order): boolean =>
  order.status !== 'refunded' && order.status !== 'cancelled' && order.total > 0;
