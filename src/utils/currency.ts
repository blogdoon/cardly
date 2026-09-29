/**
 * Single source of truth for money in Cardly.
 *
 * The store is euro-only and ships within Europe, so there is no currency
 * conversion, no exchange-rate table and no multi-currency state. Every price
 * in the app is a plain `number` in EUR major units (e.g. 4.49 = €4.49) and
 * must be rendered through `formatPrice` so the locale, decimals and symbol
 * stay consistent across the SPA and the prerendered HTML.
 *
 * Invariant: no component may hardcode a currency glyph. `npm run lint` plus
 * review should keep `£`/`$` out of src/ and scripts/.
 */

export const CURRENCY = 'EUR';
export const CURRENCY_SYMBOL = '€';
export const CURRENCY_CODE = 'EUR';

/** Region the store ships to. Drives the checkout country list. */
export const SHIPPING_REGION = 'Europe';

const formatter = new Intl.NumberFormat('en-IE', {
  style: 'currency',
  currency: CURRENCY,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format an amount in EUR for display. Always two decimals, always a
 * non-breaking space before the symbol, e.g. `€4.49`.
 *
 * @param amount Major-unit amount in EUR.
 */
export const formatPrice = (amount: number): string => formatter.format(amount);

const compactFormatter = new Intl.NumberFormat('en-IE', {
  style: 'currency',
  currency: CURRENCY,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Whole-euro formatting for headline figures (revenue cards, price sliders). */
export const formatPriceCompact = (amount: number): string => compactFormatter.format(amount);

/**
 * Countries we deliver to, in the order they appear in the checkout select.
 * Eurozone members first, then EU non-euro states, then EEA/Switzerland.
 * All prices are quoted in EUR regardless of destination — the price shown at
 * checkout is the price charged.
 */
export const SHIPPING_COUNTRIES = [
  'Austria',
  'Belgium',
  'Bulgaria',
  'Croatia',
  'Cyprus',
  'Czechia',
  'Denmark',
  'Estonia',
  'Finland',
  'France',
  'Germany',
  'Greece',
  'Hungary',
  'Iceland',
  'Ireland',
  'Italy',
  'Latvia',
  'Lithuania',
  'Luxembourg',
  'Malta',
  'Netherlands',
  'Norway',
  'Poland',
  'Portugal',
  'Romania',
  'Slovakia',
  'Slovenia',
  'Spain',
  'Sweden',
  'Switzerland',
] as const;

export type ShippingCountry = (typeof SHIPPING_COUNTRIES)[number];

/** Default country for a new checkout session. */
export const DEFAULT_SHIPPING_COUNTRY: ShippingCountry = 'Ireland';

/** Country code for the default country, used by the demo/seeded addresses. */
export const DEFAULT_COUNTRY_CODE = 'IE';

/**
 * Address field label. Ireland, Germany, France, Spain, Italy, Portugal, the
 * Netherlands, Austria, Belgium and Finland use "Postcode"; Greece uses
 * "ΤΚ"; Romania uses "Cod poștal". Europe is mixed enough that one neutral
 * label is used everywhere.
 */
export const POSTCODE_LABEL = 'Postcode';

/** Countries whose postcodes we cannot validate client-side — no hard rules. */
export const POSTCODE_HINT = 'Letters and numbers, e.g. D02 AF30';
