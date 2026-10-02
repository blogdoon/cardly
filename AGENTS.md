# AGENTS.md — read this before changing Cardly

Vite + React 19 SPA (no server), Supabase (Auth, Postgres + RLS, Storage). The 325 card templates
live in the `templates` table — `src/data/templates.ts` is only a mirror. Commands:

```
npm run dev      # vite, port 3000
npm run lint     # tsc --noEmit
npm test         # scripts/*.check.* — routes, covers, facets, pricing, front cover, generator, …
npm run build    # vite build + scripts/prerender.mjs (static HTML per card, robots.txt, sitemap.xml)
bash scripts/rls.sh   # apply the migrations to a throwaway Postgres + run the policy tests
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
- **Orders are the customer's record, and admins may only move fulfilment forward.**
  `supabase/migrations/0002_rls.sql` pins admin order updates to `status`, `trackingNumber`,
  `carrier`, `dispatchedAt`, `refund`, `cancelReason`, `adminNote`, `updatedAt` — `total`, `items`
  and the address are blocked by the `guard_order_columns()` trigger. Customers have no update
  policy on `orders` at all, and no insert policy either: an order is created by the
  `create-checkout` Edge Function (`supabase/migrations/0004_payments.sql`), which recomputes the
  total from the `templates` table. `adminOrderService.ts` is the only client-side writer, the
  payments functions are the only ones that may create an order or say it was paid.
- **No fabricated data.** There is no seeded demo order (it is purged from existing localStorage on
  read) and no hardcoded ratings. `template.rating` / `reviewCount` are recomputed from **approved**
  reviews by `recomputeTemplateRating`, so pending reviews never move what customers see. If you add
  marketing numbers ("4.9/5 from 12,000+ reviews"), they must come from a real aggregate. The
  generators used to violate this (`rating: 4.9, reviewCount: 45 + (i*13)%180`, and
  `5.0/1 + isPopular: true` on create); they now emit `0/0` and `isPopular: false`, and
  `buildTemplateFacets` preserves whatever is stored rather than resetting it — the database is the
  source of truth and this runs on the read path.
- **Every browse facet is a real, queryable column on `templates`.** `Browse.tsx` filters on
  `category`, `recipient`, `style`, `isPhotoCard`, `milestoneAge` and `price`; since the catalog is
  Postgres-backed, each one must be stored rather than inferred at render. `buildTemplateFacets` in
  `utils/templateFacets.ts` is the single place that decides them:
  `ARTWORK_FACETS` is a hand-assigned slug → `{style, recipient, tone, season, tags}` map (keyed by
  artwork filename, separator-agnostic), `DEFAULT_FACETS` covers admin uploads, and every value is
  coerced against the `RECIPIENT_TYPES` / `STYLE_TYPES` / `TONE_TYPES` / `SEASON_TYPES` arrays so a
  hand-edited doc can't hold a value no filter accepts. Both generators call it, `toCatalogDocument`
  enforces it on write, and `mergeCatalog` backfills on read — so templates stored before facets
  existed correct themselves with no migration (the `frontCover.ts` pattern). **Never reintroduce a
  blanket `recipient: 'Anyone'` / `style: 'Floral'` default** — that is what made the recipient,
  style, photo and milestone facets match nothing. Covered by `scripts/templateFacets.check.ts` and
  `scripts/templateGenerator.check.mjs`; the generator check asserts the artwork is *not* all one
  style/recipient and that nothing fabricates a rating.
  `milestoneAge` is deliberately left unset for generic art — it means "Turning 50"-style
  age-specific cards (see `utils/occasions.ts`), so putting it on a general birthday card would
  badge it with an age it does not target. The only ages accepted are `MILESTONE_AGE_VALUES`,
  which `data/categories.ts` re-exports as `MILESTONE_AGES` so there is one list, not two.
- **`recipients` and `styles` are arrays; the Browse facets multi-select.** A card for a "Friend"
  is also for a "Best Friend", and a felt-craft card is both "Cute" and "Retro" — a single value
  made those cards unreachable from half the facets. `Browse.tsx` ORs *within* a facet and ANDs
  *across* them. List facets are comma-separated in the URL (`?style=Cute,Retro`) so a
  multi-select is still one shareable link; `splitFacet` in `utils/routes.ts` is the only reader.
  `q` is a single phrase and must never be comma-split. A stored scalar `recipient`/`style` from
  before this change is widened to an array on read, which is how those documents migrate.
- **`isPhotoCard` is derived from `personalization`, never set by hand.** They were independent
  fields that could disagree, and nothing in the app ever set it true — so `?photo=1` was
  permanently empty. A card is a photo card iff `personalization` includes `photo`, which only the
  studio's "blank Photo Card" toggle (or the facet editor) sets.
- **`isNew` is a time box, not a latch.** `isNewWithin(createdAt)` is true for 90 days
  (`NEW_FOR_DAYS`); the generators no longer hardcode `isNew: true`, so the badge actually expires.
- **The colour facet is derived from the card's palette, and the palette is a design choice.**
  `colorsFrom()` buckets each swatch into a `ColorFamily` via HSL. Each entry in `ARTWORK_FACETS`
  carries its own `palette`; without it every card shared one brand palette, so `?color=` was
  *populated but useless* (all 17 cards matched `orange`) — worse than empty, because it looked
  like it worked. `templateGenerator.check.mjs` asserts the palettes are not all identical.
- **Prices vary by style tier.** `priceForStyles()` in `occasionTemplateLoader.ts`; every card was
  4.29, which made `?maxPrice=` a no-op. Stored `price` is the *standard* size price, and
  `priceRangeFor()` derives the full band from the size multipliers rather than storing a range
  that could drift from the checkout.
- **Facets are editable in the admin.** `TemplateFacetEditor` writes through the same
  `upsertTemplate` the studio uses, so `adminOrderService`-style single-writer discipline holds.
  Before it, the only admin mutation was the bestseller toggle, so a card filed in the wrong bucket
  could only be fixed by delete-and-recreate — which changes the id that past orders, saved designs
  and favourites reference. If you add a facet field, add a control for it here too.
- **Reviews require a purchase and moderation.** The review doc id is pinned to
  `${orderId}_${templateId}` (one review per order per card) and every review is created as
  `pending`; only an admin may publish. The order check is server-side: the `reviews_insert_purchaser`
  policy in `supabase/migrations/0002_rls.sql` verifies the order is the caller's and *contains* the
  template (`items @> …`) — the gap the old rules had to leave to a client assertion.
- **The admin console reads the database, never the browser.** It used to read `getLocalOrders()` —
  the operator's own localStorage — so revenue could never be real. Orders come from one query in
  `adminOrderService.ts`. Guest orders used to be localStorage-only and invisible there;
  `create-checkout` now writes them server-side with `user_id = null`, so every paid order shows up.
  The revenue figure counts money actually taken: `pending_payment`, `cancelled` and `refunded`
  orders are excluded.
- **Euro only, Europe only.** The store has no multi-currency support and does not ship outside
  Europe. All amounts are plain EUR numbers. Never inline a currency glyph — use
  `formatPrice` / `formatPriceCompact` from `src/utils/currency.ts`; the checkout country list comes
  from `SHIPPING_COUNTRIES` there, and the delivery tiers from `src/utils/delivery.ts` (shared so
  the cart estimate and the checkout charge can never drift apart). `scripts/prerender.mjs` has its
  own `formatPrice` that must match the TS one. The server's copy of the price list lives in
  `supabase/functions/_shared/pricing.ts` (sizes, envelopes, finishes, delivery tiers, promos) and
  `scripts/paymentPricing.check.ts` fails `npm test` if it drifts from these sources — that copy is
  what actually gets charged.
- **A template's front (first side) is artwork only — no baked-in text.** The customer writes their
  own wording. Enforced by `editablePagesFrom` / `stripFrontText` in `src/utils/frontCover.ts`, which
  the editor and the card-detail previews use; the generators in `occasionTemplateLoader.ts` emit an
  empty `front.elements` so there is nothing to strip. This is load-time enforcement on purpose:
  templates live in the database, so rows written before the rule existed are cleaned up without a
  migration. Only the front is affected — the inside-right message (where the customer writes) and
  the back brandmark must survive. Covered by `scripts/frontCover.check.ts` and
  `scripts/templateGenerator.check.mjs`; don't re-add `headline`/`subText` to the generators.
- **The catalog is Supabase-backed and nothing is bundled.** The `templates` table is the source of
  truth. `src/data/templates.ts` is an in-memory mirror only — it holds no template data and there is
  no seed/fallback. Do NOT add templates back to `src/`. Every lookup goes through
  `getLiveCatalog()` (or `getTemplateById` and friends, which read it). `CatalogProvider` (mounted in
  App.tsx) owns the only `subscribeToCatalog` subscription and calls `setLiveCatalog`.
- **An empty catalog is a real state, not a bug.** The storefront renders empty states (Browse says
  "No cards found matching your criteria"; Home hides its card sections) rather than silently showing
  stale data. The admin console reports `empty` and points at Occasions & Studio. Creating a card
  there now writes to the `templates` table — if that write is ever removed, the store can no longer
  be populated at all.
- **`scripts/catalog.manifest.json` is the build's view of the catalog.** Prerendering the static
  card pages and `covers.check.mjs` both read it, because the build has no Supabase credentials.
  Regenerate it with `node scripts/export-manifest.mjs` (uses the Vite SSR loader; there is no longer
  a bundled catalog for it to read, so the manifest is now a maintained artifact). Prerender also
  copies the referenced covers into `dist/covers/`, since Vite no longer emits images nothing imports.
- **Deleting a template is a soft delete.** It stamps `deletedAt` so past orders, saved designs and
  favourites keep resolving, and the storefront filters retired docs out. The admin **Retired** tab is
  where they come back from — or go for good: **Restore** puts one back, **Erase** (per row or on a
  selection) removes the row from Postgres. Erase goes through `purgeRetiredTemplates`, which refuses
  anything not yet retired *and* anything that appears in an `orders.items` payload — a sold card has
  no foreign key protecting it, so that jsonb containment check is the only thing between a purge and
  a broken customer record (and a cascaded-away review). `purgeTemplate` is a thin wrapper over the
  same path; do not add a second one. Bulk retires go through `bulkDeleteTemplate` (one statement) —
  do not loop `deleteTemplate` per row. Who may delete at all is asserted in `scripts/rls.sh`.
- **Catalog selection is scoped to the rendered rows** (`PAGE_SIZE`, currently 50). An effect prunes
  ticked ids that fall out of view, and switching between the live and retired views or changing the
  category filter clears the selection, so a bulk delete can never remove a card the admin cannot
  see. Shift-click applies the *opposite* of the anchor's state (file-manager semantics). This logic
  is mirrored in `scripts/catalogSelect.check.mjs` — update both together.
- **Retiring a card does not reach the static build on its own.** `scripts/prerender.mjs` runs
  offline and reads the manifest, so pass retired ids in via `RETIRED_TEMPLATE_IDS=…` or
  `scripts/retired-templates.json`; the script then skips them and deletes any stale
  `dist/card/<id>/`. Keep that list in sync or crawlers keep indexing a deleted card.
- **What gets printed is the order item's `designSnapshot`, never the live design or the template.**
  Fulfilment renders `items[].designSnapshot`, which `create-checkout` copied at purchase time, so a
  template edited or retired afterwards cannot change a placed order. The corollary is the trap: any
  `addItem` call that omits `designSnapshot` produces an order that cannot be printed, and
  `Account.getOrderCardDesign` will quietly fall back to template defaults — a blank card with no
  message, mailed to a paying customer. `CardEditor` and the card-detail quick-add both supply one
  (`designSnapshotFromTemplate` for the latter, which also routes through `editablePagesFrom` so the
  artwork-only front rule holds). Add a snapshot to any new add-to-cart path.
- **`_shared/printLayout.ts` is the print renderer, and `PrintPreview.tsx` is its twin.** Two
  renderers of one card is the obvious shape for silent drift: if one learns an element type the
  other lacks, the printed card is missing something the customer added, and no error fires because
  each renderer is individually fine. `scripts/printLayout.check.ts` diffs the element types both
  handle and fails on divergence. The same check pins `PRINT_SIZES` (`_shared/printSizes.ts`) to the
  `CARD_SIZES` the storefront advertises *and charges* — those millimetres are a promise to the
  customer. `@page` is set to the real sheet size in mm including bleed, so a printer left on 100%
  cannot silently resize the card. **Never inline a glyph for a sheet size**; use `PRINT_SIZES`.
- **`print-files` is private and holds PII; `card-media` is public and must stay that way.** The two
  have opposite threat models and must not be merged: a print file carries the customer's finished
  card *and their shipping address* on the spec page, while a memory is fetched by an anonymous phone
  holding a printed card. Read a print file via `createSignedUrl` (`printService.printFileUrl`) —
  `getPublicUrl` returns a URL that 404s for a private bucket, which is the same bug
  `0005_storage.sql` warns about on the photo path. **A bucket is only as private as the policies on
  `storage.objects`**: `0007_storage_policies.sql` enables RLS there and writes one policy per bucket,
  because 0005/0006 shipped with the rules described only in comments and no enforcement at all.
- **A stored print file is not a printed card.** `orders.print_files_ready_at` means "this can go to a
  printer"; `status = 'printed'` means a human or a printer API said so. Do not conflate them.
  `print_files_ready_at` and `fulfilled_at` are fulfilment columns, so `guard_order_columns()`
  already lets an admin write them while still blocking `total`, `items` and the address.
- **`handOffToPrinter` degrades, it never fabricates.** With no `PRINTER_*` secrets it returns
  `skipped` and the console says "print by hand"; a printer rejection is reported, not thrown, because
  the print file is already stored and the order stays fulfillable. Same rule as the rest of the store:
  no invented order ids, no "sent" that did not send. A half-configured printer (some of the three
  secrets) is refused outright.
- **`/admin/` is gated in the UI but RLS is the real boundary.** The route only renders for
  `isAdmin`, and the Footer link is hidden from everyone else. `is_admin()` in
  `supabase/migrations/0002_rls.sql` reads `auth.users.raw_app_meta_data`, which the browser cannot
  write — no hardcoded email anywhere (see blocker 3 for what is left to verify).

---

# Production blockers (implement in this order)

## 1. Payments — implemented, needs keys and a deploy

**State:** the simulated step is gone. `src/pages/Checkout.tsx` posts the basket to the
`create-checkout` Edge Function, which recomputes the total from the `templates` table plus
`_shared/pricing.ts`, writes the order as `pending_payment`, creates a Stripe Checkout Session and
returns its hosted URL — the browser is redirected, so no card number, no publishable key and no
Stripe SDK ever enter the bundle. The signed `stripe-webhook` is the only thing that can move an
order to `processing` (`paid_at` stamped, idempotent on replay); an expired session becomes
`cancelled`. `/checkout/success/` renders the order the server built (stashed across the redirect)
and records it in local history.

**Left to do (keys and deployment, not code):**

- `supabase functions deploy create-checkout` and `… deploy stripe-webhook --no-verify-jwt`
- `supabase secrets set STRIPE_SECRET_KEY=… STRIPE_WEBHOOK_SECRET=… SITE_ORIGIN=…`
- Stripe webhook endpoint → `https://<ref>.supabase.co/functions/v1/stripe-webhook` for
  `checkout.session.completed` and `checkout.session.expired`
