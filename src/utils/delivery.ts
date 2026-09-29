/**
 * Delivery options for the European shipping region.
 *
 * Single source of truth shared by the checkout (where the customer picks a
 * tier) and the cart / cart drawer (which quote a standard estimate). Keeping
 * them here is what stops the cart quoting one price and checkout charging
 * another — they previously drifted apart because the cart hardcoded its own
 * flat fee.
 *
 * All prices are EUR major units.
 */

import { DeliveryMethod } from '../types/order';

export const DELIVERY_METHODS: readonly DeliveryMethod[] = [
  {
    id: 'letterbox-standard',
    name: 'Standard Letterbox',
    price: 1.45,
    estimatedDelivery: '3–5 working days',
    description: 'Delivered straight through the letterbox',
    transitDays: 4,
  },
  {
    id: 'post-tracked',
    name: 'Tracked & Signed',
    price: 3.95,
    estimatedDelivery: '2–3 working days',
    description: 'Email delivery notifications with tracking',
    transitDays: 3,
  },
  {
    id: 'express-courier',
    name: 'Express Courier',
    price: 9.90,
    estimatedDelivery: 'Next working day',
    description: 'Priority courier, signature on delivery',
    transitDays: 1,
  },
] as const;

/** Tier preselected in checkout and quoted by the cart before checkout. */
export const STANDARD_DELIVERY = DELIVERY_METHODS[0];

export const STANDARD_DELIVERY_PRICE = STANDARD_DELIVERY.price;

export const findDeliveryMethod = (id: string): DeliveryMethod =>
  DELIVERY_METHODS.find((m) => m.id === id) ?? STANDARD_DELIVERY;
