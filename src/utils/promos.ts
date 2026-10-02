/**
 * Promo codes.
 *
 * Lives outside `CartContext` so `scripts/paymentPricing.check.ts` can import
 * it — the server's copy of these percentages (`supabase/functions/_shared/pricing.ts`)
 * is what actually gets charged, so it is checked against this file on every
 * `npm test`.
 */

import type { PromoCode } from '../types/cart';

export const VALID_PROMOS: Record<string, PromoCode> = {
  CARDLY20: { code: 'CARDLY20', discountPercentage: 20, description: '20% off your entire order' },
  LOVE10: { code: 'LOVE10', discountPercentage: 10, description: '10% off greeting cards' },
  FREESHIP: { code: 'FREESHIP', discountPercentage: 15, description: '15% off discount covering shipping' },
};
