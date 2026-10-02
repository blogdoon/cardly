-- Cardly — audio/video memories: the `card_media` table, the `card-media`
-- bucket, and the access rules for both.
--
-- WHY THIS EXISTS. A printed card cannot play sound. What it can carry is a QR
-- code, and the recipient's phone plays the memory from a URL. So a customer
-- uploads a clip in the editor, it lands in Storage, a row in this table records
-- it, and the QR on the printed card points at /media/<id>/. Everything here
-- exists to make that one link safe.
--
-- THE THREAT MODEL, stated plainly because it is the whole design. A physical
-- card is not a capability: anyone holding it can photograph the QR and share
-- the link. So this media is public by necessity — the recipient is a stranger
-- with no account and no session. Two consequences follow, and both are
-- deliberate:
--
--   1. The row id IS the secret. It must be unguessable, so the service mints it
--      with crypto.randomUUID(), exactly as shareService does for shared_cards.
--      Never a sequential id, never the design id, never the order id — all three
--      are guessable and all three would expose someone's family video.
--   2. The bucket is PUBLIC. A private bucket cannot be read by an anonymous
--      phone, and a signed URL would expire — the link is printed on paper and
--      has to work for years. This is the deliberate opposite of the
--      `user-photos` bucket in 0005_storage.sql, which is private because a
--      customer photo is only ever shown back to its owner inside the app. The
--      two buckets have opposite threat models and must not be merged; the
--      contrast is the reason they are separate files.
--
-- What the row must never contain: an address, a name, an order id, or anything
-- else identifying. `title` is the customer's own words for the clip and is the
-- only free text. The scan page shows title + media, nothing else — same rule
-- shared_cards follows, for the same reason.
--
--   supabase db:reset   (or apply this file in the SQL editor)

-- ---------------------------------------------------------------------------
-- 1. The table.
--
-- owner_id is nullable on purpose: guest checkout is allowed to attach a memory
-- (supabase/migrations/0004_payments.sql lets create-checkout write an order with
-- user_id = null), and refusing the media would make the feature fail for exactly
-- the customers who have not signed up. A null owner cannot update or delete the
-- row, which is the correct limit for an anonymous author.
--
-- storage_path holds the object key within the bucket, never a URL. The URL is
-- derived on read, so re-pointing the bucket (or a future CDN) does not require
-- rewriting rows.
-- ---------------------------------------------------------------------------
create table if not exists public.card_media (
  id            text primary key,
  -- Null for a guest. on delete set null, not cascade: the memory is already
  -- public, and losing it when an account closes would break a printed card.
  owner_id      uuid references public.profiles (id) on delete set null,
  kind          text not null check (kind in ('audio', 'video')),
  storage_path  text not null,
  -- Advisory only. The browser enforces the real ceiling before upload; this
  -- column is for the admin console and for noticing a client that was edited.
  byte_size     bigint,
  -- The customer's own caption. Displayed on the scan page, so it must be short.
  title         text not null default '',
  -- Seconds, measured in the browser. Never rendered as a guarantee of length.
  duration_seconds numeric,
  created_at    timestamptz not null default now()
);

-- The scan page looks up by id and nothing else; every other access is by owner.
create index if not exists card_media_owner_idx on public.card_media (owner_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 2. The bucket, public, idempotently.
--
-- The `on conflict ... where` shape is copied from 0005_storage.sql so this file
-- reads the same way, but the direction is inverted and the reason is the
-- opposite: here the ONLY value this migration can ever write is public = true,
-- because an anonymous phone has to be able to fetch the object. Compare
-- user-photos, where the only writable value is false. Read that asymmetry before
-- changing either line — it is the safety property of both migrations.
--
-- Keys are <uuid>/<file>, so a public listing still exposes nothing a UUID does
-- not already protect, and one customer's objects never share a prefix.
-- ---------------------------------------------------------------------------
insert into storage.buckets as b (id, name, public)
values ('card-media', 'card-media', true)
on conflict (id) do update
  set public = true
  where b.public is distinct from true;

-- ---------------------------------------------------------------------------
-- 3. Row policies.
--
-- Read is public for the same reason the bucket is: the recipient of a printed
-- card is anonymous. Write is owner-only, so nobody can publish a row pointing at
-- someone else's object, and a guest (owner_id null) can never write at all.
-- ---------------------------------------------------------------------------
alter table public.card_media enable row level security;

drop policy if exists card_media_select_public on public.card_media;
create policy card_media_select_public on public.card_media
  for select using (true);

drop policy if exists card_media_insert_owner on public.card_media;
create policy card_media_insert_owner on public.card_media
  for insert with check (owner_id is not null and owner_id = auth.uid());

drop policy if exists card_media_update_owner on public.card_media;
create policy card_media_update_owner on public.card_media
  for update using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists card_media_delete_owner on public.card_media;
create policy card_media_delete_owner on public.card_media
  for delete using (public.is_admin() or owner_id = auth.uid());