# Deploying Cardly

Cardly is a static Vite + React SPA. There is no application server: `npm run build` emits
`dist/`, and any static host can serve it. The only server-side runtime is Supabase
(Postgres + Auth + Edge Functions). See `AGENTS.md` for architecture and invariants; this
file is the operational runbook.

---

## 1. Build-time environment variables

Vite inlines `VITE_*` variables into the JavaScript bundle at build time. Set them in the
host's build environment, not at runtime — there is no server to read them later.

| Variable | Required | Purpose | If missing |
| --- | --- | --- | --- |
| `SITE_ORIGIN` | **Yes, in production** | Absolute origin (`https://your-domain`) baked into `<link rel="canonical">`, `og:url`, `robots.txt` and all 343 `<loc>` entries in `sitemap.xml` by `scripts/prerender.mjs`. | Falls back to `https://cardly.app`, which is wrong for every other domain. A placeholder (`MY_APP_URL`, `example.com`, `localhost`, `https://<ref>.…`) **fails the build** — see §1.1. |
| `VITE_SUPABASE_URL` | **Yes** | Supabase project URL, read in `src/services/supabase.ts` (`isSupabaseConfigured`). | The app boots but `isSupabaseConfigured` is false and the catalog is empty — the storefront renders its empty states. `db()` throws for callers that genuinely need the database. |
| `VITE_SUPABASE_ANON_KEY` | **Yes** | Supabase anon key. Public by design; **RLS is the real boundary**. | Same as above. |
| `VITE_GA_ID` | No | GA4 measurement id (`G-XXXXXXXXXX`), read in `src/utils/analytics.ts`. | Analytics stays completely inert — `initAnalytics()` returns before injecting the gtag script. |
| `VITE_USE_SUPABASE_STORAGE` | No | `"true"` uploads customer photos to a Supabase Storage bucket instead of keeping compressed WebP data URLs in the browser. | Defaults to `"false"`: no bucket required. **There are no Storage policies in `supabase/migrations/`**, so `"true"` needs the bucket and its policies written first (blocker 3 in `AGENTS.md`). |
| `GEMINI_API_KEY` | No | Injected via `define` in `vite.config.ts` for `src/utils/aiMessage.ts`. | The AI message helper reports itself unavailable. |

Do **not** set `APP_URL`. It is a leftover from the Google AI Studio template
(`.env.example` still carries `APP_URL="MY_APP_URL"`). `scripts/prerender.mjs` reads it only
as a last-resort fallback for `SITE_ORIGIN`, and now rejects it as a placeholder — which is
why a local shell that still exports `APP_URL=MY_APP_URL` fails the build until you unset it.

### 1.1 The build refuses a placeholder origin

`scripts/prerender.mjs` validates the origin before writing anything. It rejects values that
are not an absolute `http`/`https` origin, and values that are obviously placeholders:

```
prerender: SITE_ORIGIN is not usable as the site origin — it still contains a YOUR_/MY_ placeholder.

  SITE_ORIGIN="MY_APP_URL"

  Every <link rel="canonical"> and og:url on every prerendered card page, plus
  robots.txt and all 343 <loc> entries in sitemap.xml, are built from this value.
  A placeholder therefore ships a sitemap telling search engines the entire site
  lives on a host that does not exist, so the build fails instead.

  Fix: set SITE_ORIGIN to the absolute origin this build is served from, e.g.
      export SITE_ORIGIN=https://cardly.app
  or leave SITE_ORIGIN and APP_URL both unset to fall back to https://cardly.app.
  (.env is not read by this script — export the variable in the build environment.)
```

This is deliberate. A wrong origin is not cosmetic: it ships a sitemap pointing Google at a
host that does not exist, and every canonical and `og:url` on the 339 prerendered card pages
points nowhere. Failing the build is the only safe outcome.

**`.env` is not loaded by `scripts/prerender.mjs`, on purpose.** Vite already loads `.env` for
the `VITE_*` client vars; the prerender step runs as a separate `node` process and reads the
real process environment only. A gitignored local `.env` is not a source of truth for where
the site is served from — and this repo's `.env` still holds the AI Studio placeholder, so
reading it would reintroduce the exact bug the validation exists to stop. If you set
`SITE_ORIGIN` locally, export it in your shell.

