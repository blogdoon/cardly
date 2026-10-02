/**
 * The authoritative price list behind a charge.
 *
 * This is the money path: the browser's total is display only, and the amount
 * Stripe takes comes from `computeTotals` here. It mirrors four lists in the
 * SPA —
 *
 *   CARD_SIZES / CARD_FINISHES / ENVELOPE_COLORS   src/data/fonts.ts
 *   DELIVERY_METHODS / productionDaysFor           src/utils/delivery.ts
 *   VALID_PROMOS                                   src/utils/promos.ts
 *
 * and `scripts/paymentPricing.check.ts` imports this file alongside those and
 * fails `npm test` when they drift. Change a price in the app, run the check,
 * copy it across — one of the two copies is always wrong if they disagree, so
 * the check exists to make that loud instead of silently overcharging.
 *
 * Deliberately pure: no Deno, no Supabase, no Stripe imports, so Node can
 * import it for that check. The templates' own prices are NOT here — they live
 * in the database and are read per-order by `create-checkout`.
 */

export interface SizePrice {
  id: string;
  name: string;
  priceMultiplier: number;
}

export interface PricedOption {
  id: string;
  name: string;
  price: number;
}

export interface DeliveryPrice {
  id: string;
  name: string;
  price: number;
  transitDays: number;
  productionDays: number;
}

/** Mirrors CARD_SIZES in src/data/fonts.ts. */
export const SIZES: SizePrice[] = [
  { id: 'standard', name: 'Standard (A5)', priceMultiplier: 1.0 },
  { id: 'large', name: 'Large (A4)', priceMultiplier: 1.35 },
  { id: 'giant', name: 'Giant (A3)', priceMultiplier: 1.85 },
  { id: 'postcard', name: 'Flat Postcard', priceMultiplier: 0.75 },
];

/** Mirrors CARD_FINISHES in src/data/fonts.ts. */
export const FINISHES: PricedOption[] = [
  { id: 'satin', name: 'Satin Silk', price: 0 },
  { id: 'matte', name: 'Soft-Touch Matte', price: 0.75 },
  { id: 'gloss', name: 'High Gloss', price: 0.5 },
  { id: 'foil', name: 'Gold Foil Accent', price: 1.5 },
];

/** Mirrors ENVELOPE_COLORS in src/data/fonts.ts. */
export const ENVELOPES: PricedOption[] = [
  { id: 'white', name: 'Classic White', price: 0 },
  { id: 'kraft', name: 'Kraft Brown', price: 0 },
  { id: 'blush', name: 'Blush Pink', price: 0.5 },
  { id: 'scarlet', name: 'Scarlet Red', price: 0.5 },
  { id: 'forest', name: 'Forest Green', price: 0.5 },
  { id: 'navy', name: 'Navy Blue', price: 0.5 },
  { id: 'gold', name: 'Golden Pearl', price: 0.75 },
];

/** Mirrors DELIVERY_METHODS in src/utils/delivery.ts (+ its production window). */
export const DELIVERIES: DeliveryPrice[] = [
  { id: 'letterbox-standard', name: 'Standard Letterbox', price: 1.45, transitDays: 4, productionDays: 1 },
  { id: 'post-tracked', name: 'Tracked & Signed', price: 3.95, transitDays: 3, productionDays: 1 },
  { id: 'express-courier', name: 'Express Courier', price: 9.9, transitDays: 1, productionDays: 0 },
];

/** Mirrors VALID_PROMOS in src/utils/promos.ts: code → percentage off. */
export const PROMOS: Record<string, number> = {
  CARDLY20: 20,
  LOVE10: 10,
  FREESHIP: 15,
};

export const findSize = (id: string): SizePrice | undefined => SIZES.find((s) => s.id === id);
export const findFinish = (id: string): PricedOption | undefined => FINISHES.find((f) => f.id === id);
export const findEnvelope = (id: string): PricedOption | undefined => ENVELOPES.find((e) => e.id === id);
export const findDelivery = (id: string): DeliveryPrice | undefined => DELIVERIES.find((d) => d.id === id);

/** Two decimals, round-half-up — matches numeric(10,2) in the database. */
export const money = (n: number): number => Math.round(n * 100) / 100;

export interface TotalsItem {
  /** Standard-size price of the template, read from the database — never from the client. */
  templatePrice: number;
  sizeId: string;
  envelopeId: string;
  finishId: string;
  quantity: number;
}

export interface Totals {
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
}

/**
 * `templatePrice × sizeMultiplier + envelope + finish`, × quantity, then the
 * promo and the delivery tier — the same arithmetic CartContext shows the
 * customer, with every input the client could previously have faked replaced by
 * a server-side lookup. Unknown ids throw: charging the wrong amount is worse
 * than refusing the order.
 */
export function computeTotals(input: {
  items: TotalsItem[];
  deliveryMethodId: string;
  promoCode?: string | null;
}): Totals {
  if (!input.items.length) throw new Error('Your basket is empty.');
  if (input.items.length > 20) throw new Error('Too many items in one order.');

  let subtotal = 0;
  for (const item of input.items) {
    const size = findSize(item.sizeId);
    if (!size) throw new Error(`Unknown card size: ${item.sizeId}`);
    const envelope = findEnvelope(item.envelopeId);
    if (!envelope) throw new Error(`Unknown envelope: ${item.envelopeId}`);
    const finish = findFinish(item.finishId);
    if (!finish) throw new Error(`Unknown finish: ${item.finishId}`);
    const quantity = Math.floor(item.quantity);
    if (!(quantity >= 1 && quantity <= 50)) throw new Error('Quantity must be between 1 and 50.');
    if (!(item.templatePrice >= 0)) throw new Error('Invalid price.');

    const unit = item.templatePrice * size.priceMultiplier + envelope.price + finish.price;
    subtotal += unit * quantity;
  }

  const delivery = findDelivery(input.deliveryMethodId);
  if (!delivery) throw new Error(`Unknown delivery method: ${input.deliveryMethodId}`);

  const code = (input.promoCode ?? '').trim().toUpperCase();
  let discount = 0;
  if (code) {
    const pct = PROMOS[code];
    if (pct === undefined) throw new Error(`Invalid promo code: ${code}`);
    discount = (subtotal * pct) / 100;
  }

  const deliveryFee = delivery.price;
  const total = Math.max(0, subtotal - discount + deliveryFee);

  return {
    subtotal: money(subtotal),
    discount: money(discount),
    deliveryFee: money(deliveryFee),
    total: money(total),
  };
}
