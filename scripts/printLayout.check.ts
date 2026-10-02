/**
 * The print renderer must not drift from the thing the customer approved, and the
 * paper must not drift from what was sold.
 *
 * Two independent failure modes, both silent, both expensive:
 *
 *  1. `_shared/printLayout.ts` (what gets printed) and `src/components/PrintPreview.tsx`
 *     (what the customer sees) are two renderers of the same card. If one learns to
 *     draw a new element type and the other does not, a paid customer receives a
 *     card missing something they added in the editor, and there is no error
 *     anywhere — both renderers are individually correct. This check compares the
 *     element types each one handles.
 *
 *  2. `PRINT_SIZES` (what gets printed) and `CARD_SIZES` (what is advertised and
 *     charged) are two lists of the same four sizes. A card sold as "148 x 210 mm"
 *     that prints at A6 is a refund, so the folded millimetres must match.
 *
 * It also asserts the escaping, because the pages are customer-authored and every
 * one of them ends up inside a file that is printed: a `</style>` or `"><script>` in
 * a message field must not reach the renderer.
 *
 * `npm test`
 */

import { readFileSync } from 'node:fs';
import { CARD_SIZES } from '../src/data/fonts.ts';
import { PRINT_SIZES, BLEED_MM } from '../supabase/functions/_shared/printSizes.ts';
import { renderPrintDocument, escapeHtml, type PrintablePage } from '../supabase/functions/_shared/printLayout.ts';
import { describePrinterConfig, handOffToPrinter, readPrinterConfig } from '../supabase/functions/_shared/printer.ts';
import { STICKER_CATALOG } from '../src/data/elements.ts';
import { designSnapshotFromTemplate } from '../src/utils/frontCover.ts';
import type { CardTemplate } from '../src/types/template.ts';

let failures = 0;
let sentRequest: { url: string; body: Record<string, unknown> } = { url: "", body: {} };

const ok = (label: string, condition: boolean) => {
  if (!condition) {
    failures++;
    console.error(`FAIL ${label}`);
  }
};

const eq = (label: string, actual: unknown, expected: unknown) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    failures++;
    console.error(`FAIL ${label}: expected ${e}, got ${a}`);
  }
};

const REPO = new URL('..', import.meta.url);
const read = (relative: string) => readFileSync(new URL(relative, REPO), 'utf8');

// --- 1. element coverage: print renderer vs the browser preview --------------
const preview = read('src/components/PrintPreview.tsx');
const renderer = read('supabase/functions/_shared/printLayout.ts');

/** `el.type === 'text'` style branches in the source. */
const handledTypes = (source: string): string[] => {
  const found = new Set<string>();
  for (const match of source.matchAll(/\.type === '([a-z]+)'/g)) found.add(match[1]);
  return Array.from(found).sort();
};

// `media` is included in both. The preview reaches it through a cast
// (`el as MediaElement`) and this renderer through the same discriminated union.
const previewTypes = handledTypes(preview);
const renderTypes = handledTypes(renderer);

ok(
  `the print renderer handles every element type PrintPreview does (preview: ${previewTypes.join(', ')})`,
  previewTypes.every((t) => renderTypes.includes(t))
);
ok(
  'the print renderer does not invent an element type PrintPreview cannot draw',
  renderTypes.every((t) => previewTypes.includes(t))
);

// Every sticker in the catalogue must be resolvable by id, or a customer's
// balloons print as a grey circle (see `stickerArt()` in fulfil-order).
const stickerIds = STICKER_CATALOG.map((s) => s.id);
ok('the sticker catalogue is not empty', stickerIds.length > 0);
ok(
  'every sticker has art the renderer can draw (svg or emoji)',
  STICKER_CATALOG.every((s) => Boolean(s.svg || s.emoji))
);

// --- 2. sizes: what is sold vs what is printed -------------------------------
eq(
  'the printed sizes are exactly the sizes sold',
  Object.keys(PRINT_SIZES).sort(),
  CARD_SIZES.map((s) => s.id).sort()
);

