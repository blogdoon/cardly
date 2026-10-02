/**
 * Guards the legal copy against shipping unfilled placeholders.
 *
 * `src/data/legal.json` is drafted with `[BRACKETED]` values for the facts only
 * the business owner knows: the registered address, company number, VAT/EORI
 * number and the privacy contact. Those are deliberately NOT invented here — a
 * plausible-looking company number on a published policy is worse than an
 * obvious placeholder, because nobody would think to go and fix it.
 *
 * This check therefore does two separate things:
 *
 *   * `npm test` (this file) only *reports* the unfilled fields and never fails
 *     on them. A placeholder is a launch task, not a code defect, and failing
 *     every developer's build over it would just train people to ignore it.
 *   * `node scripts/legal.check.ts --strict` **fails**, and that is what the
 *     production release checklist runs once the real values are in.
 *
 * It also asserts the structural things that must stay true regardless of the
 * copy: both documents exist, every section has a heading and body, and the
 * entity block is present. The prerenderer emits this same copy into the static
 * HTML that crawlers index, so a malformed document is an SEO problem too.
 *
 * `npm test`   /   `node scripts/legal.check.ts --strict`
 */

import fs from 'node:fs';

// Read from disk rather than importing the JSON: the prerenderer and the app read
// this same file, so the check must see the bytes that actually ship. (A bare
// `import data from './legal.json'` also needs an import attribute under node.)
const data = JSON.parse(
  fs.readFileSync(new URL('../src/data/legal.json', import.meta.url), 'utf8')
) as {
  lastUpdated: string;
  entity: {
    name: string;
    address: string;
    companyNumber: string;
    vatNumber: string;
    privacyEmail: string;
    regulator: string;
  };
  docs: Record<
    string,
    { title: string; description: string; intro: string; sections: { heading: string; body: string[] }[] }
  >;
};

const STRICT = process.argv.includes('--strict');

let failures = 0;

const ok = (label: string, condition: boolean) => {
  if (!condition) {
    console.error(`FAIL ${label}`);
    failures++;
  }
};

// --- structure -----------------------------------------------------------------

const docs = data.docs as Record<
  string,
  { title: string; description: string; intro: string; sections: { heading: string; body: string[] }[] }
>;

for (const route of ['privacy', 'terms'] as const) {
  const doc = docs[route];
  ok(`${route}: the document exists`, Boolean(doc));
  if (!doc) continue;
  ok(`${route}: has a title`, typeof doc.title === 'string' && doc.title.length > 0);
  ok(`${route}: has a description`, typeof doc.description === 'string' && doc.description.length > 0);
  ok(`${route}: has an intro`, typeof doc.intro === 'string' && doc.intro.length > 0);
  ok(`${route}: has at least one section`, Array.isArray(doc.sections) && doc.sections.length > 0);
  for (const section of doc.sections ?? []) {
    ok(`${route}: every section has a heading`, Boolean(section.heading));
    ok(`${route}: every section has body copy`, Array.isArray(section.body) && section.body.length > 0);
  }
}

ok('the entity block is present', Boolean(data.entity?.name));
ok('a last-updated date is recorded', typeof data.lastUpdated === 'string' && data.lastUpdated.length > 0);

// --- unfilled placeholders -----------------------------------------------------

/** Every `[...]` span in the document. */
const PLACEHOLDER = /\[([^\]\n]{2,80})\]/g;

const collect = (): string[] => {
  const found = new Set<string>();
  const walk = (node: unknown) => {
    if (typeof node === 'string') {
      for (const m of node.matchAll(PLACEHOLDER)) found.add(m[1]);
    } else if (Array.isArray(node)) {
      node.forEach(walk);
    } else if (node && typeof node === 'object') {
      Object.values(node).forEach(walk);
    }
  };
  walk(data);
  return [...found].sort();
};

const unfilled = collect();

if (unfilled.length > 0) {
  console.warn(
    `\nlegal copy: ${unfilled.length} placeholder(s) still unfilled in src/data/legal.json — ` +
      'these MUST be replaced before taking money:\n' +
      unfilled.map((p) => `    - [${p}]`).join('\n') +
      '\n  Run `node scripts/legal.check.ts --strict` to make this a hard failure (used by the\n' +
      '  release checklist). Both documents also need review by a lawyer for the EU/UK\n' +
      '  jurisdiction Cardly sells in — this check only proves the copy is not a template.\n'
  );
  if (STRICT) {
    console.error('FAIL legal copy still contains unfilled placeholders (--strict)');
    failures++;
  }
} else {
  console.log('legal copy: no placeholders left — all entity fields are filled in');
}

// The check has to be reading the real file the prerenderer reads, not a copy.
const onDisk = JSON.parse(
  fs.readFileSync(new URL('../src/data/legal.json', import.meta.url), 'utf8')
) as typeof data;
ok('the checked file is the one on disk', onDisk.docs.privacy.title === docs.privacy.title);

if (failures > 0) {
  throw new Error(`${failures} legal check(s) failed`);
}
console.log(`legal copy: ok (2 documents, ${STRICT ? 'strict' : 'advisory'} mode)`);