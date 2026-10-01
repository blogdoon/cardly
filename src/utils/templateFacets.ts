/**
 * Browse metadata for a template, derived once and stored on the Postgres doc.
 *
 * The catalog lives in the database now, so every facet the storefront filters
 * on has to be a real, queryable field on `templates/{id}`. Previously both
 * generators hardcoded `recipient: 'Anyone'` and `style: 'Floral'` for every
 * card regardless of the artwork, so `Browse.tsx` could only ever filter by
 * occasion and price — the recipient, style, photo and milestone facets matched
 * nothing (see `src/pages/Browse.tsx`).
 *
 * This module is the single place that decides those values:
 *  - `ARTWORK_FACETS` is the hand-written source of truth for bundled artwork,
 *    keyed by the artwork's slug. The files are fixed, so an explicit reviewed
 *    map beats guessing from pixels (which would call a felt-craft photo and a
 *    geometric poster the same thing).
 *  - `buildTemplateFacets()` resolves a slug against that map, then falls back
 *    to a documented default for artwork that is not in it (user uploads).
 *  - The storefront-facing fields are validated against the `CardTemplate`
 *    unions, so a typo can never persist a facet that no filter can match.
 *  - `recipients` and `styles` are multi-valued, and a stored scalar
 *    `recipient`/`style` (written before this change) is widened on read, so
 *    those documents need no migration.
 *  - `priceRangeFor()` derives the filterable price band from `price` and the
 *    size multipliers, so the catalog does not have to store a range that could
 *    drift from the size table.
 *
 * The values are also *ratings-free* on purpose: `rating` / `reviewCount` start
 * at zero and are owned entirely by `recomputeTemplateRating`
 * (`services/reviewService.ts`). The generators used to fabricate `4.9 from
 * 45–224 reviews`, which AGENTS.md forbids.
 */

import type { OccasionType } from '../types/template';

/**
 * The facet vocabularies, as runtime values.
 *
 * These are the single source of truth for both the `CardTemplate` unions
 * (`types/template.ts` derives its types from these) and the coercion below, so
 * a facet value and the set of values a filter accepts cannot drift apart.
 */
export const RECIPIENT_TYPES = [
  'Her', 'Him', 'Mum', 'Dad', 'Sister', 'Brother', 'Wife', 'Husband', 'Partner',
  'Daughter', 'Son', 'Grandparent', 'Friend', 'Best Friend', 'Colleague', 'Kids', 'Anyone',
] as const;

export type RecipientType = (typeof RECIPIENT_TYPES)[number];

export const STYLE_TYPES = [
  'Funny', 'Cute', 'Modern', 'Elegant', 'Floral', 'Minimal', 'Retro',
  'Colorful', 'Photo', 'Typography', 'Luxury', 'Cartoon', 'Inspirational',
] as const;

export type CardStyleType = (typeof STYLE_TYPES)[number];

export const TONE_TYPES = [
  'Humorous', 'Heartfelt', 'Cheeky', 'Sweet', 'Formal', 'Playful',
] as const;

export type CardToneType = (typeof TONE_TYPES)[number];

export const SEASON_TYPES = [
  'spring', 'summer', 'autumn', 'winter', 'all-year',
] as const;

export type CardSeasonType = (typeof SEASON_TYPES)[number];

export const PERSONALIZATION_TYPES = ['photo', 'text', 'none'] as const;

export type PersonalizationType = (typeof PERSONALIZATION_TYPES)[number];

/** The colour families a card's palette is bucketed into for `?color=`. */
export const COLOR_FAMILIES = [
  'red', 'coral', 'pink', 'blush', 'purple', 'blue', 'teal', 'green',
  'sage', 'yellow', 'orange', 'gold', 'brown', 'black', 'white', 'grey', 'multicolour',
] as const;

export type ColorFamily = (typeof COLOR_FAMILIES)[number];

