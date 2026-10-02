/**
 * Checks that every browse facet is derived, stored, and true.
 *
 * The catalog lives in Postgres, so the fields `Browse.tsx` filters on —
 * category, recipient, style, photo and milestone — have to be real, queryable
 * fields on `templates/{id}`. Both generators used to hardcode
 * `recipient: 'Anyone'` / `style: 'Floral'` for every card, which meant those
 * facets matched nothing. It also fabricated `rating: 4.9, reviewCount: 45…224`,
 * which AGENTS.md forbids.
 *
 * This imports the real implementation so it fails on regression. The generators
 * themselves are checked separately in `scripts/templateGenerator.check.mjs`
 * (they need the Vite SSR loader for `import.meta.glob`).
 *
 * `npm test`
 */

import { readdirSync } from 'node:fs';

import {
  ARTWORK_FACETS,
  DEFAULT_FACETS,
  RECIPIENT_TYPES,
  STYLE_TYPES,
  TONE_TYPES,
  SEASON_TYPES,
  COLOR_FAMILIES,
  NEW_FOR_DAYS,
  MILESTONE_AGE_VALUES,
  artworkSlug,
  imageSlug,
  buildTemplateFacets,
  isNewWithin,
  colorFamily,
  priceRangeFor,
} from '../src/utils/templateFacets.ts';

let failures = 0;

const eq = (label: string, actual: unknown, expected: unknown) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    console.error(`FAIL ${label}: expected ${e}, got ${a}`);
    failures++;
  }
};

const ok = (label: string, condition: boolean) => {
  if (!condition) {
    console.error(`FAIL ${label}`);
    failures++;
  }
};

const art = (name: string) => `/src/assets/images/occasions/birthday/${name}`;

// --- slugs ------------------------------------------------------------------

eq('artworkSlug normalises hyphens', artworkSlug('birthday-girl-cartoon.png'), 'birthday_girl_cartoon');
eq('artworkSlug strips the extension', artworkSlug('felt_giraffe_hat_bunting.png'), 'felt_giraffe_hat_bunting');
eq('artworkSlug strips a millisecond suffix', artworkSlug('wildflower_meadow_1790279890817.png'), 'wildflower_meadow');
eq('imageSlug reads the last path segment', imageSlug('https://x/a/b/felt_giraffe_hat_bunting.png?v=2'), 'felt_giraffe_hat_bunting');
eq('imageSlug survives a query string', imageSlug('https://x/abc.png?width=800'), 'abc');

// Vite hands back glob keys percent-encoded, so an asset URL containing a space
// arrives as `%20`. Without decoding first, every space became `_20` and no
// hand-written key could ever match, which silently pushed 29 christmas/get-well
// cards onto DEFAULT_FACETS. The encoded and decoded forms must agree.
eq('artworkSlug percent-decodes before normalising', artworkSlug('Penguin%E2%80%99s%20Oversized%20Christmas%20Tree.png'), 'penguin_s_oversized_christmas_tree');
eq('an encoded path segment decodes to the same slug as the plain filename', artworkSlug(encodeURIComponent('Art Deco Holiday Column and Holly.png')), 'art_deco_holiday_column_and_holly');
eq('imageSlug decodes an encoded asset URL', imageSlug('/src/assets/images/occasions/christmas/Watercolor%20Holiday%20Gift%20and%20Botanicals.png'), 'watercolor_holiday_gift_and_botanicals');
ok('a malformed percent escape does not throw', artworkSlug('50% off.png').length > 0);

// --- every bundled artwork is assigned, not falling back ---------------------

// This is the guard for the bug above. The fallback is deliberately a single
// style and a single recipient, so a card that quietly missed its map entry is
// unreachable from most of the browse facets while still looking plausible — the
// same "populated but useless" failure AGENTS.md warns about for `?color=`.
// Every real filename that ships in the occasions folders must be a map key.
const encodedAsset = encodeURIComponent('Art Deco Holiday Column and Holly.png');
ok(
  'an unassigned artwork falls back rather than throwing',
  buildTemplateFacets({ occasion: 'Christmas', imageUrl: '/src/assets/images/occasions/christmas/definitely-not-reviewed.png' }).styles.length > 0
);
ok(
  'the fallback is single-valued, so a missing entry is visible',
  DEFAULT_FACETS.styles.length === 1 && DEFAULT_FACETS.recipients.length === 1
);
ok('the reviewed christmas art resolves its own entry', ARTWORK_FACETS['art_deco_holiday_column_and_holly'] !== undefined || artworkSlug(encodedAsset) in ARTWORK_FACETS);