- apply `supabase/migrations/0004_payments.sql`

**Done when:** Stripe test card `4242 4242 4242 4242` produces a real charge, the order row flips
from `pending_payment` to `processing` only after the webhook (kill the webhook and it must stay
pending), and a client-side `createOrder` insert is rejected by RLS.

## 2. Order fulfilment — implemented, needs a PDF renderer and (optionally) a printer

**State:** built. On `checkout.session.completed` the `stripe-webhook` calls the **`fulfil-order`**
Edge Function, which renders each order item's `designSnapshot` through
`supabase/functions/_shared/printLayout.ts`, uploads it to the **private** `print-files` bucket, and
records a row in `order_print_files` (`0008_fulfilment.sql`). It then stamps
`orders.print_files_ready_at` — deliberately *not* `status`, so a render never counts as "printed".

Two pieces of that design are load-bearing:

- **`printLayout.ts` is the single renderer.** `PrintPreview.tsx` is what the customer approves, so
  the print file must be the same drawing — if fulfilment rendered the card its own way, the card in
  the post would not be the card that was bought, and nothing would error because both renderers
  would be individually correct. `scripts/printLayout.check.ts` compares the element types each one
  handles and fails if they diverge. It also pins `PRINT_SIZES` to the `CARD_SIZES` the storefront
  advertises and charges: a card sold as "148 x 210 mm" that prints at A6 is a refund.
