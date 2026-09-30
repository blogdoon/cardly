/**
 * Checks that every browse facet is derived, stored, and true.
 *
 * The catalog lives in Firestore, so the fields `Browse.tsx` filters on —
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

import {
  ARTWORK_FACETS,
  DEFAULT_FACETS,
  RECIPIENT_TYPES,
  STYLE_TYPES,
  TONE_TYPES,
  SEASON_TYPES,
  artworkSlug,
  imageSlug,
  buildTemplateFacets,
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

// --- the map itself is well formed ------------------------------------------

// A value the storefront cannot match would silently drop the card from every
// filter for that facet, so the vocabulary is checked here, not at runtime.
for (const [key, seed] of Object.entries(ARTWORK_FACETS)) {
  ok(`${key}: style is a known CardStyleType`, (STYLE_TYPES as readonly string[]).includes(seed.style));
  ok(`${key}: recipient is a known RecipientType`, (RECIPIENT_TYPES as readonly string[]).includes(seed.recipient));
  ok(`${key}: tone is a known tone`, (TONE_TYPES as readonly string[]).includes(seed.tone));
  ok(`${key}: season is a known season`, (SEASON_TYPES as readonly string[]).includes(seed.season));
  ok(`${key}: has at least one descriptive tag`, seed.tags.length > 0);
}
ok('the map is not empty', Object.keys(ARTWORK_FACETS).length > 0);
// The old blanket default is exactly the lie this module exists to remove: every
// card was filed as 'Floral' regardless of what the artwork actually was.
ok("the fallback style is not the old blanket 'Floral'", DEFAULT_FACETS.style !== 'Floral');

// --- known artwork resolves to its assigned facets --------------------------

const known = buildTemplateFacets({ occasion: 'Birthday', imageUrl: art('felt_giraffe_hat_bunting.png') });
eq('bundled felt art is filed as Cute', known.style, 'Cute');
eq('bundled felt art is filed for Kids', known.recipient, 'Kids');
// A hyphenated filename must resolve the same as an underscored one.
const hyphen = buildTemplateFacets({ occasion: 'Birthday', imageUrl: art('birthday-girl-cartoon.png') });
eq('a hyphenated filename resolves its entry', hyphen.style, 'Cartoon');
eq('a hyphenated filename resolves its recipient', hyphen.recipient, 'Her');

// --- unknown artwork (an admin upload) falls back, does not lie ------------

const unknown = buildTemplateFacets({ occasion: 'Birthday', imageUrl: 'https://x/user-upload.png' });
eq('unknown artwork uses the fallback style', unknown.style, DEFAULT_FACETS.style);
eq('unknown artwork uses the fallback recipient', unknown.recipient, DEFAULT_FACETS.recipient);

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
  existing: { rating: 4, reviewCount: 12, isPopular: true, style: 'Elegant', recipient: 'Wife' },
});
eq('a stored rating is left alone', stored.rating, 4);
eq('a stored review count is left alone', stored.reviewCount, 12);
eq('a stored popularity flag is left alone', stored.isPopular, true);
eq('an admin style override wins', stored.style, 'Elegant');
eq('an admin recipient override wins', stored.recipient, 'Wife');

// --- a hand-edited doc cannot poison a facet --------------------------------

// Someone typing "Botanical" into Firestore must not produce a card that no
// style filter can ever return.
const bad = buildTemplateFacets({
  occasion: 'Birthday',
  imageUrl: art('monstera_vase_terracotta.png'),
  existing: { style: 'Botanical' as never, recipient: 'Everyone' as never, season: 'winter-ish' as never },
});
eq('an unrecognised style falls back to the artwork', bad.style, 'Minimal');
eq('an unrecognised recipient falls back to the artwork', bad.recipient, 'Anyone');
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
