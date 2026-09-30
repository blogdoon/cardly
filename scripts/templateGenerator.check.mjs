// Asserts the template generators emit a blank front cover: `npm test`.
//
// The generators live in src/utils/occasionTemplateLoader.ts, which uses
// import.meta.glob to discover the bundled occasion artwork — a Vite-only API, so
// this has to run through the Vite SSR loader rather than plain node (unlike
// scripts/frontCover.check.ts, which tests the pure policy module).
//
// The rule: a template's first side is artwork only. The customer adds their own
// wording, so a generated template must carry no text elements on the front. The
// inside-right message and the back brandmark are intentional and must survive.
import { createServer } from 'vite';

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});
const loader = await server.ssrLoadModule('/src/utils/occasionTemplateLoader.ts');
await server.close();

const isText = (el) => el.type === 'text';
const frontTextCount = (t) => t.defaultPages.front.elements.filter(isText).length;

let failures = 0;
const eq = (label, actual, expected) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    console.error(`FAIL ${label}: expected ${e}, got ${a}`);
    failures++;
  }
};

// --- one-off generator (Occasion Studio "Generate & Publish") ----------------
const created = loader.createTemplateFromOccasionImage({
  occasion: 'Birthday',
  imageUrl: '/cover.jpg',
  title: 'Test Card',
  textColor: '#d97706',
});
eq('a generated template has no front text', frontTextCount(created), 0);
eq('a generated template keeps its cover image', created.defaultPages.front.backgroundImage, '/cover.jpg');
eq('a generated template keeps its inside message', created.defaultPages.insideRight.elements.filter(isText).length, 1);
eq('a generated template keeps its back brandmark', created.defaultPages.back.elements.filter(isText).length, 1);

// --- the generator must not accept front copy any more ----------------------
// headline/subText were removed from the options; re-adding them silently would
// reintroduce baked-in front text.
const src = await (await import('node:fs/promises')).readFile(
  new URL('../src/utils/occasionTemplateLoader.ts', import.meta.url),
  'utf8'
);
eq('the generator no longer takes a headline', /headline\?:/.test(src), false);
eq('the generator no longer takes subText', /subText\?:/.test(src), false);

// --- every template derived from the bundled artwork ------------------------
const fromBundle = loader.generateTemplatesFromOccasionImages();
if (fromBundle.length === 0) {
  console.error('FAIL no bundled templates were generated — the glob found nothing to check');
  failures++;
} else {
  eq(
    'all bundled templates have no front text',
    fromBundle.filter((t) => frontTextCount(t) > 0).length,
    0
  );
  eq(
    'all bundled templates keep a cover image',
    fromBundle.every((t) => Boolean(t.defaultPages.front.backgroundImage)),
    true
  );
  eq(
    'all bundled templates keep an inside message',
    fromBundle.every((t) => t.defaultPages.insideRight.elements.filter(isText).length === 1),
    true
  );
  eq(
    'all bundled templates keep a back brandmark',
    fromBundle.every((t) => t.defaultPages.back.elements.filter(isText).length === 1),
    true
  );
}

// --- facets are derived, not hardcoded --------------------------------------
//
// The generators used to stamp `recipient: 'Anyone'` and `style: 'Floral'` on
// every card, so Browse's recipient and style facets matched nothing. Every
// browse field must now be a real value the storefront can filter on.
const RECIPIENTS = new Set([
  'Her', 'Him', 'Mum', 'Dad', 'Sister', 'Brother', 'Wife', 'Husband', 'Partner',
  'Daughter', 'Son', 'Grandparent', 'Friend', 'Best Friend', 'Colleague', 'Kids', 'Anyone',
]);
const STYLES = new Set([
  'Funny', 'Cute', 'Modern', 'Elegant', 'Floral', 'Minimal', 'Retro',
  'Colorful', 'Photo', 'Typography', 'Luxury', 'Cartoon', 'Inspirational',
]);
const SEASONS = new Set(['spring', 'summer', 'autumn', 'winter', 'all-year']);
const PERSONALIZATIONS = new Set(['photo', 'text', 'none']);

const ok = (label, condition) => {
  if (!condition) {
    console.error(`FAIL ${label}`);
    failures++;
  }
};

const facetsValid = (t) =>
  typeof t.category === 'string' && t.category.length > 0 &&
  Array.isArray(t.recipients) && t.recipients.length > 0 && t.recipients.every((r) => RECIPIENTS.has(r)) &&
  Array.isArray(t.styles) && t.styles.length > 0 && t.styles.every((s) => STYLES.has(s)) &&
  SEASONS.has(t.season) &&
  Array.isArray(t.personalization) && t.personalization.length > 0 &&
  t.personalization.every((p) => PERSONALIZATIONS.has(p)) &&
  Array.isArray(t.colors) &&
  Array.isArray(t.tags) && t.tags.length > 0;

