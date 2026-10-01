/**
 * Checks the front-cover text policy: a template's first side is artwork only.
 *
 * The customer adds their own wording, so a template that ships with a baked-in
 * headline is a bug — and templates live in Postgres, so this has to hold for
 * data this repo does not contain. The policy is enforced at load time by
 * `editablePagesFrom` / `stripFrontText`, and templates are generated without
 * front text in the first place.
 *
 * This imports the real implementation rather than restating it, so it fails if
 * the behaviour regresses. `npm test`
 */

import {
  stripFrontText,
  withBlankFront,
  frontHasText,
  editablePagesFrom,
} from '../src/utils/frontCover.ts';
import type { CardTemplate, CardElement, CardPageDefinition } from '../src/types/template.ts';

let failures = 0;

const eq = (label: string, actual: unknown, expected: unknown) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    console.error(`FAIL ${label}: expected ${e}, got ${a}`);
    failures++;
  }
};

const isText = (el: CardElement) => el.type === 'text';

const text = (id: string, value: string): CardElement => ({
  id,
  type: 'text',
  x: 32,
  y: 40,
  width: 44,
  height: 20,
  rotation: 0,
  zIndex: 1,
  text: value,
  fontFamily: 'Georgia',
  fontSize: 20,
  color: '#111',
  textAlign: 'left',
});

const photo = (id: string): CardElement => ({
  id,
  type: 'photo',
  x: 10,
  y: 10,
  width: 80,
  height: 60,
  rotation: 0,
  zIndex: 0,
  imageUrl: '/x.jpg',
});

const sticker = (id: string): CardElement => ({
  id,
  type: 'sticker',
  x: 60,
  y: 70,
  width: 20,
  height: 20,
  rotation: 0,
  zIndex: 2,
  stickerId: 'heart',
});

// A template that still carries baked-in front copy, like the ones already in Postgres.
const legacyFront: CardPageDefinition = {
  pageType: 'front',
  backgroundColor: '#faf8f5',
  backgroundImage: '/cover.jpg',
  elements: [text('headline-1', 'Happiest of Birthdays'), text('subtext-1', 'Wishing you joy'), photo('bg'), sticker('s')],
};

// --- stripping removes text, keeps everything else --------------------------
const stripped = stripFrontText(legacyFront);
eq('no text elements survive on the front', stripped.elements.filter(isText).length, 0);
eq('non-text elements survive in order', stripped.elements.map((e) => e.id), ['bg', 's']);
eq('page background is preserved', stripped.backgroundColor, '#faf8f5');
eq('page background image is preserved', stripped.backgroundImage, '/cover.jpg');
eq('page type is preserved', stripped.pageType, 'front');

// --- idempotent: stripping twice changes nothing ----------------------------
eq('stripping is idempotent', stripFrontText(stripped).elements, stripped.elements);

// --- it must not mutate the source ------------------------------------------
const before = JSON.stringify(legacyFront);
stripFrontText(legacyFront);
eq('the source page is not mutated', JSON.stringify(legacyFront), before);

// --- a front that is already blank is left alone ----------------------------
const blank: CardPageDefinition = {
  pageType: 'front',
  backgroundColor: '#fff',
  elements: [photo('only')],
};
eq('an already-blank front is unchanged', stripFrontText(blank).elements.map((e) => e.id), ['only']);

// --- an entirely empty front is handled -------------------------------------
const empty: CardPageDefinition = { pageType: 'front', backgroundColor: '#fff', elements: [] };
eq('an empty front stays empty', stripFrontText(empty).elements, []);

// --- only the front is affected ---------------------------------------------
// stripFrontText is deliberately generic (it strips whatever page it is given);
// the POLICY is that it is only ever applied to the front, which is enforced by
// editablePagesFrom. The inside message and the back brandmark must survive that
// path: the first is where the customer writes, the second is the studio's mark.
const insideRight: CardPageDefinition = {
  pageType: 'inside-right',
  backgroundColor: '#fff',
  elements: [text('msg', 'Dear Sophie')],
};
const back: CardPageDefinition = {
  pageType: 'back',
  backgroundColor: '#fff',
  elements: [text('brand', 'cardly.')],
};
// Used as a guard: if someone ever changes editablePagesFrom to strip every page,
// these two assertions below are what catch it.
const untouched = {
  id: 'card-002',
  defaultPages: { front: legacyFront, insideRight, back },
} as unknown as CardTemplate;
const kept = editablePagesFrom(untouched);
eq('the policy leaves inside-right alone', kept.insideRight.elements.length, 1);
eq('the policy leaves the back brandmark alone', kept.back.elements.length, 1);

// --- frontHasText / withBlankFront ------------------------------------------
const template = {
  id: 'card-001',
  defaultPages: { front: legacyFront, insideRight, back },
} as unknown as CardTemplate;

eq('frontHasText detects baked-in copy', frontHasText(template), true);
eq('withBlankFront clears it', frontHasText(withBlankFront(template)), false);
eq('withBlankFront leaves the inside alone', withBlankFront(template).defaultPages.insideRight.elements.length, 1);
eq('withBlankFront does not mutate the original', frontHasText(template), true);

// --- editablePagesFrom -------------------------------------------------------
const pages = editablePagesFrom(template);
eq('editable front is blank', pages.front.elements.filter(isText).length, 0);
eq('editable inside-right keeps the message', pages.insideRight.elements[0].text, 'Dear Sophie');
eq('a missing inside-left is defaulted', pages.insideLeft.pageType, 'inside-left');
eq('editable pages do not alias the template', pages.back === template.defaultPages.back, false);

// --- generated templates must already be blank ------------------------------
// The generators emit an empty front, so nothing needs stripping at load time.
// They live in occasionTemplateLoader, which uses import.meta.glob (Vite-only), so
// the generated output is asserted by scripts/templateGenerator.check.mjs instead.

if (failures > 0) {
  throw new Error(`${failures} front cover check(s) failed`);
}
console.log('front cover: ok');
