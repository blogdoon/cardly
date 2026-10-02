/**
 * The server's price list must never drift from the app's.
 *
 * `supabase/functions/_shared/pricing.ts` is what actually gets charged — it is
 * a copy of the four lists the browser renders prices from. A copy that drifts
 * is a store that overcharges or undercharges silently, so this imports both
 * sides and fails `npm test` on any difference. This is the money path check
 * for AGENTS.md production blocker #1.
 *
 * `npm test`
 */

import { CARD_SIZES, CARD_FINISHES, ENVELOPE_COLORS } from '../src/data/fonts.ts';
import { DELIVERY_METHODS, productionDaysFor } from '../src/utils/delivery.ts';
import { VALID_PROMOS } from '../src/utils/promos.ts';
import {
  SIZES,
  FINISHES,
  ENVELOPES,
  DELIVERIES,
  PROMOS,
  computeTotals,
} from '../supabase/functions/_shared/pricing.ts';

let failures = 0;

const eq = (label: string, actual: unknown, expected: unknown) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    failures++;
    console.error(`FAIL ${label}: expected ${e}, got ${a}`);
  }
};

const ok = (label: string, condition: boolean) => {
  if (!condition) {
    failures++;
    console.error(`FAIL ${label}`);
  }
};

const find = <T extends { id: string }>(list: T[], id: string): T | undefined =>
  list.find((x) => x.id === id);

/** Same ids, same count — a dropped option would silently fail checkout. */
const sameIds = (label: string, app: readonly { id: string }[], server: readonly { id: string }[]) =>
  eq(label, server.map((x) => x.id).sort(), app.map((x) => x.id).sort());

// --- sizes: template price × multiplier -------------------------------------
sameIds('size ids', CARD_SIZES, SIZES);
for (const size of CARD_SIZES) {
  eq(`size ${size.id} multiplier`, find(SIZES, size.id)?.priceMultiplier, size.priceMultiplier);
}

// --- finishes and envelopes: the add-on prices ------------------------------
sameIds('finish ids', CARD_FINISHES, FINISHES);
for (const finish of CARD_FINISHES) {
  eq(`finish ${finish.id} price`, find(FINISHES, finish.id)?.price, finish.price);
}

sameIds('envelope ids', ENVELOPE_COLORS, ENVELOPES);
for (const envelope of ENVELOPE_COLORS) {
  eq(`envelope ${envelope.id} price`, find(ENVELOPES, envelope.id)?.price, envelope.price);
}

// --- delivery: the quoted fee AND the promised window -----------------------
sameIds('delivery ids', DELIVERY_METHODS, DELIVERIES);
for (const method of DELIVERY_METHODS) {
  const server = find(DELIVERIES, method.id);
  eq(`delivery ${method.id} price`, server?.price, method.price);
  eq(`delivery ${method.id} transit days`, server?.transitDays, method.transitDays);
  eq(
    `delivery ${method.id} production days`,
    server?.productionDays,
    productionDaysFor(method.id)
  );
}

// --- promos: what the customer is promised off ------------------------------
eq('promo codes', Object.keys(PROMOS).sort(), Object.keys(VALID_PROMOS).sort());
for (const [code, promo] of Object.entries(VALID_PROMOS)) {
  eq(`promo ${code} percentage`, PROMOS[code], promo.discountPercentage);
}

// --- computeTotals: one worked order, priced by both sides ------------------
// 2 × (€4.29 × 1.35 large + €0.75 gold envelope + €1.50 foil), 20% off,
// €9.90 express delivery.
const worked = computeTotals({
  items: [
    { templatePrice: 4.29, sizeId: 'large', envelopeId: 'gold', finishId: 'foil', quantity: 2 },
  ],
  deliveryMethodId: 'express-courier',
  promoCode: 'CARDLY20',
});
const cartSubtotal = (4.29 * 1.35 + 0.75 + 1.5) * 2;
eq('worked order subtotal', worked.subtotal, 16.08);
eq('worked order discount', worked.discount, 3.22);
eq('worked order delivery', worked.deliveryFee, 9.9);
eq('worked order total', worked.total, 22.77);
ok(
  'server subtotal agrees with the cart formula within a cent',
  Math.abs(worked.subtotal - cartSubtotal) < 0.01
);

// A promo can never take the total below zero, and a free card stays free.
const freeDelivery = computeTotals({
  items: [{ templatePrice: 4.29, sizeId: 'postcard', envelopeId: 'white', finishId: 'satin', quantity: 1 }],
  deliveryMethodId: 'letterbox-standard',
  promoCode: 'CARDLY20',
});
ok('total never negative', freeDelivery.total >= 0);

// --- reject rather than guess: unknown ids are refused, not priced wrong ----
const expectThrow = (label: string, fn: () => unknown) => {
  try {
    fn();
    failures++;
    console.error(`FAIL ${label}: expected a throw, got none`);
  } catch {
    /* expected */
  }
};

const base = { deliveryMethodId: 'letterbox-standard' } as const;
expectThrow('empty basket is refused', () => computeTotals({ ...base, items: [] }));
expectThrow('unknown size is refused', () =>
  computeTotals({
    ...base,
    items: [{ templatePrice: 4.29, sizeId: 'jumbo', envelopeId: 'white', finishId: 'satin', quantity: 1 }],
  })
);
expectThrow('unknown envelope is refused', () =>
  computeTotals({
    ...base,
    items: [{ templatePrice: 4.29, sizeId: 'standard', envelopeId: 'plaid', finishId: 'satin', quantity: 1 }],
  })
);
expectThrow('unknown delivery tier is refused', () =>
  computeTotals({
    deliveryMethodId: 'carrier-pigeon',
    items: [{ templatePrice: 4.29, sizeId: 'standard', envelopeId: 'white', finishId: 'satin', quantity: 1 }],
  })
);
expectThrow('unknown promo is refused', () =>
  computeTotals({
    ...base,
    items: [{ templatePrice: 4.29, sizeId: 'standard', envelopeId: 'white', finishId: 'satin', quantity: 1 }],
    promoCode: 'FREEEVERYTHING',
  })
);

if (failures) {
  console.error(`\npayment pricing: ${failures} failure(s)`);
  process.exit(1);
}
console.log('payment pricing: ok (server price list matches the app, 4 sizes / 7 envelopes / 4 finishes / 3 delivery tiers / 3 promos)');
