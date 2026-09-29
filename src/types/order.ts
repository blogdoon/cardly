import { CartItem } from './cart';
import { DeliveryAddress } from './user';

export type { DeliveryAddress };

export type OrderStatus = 'processing' | 'printed' | 'dispatched' | 'delivered';

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
  paymentSummary: {
    method: 'card' | 'apple_pay' | 'google_pay';
    last4?: string;
    brand?: string;
  };
  createdAt: string;
  updatedAt: string;
}
