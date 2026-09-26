# AGENTS.md — read this before changing Cardly

Vite + React 19 SPA (no server), Firebase (Auth / Firestore / Storage), 325 card templates in
`src/data/templates.ts`. Commands:

```
npm run dev      # vite, port 3000
npm run lint     # tsc --noEmit
npm test         # scripts/routes.check.ts + scripts/covers.check.mjs
npm run build    # vite build + scripts/prerender.mjs (static HTML per card, robots.txt, sitemap.xml)
```

## Invariants — do not regress

- **Routing lives in `src/utils/routes.ts`** (`parsePath`, `routePath`, `ROUTE_META`). App.tsx only
  wires pushState/popstate and renders. New routes go there, and every route needs a `ROUTE_META`
  entry (title + description) — `npm test` enforces it.
- **Legacy QR links** (`/?design=…`, `/?card=…`, `/?edit=…`) printed on physical cards must keep
  working; App's deep-link effect rewrites them to canonical paths.
- **Never resume a saved design on a fresh "Personalize"** (fixed once: stale `?design=` in the URL
  + `getActiveDraftId` fallback both reopened the previous card). A new card = template defaults.
- **Cover art**: index the pool with a per-occasion counter (`coverCounters`), never with
  `templates.length` — that parity gate locks the index and gives every card the same picture.
  `covers.check.mjs` fails the build's test step if covers bunch up.
- Prerendered HTML under `dist/card/<id>/` is replaced by React on mount; keep head tags
  (title/canonical/og) in sync between `scripts/prerender.mjs` and `setPageMeta` in App.tsx.

---

# Production blockers (implement in this order)

## 1. Payments are simulated — blocks all revenue

**State:** `src/pages/Checkout.tsx` step 4 is literally labelled "Payment Simulation". Card fields
are never sent anywhere, `last4` is sliced client-side, and `handlePlaceOrder` writes an order row
straight to Firestore/localStorage. No payment service provider, no webhook, no refund path.

**Implement:** Stripe Payment Element (or Google-Pay-only if you want the smallest surface).
Order must be created server-side (Cloud Function or Stripe Checkout), and the paid status must
come from the webhook — never from the client. Recompute the total server-side from template
`price × size.priceMultiplier + envelope.price`; the client total is a display value only.

**Done when:** Stripe test card `4242 4242 4242 4242` produces a real charge; the order flips to
paid only after the webhook; no card number ever appears in our JS bundle or network logs.

## 2. No order fulfilment — paid customers get nothing

**State:** orders are rows in `users/{uid}/orders` (guest orders only in localStorage under
`cardly_user_orders`). Nothing prints, emails or ships. The customer's personalised design exists
only in browser state.

**Implement:** on payment success, export the 4 pages print-ready (start from
`src/components/PrintPreview.tsx`, which already renders the print layout), upload to Storage, then
hand off to a printer API (Gelato / Prodigi) — or at minimum email the customer a PDF. Needs a
server (Cloud Function) because the client cannot be trusted to trigger it.

**Done when:** an end-to-end test order yields a stored print-ready file plus a confirmation email.

## 3. Admin authorization is a hardcoded email — security

**State:** `firestore.rules` grants template writes to
`request.auth.token.email == 'blogdoontv@gmail.com'`. `.env.example` also documents a local
developer admin session fallback used when the OAuth domain is unauthorised.

**Implement:** set an `admin` custom claim via the Firebase Admin SDK and check
`request.auth.token.admin == true` in rules; delete the dev-admin fallback or hard-gate it to
`localhost`; confirm `storage.rules` follows the same model.

**Done when:** a second, non-admin account is denied template writes, and a production build
contains no dev session path. (Rules otherwise look sound: default-deny, owner-scoped
designs/favorites, orders immutable after creation.)

## 4. Deploy configuration — cheap, ship with any release

- Set **`SITE_ORIGIN`** at build time — canonical/og/robots/sitemap currently default to
  `https://cardly.app`.
- Set **`VITE_GA_ID`** (GA4) if analytics are wanted; it is inert otherwise.
- **404s return HTTP 200** on unknown paths (client-side route). Add host rewrites
  (`try_files $uri $uri/ /index.html`) — status codes affect crawling.
- **No `package-lock.json`** (only `bun.lock`), so CI runs `npm install` non-deterministically.
  Generate and commit a lockfile.

## Known minor issues (not blockers)

- Two handcrafted base archetypes still share a cover within the Birthday grid (cake ×2, art-deco
  ×2) — only 18 studio photos exist for 166 photo cards, ~9 reuses each is the floor.
- No automated tests for the editor / save / checkout flows; only the two static checks in
  `npm test`. No visual regression coverage.

## Verification before claiming anything done

```
npm run lint && npm test && npm run build
chromium --headless --no-sandbox --dump-dom http://localhost:4173/<route>   # after vite preview
```