- **The order item is the source of truth for the design, not the design table.** `create-checkout`
  copies `designSnapshot` into `items`, so a later template edit or retirement cannot change what a
  placed order prints. Anything that adds to the cart **without** a snapshot therefore buys an
  unprintable card — `designSnapshotFromTemplate` in `frontCover.ts` is what the card-detail quick-add
  uses, and it runs the pages through `editablePagesFrom` so the artwork-only-front rule holds there
  too.

`0007_storage_policies.sql` also fixes a **pre-existing security hole**: `0005_storage.sql` and
`0006_media.sql` created buckets and described access rules in their comments, but neither ever
enabled RLS on `storage.objects` nor wrote a policy against it — and a policy on a table without RLS
is inert. Every customer's `user-photos` object was readable by any signed-in user through the
authenticated API. The tell is that every *positive* read assertion passed anyway; only the negatives
catch it, which is why `supabase/tests/rls.sql` is heavy on them.

**Left to do (configuration, not code):**

- `supabase functions deploy fulfil-order`
- `supabase secrets set PDF_RENDER_URL=…` — a headless-Chromium service that takes `{html}` and
  returns a PDF. **Without it the PDF is skipped, not faked**: the render HTML is still stored as
  `source_html` and the admin console reports it, so an operator can open and print it by hand.
  Local proof: `chromium --headless --print-to-pdf=out.pdf file://…` yields the right sheet size.