export const COLOR_FAMILY_LABELS: Record<ColorFamily, string> = {
  red: 'Red', coral: 'Coral', pink: 'Pink', blush: 'Blush', purple: 'Purple',
  blue: 'Blue', teal: 'Teal', green: 'Green', sage: 'Sage', yellow: 'Yellow',
  orange: 'Orange', gold: 'Gold', brown: 'Brown', black: 'Black', white: 'White',
  grey: 'Grey', multicolour: 'Multicolour',
};

/** The tone/season/style vocabulary a card is filed under. */
export interface FacetSeed {
  /** Multi-valued: a card can honestly be both "Cute" and "Retro". */
  styles: CardStyleType[];
  recipients: RecipientType[];
  tone: CardToneType;
  season: CardSeasonType;
  /** Extra descriptive tags, in addition to the occasion and artwork words. */
  tags: string[];
  /**
   * `[background, accent, trim]` for the catalog swatches.
   *
   * These are a *design choice* keyed to each artwork's character, not a pixel
   * sample — the `?color=` facet filters on what the card looks like on the
   * shelf, and a card's swatch is a merchandising decision. Without them every
   * card shared one palette, so the colour facet was populated but useless
   * (all 17 cards matched `orange`, none matched `teal`), which is worse than
   * an empty filter because it looks like it works.
   */
  palette?: string[];
}

/** The facet fields a template doc must carry for the storefront filters. */
export interface TemplateFacets {
  category: OccasionType;
  subcategory: string;
  recipients: RecipientType[];
  styles: CardStyleType[];
  tone: CardToneType;
  season: CardSeasonType;
  personalization: PersonalizationType[];
  colors: ColorFamily[];
  tags: string[];
  /** The catalog swatches, from which `colors` is derived. */
  palette: string[];
  isPhotoCard: boolean;
  /** Present only for age-specific cards; validated against MILESTONE_AGES. */
  milestoneAge?: number;
  isPopular: boolean;
  isBestSeller: boolean;
  isNew: boolean;
  rating: number;
  reviewCount: number;
}

/**
 * Hand-assigned facets for the bundled artwork in
 * `src/assets/images/occasions/<folder>/`.
 *
 * Keyed by the artwork slug (filename minus extension, separators normalised).
 * These are the only truthful answer to "what style is this?" — the artwork is
 * fixed and reviewed, so it is written down rather than inferred. Add an entry
 * when you add art; anything missing falls back to DEFAULT_FACETS.
 */
