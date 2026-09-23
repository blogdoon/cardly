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
}
