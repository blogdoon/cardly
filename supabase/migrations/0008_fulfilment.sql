-- Cardly — order fulfilment: the `print-files` bucket and the `order_print_files`
-- table that records what was produced for a paid order.
--
-- WHY THIS EXISTS. This is AGENTS.md production blocker 2, and it is the one that
-- stops a real launch: until now a paid customer received nothing. `stripe-webhook`
-- flipped an order to `processing` and that was the end of it — no print file, no
-- email, nothing to hand a printer. Each order item already carries the customer's
-- `designSnapshot` in `items` (written by `create-checkout`), so the raw material
-- was on the row and unused.
--
-- WHAT IS ACTUALLY STORED HERE. The `fulfil-order` Edge Function renders that
-- snapshot through `_shared/printLayout.ts` — the same pure renderer contract the
-- browser's PrintPreview follows — and writes the result here. Every row is one
-- artefact for one order: the object key in `print-files`, the item it belongs to,
-- and what it is (the duplex print sheet, or the raw HTML the PDF was made from).
--
-- THE THREAT MODEL, which is the opposite of 0006_media.sql and must not be merged
-- with it. A print file contains the customer's finished card AND their shipping
-- name and address on the spec page. `card-media` is PUBLIC because an anonymous
-- phone holding a printed card has to fetch it; this bucket is PRIVATE because
-- nothing about a fulfilment job is ever shown to the recipient. Read access is:
--
--   * an admin, through the same public.is_admin() helper every other store policy
--     uses, so the console and the database cannot disagree; and
--   * the customer who owns the order, so they can download a keepsake or a
--     reprint of what they bought. Scoped to their OWN orders by a subquery — the
--     alternative, a policy keyed on the caller alone, would let any signed-in
--     person read any print file in the system.
--
-- Guests (`user_id = null`, which `create-checkout` allows) therefore cannot read
-- their own print file: there is no account to scope the policy to. That is the
-- correct limit, not an oversight — the operator still can, which is what
-- fulfilment needs.
--
-- `print-files` is written only by the service role (the Edge Function). There is
-- no customer insert policy at all, mirroring the reasoning in 0004_payments.sql:
-- a client that can write an artefact can lie about what it produced.
--
--   supabase db:reset   (or apply this file in the SQL editor)

-- ---------------------------------------------------------------------------
-- 1. The table.
--
-- `storage_path` holds the object key within the bucket, never a URL, so the
-- bucket can be re-pointed without rewriting rows — the same convention
-- `card_media` uses.
--
-- `item_index` is the position in the order's `items` array rather than the
-- cart line id: `items` is jsonb with no stable key we can join on, and the
-- operator needs "the 2nd card on this order", which is what the array position
-- means to them. `qty` repeats the line quantity because a print run of 5 needs 5
-- sheets and the artefact is one file describing all of them.
--
-- `checksum` is a sha256 of the bytes actually written, so an operator can prove
-- the file they are holding is the file the function produced, and a re-render
-- that changed nothing is detectable.
-- ---------------------------------------------------------------------------
create table if not exists public.order_print_files (
  id           text primary key,
  order_id     text not null references public.orders (id) on delete cascade,
  item_index   integer not null default 0,
  -- 'print_sheet' is the duplex PDF an operator prints; 'source_html' is the
  -- pre-PDF render kept so a layout change can be re-run without the snapshot.
  kind         text not null check (kind in ('print_sheet', 'source_html')),
  storage_path text not null,
  byte_size    bigint,
  checksum     text,
  qty          integer not null default 1 check (qty >= 1),
  -- Printed paper size of the artefact, e.g. '302x216'. Recorded so an operator
  -- can tell a mis-sized file from a correct one without opening it.
  sheet_mm     text,
  -- Set when the item had no usable designSnapshot. A blank card is worse than a
  -- slow one, so this is surfaced in the admin console rather than swallowed.
  warning      text,
  -- Set once a printer API accepts it (Gelato/Prodigi). Null means the artefact
  -- is ready and waiting for a human, which is a legitimate end state.
  printer      text,
  printer_ref  text,
  created_at   timestamptz not null default now()
);

-- The admin console lists "this order's files", newest first.
create index if not exists order_print_files_order_idx
  on public.order_print_files (order_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 2. The bucket, private, idempotently.
--
-- The `on conflict ... where` shape is copied from 0005_storage.sql, and so is
-- the direction, which is the safety property: the ONLY value this migration can
-- ever write here is public = false. Applying it — first time, or to a project
-- that predates it — cannot make a customer's name and address world-readable.
-- Compare 0006_media.sql, where the only writable value is true, for the opposite
-- threat model. Read that asymmetry before changing either line.
--
-- Keys are <order_id>/<file>, so a listing exposes nothing an order id does not
-- already protect, and one order's artefacts never share a prefix.
-- ---------------------------------------------------------------------------
insert into storage.buckets as b (id, name, public)
values ('print-files', 'print-files', false)
on conflict (id) do update
  set public = false
  where b.public is distinct from false;

-- ---------------------------------------------------------------------------
-- 3. Row policies.
--
-- Read is admin-or-own-order. The ownership check is a subquery against `orders`
-- rather than reading `user_id` off this table, because a guest order has none and
-- `auth.uid()` must still be matched against the real owner.
--
-- Writes are nobody's but the service role's. There is deliberately no insert,
-- update or delete policy here: the Edge Function uses the service role, which
-- bypasses RLS, and an admin console that needs to annotate a row (say, after a
-- printer accepts it) goes through `fulfil-order`, not through a client write.
-- A table with RLS on and no write policy is locked, which is the intent.
-- ---------------------------------------------------------------------------
alter table public.order_print_files enable row level security;

drop policy if exists order_print_files_select_own on public.order_print_files;
create policy order_print_files_select_own on public.order_print_files
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.orders o
      where o.id = order_print_files.order_id
        and o.user_id = auth.uid()
    )
  );

-- Storage-object access for the `print-files` bucket lives in
-- 0007_storage_policies.sql, alongside `user-photos` and `card-media`. It is not
-- repeated here on purpose: enabling RLS on `storage.objects` and writing one
-- policy per bucket are a single unit of work, and splitting them across two
-- files is how the bucket ended up with no object policies at all in the first
-- place (see the header of 0007).

-- ---------------------------------------------------------------------------
-- 4. Fulfilment bookkeeping on the order itself.
--
-- `print_files_ready_at` is what the webhook stamps once every item has an
-- artefact. It is the honest signal for "this order can go to a printer", and it
-- is deliberately separate from `status`: an order is `printed` only when a human
-- or a printer API says so, and conflating the two would let a render count as
-- having been printed.
--
-- These are fulfilment columns, so the `guard_order_columns()` trigger in
-- 0002_rls.sql already permits an admin to write them — it pins `total`, `items`
-- and the address as immutable and leaves everything else forward-moving.
-- ---------------------------------------------------------------------------
alter table public.orders add column if not exists print_files_ready_at timestamptz;
alter table public.orders add column if not exists fulfilled_at timestamptz;