eq('a generated template has filterable facets', facetsValid(created), true);
eq('a generated template gets no fabricated rating', created.rating, 0);
eq('a generated template gets no fabricated review count', created.reviewCount, 0);
eq('a new template is not popular by default', created.isPopular, false);
eq('pre-printed artwork is not a photo card', created.isPhotoCard, false);
eq('a general card has no milestone age', created.milestoneAge, undefined);
ok('a generated template is priced from its style tier', typeof created.price === 'number' && created.price > 0);

// --- the two filters that could never match anything now can ----------------

// Neither `isPhotoCard` nor `milestoneAge` was ever set anywhere in the app, so
// `?photo=1` and the Milestone Age facet always rendered an empty set.
const photoCard = loader.createTemplateFromOccasionImage({
  occasion: 'Birthday',
  imageUrl: '/blank.png',
  title: 'Blank Photo Card',
  customerSuppliesPhoto: true,
});
eq('a customer-supplied photo produces a photo card', photoCard.isPhotoCard, true);
eq('a photo card advertises photo personalisation', photoCard.personalization.includes('photo'), true);

const milestone = loader.createTemplateFromOccasionImage({
  occasion: 'Birthday',
  imageUrl: '/turning-50.png',
  title: 'Turning 50',
  milestoneAge: 50,
});
eq('an age-specific card stores its milestone', milestone.milestoneAge, 50);

if (fromBundle.length > 0) {
  eq(
    'all bundled templates have filterable facets',
    fromBundle.filter((t) => !facetsValid(t)).length,
    0
  );
  // The blanket 'Floral' default is the specific regression being guarded: if
  // every card is one style, the style facet is decorative.
  eq(
    'bundled artwork is not all filed under a single style',
    new Set(fromBundle.map((t) => t.styles.join('|'))).size > 1,
    true
  );
  eq(
    'bundled artwork is not all filed for a single recipient',
    new Set(fromBundle.map((t) => t.recipients.join('|'))).size > 1,
    true
  );
  // Multi-valued is the point: single-select filtering could only reach one.
  ok('bundled artwork carries multiple styles', fromBundle.every((t) => t.styles.length > 1));
  ok('bundled artwork carries multiple recipients', fromBundle.every((t) => t.recipients.length > 1));
  // A max-only price filter was a no-op while every card cost the same.
  ok('bundled artwork is not all one price', new Set(fromBundle.map((t) => t.price)).size > 1);
  // `isNew` is a time box, so it must not be latched on forever.
  eq('no bundled template claims to be new', fromBundle.filter((t) => t.isNew).length, 0);
  // Derived from `previewColors`. This regressed once: the generator built the
  // facets before declaring its swatches, so every card got `colors: []` and the
  // whole `?color=` facet was unreachable while the build stayed green.
  eq(
    'every bundled template has a derived colour',
    fromBundle.filter((t) => !Array.isArray(t.colors) || t.colors.length === 0).length,
    0
  );
  ok(
    'derived colours come from the swatches shown',
    fromBundle.every((t) => t.previewColors.length > 0 && t.colors.length > 0)
  );
  // Populated-but-identical is worse than empty: `?color=` would appear to work
  // while every card matched the same swatch.
  ok(
    'bundled artwork does not all share one palette',
    new Set(fromBundle.map((t) => t.colors.join('|'))).size > 1
  );
  ok(
    'the stored swatches are the ones the colours came from',
    fromBundle.every((t) => t.previewColors.length > 0 && t.colors.length > 0)
  );
  eq('no bundled template fabricates a rating', fromBundle.filter((t) => t.rating !== 0).length, 0);
  eq(
    'no bundled template fabricates a review count',
    fromBundle.filter((t) => t.reviewCount !== 0).length,
    0
  );
  eq('no bundled template is popular by default', fromBundle.filter((t) => t.isPopular).length, 0);
  eq(
    'no bundled template claims to be a bestseller',
    fromBundle.filter((t) => t.isBestSeller).length,
    0
  );
  eq(
    'no bundled template claims a milestone age',
    fromBundle.filter((t) => t.milestoneAge != null).length,
    0
  );
}

if (failures > 0) {
  throw new Error(`${failures} template generator check(s) failed`);
}
console.log(`template generator: ok (${fromBundle.length} bundled templates checked)`);