for (const size of CARD_SIZES) {
  const geometry = PRINT_SIZES[size.id as keyof typeof PRINT_SIZES];
  ok(`print geometry exists for the sold size "${size.id}"`, Boolean(geometry));
  if (!geometry) continue;

  // CARD_SIZES.dimensions is the customer-facing string, e.g. '148 x 210 mm'.
  const advertised = /(\d+)\s*x\s*(\d+)/.exec(size.dimensions);
  ok(`"${size.id}" advertises parseable dimensions`, Boolean(advertised));
  if (!advertised) continue;
  eq(
    `"${size.id}" prints at the width it sells`,
    geometry.foldedMm.width,
    Number(advertised[1])
  );
  eq(
    `"${size.id}" prints at the height it sells`,
    geometry.foldedMm.height,
    Number(advertised[2])
  );

  // A bi-fold unfolds to exactly two panels wide; a postcard does not fold.
  if (geometry.fold) {
    eq(
      `"${size.id}" unfolds to two panels`,
      geometry.unfoldedMm.width,
      geometry.foldedMm.width * 2
    );
    ok(`"${size.id}" keeps its height when unfolded`, geometry.unfoldedMm.height === geometry.foldedMm.height);
  } else {
    eq(`"${size.id}" (postcard) does not unfold`, geometry.unfoldedMm.width, geometry.foldedMm.width);
  }

  // The sheet must actually contain the card plus bleed, or the crop marks fall
  // outside the paper and the finished card is trimmed short.
  ok(
    `"${size.id}" sheet is wider than its card`,
    geometry.sheetMm.width >= geometry.unfoldedMm.width + BLEED_MM * 2 - 0.01
  );
  ok(
    `"${size.id}" sheet is taller than its card`,
    geometry.sheetMm.height >= geometry.unfoldedMm.height + BLEED_MM * 2 - 0.01
  );
}

// --- 3. escaping -----------------------------------------------------------
eq('escapeHtml escapes a tag', escapeHtml('<b>hi</b>'), '&lt;b&gt;hi&lt;/b&gt;');
eq('escapeHtml escapes a quote', escapeHtml('a"b'), 'a&quot;b');
ok('escapeHtml drops a nullish value', escapeHtml(undefined) === '');

const hostile = '<script>alert(1)</script>';
const hostilePage: PrintablePage = {
  pageType: 'front',
  backgroundColor: '#ffffff',
  elements: [
    {
      id: 'x',
      type: 'text',
      x: 50,
      y: 50,
      width: 80,
      height: 10,
      rotation: 0,
      zIndex: 1,
      text: hostile,
      fontSize: 20,
      color: '#000000',
    },
  ],
};

const blankPages = (): Record<string, PrintablePage> => ({
  front: { pageType: 'front', backgroundColor: '#fff', elements: [] },
  insideLeft: { pageType: 'inside-left', backgroundColor: '#fff', elements: [] },
  insideRight: { pageType: 'inside-right', backgroundColor: '#fff', elements: [] },
  back: { pageType: 'back', backgroundColor: '#fff', elements: [] },
});

const hostileDoc = renderPrintDocument(
  { orderNumber: 'CD-X', title: hostile, cardSize: 'standard' },
  { ...blankPages(), front: hostilePage } as never
);
ok('a script tag in the message does not reach the print file', !hostileDoc.includes(hostile));
ok('it is present, escaped', hostileDoc.includes('&lt;script&gt;'));

// A hostile ORDER NUMBER (which comes from the operator's system, but is still
// interpolated) must not be able to close the style block either.
const styleBreak = renderPrintDocument(
  { orderNumber: '</style><script>alert(2)</script>', title: 'T', cardSize: 'standard' },
  blankPages() as never
);
ok('a style break in the order number is escaped', !styleBreak.includes('<script>alert(2)'));

// A hostile colour must be dropped, not interpolated into the stylesheet.
const cssBreak = renderPrintDocument(
  { orderNumber: 'CD-Y', title: 'T', cardSize: 'standard' },
  {
    ...blankPages(),
    front: {
      pageType: 'front',
      backgroundColor: 'red;} body{display:none',
      elements: [],
    },
  } as never
);
ok('a hostile background colour is dropped', !cssBreak.includes('body{display:none'));

// A `javascript:` image source must not become an <img src>.
const jsUrl = renderPrintDocument(
  { orderNumber: 'CD-Z', title: 'T', cardSize: 'standard' },
  {
    ...blankPages(),
    front: {
      pageType: 'front',
      backgroundColor: '#fff',
      elements: [
        {
          id: 'p',
          type: 'photo',
          x: 50,
          y: 50,
          width: 50,
          height: 50,
          rotation: 0,
          zIndex: 1,
          imageUrl: 'javascript:alert(1)',
        },
      ],
    },
  } as never
);
ok('a javascript: image url is dropped', !jsUrl.includes('javascript:'));

