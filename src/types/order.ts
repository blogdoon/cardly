import { CartItem } from './cart';
import { DeliveryAddress } from './user';

export type { DeliveryAddress };

export type OrderStatus =
  | 'processing'
  | 'printed'
  | 'dispatched'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  'processing',
  'printed',
  'dispatched',
  'delivered',
];

export const isTerminalStatus = (status: OrderStatus): boolean =>
  status === 'delivered' || status === 'cancelled' || status === 'refunded';

export interface RefundRecord {
  amount: number;
  reason: string;
  at: string;
  by: string;
}

export interface DeliveryMethod {
  id: string;
  name: string;
  price: number;
  estimatedDelivery: string;
  description: string;
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
  dispatchDate: string; // 'now' or ISO date
  paymentSummary: {
    method: 'card' | 'apple_pay' | 'google_pay';
    last4?: string;
    brand?: string;
  };
  createdAt: string;
  updatedAt: string;
  trackingNumber?: string;
  carrier?: string;
  dispatchedAt?: string;
  estimatedArrival?: string;
  cancelReason?: string;
  adminNote?: string | null;
  refund?: RefundRecord;
}