export const ARTWORK_FACETS: Record<string, FacetSeed> = {
  // birthday/ — felt craft, retro geometry, and botanical watercolour.
  // Styles and recipients are multi-valued so these stay reachable from more
  // than one facet, and so "Anyone" reflects that a birthday card is not
  // gender- or age-locked.
  'birthday_girl_cartoon': {
    styles: ['Cartoon', 'Cute'],
    recipients: ['Her', 'Daughter', 'Anyone'],
    tone: 'Playful',
    season: 'all-year',
    tags: ['cartoon', 'girl', 'playful'],
    palette: ['#fdf2f4', '#f9a8b8', '#be123c'],
  },
  'birthday_kid_cartoon': {
    styles: ['Cartoon', 'Cute'],
    recipients: ['Kids', 'Son', 'Daughter', 'Anyone'],
    tone: 'Playful',
    season: 'all-year',
    tags: ['cartoon', 'kids', 'playful'],
    palette: ['#eff6ff', '#93c5fd', '#1d4ed8'],
  },
  'felt_giraffe_hat_bunting': {
    styles: ['Cute', 'Colorful'],
    recipients: ['Kids', 'Anyone'],
    tone: 'Playful',
    season: 'all-year',
    tags: ['felt', 'giraffe', 'bunting', 'craft', 'animal', 'party'],
    palette: ['#fefce8', '#fcd34d', '#1d4ed8'],
  },
  'felt_applique_stars_hearts': {
    styles: ['Cute', 'Colorful'],
    recipients: ['Kids', 'Anyone'],
    tone: 'Playful',
    season: 'all-year',
    tags: ['felt', 'applique', 'stars', 'hearts', 'craft', 'handmade'],
    palette: ['#f8fafc', '#fbbf24', '#1e40af'],
  },
  'embroidered_daisies_blush_linen': {
    styles: ['Floral', 'Elegant'],
    recipients: ['Mum', 'Grandparent', 'Anyone'],
    tone: 'Sweet',
    season: 'spring',
    tags: ['embroidered', 'daisies', 'linen', 'handmade'],
    palette: ['#fdf7f2', '#fbcfe8', '#a3b18a'],
  },
  'blush_floral_corner_spray': {
    styles: ['Floral', 'Elegant'],
    recipients: ['Her', 'Wife', 'Partner', 'Anyone'],
    tone: 'Sweet',
    season: 'spring',
    tags: ['blush', 'floral', 'spray', 'romantic'],
    palette: ['#fdf2f4', '#fda4af', '#9f1239'],
  },
  'watercolor_botanical_border_coral': {
    styles: ['Floral', 'Elegant'],
    recipients: ['Her', 'Wife', 'Anyone'],
    tone: 'Sweet',
    season: 'all-year',
    tags: ['watercolour', 'botanical', 'border', 'coral'],
    palette: ['#fdf8f4', '#fca5a5', '#a8a29e'],
  },
  'watercolor_meadow_lavender_poppy': {
    styles: ['Floral', 'Elegant'],
    recipients: ['Her', 'Friend', 'Anyone'],
    tone: 'Heartfelt',
    season: 'spring',
    tags: ['watercolour', 'meadow', 'lavender', 'poppy', 'wildflower'],
    palette: ['#faf7fd', '#c4b5fd', '#f9a8d4'],
  },
  'watercolor_meadow_border_frame': {
    styles: ['Floral', 'Minimal'],
    recipients: ['Anyone', 'Friend', 'Colleague'],
    tone: 'Heartfelt',
    season: 'spring',
    tags: ['watercolour', 'meadow', 'border', 'frame', 'wildflower'],
    palette: ['#f7faf6', '#d9e4c8', '#b6ad9a'],
  },
  'watercolor_rabbit_daisy_meadow': {
    styles: ['Cute', 'Floral'],
    recipients: ['Kids', 'Anyone'],
    tone: 'Playful',
    season: 'spring',
    tags: ['watercolour', 'rabbit', 'daisies', 'meadow', 'animal', 'spring'],
    palette: ['#fbfaf6', '#a3b18a', '#fde68a'],
  },
  'watercolor_bear_balloons_meadow': {
    styles: ['Cute', 'Floral'],
    recipients: ['Kids', 'Anyone'],
    tone: 'Playful',
    season: 'all-year',
    tags: ['watercolour', 'bear', 'balloons', 'party', 'meadow'],
    palette: ['#f4f9fd', '#bfe3f5', '#f5d0a9'],
  },
  'retro_waves_coral_navy': {
    styles: ['Retro', 'Modern'],
    recipients: ['Anyone', 'Friend', 'Colleague'],
    tone: 'Heartfelt',
    season: 'all-year',
    tags: ['retro', 'waves', 'abstract', 'mid-century', 'geometric'],
    palette: ['#fdf6ef', '#fb7185', '#1e3a5f'],
  },
  'retro_arches_botanical_coral': {
    styles: ['Retro', 'Minimal'],
    recipients: ['Anyone', 'Colleague'],
    tone: 'Heartfelt',
    season: 'all-year',
    tags: ['retro', 'arches', 'botanical', 'mid-century'],
    palette: ['#fdf7f0', '#f4a261', '#7a8b4f'],
  },
  'midcentury_tiles_coral_olive': {
    styles: ['Retro', 'Minimal', 'Colorful'],
    recipients: ['Anyone', 'Friend', 'Colleague'],
    tone: 'Heartfelt',
    season: 'all-year',
    tags: ['retro', 'geometric', 'tiles', 'mid-century', 'pattern'],
    palette: ['#faf7f0', '#e2725b', '#7d8a4e'],
  },
  'abstract_brushstrokes_gold_rust': {
    styles: ['Modern', 'Minimal', 'Luxury'],
    recipients: ['Anyone', 'Colleague'],
    tone: 'Heartfelt',
    season: 'all-year',
    tags: ['abstract', 'brushstrokes', 'modern', 'texture', 'gold'],
    palette: ['#f7f2ea', '#c9a227', '#9a4a22'],
  },
  'gold_star_heart_eyes_doodle': {
    styles: ['Typography', 'Funny'],
    recipients: ['Anyone', 'Friend', 'Best Friend'],
    tone: 'Cheeky',
    season: 'all-year',
    tags: ['doodle', 'stars', 'gold', 'whimsical', 'humour'],
    palette: ['#fdf8ec', '#d4af37', '#2f2f2f'],
  },
  'monstera_vase_terracotta': {
    styles: ['Minimal', 'Modern'],
    recipients: ['Anyone', 'Friend', 'Grandparent', 'Colleague'],
    tone: 'Heartfelt',
    season: 'autumn',
    tags: ['monstera', 'terracotta', 'botanical', 'minimal', 'foliage'],
    palette: ['#f4f1ea', '#4f6b4a', '#b5651d'],
  },
};