Verify after every deploy:

```bash
curl -s https://your-domain/robots.txt             # Sitemap: https://your-domain/sitemap.xml
curl -s https://your-domain/sitemap.xml | head -3  # <loc>https://your-domain/</loc>
curl -s https://your-domain/card/card-001/ | grep -o '<link rel="canonical"[^>]*>'
```

---

## 2. Stripe keys are Edge Function secrets, never `VITE_` vars

Anything named `VITE_*` is **compiled into the public bundle** and readable by anyone who
views source. Stripe keys must never carry that prefix.

The browser is redirected to Stripe's hosted Checkout, so **no card number, no publishable key
and no Stripe SDK ever enter the bundle**. `create-checkout` recomputes every amount from the
`templates` table plus `supabase/functions/_shared/pricing.ts` and returns a hosted URL.

```bash
supabase functions deploy create-checkout
supabase functions deploy stripe-webhook --no-verify-jwt   # Stripe sends no JWT
supabase secrets set STRIPE_SECRET_KEY=sk_live_… \
                   STRIPE_WEBHOOK_SECRET=whsec_… \
                   SITE_ORIGIN=https://your-domain
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected by the platform automatically —
do not set them by hand.

| Secret | Read by | Notes |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | `create-checkout`, `stripe-webhook` | Never a `VITE_` var. |
| `STRIPE_WEBHOOK_SECRET` | `stripe-webhook` | Used to verify the signature. |
| `SITE_ORIGIN` | `create-checkout` | The **Edge Function** secret used to build the success/cancel return URLs. Same value as the build-time `SITE_ORIGIN`, set in a different place. |

### Fulfilment secrets

`stripe-webhook` calls `fulfil-order` when payment lands, so **a paid customer now gets a print
file**. Three more optional secrets:

```bash
supabase functions deploy fulfil-order
supabase secrets set PDF_RENDER_URL=https://your-pdf-service/render \   # optional
# …and, only if you have a printer account, all three or none:
supabase secrets set PRINTER_API_URL=https://api.gelato.com/v2 PRINTER_API_KEY=… PRINTER_NAME=…
```

| Secret | Read by | Notes |
| --- | --- | --- |
| `PDF_RENDER_URL` | `fulfil-order` | A headless-Chromium service taking `{html}` → PDF. Omit it and the PDF step is skipped: the render is stored as `source_html` and printable by hand. Nothing is faked. |
| `PRINTER_API_URL` / `PRINTER_API_KEY` / `PRINTER_NAME` | `fulfil-order` | Gelato/Prodigi handoff. All three or none; a half-configured printer is refused. With none, the console says "print by hand from the download". |

Stripe Dashboard → Developers → Webhooks → endpoint
`https://<project-ref>.supabase.co/functions/v1/stripe-webhook`, subscribed to
`checkout.session.completed` and `checkout.session.expired`.

The signed webhook is the only thing that can move an order from `pending_payment` to
`processing`. Kill it and orders must stay pending — that is the test that proves the client
cannot fake a payment.

---

## 3. Host rewrites and real 404s

Cardly owns real URL paths (`/browse/`, `/card/<id>/`, `/edit/<id>/`, `/cart/`, … — see
`ROUTE_META` in `src/utils/routes.ts`), and navigation is client-side `pushState`. The host
must therefore fall back to `index.html` for any path that is not a file on disk, or a hard
refresh on `/card/<id>/` returns 404.

Two requirements, and they are in tension:

1. **SPA fallback** — unknown *app* paths must serve `index.html` so React can route them.
2. **Real 404s** — a genuinely nonexistent path must not be served as a bare HTTP 200. Status
   codes affect crawling, and a 200 on an empty shell tells search engines the URL exists.

`public/_redirects` ships the SPA fallback (`/* /index.html 200`) for Netlify and Cloudflare
Pages. Netlify and Cloudflare support a status on the rewrite, so the trailing status should
be `404`:

```
/*  /index.html  404
```

`index.html` exists on disk, so real pages (`/`, `/browse/`, `/privacy/`) are served normally;
only the rewrite target gets the 404 status. Under nginx, `try_files … /index.html` always
answers 200, so pair it with `error_page`:

