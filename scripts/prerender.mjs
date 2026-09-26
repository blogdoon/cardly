// Post-build prerender: writes a static HTML file per card template page so crawlers get
// real <title>/meta/canonical and visible content without running JavaScript.
// Run after `vite build` (see the `build` script in package.json).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
// Absolute origin for canonical/og URLs, robots.txt and the sitemap (see .env.example).
const ORIGIN = (process.env.SITE_ORIGIN || process.env.APP_URL || 'https://cardly.app').replace(
  /\/+$/,
  ''
);

const shell = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const builtAssets = fs.readdirSync(path.join(dist, 'assets'));

// Vite hashes asset names but keeps the original basename:
// `/src/assets/images/x.jpg` -> `/assets/x-<hash>.jpg`
const assetUrl = (src) => {
  if (!src) return '';
  const base = path.basename(src);
  const hit = builtAssets.find(
    (f) => f.startsWith(`${path.parse(base).name}-`) && f.endsWith(path.extname(base))
  );
  return hit ? `/assets/${hit}` : '';
};

// Load the template catalogue through Vite so TS + image imports resolve.
const server = await createServer({
  root,
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});
const { ALL_TEMPLATES } = await server.ssrLoadModule('/src/data/templates.ts');
await server.close();

const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const clip = (s, n) => (s.length > n ? `${s.slice(0, n).trimEnd()}…` : s);

const PAGE_STYLE = `
    .card-page { max-width: 720px; margin: 0 auto; padding: 48px 24px; font-family: system-ui, sans-serif; color: #0f172a; }
    .card-page h1 { font-size: 2.25rem; font-weight: 900; margin: 0 0 12px; }
    .card-page .desc { font-size: 1.05rem; line-height: 1.6; color: #334155; margin: 0 0 16px; }
    .card-page .meta { font-size: 0.9rem; color: #64748b; margin: 0 0 24px; }
    .card-page img { width: 100%; height: auto; border-radius: 16px; display: block; margin-bottom: 24px; }
    .card-page .cta { display: inline-block; background: #e11d48; color: #fff; font-weight: 700; padding: 12px 24px; border-radius: 14px; text-decoration: none; }
`;

let written = 0;
for (const t of ALL_TEMPLATES) {
  const url = `${ORIGIN}/card/${t.id}/`;
  const title = `${t.title} | Cardly ${t.category} Cards`;
  const desc = clip(t.description, 155);
  const img = assetUrl(t.thumbnail);

  const html = shell
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
    .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(title)}$2`)
    .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(desc)}$2`)
    .replace(
      '</head>',
      [
        `    <link rel="canonical" href="${url}" />`,
        `    <meta property="og:url" content="${url}" />`,
        img ? `    <meta property="og:image" content="${ORIGIN}${img}" />` : '',
        '  </head>',
      ]
        .filter(Boolean)
        .join('\n')
    )
    .replace(
      '<div id="root"></div>',
      `<div id="root">
      <main class="card-page">
        <style>${PAGE_STYLE}</style>
        <h1>${esc(t.title)}</h1>
        <p class="desc">${esc(t.description)}</p>
        <p class="meta">${esc(t.category)} card for ${esc(t.recipient)} · £${t.price.toFixed(2)} · ${t.rating}★ (${t.reviewCount} reviews)</p>
        ${img ? `<img src="${img}" alt="${esc(t.title)} greeting card design" />` : ''}
        <a class="cta" href="/edit/${esc(t.id)}/">Personalise this card</a>
      </main>
    </div>`
    );

  const outDir = path.join(dist, 'card', t.id);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
  written++;
}

if (written !== ALL_TEMPLATES.length || written === 0) {
  throw new Error(`prerender: wrote ${written} of ${ALL_TEMPLATES.length} template pages`);
}

// robots.txt + sitemap for the prerendered catalogue (root paths only; /edit/, /cart/
// and friends are app-internal and excluded).
fs.writeFileSync(
  path.join(dist, 'robots.txt'),
  `User-agent: *\nAllow: /\nDisallow: /account/\nDisallow: /admin/\n\nSitemap: ${ORIGIN}/sitemap.xml\n`
);

const sitemapUrls = ['/', '/browse/', ...ALL_TEMPLATES.map((t) => `/card/${t.id}/`)]
  .map((u) => `  <url><loc>${ORIGIN}${u}</loc></url>`)
  .join('\n');
fs.writeFileSync(
  path.join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls}\n</urlset>\n`
);

console.log(
  `prerender: ${written} template pages -> dist/card/<id>/index.html, plus robots.txt + sitemap.xml (${sitemapUrls.split('\n').length} urls, origin ${ORIGIN})`
);
