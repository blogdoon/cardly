/**
 * Row mapping for `public.orders`. snake_case columns ↔ camelCase `Order`.
 *
 * `items`, `shipping_address`, `delivery_method`, `refund` and `payment_summary`
 * are jsonb, so they round-trip as-is. Everything else is a scalar rename.
 */

import type { Order } from '../types/order';

type Row = Record<string, unknown>;

export function rowToOrder(r: Row): Order {
  return {
    id: r.id as string,
    orderNumber: r.order_number as string,
    userId: (r.user_id as string) ?? '',
    items: (r.items as Order['items']) ?? [],
    subtotal: Number(r.subtotal ?? 0),
    deliveryFee: Number(r.delivery_fee ?? 0),
    discount: Number(r.discount ?? 0),
    total: Number(r.total ?? 0),
    status: r.status as Order['status'],
    shippingAddress: r.shipping_address as Order['shippingAddress'],
    deliveryMethod: r.delivery_method as Order['deliveryMethod'],
    dispatchDate: (r.dispatch_date as string) ?? '',
    deliveryType: (r.delivery_type as Order['deliveryType']) ?? 'direct_to_recipient',
    estimatedArrival: (r.estimated_arrival as string) ?? '',
    requestedDeliveryDate: (r.requested_delivery_date as string) ?? undefined,
    trackingNumber: (r.tracking_number as string) ?? undefined,
    carrier: (r.carrier as string) ?? undefined,
    dispatchedAt: (r.dispatched_at as string) ?? undefined,
    refund: (r.refund as Order['refund']) ?? undefined,
    cancelReason: (r.cancel_reason as string) ?? undefined,
    paymentSummary: (r.payment_summary as Order['paymentSummary']) ?? { method: 'card' },
    createdAt: (r.created_at as string) ?? '',
    updatedAt: (r.updated_at as string) ?? '',
  };
}

/** App → row for an insert. Server-managed columns (updated_at) are omitted. */
export function orderToRow(o: Order): Row {
  return {
    id: o.id,
    order_number: o.orderNumber,
    user_id: o.userId || null,
    items: o.items ?? [],
    subtotal: o.subtotal,
    delivery_fee: o.deliveryFee ?? 0,
    discount: o.discount ?? 0,
    total: o.total,
    status: o.status,
    shipping_address: o.shippingAddress,
    delivery_method: o.deliveryMethod,
    dispatch_date: o.dispatchDate || null,
    delivery_type: o.deliveryType ?? 'direct_to_recipient',
    estimated_arrival: o.estimatedArrival || null,
    requested_delivery_date: o.requestedDeliveryDate ?? null,
    payment_summary: o.paymentSummary ?? {},
    created_at: o.createdAt || new Date().toISOString(),
  };
}