- Optionally `PRINTER_API_URL` / `PRINTER_API_KEY` / `PRINTER_NAME` — all three or none. With none,
  `handOffToPrinter` returns `skipped` and the console says "print by hand from the download". It
  never fabricates a printer order id. A printer rejection degrades to `skipped` rather than
  throwing, because the print file is already stored.

**Done when:** an end-to-end test order yields a stored print file the admin console can open. The
confirmation **email is still not implemented** — see below.

**Still not done (was part of the original scope):** no email is sent to the customer on dispatch.
That needs an email provider (Resend/Postmark) and a second trigger; the print file is stored and
downloadable by the customer under their own order via `printService.printFileUrl`.

## 3. Admin authorization — verify, mostly implemented

**State:** `supabase/migrations/0002_rls.sql` defines `is_admin()` reading
`auth.users.raw_app_meta_data ->> 'is_admin'`, and `0003_bootstrap_admin.sql` promotes the **first**
user to admin in a trigger — no hardcoded email. The client reads the same flag off its JWT
(`authService.loadProfile`), so the UI and RLS cannot disagree. The local dev admin session in
`authService.ts` now throws off-loopback, but that code still ships in the production bundle.

**Implement:** confirm on a deployed build that a second, non-admin account is denied template writes
and cannot reach `/admin/`; consider tree-shaking or feature-flagging the demo session out of the prod
bundle. The Storage half of this is **done**: `0007_storage_policies.sql` enables RLS on
`storage.objects` and routes `user-photos`, `card-media` and `print-files` through the same
`is_admin()` helper — which closed a real hole, see blocker 2.