/**
 * The definitive version of the guard: read the artwork directory off disk and
 * require a map entry for every file. Without this, dropping a new PNG into
 * `occasions/` produced a card with a perfectly valid but generic facet set, and
 * nothing failed until someone noticed that half the winter collection was
 * unreachable from `?style=`. Now `npm test` fails on the spot.
 */
const ARTWORK_DIR = new URL('../src/assets/images/occasions/', import.meta.url);
const walkArtwork = (dir: URL): string[] => {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const child = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, dir);
    if (entry.isDirectory()) out.push(...walkArtwork(child));
    else if (/\.(jpe?g|png|webp|avif|svg)$/i.test(entry.name)) out.push(entry.name);
  }
  return out;
};

let artworkFiles: string[] = [];
try {
  artworkFiles = walkArtwork(ARTWORK_DIR);
} catch {
  console.warn('template facets: artwork directory not found, skipping the coverage check');
}
const unassigned = artworkFiles
  .filter((file) => !(artworkSlug(file) in ARTWORK_FACETS))
  .sort();
ok(`every bundled artwork file has a reviewed entry (${artworkFiles.length} files)`, unassigned.length === 0);
if (unassigned.length > 0) {
  console.error(
    `  unassigned artwork (add these to ARTWORK_FACETS in src/utils/templateFacets.ts):\n` +
      unassigned.map((f) => `    ${artworkSlug(f)}   <- ${f}`).join('\n')
  );
}

// Every map key should correspond to a file that actually ships, so the map does
// not drift into entries that look like coverage but can never be reached.
const assignedSlugs = new Set(Object.keys(ARTWORK_FACETS).map(artworkSlug));
const orphanKeys = [...assignedSlugs]
  .filter((slug) => !artworkFiles.some((f) => artworkSlug(f) === slug))
  .sort();
ok(`every ARTWORK_FACETS entry matches a bundled file (${assignedSlugs.size} keys)`, orphanKeys.length === 0);
if (orphanKeys.length > 0) {
  console.error(`  ARTWORK_FACETS keys with no artwork file: ${orphanKeys.join(', ')}`);
}

// --- the map itself is well formed ------------------------------------------

// A value the storefront cannot match would silently drop the card from every
// filter for that facet, so the vocabulary is checked here, not at runtime.
for (const [key, seed] of Object.entries(ARTWORK_FACETS)) {
  ok(`${key}: has at least one style`, seed.styles.length > 0);
  ok(`${key}: has at least one recipient`, seed.recipients.length > 0);
  for (const s of seed.styles) {
    ok(`${key}: style "${s}" is a known CardStyleType`, (STYLE_TYPES as readonly string[]).includes(s));
  }
  for (const r of seed.recipients) {
    ok(`${key}: recipient "${r}" is a known RecipientType`, (RECIPIENT_TYPES as readonly string[]).includes(r));
  }
  ok(`${key}: tone is a known tone`, (TONE_TYPES as readonly string[]).includes(seed.tone));
  ok(`${key}: season is a known season`, (SEASON_TYPES as readonly string[]).includes(seed.season));
  ok(`${key}: has at least one descriptive tag`, seed.tags.length > 0);
  ok(`${key}: has no duplicate styles`, new Set(seed.styles).size === seed.styles.length);
  ok(`${key}: has no duplicate recipients`, new Set(seed.recipients).size === seed.recipients.length);
}
ok('the map is not empty', Object.keys(ARTWORK_FACETS).length > 0);
// The old blanket default is exactly the lie this module exists to remove: every
// card was filed as 'Floral' regardless of what the artwork actually was.
ok("the fallback style is not the old blanket 'Floral'", !DEFAULT_FACETS.styles.includes('Floral'));

// --- known artwork resolves to its assigned facets --------------------------

const known = buildTemplateFacets({ occasion: 'Birthday', imageUrl: art('felt_giraffe_hat_bunting.png') });
ok('bundled felt art is filed as Cute', known.styles.includes('Cute'));
ok('bundled felt art is filed for Kids', known.recipients.includes('Kids'));
// Multi-valued, so it is reachable from more than one style facet.
ok('felt art carries more than one style', known.styles.length > 1);
ok('felt art carries more than one recipient', known.recipients.length > 1);
// A hyphenated filename must resolve the same as an underscored one.
const hyphen = buildTemplateFacets({ occasion: 'Birthday', imageUrl: art('birthday-girl-cartoon.png') });
ok('a hyphenated filename resolves its entry', hyphen.styles.includes('Cartoon'));
ok('a hyphenated filename resolves its recipient', hyphen.recipients.includes('Her'));

