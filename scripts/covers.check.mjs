// Runnable check that template cover art stays varied: `npm test`.
// Guards the bug where the pool index was locked by the parity gate, so every photo card
// of an occasion got the identical picture.
//
// Reads scripts/catalog.manifest.json — the catalog itself now lives in Firestore and is
// not part of the app bundle, so the build needs a manifest to check against. Regenerate
// it with `node scripts/export-manifest.mjs`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = path.join(root, 'scripts', 'catalog.manifest.json');

if (!fs.existsSync(MANIFEST)) {
  throw new Error(
    `covers check: ${path.relative(root, MANIFEST)} is missing. ` +
      'Regenerate it with `node scripts/export-manifest.mjs`.'
  );
}
const ALL_TEMPLATES = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));

// thumbnail is either a studio cover image (bundled asset path) or a generated design SVG
const photoCards = ALL_TEMPLATES.filter((t) => String(t.thumbnail).includes('assets/images'));

const byOccasion = new Map();
for (const t of photoCards) {
  const counts = byOccasion.get(t.category) || new Map();
  counts.set(t.thumbnail, (counts.get(t.thumbnail) || 0) + 1);
  byOccasion.set(t.category, counts);
}

let failures = 0;
const MAX_SHARE = 0.6;
for (const [occasion, counts] of byOccasion) {
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  if (total < 6) continue; // too few photo cards for the ratio to mean anything
  const max = Math.max(...counts.values());
  if (max / total > MAX_SHARE) {
    failures++;
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    console.error(
      `FAIL ${occasion}: ${(max / total * 100).toFixed(0)}% share (${max}/${total}) for ${top[0].split('/').pop()}`
    );
  }
}

const distinctCovers = new Set(photoCards.map((t) => t.thumbnail));
if (distinctCovers.size < 15) {
  failures++;
  console.error(`FAIL only ${distinctCovers.size} distinct covers in use across ${photoCards.length} photo cards`);
}

if (failures) {
  throw new Error(`${failures} cover check(s) failed`);
}
console.log(
  `covers check: ok (${photoCards.length} photo cards, ${distinctCovers.size} distinct covers, ` +
    `${byOccasion.size} occasions)`
);
