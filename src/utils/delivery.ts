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

import type { DeliveryMethod } from '../types/order';

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

/** Working days of print-and-fold before the card can leave the building. */
export const productionDaysFor = (methodId: string): number =>
  methodId === 'express-courier' ? 0 : 1;

export interface DeliveryWindow {
  dispatchDate: Date;
  arrivalDate: Date;
}

/**
 * The single source of truth for "when will this arrive". Checkout uses it both
 * to quote the window and to decide whether a tier can meet a customer's
 * "needed by" date, so the promise and the stored estimate cannot disagree.
 */
export function deliveryWindow(method: DeliveryMethod, from: Date = new Date()): DeliveryWindow {
  const dispatchDate = new Date(from);
  dispatchDate.setDate(dispatchDate.getDate() + productionDaysFor(method.id));
  const arrivalDate = new Date(dispatchDate);
  arrivalDate.setDate(arrivalDate.getDate() + method.transitDays);
  return { dispatchDate, arrivalDate };
}

/** `yyyy-mm-dd` in local time — the format `<input type="date">` speaks. */
export const toDateInput = (d: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Parses `yyyy-mm-dd` as local midnight, not UTC, so no off-by-one-day drift. */
export const parseDateInput = (value: string): Date => {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

/** True if this tier is expected to land on or before the requested date. */
export function canArriveBy(method: DeliveryMethod, requestedISO: string, from: Date = new Date()): boolean {
  if (!requestedISO) return true;
  const requested = parseDateInput(requestedISO);
  requested.setHours(23, 59, 59, 999); // a card arriving any time that day counts
  return deliveryWindow(method, from).arrivalDate.getTime() <= requested.getTime();
}

/** The soonest date the customer can ask for — the express window. */
export const earliestRequestableDate = (from: Date = new Date()): string => {
  const fastest = deliveryWindow(
    DELIVERY_METHODS.reduce((a, b) => (b.transitDays < a.transitDays ? b : a)),
    from
  );
  return toDateInput(fastest.arrivalDate);
};
