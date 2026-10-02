// Post-build prerender: writes a static HTML file per card template page so crawlers get
// real <title>/meta/canonical and visible content without running JavaScript.
// Run after `vite build` (see the `build` script in package.json).
//
// The catalog lives in Postgres and is NOT in the client bundle, and this build has no
// database credentials — so the template list comes from scripts/catalog.manifest.json.
// Regenerate that with `node scripts/export-manifest.mjs`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const MANIFEST = path.join(root, 'scripts', 'catalog.manifest.json');

const loadCatalogManifest = () => {
  if (!fs.existsSync(MANIFEST)) {
    throw new Error(
      `prerender: ${path.relative(root, MANIFEST)} is missing. ` +
        'Regenerate it with `node scripts/export-manifest.mjs`.'
    );
  }
  return JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
};
// Absolute origin for canonical/og URLs, robots.txt and the sitemap (see .env.example
// and DEPLOYMENT.md).
//
// .env is deliberately NOT read here. Vite already loads it for the VITE_* client vars,
// and whatever builds this bundle injects the real environment into this process. A
// gitignored local .env is not a source of truth for where the site is served from, and
// this repo's .env still carries the AI Studio placeholder APP_URL="MY_APP_URL" — reading
// it would make that placeholder the site's canonical origin (which is exactly how
// `Sitemap: MY_APP_URL/sitemap.xml` once shipped).
const DEFAULT_ORIGIN = 'https://cardly.app';

// Values that are unmistakably not a real deployment origin. Rejected with a specific
// reason rather than a bare "invalid URL", because some of these do parse (`your-domain.com`
// and `http://localhost:3000` both yield a perfectly good URL object) and would otherwise
// put 343 wrong <loc> entries into the sitemap without complaint.
const ORIGIN_PLACEHOLDERS = [
  { test: /(^|[^a-z0-9])(your|my)[_-]/i, why: 'it still contains a YOUR_/MY_ placeholder' },
  { test: /[<>]|\$\{/, why: 'it contains an unsubstituted placeholder (<…> or ${…})' },
  {
    test: /example\.(com|org|net)|localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]/i,
    why: 'it is a documentation or loopback host, not a public site',
  },
  {
    test: /^(my_?app_?url|your_?app_?url|app_?url|site_?origin|url|origin|changeme|todo|tbd)$/i,
    why: 'it is a placeholder name, not a URL',
  },
];