### nginx

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain;

    root /var/www/cardly/dist;
    index index.html;

    # Hashed Vite assets are immutable; index.html must never be cached or a
    # deploy leaves clients on the old bundle.
    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }
    location = /index.html {
        add_header Cache-Control "no-cache";
    }

    # Prerendered card/legal pages exist as directories; try_files resolves them.
    location / {
        try_files $uri $uri/ /index.html;
        error_page 404 /index.html;
    }

    # … TLS (certbot), security headers, gzip …
}
```

`error_page 404 /index.html` is an internal redirect, so the client still receives **404** with
the app shell; React hydrates and `parsePath` routes it to `notFound` for the copy.

### Netlify / Cloudflare Pages

`public/_redirects` (copied verbatim into `dist/`) handles this. Change the trailing status
from `200` to `404` as shown above. Cloudflare Pages reads the same file format.

### Vercel

`vercel.json` at the repo root:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
    },
    {
      "source": "/index.html",
      "headers": [{ "key": "Cache-Control", "value": "no-cache" }]
    }
  ]
}
```

Vercel has no per-rewrite status in `rewrites`, so unknown paths return 200 there. Rely on the
app rendering `notFound`, and do not rely on status codes from Vercel. Do **not** add a
catch-all `routes` entry — it shadows the filesystem and breaks the prerendered pages.

### Verify the rewrite after deploying

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://your-domain/card/card-001/       # 200
curl -s -o /dev/null -w '%{http_code}\n' https://your-domain/privacy/             # 200
curl -s -o /dev/null -w '%{http_code}\n' https://your-domain/browse/              # 200
curl -s -o /dev/null -w '%{http_code}\n' https://your-domain/nope-does-not-exist  # 404
```

The first three must be 200 **from the host, not from React** — if `curl` shows 404 there,
the SPA fallback is missing and the fix is the rewrite above.

---

## 4. Production launch checklist

Work top to bottom. Steps 1–4 are the parts that are code-complete but not yet deployed.

### A. Database and auth

1. Apply migrations in order, all four:
   ```bash
   supabase db push                       # or: for f in supabase/migrations/*.sql; do psql "$DATABASE_URL" -f "$f"; done
   ```
   `0001_schema.sql`, `0002_rls.sql`, `0003_bootstrap_admin.sql`, `0004_payments.sql`.
2. Run the RLS behaviour tests — **not optional**. In Postgres a table with RLS enabled and no
   policy is silently locked, and a policy written `using (true)` silently publishes the table;
   nothing errors either way. `scripts/rls.sh` spins up a throwaway cluster, applies the
   migrations and exercises the policies:
   ```bash
   bash scripts/rls.sh
   # or against an existing database:
   DATABASE_URL=postgres://… bash scripts/rls.sh
   ```
3. Confirm `SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` point at this project, and add the
   production origin to **Auth → Providers → URL Configuration** (site URL + redirect
   allow-list), or Google sign-in redirects to localhost.
4. Create the operator account. `0003_bootstrap_admin.sql` promotes the **first** user to
   admin via a trigger on `auth.users` — no hardcoded email — and only the first. Do this
   before anyone else signs up, or you will have to promote by hand.

### B. Payments

5. `supabase secrets set STRIPE_SECRET_KEY=… STRIPE_WEBHOOK_SECRET=… SITE_ORIGIN=https://your-domain`
6. `supabase functions deploy create-checkout` and `supabase functions deploy stripe-webhook --no-verify-jwt`
7. Create the Stripe webhook endpoint (§2) with both events subscribed.
8. End-to-end test with Stripe's test card `4242 4242 4242 4242`. **Done when**: a real charge
   appears, the order flips `pending_payment` → `processing` *only after* the webhook (stop the
   webhook and confirm it stays pending), and a client-side `createOrder` insert is rejected by
   RLS.

### C. Fulfilment

9. Apply the two new migrations: `0007_storage_policies.sql` then `0008_fulfilment.sql`. The first
   is a **security fix**, not just a new bucket — `0005`/`0006` never enabled RLS on
   `storage.objects`, so every `user-photos` object was readable by any signed-in user. If you
   already had `VITE_USE_SUPABASE_STORAGE="true"` live, apply this before you take any more orders.
