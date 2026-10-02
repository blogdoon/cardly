/**
 * Card sizes, as real paper.
 *
 * Why this file is separate from `pricing.ts`: `pricing.ts` decides what a card
 * COSTS, this decides what a card IS. They are read from the same four id strings
 * in `CARD_SIZES` (`src/data/fonts.ts`), so `scripts/printLayout.check.ts`
 * asserts the folded millimetre dimensions below are the same ones the storefront
 * advertises — a card sold as "148 x 210 mm" that prints at A6 is a refund, and
 * the two numbers must never be able to disagree silently.
 *
 * The geometry itself, because a folded card is not a rectangle:
 *
 *   - `foldedMm` is the card the customer holds: the size listed in CARD_SIZES.
 *   - `unfoldedMm` is the printed sheet, twice the width for a bi-fold. A5 folds
 *     out to 296 x 210, which is A4 landscape — the sheet a home printer has.
 *   - `sheetMm` is the paper the print file is laid out on, with the 3mm bleed
 *     the crop marks sit in. A5 -> A4, A4 -> A3, A3 -> A2, postcard -> A5.
 *     Every size therefore lands on real, purchasable stock; nothing is scaled
 *     to fit, because a scaled card is the wrong size.
 *
 * `postcard` is the exception and the reason `fold` exists: it is a flat single
 * sheet with no spine, so front and back print on opposite sides of one page
 * rather than as a two-panel spread.
 *
 * Deliberately pure — no Deno, no Supabase, no npm imports — so both the Edge
 * Function and the Node check script import it. Same rule as `pricing.ts`.
 */

/** The `cardSize` ids on an order item. Mirrors `CardSizeOption`. */
export type PrintCardSize = 'standard' | 'large' | 'giant' | 'postcard';

export interface PrintSizeGeometry {
  id: PrintCardSize;
  /** Name as the storefront sells it. */
  name: string;
  /** The finished card, portrait. */
  foldedMm: { width: number; height: number };
  /** Printed sheet for a bi-fold: two panels side by side. */
  unfoldedMm: { width: number; height: number };
  /** Paper the print file is laid out on, bleed included. */
  sheetMm: { width: number; height: number };
  /** False for the flat postcard, which has no spine. */
  fold: boolean;
  /** Envelope the finished card goes in, for the job spec. */
  envelope: string;
}

/**
 * Bleed added around the sheet, and the crop-mark length inside it. 3mm is the
 * commercial default; the marks are drawn IN the bleed so trimming removes them.
 */
export const BLEED_MM = 3;
export const CROP_MARK_MM = 4;

export const PRINT_SIZES: Record<PrintCardSize, PrintSizeGeometry> = {
  standard: {
    id: 'standard',
    name: 'Standard (A5)',
    // CARD_SIZES advertises '148 x 210 mm'.
    foldedMm: { width: 148, height: 210 },
    unfoldedMm: { width: 296, height: 210 },
    sheetMm: { width: 302, height: 216 },
    fold: true,
    envelope: 'C5 / DL',
  },
  large: {
    id: 'large',
    name: 'Large (A4)',
    // CARD_SIZES advertises '210 x 297 mm'.
    foldedMm: { width: 210, height: 297 },
    unfoldedMm: { width: 420, height: 297 },
    sheetMm: { width: 426, height: 303 },
    fold: true,
    envelope: 'C4',
  },
  giant: {
    id: 'giant',
    name: 'Giant (A3)',
    // CARD_SIZES advertises '297 x 420 mm'.
    foldedMm: { width: 297, height: 420 },
    unfoldedMm: { width: 594, height: 420 },
    sheetMm: { width: 600, height: 426 },
    fold: true,
    envelope: 'C4 (oversize)',
  },
  postcard: {
    id: 'postcard',
    name: 'Flat Postcard',
    // CARD_SIZES advertises '105 x 148 mm'. Front and back, one sheet, no fold.
    foldedMm: { width: 105, height: 148 },
    unfoldedMm: { width: 105, height: 148 },
    sheetMm: { width: 111, height: 154 },
    fold: false,
    envelope: 'A6',
  },
};

export const isPrintCardSize = (value: unknown): value is PrintCardSize =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(PRINT_SIZES, value);

/**
 * Geometry for an order item, defaulting to the standard A5 rather than throwing.
 *
 * A missing or unknown `cardSize` must not lose a paid order: the customer gets
 * the most common card printed and an operator note, which is recoverable. The
 * refusal case belongs to `create-checkout`, which already 400s an unknown size
 * before the money is taken (`computeTotals` throws on it) — so by the time an
 * item reaches fulfilment the id is already known-good, and this default is
 * belt-and-braces for rows written before that validation existed.
 */
export function printSizeFor(cardSize: unknown): PrintSizeGeometry {
  return isPrintCardSize(cardSize) ? PRINT_SIZES[cardSize] : PRINT_SIZES.standard;
}

/** Panel order per printed side. `back | front` on the outside, in reading order. */
export const OUTSIDE_PANELS = ['back', 'front'] as const;
export const INSIDE_PANELS = ['inside-left', 'inside-right'] as const;