**Done when:** a second, non-admin account is denied template writes from a production build, and
off-loopback the demo session cannot be reached. (Policies otherwise look sound: default-deny,
owner-scoped designs/favorites, orders immutable for customers, `(order_id, template_id)` primary key
on reviews.)

## 4. Deploy configuration — cheap, ship with any release

- Set **`SITE_ORIGIN`** at build time — canonical/og/robots/sitemap currently default to
  `https://cardly.app`.
- Set **`VITE_GA_ID`** (GA4) if analytics are wanted; it is inert otherwise.
- **404s return HTTP 200** on unknown paths (client-side route). Add host rewrites
  (`try_files $uri $uri/ /index.html`) — status codes affect crawling.
- **No `package-lock.json`** (only `bun.lock`), so CI runs `npm install` non-deterministically.
  Generate and commit a lockfile.

## Known minor issues (not blockers)

- **`npm test` currently fails on two catalog checks, and it is not the fulfilment work.** 71 newly
  added artwork files under `src/assets/images/occasions/{christmas,get-well,wedding}/` have no entry
  in `ARTWORK_FACETS` (`src/utils/templateFacets.ts`), so `templateFacets.check.ts` fails, and the
  resulting single-style/single-recipient artwork fails
  `templateGenerator.check.mjs` too. Verified pre-existing: both pass at `HEAD` and fail on the
  working tree. Fix by assigning each new artwork a real `{style, recipient, tone, season, tags, palette}`
  — the same rule as the existing entries, and never a blanket default.
- Two handcrafted base archetypes still share a cover within the Birthday grid (cake ×2, art-deco
  ×2) — only 18 studio photos exist for 166 photo cards, ~9 reuses each is the floor.
- No automated tests for the editor / save / checkout flows; the checks in `npm test` are static, and
  there is no visual regression coverage. `scripts/printLayout.check.ts` asserts the print renderer's
  *output properties* (escaping, sheet size, duplex order, element coverage) but not its pixels —
  a rendering regression in layout would need a human to look at a print file.

## Verification before claiming anything done

```
npm run lint && npm test && npm run build
chromium --headless --no-sandbox --dump-dom http://localhost:4173/<route>   # after vite preview
```