// One layer of matching quotes, in case the value came through a shell/YAML/CI secret that
// kept them: `SITE_ORIGIN="https://…"`. Without this, the quote breaks URL parsing and the
// error says "not a URL" for what is actually a quoting mistake.
const unquote = (v) => {
  const m = /^(['"])([\s\S]*)\1$/.exec(v);
  return m ? m[2] : v;
};

/**
 * Resolve the build origin, or throw.
 *
 * `SITE_ORIGIN` wins; `APP_URL` is the older AI Studio name and is kept only as a
 * fallback. Both genuinely unset/empty falls back to DEFAULT_ORIGIN so a plain local
 * build still succeeds; anything set but unusable fails the build loudly, because a
 * wrong origin is not a cosmetic problem — it silently rewrites the canonical URL and
 * og:url of every prerendered page and points robots.txt at a host that does not exist.
 */
const resolveOrigin = () => {
  const chosen = [
    ['SITE_ORIGIN', process.env.SITE_ORIGIN],
    ['APP_URL', process.env.APP_URL],
  ].find(([, raw]) => typeof raw === 'string' && raw.trim() !== '');
  if (!chosen) return { origin: DEFAULT_ORIGIN, source: 'default' };

  const [name, rawValue] = chosen;
  const value = unquote(rawValue.trim());
  const fail = (why) => {
    throw new Error(
      [
        `prerender: ${name} is not usable as the site origin — ${why}.`,
        '',
        `  ${name}=${JSON.stringify(rawValue)}`,
        '',
        '  Every <link rel="canonical"> and og:url on every prerendered card page, plus',
        '  robots.txt and all 343 <loc> entries in sitemap.xml, are built from this value.',
        '  A placeholder therefore ships a sitemap telling search engines the entire site',
        '  lives on a host that does not exist, so the build fails instead.',
        '',
        '  Fix: set SITE_ORIGIN to the absolute origin this build is served from, e.g.',
        '      export SITE_ORIGIN=https://cardly.app',
        `  or leave SITE_ORIGIN and APP_URL both unset to fall back to ${DEFAULT_ORIGIN}.`,
        '  (.env is not read by this script — export the variable in the build environment.)',
      ].join('\n')
    );
  };

  const placeholder = ORIGIN_PLACEHOLDERS.find((p) => p.test.test(value));
  if (placeholder) fail(placeholder.why);

  let url;
  try {
    url = new URL(value);
  } catch {
    fail('it is not a parseable absolute URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    fail(`its scheme is "${url.protocol}"; only http:// and https:// are allowed`);
  }
  if (!url.hostname) fail('it has no hostname');
  // An origin is scheme + host + port only. A trailing path or a query string would be
  // pasted in front of every generated URL (`https://host/shop/card/<id>/`).
  if (url.pathname !== '/' || url.search || url.hash) {
    fail('it must be an origin only — no path, query string or fragment');
  }

  // `url.origin` normalises the trailing slash away for http/https.
  return { origin: url.origin, source: name };
};

const { origin: ORIGIN, source: ORIGIN_SOURCE } = resolveOrigin();

const shell = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const builtAssets = fs.readdirSync(path.join(dist, 'assets'));

// Cover art for the static card pages.
//
// The catalog is no longer bundled, so Vite no longer emits these images — it only
// emits what the JS actually imports, and the JS no longer imports any template.
// The prerendered pages still need them (they are the og:image and the visible
// <img>), so we copy the originals into dist/covers/ and point the markup there.
const COVERS_DIR = path.join(dist, 'covers');
const copyCover = (src) => {
  if (!src) return '';
  // Only real bundled files can be copied. Data-URL thumbnails (generated SVGs)
  // are inline already and have no file on disk.
  if (!src.startsWith('/src/')) return '';
  const from = path.join(root, src.replace(/^\//, ''));
  if (!fs.existsSync(from)) return '';
  fs.mkdirSync(COVERS_DIR, { recursive: true });
  const name = path.basename(src);
  fs.copyFileSync(from, path.join(COVERS_DIR, name));
  return `/covers/${name}`;
};

// Prefer a Vite-emitted asset (still bundled, e.g. the occasion art), otherwise
// fall back to copying the cover referenced by the manifest.
const assetUrl = (src) => {
  if (!src) return '';
  if (!src.startsWith('/src/')) return '';
  const base = path.basename(src);
  const hit = builtAssets.find(
    (f) => f.startsWith(`${path.parse(base).name}-`) && f.endsWith(path.extname(base))
  );
  return hit ? `/assets/${hit}` : copyCover(src);
};

// The template list for static generation (see the header for why a manifest).
const ALL_TEMPLATES = loadCatalogManifest();

const esc = (s) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const clip = (s, n) => (s.length > n ? `${s.slice(0, n).trimEnd()}…` : s);

// Mirrors `formatPrice` in src/utils/currency.ts. The store is euro-only, so
// there is no conversion — keep the two in sync or the static HTML and the
// hydrated React tree will disagree on price.
const eur = new Intl.NumberFormat('en-IE', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const formatPrice = (amount) => eur.format(amount);

const PAGE_STYLE = `
    .card-page { max-width: 720px; margin: 0 auto; padding: 48px 24px; font-family: system-ui, sans-serif; color: #0f172a; }
    .card-page h1 { font-size: 2.25rem; font-weight: 900; margin: 0 0 12px; }
    .card-page .desc { font-size: 1.05rem; line-height: 1.6; color: #334155; margin: 0 0 16px; }
    .card-page .meta { font-size: 0.9rem; color: #64748b; margin: 0 0 24px; }
    .card-page img { width: 100%; height: auto; border-radius: 16px; display: block; margin-bottom: 24px; }
    .card-page .cta { display: inline-block; background: #e11d48; color: #fff; font-weight: 700; padding: 12px 24px; border-radius: 14px; text-decoration: none; }
`;

// Templates retired from the admin console must not keep serving static pages or
// sitemap entries. Retirements live in Postgres (written at runtime), so they
// are piped in at build time via RETIRED_TEMPLATE_IDS (comma-separated) or a
// scripts/retired-templates.json list — see AGENTS.md.
const RETIRED_IDS = (() => {
  const fromEnv = (process.env.RETIRED_TEMPLATE_IDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const fromFile = (() => {
    const f = path.join(root, 'scripts', 'retired-templates.json');
    if (!fs.existsSync(f)) return [];
    try {
      const parsed = JSON.parse(fs.readFileSync(f, 'utf8'));
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch (e) {
      console.warn(`prerender: could not parse retired-templates.json: ${e.message}`);
      return [];
    }
  })();
  return new Set([...fromEnv, ...fromFile]);
})();

const ACTIVE_TEMPLATES = ALL_TEMPLATES.filter((t) => !RETIRED_IDS.has(t.id));

// Legal pages are prerendered too: crawlers do not run React, so a component-only
// policy would be invisible to the index. Copy lives in src/data/legal.json so this
// and the React page cannot drift apart.
const LEGAL = JSON.parse(fs.readFileSync(path.join(root, 'src', 'data', 'legal.json'), 'utf8'));

let legalWritten = 0;
for (const [slug, doc] of Object.entries(LEGAL.docs)) {
  const url = `${ORIGIN}/${slug}/`;
  const title = `${doc.title} | Cardly`;
  const desc = clip(doc.description, 155);

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
        '  </head>',
      ].join('\n')
    )
    .replace(
      '<div id="root"></div>',
      `<div id="root">
      <main class="card-page">
        <style>${PAGE_STYLE}</style>
        <h1>${esc(doc.title)}</h1>
        <p class="meta">Last updated ${esc(LEGAL.lastUpdated)}</p>
        <p class="desc">${esc(doc.intro)}</p>
        ${doc.sections
          .map(
            (s) =>
              `<h2>${esc(s.heading)}</h2>` + s.body.map((p) => `<p>${esc(p)}</p>`).join('')
          )
          .join('')}
        <p><a class="cta" href="/${slug === 'privacy' ? 'terms' : 'privacy'}/">${
          slug === 'privacy' ? 'Read the Terms &amp; Conditions' : 'Read the Privacy Policy'
        }</a></p>
      </main>
    </div>`
    );

  const outDir = path.join(dist, slug);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'index.html'), html);
  legalWritten++;
}

if (RETIRED_IDS.size > 0) {
  console.log(`prerender: skipping ${RETIRED_IDS.size} retired template(s)`);
}

let written = 0;
for (const t of ACTIVE_TEMPLATES) {
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
        img ? `    <meta property="og:image" content="${ORIGIN}${img}" />
    <meta property="og:image:alt" content="${esc(t.title)} greeting card design" />` : '',
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
        <p class="meta">${esc(t.category)} card for ${esc(t.recipient)} · ${esc(formatPrice(t.price))}</p>
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

if (written !== ACTIVE_TEMPLATES.length || written === 0) {
  throw new Error(`prerender: wrote ${written} of ${ACTIVE_TEMPLATES.length} template pages`);
}

// Drop any page left over from a previous build for a now-retired template,
// otherwise the static copy outlives the admin's decision.
let removed = 0;
for (const id of RETIRED_IDS) {
  const stale = path.join(dist, 'card', id);
  if (fs.existsSync(stale)) {
    fs.rmSync(stale, { recursive: true, force: true });
    removed++;
  }
}

// robots.txt + sitemap for the prerendered catalogue (root paths only; /edit/, /cart/
// and friends are app-internal and excluded).
fs.writeFileSync(
  path.join(dist, 'robots.txt'),
  `User-agent: *\nAllow: /\nDisallow: /account/\nDisallow: /admin/\n\nSitemap: ${ORIGIN}/sitemap.xml\n`
);

const today = new Date().toISOString().split('T')[0];
const sitemapUrls = [
  { url: '/', changefreq: 'daily', lastmod: today },
  { url: '/browse/', changefreq: 'daily', lastmod: today },
  { url: '/privacy/', changefreq: 'yearly', lastmod: today },
  { url: '/terms/', changefreq: 'yearly', lastmod: today },
  ...ACTIVE_TEMPLATES.map((t) => ({
    url: `/card/${t.id}/`,
    changefreq: 'weekly',
    lastmod: today,
  })),
]
  .map((u) => `  <url><loc>${ORIGIN}${u.url}</loc><lastmod>${u.lastmod}</lastmod><changefreq>${u.changefreq}</changefreq></url>`)
  .join('\n');
fs.writeFileSync(
  path.join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls}\n</urlset>\n`
);

console.log(
  `prerender: ${written} template pages -> dist/card/<id>/index.html, plus robots.txt + sitemap.xml (${sitemapUrls.split('\n').length} urls, origin ${ORIGIN} from ${ORIGIN_SOURCE})` +
    (removed > 0 ? `; removed ${removed} stale retired page(s)` : '')
);
