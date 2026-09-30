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
- **Browse filters are typed facets, not one overloaded param.** `?q=` (search), `?occasion=`,
  `?recipient=`, `?style=`, `?photo=1`, `?maxPrice=` — see `BrowseFacets` in `src/utils/routes.ts`.
  They used to share a single `param`, so a Navbar search was treated as an occasion name, matched
  zero templates, and rendered the empty state. `onNavigate` takes `(route, param?, facets?)`;
  pass facets, not a bare string. Filters now survive reload and back/forward.
- **Orders are the customer's record, and admins may only move fulfilment forward.** `firestore.rules`
  pins admin order updates to `status`, `trackingNumber`, `carrier`, `dispatchedAt`, `refund`,
  `cancelReason`, `adminNote`, `updatedAt` via `hasOnly` — never `total`, `items` or the address.
  Customers still cannot update an order at all. `adminOrderService.ts` is the only writer.
- **No fabricated data.** There is no seeded demo order (it is purged from existing localStorage on
  read) and no hardcoded ratings. `template.rating` / `reviewCount` are recomputed from **approved**
  reviews by `recomputeTemplateRating`, so pending reviews never move what customers see. If you add
  marketing numbers ("4.9/5 from 12,000+ reviews"), they must come from a real aggregate.
- **Reviews require a purchase and moderation.** The review doc id is pinned to
  `${orderId}_${templateId}` (one review per order per card) and every review is created as
  `pending`; only an admin may publish. Known gap, documented in `firestore.rules`: rules cannot
  verify the order *contains* the template, so the client asserts it. Closing that needs a Cloud
  Function.
- **The admin console reads the database, never the browser.** It used to read `getLocalOrders()` —
  the operator's own localStorage — so revenue could never be real. Orders come from a
  `collectionGroup` query in `adminOrderService.ts`. Guest checkout orders are localStorage-only and
  so are invisible to admin; that resolves with the payments work.
- **Euro only, Europe only.** The store has no multi-currency support and does not ship outside
  Europe. All amounts are plain EUR numbers. Never inline a currency glyph — use
  `formatPrice` / `formatPriceCompact` from `src/utils/currency.ts`; the checkout country list comes
  from `SHIPPING_COUNTRIES` there, and the delivery tiers from `src/utils/delivery.ts` (shared so
  the cart estimate and the checkout charge can never drift apart). `scripts/prerender.mjs` has its
  own `formatPrice` that must match the TS one.
- **A template's front (first side) is artwork only — no baked-in text.** The customer writes their
  own wording. Enforced by `editablePagesFrom` / `stripFrontText` in `src/utils/frontCover.ts`, which
  the editor and the card-detail previews use; the generators in `occasionTemplateLoader.ts` emit an
  empty `front.elements` so there is nothing to strip. This is load-time enforcement on purpose:
  templates live in Firestore, so cards stored before the rule existed are cleaned up without a
  migration. Only the front is affected — the inside-right message (where the customer writes) and
  the back brandmark must survive. Covered by `scripts/frontCover.check.ts` and
  `scripts/templateGenerator.check.mjs`; don't re-add `headline`/`subText` to the generators.
- **The catalog is Firestore-backed and nothing is bundled.** `templates/{id}` is the source of
  truth. `src/data/templates.ts` is an 89-line in-memory mirror only — it holds no template data and
  there is no seed/fallback. Do NOT add templates back to `src/`. Every lookup goes through
  `getLiveCatalog()` (or `getTemplateById` and friends, which read it). `CatalogProvider` (mounted in
  App.tsx) owns the only `onSnapshot` subscription and calls `setLiveCatalog`.
- **An empty catalog is a real state, not a bug.** The storefront renders empty states (Browse says
  "No cards found matching your criteria"; Home hides its card sections) rather than silently showing
  stale data. The admin console reports `empty` and points at Occasions & Studio. Creating a card
  there now writes to Firestore — if that write is ever removed, the store can no longer be populated
  at all.
- **`scripts/catalog.manifest.json` is the build's view of the catalog.** Prerendering the static
  card pages and `covers.check.mjs` both read it, because the build has no Firebase credentials.
  Regenerate it with `node scripts/export-manifest.mjs` (uses the Vite SSR loader; there is no longer
  a bundled catalog for it to read, so the manifest is now a maintained artifact). Prerender also
  copies the referenced covers into `dist/covers/`, since Vite no longer emits images nothing imports.
- **Deleting a template is a soft delete.** It stamps `deletedAt` so past orders, saved designs and
  favourites keep resolving, and the storefront filters retired docs out. Restore comes back from the
  admin "Retired" tab. `purgeTemplate` (real `deleteDoc`) exists but must only be used for cards that
  were never sold or customised. Bulk deletes go through `bulkDeleteTemplate` (batched, 500/batch) —
  do not loop `deleteTemplate` per row, it is one round trip each.
- **Catalog selection is scoped to the rendered rows** (`PAGE_SIZE`, currently 50). An effect prunes
  ticked ids that fall out of view, and switching between the live and retired views or changing the
  category filter clears the selection, so a bulk delete can never remove a card the admin cannot
  see. Shift-click applies the *opposite* of the anchor's state (file-manager semantics). This logic
  is mirrored in `scripts/catalogSelect.check.mjs` — update both together.
- **Retiring a card does not reach the static build on its own.** `scripts/prerender.mjs` runs
  offline and reads the manifest, so pass retired ids in via `RETIRED_TEMPLATE_IDS=…` or
  `scripts/retired-templates.json`; the script then skips them and deletes any stale
  `dist/card/<id>/`. Keep that list in sync or crawlers keep indexing a deleted card.
- **`/admin/` is gated in the UI but Firestore rules are the real boundary.** The route only renders
  for `isAdmin`, and the Footer link is hidden from everyone else. The rules still check a
  hardcoded email — see the Admin authorization blocker below.

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

**State:** `firestore.rules` now routes catalog writes through an `isAdmin()` helper that still
checks `request.auth.token.email == 'blogdoontv@gmail.com'`. `.env.example` also documents a local
developer admin session fallback used when the OAuth domain is unauthorised. The `/admin/` route is
gated in React (`AdminGate` in App.tsx, Footer link hidden) but that is cosmetic — rules are the
boundary, and a client-side check is not authorization.

**Implement:** set an `admin` custom claim via the Firebase Admin SDK and change `isAdmin()` to
`request.auth.token.admin == true`; delete the dev-admin fallback or hard-gate it to `localhost`;
confirm `storage.rules` follows the same model. Note that the dev-admin fallback mints a **local
admin session** on `auth/unauthorized-domain`, so on any unconfigured host a visitor is an admin
in the UI — the custom claim fixes the rules side of this, the fallback fix closes the UI side.

**Done when:** a second, non-admin account is denied template writes, and a production build
contains no dev session path. (Rules otherwise look sound: default-deny, owner-scoped
designs/favorites, orders immutable after creation, template ids immutable once written.)

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