10. `supabase functions deploy fulfil-order` (JWT verification **stays on**; unlike the Stripe
    webhook, this one is also called by your admin console).
11. Set `PDF_RENDER_URL` to a headless-Chromium service that accepts `{html}` and returns a PDF.
    **Optional but recommended.** Without it the PDF step is skipped and the render is stored as
    `source_html`; the admin console says so and an operator can open and print it by hand. It never
    fabricates a PDF.
12. Optionally all three of `PRINTER_API_URL`, `PRINTER_API_KEY`, `PRINTER_NAME` for Gelato/Prodigi.
    All three or none — a half-configured printer is refused rather than guessed at.
13. **Done when**: place a real test order, then in `/admin/` → Orders press **Print file** on the
    new order. You should get a file you can open at the correct paper size (A5 → A4 landscape, A4 →
    A3, A3 → A2, postcard → A5), with a job spec page, crop marks and a centre fold line. Then set
    the order to `printed` yourself and dispatch it.

### D. Build and host

14. Fill in `src/data/legal.json`. `npm test` reports placeholders in advisory mode; run
    `node scripts/legal.check.ts --strict` to make it a hard failure. The documents still need a
    lawyer's review for the EU/UK jurisdiction — the check only proves the copy is not a
    template.
15. Set the build env vars from §1 — `SITE_ORIGIN` above all. Keep `APP_URL` unset.
16. `npm ci && npm run lint && npm test && npm run build`. Verify the origin in the last line
    of output names `SITE_ORIGIN`, not `default`:
    ```
    prerender: 339 template pages -> dist/card/<id>/index.html, plus robots.txt + sitemap.xml (343 urls, origin https://your-domain from SITE_ORIGIN)
    ```
    Then check `dist/robots.txt` and `dist/sitemap.xml` for the right host before uploading.
17. Apply the host config from §3 and run the four `curl` checks.
18. If you retired templates, `scripts/retired-templates.json` (or `RETIRED_TEMPLATE_IDS=…`) must
    be committed **before** the build — `scripts/prerender.mjs` reads it offline and deletes the
    stale `dist/card/<id>/`. Otherwise crawlers keep indexing a deleted card.
19. Regenerate the manifest if the catalog changed: `node scripts/export-manifest.mjs`
    (`scripts/catalog.manifest.json` is the build's view of the catalog — the build has no
    database credentials).

### E. Verify on the deployed build

20. Sign in as a **second, non-admin account** and confirm it is denied template writes and
    cannot reach `/admin/`. `/admin/` is gated in the UI but RLS is the real boundary.
21. Confirm the off-loopback demo session in `src/services/authService.ts` cannot be reached.
    That code still ships in the production bundle — it throws off-loopback, but consider
    tree-shaking or feature-flagging it out (blocker 3).
22. Confirm the customer can download their own print file from their order, and that a
    **different** signed-in customer cannot. `print-files` is private; this is the check that
    would catch a regression in its policy.

### F. Still not shipped

23. **No confirmation email.** The print file is stored and the customer can download it from their
    order, but nothing is sent to them on dispatch. That needs an email provider (Resend/Postmark)
    and a second trigger. It is the last piece of blocker 2.
24. **Two catalog checks fail on `npm test`** and are unrelated to payments or fulfilment: 71 newly
    added artwork files have no `ARTWORK_FACETS` entry, so `templateFacets.check.ts` and
    `templateGenerator.check.mjs` fail. Both pass at `HEAD`. Fix before launch by assigning each new
    artwork a real style/recipient/tone/season/palette — never a blanket default.

---

## 5. CI

`.github/workflows/ci.yml` runs `npm ci` → `npm run lint` → `npm test` → `npm run build` on Node
22, then uploads `dist` as an artifact. `npm ci` requires `package-lock.json`, which is now
committed (previously only `bun.lock` existed and `npm ci` failed immediately, leaving CI
permanently red).

The CI build sets no `SITE_ORIGIN`, so the artifact uses the `https://cardly.app` default. That
is fine for a smoke test, but **the artifact is not deployable as-is** — always rebuild in your
host with the real `SITE_ORIGIN`, or the canonical URLs and sitemap will point at
`cardly.app`. If `APP_URL` is exported anywhere in the CI environment the build now fails
loudly, which is the intended behaviour.