/**
 * Fallback for artwork with no entry in ARTWORK_FACETS (i.e. an admin upload).
 *
 * Deliberately NOT the old blanket 'Floral'/'Anyone': 'Modern' is the one style
 * that is not a claim about the subject matter, and 'Anyone' is a truthful
 * recipient for art we have not characterised. The studio still prompts for both
 * so a human overrides these.
 */
export const DEFAULT_FACETS: FacetSeed = {
  styles: ['Modern'],
  recipients: ['Anyone'],
  tone: 'Heartfelt',
  season: 'all-year',
  tags: ['artisan', 'stationery'],
  palette: ['#faf8f5', '#a8a29e', '#d97706'],
};

/** Normalise a filename to the slug used as an ARTWORK_FACETS key. */
export const artworkSlug = (fileName: string): string =>
  fileName
    .replace(/\.[^/.]+$/, '')
    .replace(/_\d{10,}$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

/**
 * ARTWORK_FACETS re-keyed through `artworkSlug`, so a map entry written
 * `birthday-girl-cartoon` resolves the same as `birthday_girl_cartoon`. The
 * artwork on disk uses both separators; the map should not have to care.
 */
const FACETS_BY_SLUG: Record<string, FacetSeed> = Object.fromEntries(
  Object.entries(ARTWORK_FACETS).map(([key, seed]) => [artworkSlug(key), seed])
);

/** A stable slug for an arbitrary image reference (uploaded artwork included). */
export const imageSlug = (imageUrl: string): string => {
  const base = imageUrl.split(/[?#]/)[0].split('/').pop() || '';
  return artworkSlug(base);
};

const RECIPIENTS = RECIPIENT_TYPES;
const STYLES = STYLE_TYPES;
const TONES = TONE_TYPES;
const SEASONS = SEASON_TYPES;

/**
 * Coerce one facet to a member of its union, falling back when the stored value
 * is absent or not recognised. Without this, a hand-edited Postgres doc can
 * hold `style: "Botanical"` and the storefront silently drops that card from
 * every style filter.
 */
const coerce = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;

const lower = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : fallback;

/**
 * The ages the Browse page offers, and the only ones a template's
 * `milestoneAge` may hold. `data/categories.ts` re-exports this as
 * `MILESTONE_AGES`, so there is one list rather than two that can drift.
 */
export const MILESTONE_AGE_VALUES = [1, 16, 18, 21, 30, 40, 50, 60, 70, 80, 90, 100] as const;

/**
 * A stored rating, if it is a real number.
 *
 * `recomputeTemplateRating` is the only writer of these, and the database is the
 * source of truth, so a stored value is preserved — this runs on the *read* path
 * too (`mergeCatalog`), and zeroing there would blank the rating of every card
 * that genuinely has approved reviews. Only a missing/invalid value defaults to
 * 0, which is what a never-reviewed card should show.
 */
const storedRating = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0;

/**
 * Coerce a multi-valued facet.
 *
 * Accepts an array *or* a bare scalar, because templates written before this
 * change stored `recipient: 'Anyone'` / `style: 'Floral'` as single values —
 * widening those on read is what lets the old documents migrate themselves
 * rather than needing a backfill script. Unknown entries are dropped rather
 * than kept, so a typo cannot produce a card no filter can reach.
 */
const coerceList = <T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: readonly T[]
): T[] => {
  const raw = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
  const kept = raw.filter(
    (v): v is T => typeof v === 'string' && (allowed as readonly string[]).includes(v)
  );
  return kept.length > 0 ? Array.from(new Set(kept)) : [...fallback];
};

/** How long a card keeps the "New" badge. */
export const NEW_FOR_DAYS = 90;

/** Whether a card is still within its `NEW_FOR_DAYS` window. */
export function isNewWithin(createdAt: unknown, now: Date = new Date()): boolean {
  if (typeof createdAt !== 'string') return false;
  const made = new Date(createdAt);
  if (Number.isNaN(made.getTime())) return false;
  const age = (now.getTime() - made.getTime()) / 86_400_000;
  return age >= 0 && age <= NEW_FOR_DAYS;
}

/**
 * Bucket a hex colour into a family, for the `?color=` facet.
 *
 * HSL rather than a hand-tuned nearest-named-colour table: the swatches are
 * arbitrary, and this keeps the answer stable as new swatches are added.
 */
export function colorFamily(hex: string): ColorFamily | undefined {
  const m = /^#?([\da-f]{6})$/i.exec(hex.trim());
  if (!m) return undefined;
  const int = parseInt(m[1], 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));

  if (d === 0) {
    if (l < 0.12) return 'black';
    if (l > 0.92) return 'white';
    return 'grey';
  }
  // Very light and very dark swatches read better as neutrals than as a hue.
  if (l < 0.1) return 'black';
  if (l > 0.93) return 'white';
  if (s < 0.12) return 'grey';

  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h = Math.round(h * 60);
  if (h < 0) h += 360;

  if (h >= 15 && h < 45) return l < 0.4 ? 'brown' : 'orange';
  if (h >= 45 && h < 70) return 'gold';
  if (h >= 70 && h < 100) return 'yellow';
  if (h >= 100 && h < 160) return 'green';
  if (h >= 160 && h < 200) return 'teal';
  if (h >= 200 && h < 255) return 'blue';
  if (h >= 255 && h < 290) return 'purple';
  if (h >= 290 && h < 335) return 'pink';
  if (h >= 335 || h < 15) return l < 0.45 ? 'brown' : 'red';
  return 'grey';
}

/** Every colour family present in a swatch list, de-duplicated and ordered. */
export const colorsFrom = (swatches: readonly string[]): ColorFamily[] => {
  const found = swatches
    .map((c) => colorFamily(c))
    .filter((c): c is ColorFamily => Boolean(c));
  return COLOR_FAMILIES.filter((f) => found.includes(f));
};

/**
 * The filterable price band for a card.
 *
 * The stored `price` is the *standard* size price, so the band is derived from
 * the size multipliers rather than stored — a stored min/max would be a second
 * copy of the size table that could drift out of sync with the checkout.
 * Imported lazily by callers that need it; the multipliers are inlined here to
 * keep this module free of the fonts/catalog import graph.
 */
const SIZE_MULTIPLIERS = [0.75, 1.0, 1.35, 1.85] as const;

export function priceRangeFor(price: number): { min: number; max: number } {
  const base = typeof price === 'number' && Number.isFinite(price) && price > 0 ? price : 0;
  return {
    min: round2(base * Math.min(...SIZE_MULTIPLIERS)),
    max: round2(base * Math.max(...SIZE_MULTIPLIERS)),
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Build the full facet set for a template.
 *
 * Values already present on `existing` win — the database is the source of
 * truth, and an admin editing a card in Postgres must not be undone by a
 * rebuild. Only *missing or invalid* fields are filled in, which is what makes
 * this safe to run on the read path (see `mergeCatalog` in
 * `services/catalogService.ts`) and needs no migration.
 */
export function buildTemplateFacets(input: {
  occasion: OccasionType;
  imageUrl: string;
  subcategory?: string;
  /** The card's palette, for the `?color=` facet. */
  previewColors?: readonly string[];
  /** Set by the studio when the card targets a specific age. */
  milestoneAge?: number;
  /** Overrides the artwork's palette; used by the studio's colour picker. */
  palette?: readonly string[];
  createdAt?: string;
  existing?: Partial<TemplateFacets> & {
    /** Legacy single-valued facets, written before the facets became arrays. */
    recipient?: RecipientType;
    style?: CardStyleType;
    tags?: string[];
    colors?: string[];
    palette?: string[];
    isPhotoCard?: boolean;
    isNew?: boolean;
    createdAt?: string;
    previewColors?: string[];
  };
}): TemplateFacets {
  const { occasion, imageUrl, existing = {} } = input;

  const seed = FACETS_BY_SLUG[imageSlug(imageUrl)] ?? DEFAULT_FACETS;

  // The occasion word, the artwork's own descriptive words, and the seed tags.
  // Keywords derived from the filename are what make `?q=` actually work.
  const artworkWords = imageSlug(imageUrl).split('_').filter((w) => w.length > 2);
  const tags = Array.from(
    new Set(
      [
        lower(occasion, 'birthday'),
        ...artworkWords,
        ...(Array.isArray(existing.tags) ? existing.tags : seed.tags),
      ]
        .map((t) => lower(t, ''))
        .filter(Boolean)
    )
  ).slice(0, 12);

  // Pre-printed artwork: the customer personalises the message, not the cover,
  // so the default is text-only. A blank/photo template says so explicitly.
  const personalization = coerceList(
    existing.personalization,
    PERSONALIZATION_TYPES,
    ['text'] as const
  );

  // The swatches, in priority order: an explicit palette, then the card's
  // stored one, then the artwork's. `colors` is derived from this so the
  // colour facet can never disagree with what the storefront renders.
  const storedPalette = Array.isArray(existing.palette) ? existing.palette : [];
  const palette = (input.palette?.length ? input.palette : storedPalette).length
    ? (input.palette?.length ? input.palette : storedPalette)
    : (seed.palette ?? DEFAULT_FACETS.palette ?? []);

  return {
    category: occasion,
    subcategory:
      typeof existing.subcategory === 'string' && existing.subcategory.trim()
        ? existing.subcategory
        : 'Artisan Collection',
    recipients: coerceList(
      existing.recipients ?? existing.recipient,
      RECIPIENTS,
      seed.recipients
    ),
    styles: coerceList(existing.styles ?? existing.style, STYLES, seed.styles),
    tone: coerce(existing.tone, TONES, seed.tone),
    season: coerce(existing.season, SEASONS, seed.season),
    personalization,
    // Derived from the palette, not hand-set, so it can never disagree with the
    // swatches a customer actually sees.
    colors: colorsFrom(existing.colors?.length ? existing.colors : palette),
    // Only kept when it is an age the storefront can actually filter on, so a
    // typo cannot produce a card no Milestone Age button can return.
    ...(() => {
      const age = existing.milestoneAge ?? input.milestoneAge;
      return typeof age === 'number' && (MILESTONE_AGE_VALUES as readonly number[]).includes(age)
        ? { milestoneAge: age }
        : {};
    })(),
    tags,
    palette: [...palette],
    // `isPhotoCard` is *derived* from personalization: the two used to be
    // independent fields that could disagree, and nothing ever set it true.
    isPhotoCard: personalization.includes('photo'),
    isPopular: typeof existing.isPopular === 'boolean' ? existing.isPopular : false,
    isBestSeller: typeof existing.isBestSeller === 'boolean' ? existing.isBestSeller : false,
    // Time-boxed rather than latched on, so "New" actually expires.
    isNew: isNewWithin(existing.createdAt ?? input.createdAt),
    // Never fabricated — `recomputeTemplateRating` owns these. A value already
    // in the database is kept; a missing one starts at zero.
    rating: storedRating(existing.rating),
    reviewCount: storedRating(existing.reviewCount),
  };
}