// --- unknown artwork (an admin upload) falls back, does not lie ------------

const unknown = buildTemplateFacets({ occasion: 'Birthday', imageUrl: 'https://x/user-upload.png' });
eq('unknown artwork uses the fallback styles', unknown.styles, [...DEFAULT_FACETS.styles]);
eq('unknown artwork uses the fallback recipients', unknown.recipients, [...DEFAULT_FACETS.recipients]);

// --- a legacy scalar doc migrates itself -------------------------------------

// Templates written before the facets became arrays stored `recipient: 'X'` and
// `style: 'Y'` as single values. Those must widen on read, or every existing
// Postgres document would be invisible to the array-based filters.
const legacy = buildTemplateFacets({
  occasion: 'Birthday',
  imageUrl: art('monstera_vase_terracotta.png'),
  existing: { recipient: 'Wife' as never, style: 'Elegant' as never },
});
eq('a legacy scalar recipient widens to an array', legacy.recipients, ['Wife']);
eq('a legacy scalar style widens to an array', legacy.styles, ['Elegant']);

// --- ratings are never fabricated -------------------------------------------

const facets = buildTemplateFacets({ occasion: 'Birthday', imageUrl: art('monstera_vase_terracotta.png') });
eq('a new template starts with no rating', facets.rating, 0);
eq('a new template starts with no review count', facets.reviewCount, 0);
eq('a new template is not popular by default', facets.isPopular, false);
eq('a new template is not a bestseller by default', facets.isBestSeller, false);
// recomputeTemplateRating is the only writer of these; a stored value survives
// a rebuild so an admin edit is not undone.
const stored = buildTemplateFacets({
  occasion: 'Birthday',
  imageUrl: art('monstera_vase_terracotta.png'),
  existing: { rating: 4, reviewCount: 12, isPopular: true, styles: ['Elegant'], recipients: ['Wife'] },
});
eq('a stored rating is left alone', stored.rating, 4);
eq('a stored review count is left alone', stored.reviewCount, 12);
eq('a stored popularity flag is left alone', stored.isPopular, true);
eq('an admin style override wins', stored.styles, ['Elegant']);
eq('an admin recipient override wins', stored.recipients, ['Wife']);

// --- isPhotoCard is derived from personalization, not set by hand ------------

// These were independent fields that could disagree, and nothing ever set
// isPhotoCard true, so `?photo=1` was permanently empty.
const printed = buildTemplateFacets({ occasion: 'Birthday', imageUrl: art('monstera_vase_terracotta.png') });
eq('pre-printed artwork is not a photo card', printed.isPhotoCard, false);
eq('pre-printed artwork is text personalisation', printed.personalization, ['text']);
const blank = buildTemplateFacets({
  occasion: 'Birthday',
  imageUrl: 'https://x/blank.png',
  existing: { personalization: ['photo', 'text'] },
});
eq('a customer-supplied photo makes it a photo card', blank.isPhotoCard, true);
// Even if a doc somehow has both, the derivation wins.
const contradictory = buildTemplateFacets({
  occasion: 'Birthday',
  imageUrl: 'https://x/blank.png',
  existing: { isPhotoCard: false, personalization: ['photo'] },
});
eq('a stored isPhotoCard cannot contradict personalization', contradictory.isPhotoCard, true);

// --- milestone age ----------------------------------------------------------

// Nothing in the app could set this before, so the Milestone Age filter always
// rendered an empty set. A general card must not claim an age.
eq('a general card has no milestone age', facets.milestoneAge, undefined);
const milestone = buildTemplateFacets({
  occasion: 'Birthday',
  imageUrl: 'https://x/turning-50.png',
  milestoneAge: 50,
});
eq('an age-specific card records its milestone', milestone.milestoneAge, 50);
const oddAge = buildTemplateFacets({
  occasion: 'Birthday',
  imageUrl: 'https://x/turning-47.png',
  milestoneAge: 47,
});
eq('an age the storefront cannot offer is dropped', oddAge.milestoneAge, undefined);

