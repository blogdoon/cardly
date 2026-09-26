// Runnable check that template cover art stays varied: `npm test`.
// Guards the bug where the pool index was locked by the parity gate, so every photo card
// of an occasion got the identical picture.
import { createServer } from 'vite';

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});
const { ALL_TEMPLATES } = await server.ssrLoadModule('/src/data/templates.ts');
await server.close();

// thumbnail is either a studio cover image (bundled asset path) or a generated design SVG
const photoCards = ALL_TEMPLATES.filter((t) => t.thumbnail.includes('assets/images'));

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