// --- 4. the rendered document ----------------------------------------------
const doc = renderPrintDocument(
  {
    orderNumber: 'CD-1234',
    title: 'Birthday',
    cardSize: 'standard',
    finish: 'matte',
    quantity: 2,
    warning: 'No personalised design was stored for this item.',
  },
  { ...blankPages(), front: hostilePage } as never
);

// Three sheets: the job spec, the outside spread, the inside spread.
eq('the print file has a spec sheet and two spreads', (doc.match(/<section class="sheet/g) ?? []).length, 3);
ok('the spec carries the order number', doc.includes('CD-1234'));
ok('the warning is on the spec sheet', doc.includes('No personalised design was stored'));
ok('the outside is back | front (correct duplex order)', doc.includes('OUTSIDE - back | front'));
ok('the inside is left | right', doc.includes('INSIDE - left | right'));

// Physical page size must equal the sheet, or the printer scales the card.
const pageSize = /@page \{ size: ([^;]+);/.exec(doc)?.[1] ?? '';
ok(
  `the @page box is the sheet size (got "${pageSize}")`,
  pageSize === `${PRINT_SIZES.standard.sheetMm.width}mm ${PRINT_SIZES.standard.sheetMm.height}mm`
);

// A missing insideLeft must render blank, NOT copy the right-hand page — that
// would print the customer's message twice.
const noInsideLeft = renderPrintDocument(
  { orderNumber: 'CD-1', title: 'T', cardSize: 'standard' },
  {
    front: blankPages().front,
    insideRight: {
      pageType: 'inside-right',
      backgroundColor: '#fff',
      elements: [
        {
          id: 'm',
          type: 'text',
          x: 50,
          y: 50,
          width: 60,
          height: 10,
          rotation: 0,
          zIndex: 1,
          text: 'ONLY ONCE',
          fontSize: 18,
        },
      ],
    },
    back: blankPages().back,
  } as never
);
eq(
  'an absent inside-left is not duplicated from the right',
  (noInsideLeft.match(/ONLY ONCE/g) ?? []).length,
  1
);

// A postcard must not grow a fold line.
const postcard = renderPrintDocument(
  { orderNumber: 'CD-2', title: 'T', cardSize: 'postcard' },
  blankPages() as never
);
eq('a postcard has no fold line', (postcard.match(/class="fold-line"/g) ?? []).length, 0);
ok(
  'a postcard prints on its own sheet size',
  (postcard.match(/@page \{ size: ([^;]+);/)?.[1] ?? '') ===
    `${PRINT_SIZES.postcard.sheetMm.width}mm ${PRINT_SIZES.postcard.sheetMm.height}mm`
);

// Regression guard: a fused CSS declaration silently drops `position:absolute`
// and lets text escape its panel. It shipped once; assert it cannot come back.
ok('no fused CSS declaration (e.g. "border-boxposition")', !doc.includes('border-boxposition'));

// --- 5. printer handoff ----------------------------------------------------
// The happy path is NOT the default: with nothing configured the job is left for a
// human, and that must be reported honestly rather than faked as "sent".
const unconfigured = readPrinterConfig({});
ok('no printer config reads as empty', !unconfigured.url && !unconfigured.apiKey && !unconfigured.printer);
ok(
  'an unconfigured printer says so in words',
  describePrinterConfig(unconfigured).includes('print by hand')
);

const skipped = await handOffToPrinter({
  config: unconfigured,
  orderId: 'ord_1',
  fileName: 'card.pdf',
  fileBase64: 'AAA=',
  quantity: 1,
});
eq('an unconfigured handoff is skipped, not faked as sent', skipped.status, 'skipped');

// A half-configured printer is refused rather than guessed at.
const halfConfigured = readPrinterConfig({ PRINTER_API_URL: 'https://api.example.com' });
const half = await handOffToPrinter({
  config: halfConfigured,
  orderId: 'ord_1',
  fileName: 'card.pdf',
  fileBase64: 'AAA=',
  quantity: 1,
});
eq('a half-configured printer is skipped', half.status, 'skipped');
ok(
  'a half-configured printer names what is missing',
  (half.reason ?? '').includes('PRINTER_API_KEY') && (half.reason ?? '').includes('PRINTER_NAME')
);

const fullConfig = readPrinterConfig({
  PRINTER_API_URL: 'https://api.example.com/v2/',
  PRINTER_API_KEY: 'key_123',
  PRINTER_NAME: 'card-a5-matte',
});

// Captured rather than sent: this check must never make a network call.
const sent = await handOffToPrinter({
  config: fullConfig,
  orderId: 'ord_1',
  fileName: 'card.pdf',
  fileBase64: 'AAA=',
  quantity: 3,
  fetchImpl: (async (_url: string, init?: RequestInit) => {
    sentRequest = { url: String(_url), body: JSON.parse(String(init?.body ?? '{}')) };
    return new Response(JSON.stringify({ id: 'prn_999' }), { status: 200 });
  }) as unknown as typeof fetch,
});
eq('a configured handoff reports sent', sent.status, 'sent');
eq('the printer reference is kept', sent.ref, 'prn_999');
eq('the trailing slash is not doubled', sentRequest.url, 'https://api.example.com/v2/orders');
eq('the order reference is sent', sentRequest.body.reference, 'ord_1');
eq('the quantity is sent', sentRequest.body.quantity, 3);
eq('the printer product is sent', sentRequest.body.printer, 'card-a5-matte');

// A printer outage must NOT throw: the print file is already stored, so the order
// stays fulfillable by hand. It degrades, and says so.
const rejected = await handOffToPrinter({
  config: fullConfig,
  orderId: 'ord_1',
  fileName: 'card.pdf',
  fileBase64: 'AAA=',
  quantity: 1,
  fetchImpl: (async () => new Response('nope', { status: 422 })) as unknown as typeof fetch,
});
eq('a printer rejection degrades rather than throwing', rejected.status, 'skipped');
ok('a printer rejection explains itself', (rejected.reason ?? '').includes('422'));

// --- 6. the quick-add snapshot ---------------------------------------------
// `CardDetail` adds a card to the cart with no editor session, so it builds the
// snapshot itself. Without one, fulfilment has nothing to print and Account
// silently falls back to template defaults — a blank card with no message.
const template: CardTemplate = {
  id: 'tpl_test',
  title: 'Test Card',
  description: 'd',
  category: 'Birthday',
  recipients: ['Friend'],
  styles: ['Cute'],
  tone: 'Heartfelt',
  personalization: [],
  tags: [],
  price: 4.29,
  rating: 0,
  reviewCount: 0,
  isPhotoCard: false,
  thumbnail: '/t.jpg',
  previewColors: ['#fff'],
  defaultPages: {
    // A template stored before the artwork-only-front rule: it still has a
    // preview headline, and it must not reach the customer's card.
    front: {
      pageType: 'front',
      backgroundColor: '#ffffff',
      elements: [
        { id: 'f1', type: 'text', x: 50, y: 10, width: 80, height: 10, rotation: 0, zIndex: 1, text: 'HAPPY 30TH', fontSize: 30, fontFamily: 'Georgia', color: '#000000', textAlign: 'center' },
        { id: 'f2', type: 'shape', x: 50, y: 60, width: 40, height: 40, rotation: 0, zIndex: 1, shapeType: 'star', fill: '#f43f5e' },
      ],
    },
    insideRight: {
      pageType: 'inside-right',
      backgroundColor: '#ffffff',
      elements: [
        { id: 'i1', type: 'text', x: 50, y: 50, width: 70, height: 10, rotation: 0, zIndex: 1, text: 'template placeholder', fontSize: 18, fontFamily: 'Georgia', color: '#000000', textAlign: 'center' },
      ],
    },
    back: { pageType: 'back', backgroundColor: '#ffffff', elements: [] },
  },
};

const snapshot = designSnapshotFromTemplate(template);
ok('a quick-add snapshot exists', Boolean(snapshot?.pages));
ok(
  'the snapshot front has no baked-in text (artwork-only front rule)',
  snapshot.pages.front.elements.every((el) => el.type !== 'text')
);
ok(
  'the snapshot front keeps its artwork',
  snapshot.pages.front.elements.some((el) => el.type === 'shape')
);
ok(
  'the inside message survives (only the front is stripped)',
  snapshot.pages.insideRight.elements.length === 1
);
ok(
  'the snapshot is deep-copied, not a live reference into the catalog',
  snapshot.pages.front !== template.defaultPages.front
);

if (failures) {
  console.error(`print layout: FAILED (${failures} problem${failures === 1 ? '' : 's'})`);
  process.exit(1);
}

console.log(
  `print layout: ok (${previewTypes.length} element types in both renderers / ` +
    `${CARD_SIZES.length} sizes match / escaping, duplex order, printer handoff and the ` +
    `quick-add snapshot all verified)`
);
