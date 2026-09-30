// One-time: exports the current bundled catalog to scripts/catalog.manifest.json.
//
// The app no longer ships hardcoded templates (see AGENTS.md) — the catalog lives in
// Firestore. But the build has no Firebase credentials, so prerendering static card
// pages and the cover-art check still need a build-time list. This manifest is that
// list: it is read by scripts/prerender.mjs and scripts/covers.check.mjs, and is NOT
// part of the client bundle.
//
// Regenerate with:  node scripts/export-manifest.mjs
// It uses the Vite SSR loader, so run it before deleting src/data/templates.ts if the
// generator is being removed.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'scripts', 'catalog.manifest.json');

const server = await createServer({
  root,
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});
const { ALL_TEMPLATES } = await server.ssrLoadModule('/src/data/templates.ts');
await server.close();

// Only the fields the build actually reads. Keeping this list tight stops the
// manifest (and anything derived from it) from quietly becoming a second catalog.
const manifest = ALL_TEMPLATES.map((t) => ({
  id: t.id,
  title: t.title,
  description: t.description,
  category: t.category,
  recipient: t.recipient,
  style: t.style,
  price: t.price,
  rating: t.rating,
  reviewCount: t.reviewCount,
  thumbnail: t.thumbnail,
  isPhotoCard: t.isPhotoCard,
  isPopular: t.isPopular,
  isBestSeller: t.isBestSeller,
  tags: t.tags,
}));

fs.writeFileSync(OUT, JSON.stringify(manifest, null, 2) + '\n');
console.log(
  `manifest: wrote ${manifest.length} templates -> scripts/catalog.manifest.json ` +
    `(${photoCards(manifest)} photo cards)`
);

function photoCards(list) {
  return list.filter((t) => String(t.thumbnail).includes('assets/images')).length;
}