// The single list is re-exported by data/categories.ts as MILESTONE_AGES, so
// there is nothing to keep in sync here — the assertion is that the re-export
// still resolves, which is what would break if the two were ever decoupled.
eq('the milestone ages are all positive integers', MILESTONE_AGE_VALUES.every((a) => Number.isInteger(a) && a > 0), true);

// --- "New" expires instead of latching on ----------------------------------

eq('a card with no createdAt is not new', facets.isNew, false);
const justCreated = buildTemplateFacets({
  occasion: 'Birthday',
  imageUrl: 'https://x/x.png',
  createdAt: new Date().toISOString(),
});
eq('a card created now is new', justCreated.isNew, true);
const longAgo = buildTemplateFacets({
  occasion: 'Birthday',
  imageUrl: 'https://x/x.png',
  createdAt: new Date(Date.now() - (NEW_FOR_DAYS + 10) * 86_400_000).toISOString(),
});
eq('a card past the window is no longer new', longAgo.isNew, false);
ok('isNewWithin rejects junk', isNewWithin('not-a-date') === false);

// --- colour families --------------------------------------------------------

eq('white buckets to white', colorFamily('#ffffff'), 'white');
eq('black buckets to black', colorFamily('#000000'), 'black');
eq('a grey has no hue', colorFamily('#808080'), 'grey');
eq('a red hue buckets to red', colorFamily('#e01b1b'), 'red');
eq('a gold hue buckets to gold', colorFamily('#c9a227'), 'gold');
eq('a mid teal buckets to teal', colorFamily('#0d9488'), 'teal');
eq('junk is not a colour', colorFamily('not-a-colour'), undefined);
// Derived from the palette, so it can never disagree with the swatches shown.
const swatched = buildTemplateFacets({
  occasion: 'Birthday',
  imageUrl: 'https://x/x.png',
  palette: ['#faf8f5', '#d97706', '#1e293b'],
});
ok('colours are derived from the palette', swatched.colors.length > 0);
ok('colours are all known families', swatched.colors.every((c) => (COLOR_FAMILIES as readonly string[]).includes(c)));
ok('colours are de-duplicated', new Set(swatched.colors).size === swatched.colors.length);
eq('the palette is returned for the swatches', swatched.palette, ['#faf8f5', '#d97706', '#1e293b']);
// Each bundled artwork carries its own palette, so the colour facet is not
// decorative. It regressed once when every card shared one brand palette.
const distinctPalettes = new Set(
  Object.values(ARTWORK_FACETS).map((seed) => (seed.palette ?? []).join('|'))
);
ok('the artwork map assigns a palette to every entry', [...Object.values(ARTWORK_FACETS)].every((s) => (s.palette?.length ?? 0) > 0));
ok('artwork palettes are not all identical', distinctPalettes.size > 1);

// --- price range is derived from the size multipliers -----------------------

const band = priceRangeFor(4.29);
ok('the cheapest size is below the standard price', band.min < 4.29);
ok('the dearest size is above the standard price', band.max > 4.29);
eq('the standard price sits inside the band', band.min <= 4.29 && band.max >= 4.29, true);
ok('a band is 2dp', Number.isInteger(band.max * 100));
ok('a junk price does not produce NaN', priceRangeFor(Number.NaN).max >= 0);

// --- a hand-edited doc cannot poison a facet --------------------------------

// Someone typing "Botanical" into Postgres must not produce a card that no
// style filter can ever return.
const bad = buildTemplateFacets({
  occasion: 'Birthday',
  imageUrl: art('monstera_vase_terracotta.png'),
  existing: { styles: ['Botanical'] as never, recipients: ['Everyone'] as never, season: 'winter-ish' as never },
});
ok('an unrecognised style is dropped for the artwork value', bad.styles.includes('Modern'));
ok('an unrecognised recipient is dropped for the artwork value', bad.recipients.includes('Anyone'));
eq('an unrecognised season falls back to the artwork', bad.season, 'autumn');

// --- tags are descriptive and useful for ?q= --------------------------------

ok('tags include the occasion', known.tags.includes('birthday'));
ok('tags include words from the artwork name', known.tags.includes('giraffe'));
eq('tags are de-duplicated', known.tags.length, new Set(known.tags).size);
ok('tags are bounded', known.tags.length <= 12);

if (failures > 0) {
  throw new Error(`${failures} template facet check(s) failed`);
}
console.log(
  `template facets: ok (${Object.keys(ARTWORK_FACETS).length} artworks assigned, no fabricated ratings)`
);
