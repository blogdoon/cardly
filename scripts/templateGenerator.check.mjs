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

if (failures > 0) {
  throw new Error(`${failures} template generator check(s) failed`);
}
console.log(`template generator: ok (${fromBundle.length} bundled templates checked)`);
