/**
 * Browse metadata for a template, derived once and stored on the Firestore doc.
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

/** The tone/season/style vocabulary a card is filed under. */
export interface FacetSeed {
  style: CardStyleType;
  recipient: RecipientType;
  tone: CardToneType;
  season: CardSeasonType;
  /** Extra descriptive tags, in addition to the occasion and artwork words. */
  tags: string[];
}

/** The facet fields a template doc must carry for the storefront filters. */
export interface TemplateFacets {
  category: OccasionType;
  subcategory: string;
  recipient: RecipientType;
  style: CardStyleType;
  tone: CardToneType;
  season: CardSeasonType;
  tags: string[];
  isPhotoCard: boolean;
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
  // birthday/ — felt craft, retro geometry, and botanical watercolour
  'birthday_girl_cartoon': {
    style: 'Cartoon',
    recipient: 'Her',
    tone: 'Playful',
    season: 'all-year',
    tags: ['cartoon', 'girl', 'playful'],
  },
  'birthday_kid_cartoon': {
    style: 'Cartoon',
    recipient: 'Kids',
    tone: 'Playful',
    season: 'all-year',
    tags: ['cartoon', 'kids', 'playful'],
  },
  'felt_giraffe_hat_bunting': {
    style: 'Cute',
    recipient: 'Kids',
    tone: 'Playful',
    season: 'all-year',
    tags: ['felt', 'giraffe', 'bunting', 'craft', 'animal'],
  },
  'felt_applique_stars_hearts': {
    style: 'Cute',
    recipient: 'Kids',
    tone: 'Playful',
    season: 'all-year',
    tags: ['felt', 'applique', 'stars', 'hearts', 'craft'],
  },
  'embroidered_daisies_blush_linen': {
    style: 'Floral',
    recipient: 'Mum',
    tone: 'Sweet',
    season: 'spring',
    tags: ['embroidered', 'daisies', 'linen', 'handmade'],
  },
  'blush_floral_corner_spray': {
    style: 'Floral',
    recipient: 'Her',
    tone: 'Sweet',
    season: 'spring',
    tags: ['blush', 'floral', 'spray', 'romantic'],
  },
  'watercolor_botanical_border_coral': {
    style: 'Floral',
    recipient: 'Her',
    tone: 'Sweet',
    season: 'all-year',
    tags: ['watercolour', 'botanical', 'border', 'coral'],
  },
  'watercolor_meadow_lavender_poppy': {
    style: 'Floral',
    recipient: 'Her',
    tone: 'Heartfelt',
    season: 'spring',
    tags: ['watercolour', 'meadow', 'lavender', 'poppy'],
  },
  'watercolor_meadow_border_frame': {
    style: 'Floral',
    recipient: 'Anyone',
    tone: 'Heartfelt',
    season: 'spring',
    tags: ['watercolour', 'meadow', 'border', 'frame', 'wildflower'],
  },
  'watercolor_rabbit_daisy_meadow': {
    style: 'Cute',
    recipient: 'Kids',
    tone: 'Playful',
    season: 'spring',
    tags: ['watercolour', 'rabbit', 'daisies', 'meadow', 'animal'],
  },
  'watercolor_bear_balloons_meadow': {
    style: 'Cute',
    recipient: 'Kids',
    tone: 'Playful',
    season: 'all-year',
    tags: ['watercolour', 'bear', 'balloons', 'party'],
  },
  'retro_waves_coral_navy': {
    style: 'Retro',
    recipient: 'Her',
    tone: 'Heartfelt',
    season: 'all-year',
    tags: ['retro', 'waves', 'abstract', 'mid-century'],
  },
  'retro_arches_botanical_coral': {
    style: 'Retro',
    recipient: 'Anyone',
    tone: 'Heartfelt',
    season: 'all-year',
    tags: ['retro', 'arches', 'botanical', 'mid-century'],
  },
  'midcentury_tiles_coral_olive': {
    style: 'Retro',
    recipient: 'Anyone',
    tone: 'Heartfelt',
    season: 'all-year',
    tags: ['retro', 'geometric', 'tiles', 'mid-century'],
  },
  'abstract_brushstrokes_gold_rust': {
    style: 'Modern',
    recipient: 'Anyone',
    tone: 'Heartfelt',
    season: 'all-year',
    tags: ['abstract', 'brushstrokes', 'modern', 'texture'],
  },
  'gold_star_heart_eyes_doodle': {
    style: 'Typography',
    recipient: 'Anyone',
    tone: 'Cheeky',
    season: 'all-year',
    tags: ['doodle', 'stars', 'gold', 'whimsical'],
  },
  'monstera_vase_terracotta': {
    style: 'Minimal',
    recipient: 'Anyone',
    tone: 'Heartfelt',
    season: 'autumn',
    tags: ['monstera', 'terracotta', 'botanical', 'minimal'],
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
  style: 'Modern',
  recipient: 'Anyone',
  tone: 'Heartfelt',
  season: 'all-year',
  tags: ['artisan', 'stationery'],
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
 * is absent or not recognised. Without this, a hand-edited Firestore doc can
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
 * Build the full facet set for a template.
 *
 * Values already present on `existing` win — the database is the source of
 * truth, and an admin editing a card in Firestore must not be undone by a
 * rebuild. Only *missing or invalid* fields are filled in, which is what makes
 * this safe to run on the read path (see `mergeCatalog` in
 * `services/catalogService.ts`) and needs no migration.
 */
export function buildTemplateFacets(input: {
  occasion: OccasionType;
  imageUrl: string;
  subcategory?: string;
  existing?: Partial<TemplateFacets> & {
    tags?: string[];
    milestoneAge?: number;
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

  return {
    category: coerce(occasion, [] as unknown as readonly OccasionType[], occasion),
    subcategory:
      typeof existing.subcategory === 'string' && existing.subcategory.trim()
        ? existing.subcategory
        : 'Artisan Collection',
    recipient: coerce(existing.recipient, RECIPIENTS, seed.recipient),
    style: coerce(existing.style, STYLES, seed.style),
    tone: coerce(existing.tone, TONES, seed.tone),
    season: coerce(existing.season, SEASONS, seed.season),
    tags,
    // Pre-printed artwork: the customer is not supplying the cover photo, so
    // this is genuinely false. Only a blank template is a photo card.
    isPhotoCard: typeof existing.isPhotoCard === 'boolean' ? existing.isPhotoCard : false,
    isPopular: typeof existing.isPopular === 'boolean' ? existing.isPopular : false,
    isBestSeller: typeof existing.isBestSeller === 'boolean' ? existing.isBestSeller : false,
    isNew: typeof existing.isNew === 'boolean' ? existing.isNew : true,
    // Never fabricated — `recomputeTemplateRating` owns these. A value already
    // in the database is kept; a missing one starts at zero.
    rating: storedRating(existing.rating),
    reviewCount: storedRating(existing.reviewCount),
  };
}
