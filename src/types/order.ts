import type { CartItem } from './cart';
import type { DeliveryAddress } from './user';

export type { DeliveryAddress };

/**
 * Order lifecycle.
 *
 * `pending_payment` comes first: the order row is written by the checkout
 * Edge Function before the customer is sent to Stripe, and only the signed
 * webhook moves it to `processing`. It is a real row with a real (server-side)
 * total — it just has not been charged yet, so it must not count as revenue.
 *
 * `cancelled` and `refunded` are terminal: they are reachable by an admin, and
 * the customer sees the outcome (and any refund) on their order. They were
 * missing before, which left the "free reprint or refund" promise in the footer
 * and on the card page with no way to actually honour it.
 */
export type OrderStatus =
  | 'pending_payment'
  | 'processing'
  | 'printed'
  | 'dispatched'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

/** Statuses a card can still be moved to, in order. */
export const ORDER_STATUS_FLOW: OrderStatus[] = [
  'processing',
  'printed',
  'dispatched',
  'delivered',
];

/** Terminal states — no further progress is made on these orders. */
export const TERMINAL_ORDER_STATUSES: OrderStatus[] = ['cancelled', 'refunded'];

export const isTerminalStatus = (status: OrderStatus): boolean =>
  TERMINAL_ORDER_STATUSES.includes(status);

/** A refund recorded against an order. */
export interface RefundRecord {
  /** Amount returned, in EUR. May be a partial reprint credit. */
  amount: number;
  reason: string;
  /** ISO timestamp. */
  at: string;
  /** Admin email that authorised it. */
  by: string;
}

export interface DeliveryMethod {
  id: string;
  name: string;
  price: number;
  estimatedDelivery: string;
  description: string;
  /** Transit time in working days, used to compute the dispatch/arrival window. */
  transitDays: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  status: OrderStatus;
  shippingAddress: DeliveryAddress;
  deliveryMethod: DeliveryMethod;
  dispatchDate: string; // ISO date the card leaves the printer
  /** Where the finished card goes: the recipient, or back to the customer. */
  deliveryType: 'direct_to_recipient' | 'back_to_me';
  /** ISO date the carrier is expected to deliver, derived from the delivery method. */
  estimatedArrival: string;
  /** `yyyy-mm-dd` the customer asked for, if they picked one. Not a guarantee. */
  requestedDeliveryDate?: string;
  /** Carrier tracking reference, set by an admin once the card is handed over. */
  trackingNumber?: string;
  /** Who is carrying it, e.g. the delivery method's courier. */
  carrier?: string;
  /** ISO timestamp of when the parcel was actually handed to the carrier. */
  dispatchedAt?: string;
  /** Present once an admin has refunded (in full or in part). */
  refund?: RefundRecord;
  /** Why an order was cancelled. */
  cancelReason?: string;
  paymentSummary: {
    method: 'card' | 'apple_pay' | 'google_pay';
    last4?: string;
    brand?: string;
  };
  createdAt: string;
  updatedAt: string;
}
