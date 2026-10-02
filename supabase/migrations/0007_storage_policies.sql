-- Cardly — RLS on `storage.objects`, and the policies every bucket needs.
--
-- WHY THIS FILE EXISTS, and it is a security fix rather than a feature.
--
-- 0005_storage.sql and 0006_media.sql create their buckets and their headers
-- promise access rules, but NEITHER of them ever enables row level security on
-- `storage.objects` or writes a single policy against it. `storage.objects` is
-- the table every object in every bucket is read through, and a policy on a
-- table whose RLS is not enabled is INERT — Postgres does not error, it does not
-- warn, it simply does not apply the policy. Both files therefore shipped with
-- the access rules described in their comments existing only as prose.
--
-- The concrete exposure, found while writing the fulfilment policies in
-- 0008_fulfilment.sql and caught by scripts/rls.sh:
--
--   * `user-photos` is a PRIVATE bucket, so its objects are not served by the
--     public endpoint — but `storage.objects` had no RLS and no policy, so any
--     signed-in user could list and read every other customer's uploaded photos
--     through the authenticated storage API. A private bucket is only as private
--     as the policies on the table behind it.
--   * `print-files` would have inherited exactly the same hole, and worse: those
--     files carry a shipping name and address.
--
-- The tell is the shape of the failure, and it is worth stating because it is the
-- kind of bug that looks like a working feature: with RLS off, EVERY read
-- assertion passes. A test written as "the owner can read their file" would go
-- green and prove nothing, while "a stranger cannot read it" is the assertion
-- that actually catches it. That is why the negatives are the ones that matter
-- in supabase/tests/rls.sql.
--
-- Also note that enabling RLS here is what makes the *bucket* `public` flag
-- meaningful. In Supabase the public endpoint bypasses these policies entirely
-- (that is how 0006_media.sql serves an anonymous phone), while the
-- authenticated API goes through them. So `card-media` being public and
-- `user-photos` being private is enforced by two different mechanisms, and both
-- now exist.
--
--   supabase db:reset   (or apply this file in the SQL editor)

-- ---------------------------------------------------------------------------
-- 1. Enable RLS on the objects table.
--
-- The one line the other two storage migrations were missing. In production
-- Supabase already has RLS on this table, so this is a no-op there; it matters in
-- the throwaway cluster scripts/rls.sh builds, and it documents the invariant.
-- ---------------------------------------------------------------------------
alter table storage.objects enable row level security;

-- ---------------------------------------------------------------------------
-- 2. `user-photos` — owner-scoped, admin too.
--
-- Scoped by the FIRST path segment, which is what uploadUserPhoto
-- (src/services/cardStorage.ts) already writes: `${effectiveUserId}/${file}`.
-- storage.foldername() splits on '/' and keeps the filename, so [1] is the uid.
-- An admin passes through the same public.is_admin() helper the rest of the store
-- authorizes with, so the console UI and the database cannot disagree.
-- ---------------------------------------------------------------------------
drop policy if exists user_photos_read_own on storage.objects;
create policy user_photos_read_own on storage.objects
  for select using (
    bucket_id = 'user-photos'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );

-- Upload and delete are owner-only. An admin can read (to moderate) but does not
-- need to write a customer's photo, so there is no admin branch here on purpose.
drop policy if exists user_photos_write_own on storage.objects;
create policy user_photos_write_own on storage.objects
  for insert with check (
    bucket_id = 'user-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists user_photos_delete_own on storage.objects;
create policy user_photos_delete_own on storage.objects
  for delete using (
    bucket_id = 'user-photos'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = auth.uid()::text
    )
  );

-- ---------------------------------------------------------------------------
-- 3. `card-media` — write owner-scoped, read via the public endpoint.
--
-- No SELECT policy is written on purpose. That bucket is PUBLIC by necessity
-- (0006_media.sql: the recipient is an anonymous phone and the link is printed on
-- paper), so reads are served by the public object endpoint, which does not
-- consult these policies. Adding a restrictive select policy here would not
-- protect anything — the public route already bypasses it — while breaking the
-- scan page if Supabase's public path ever stopped bypassing. The protection
-- for these objects is the unguessable row id, which 0006_media.sql documents.
--
-- Write policies still matter: they stop a client publishing an object under
-- someone else's uuid prefix.
-- ---------------------------------------------------------------------------
drop policy if exists card_media_write_owner on storage.objects;
create policy card_media_write_owner on storage.objects
  for insert with check (
    bucket_id = 'card-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists card_media_update_owner on storage.objects;
create policy card_media_update_owner on storage.objects
  for update using (
    bucket_id = 'card-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'card-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists card_media_delete_owner on storage.objects;
create policy card_media_delete_owner on storage.objects
  for delete using (
    bucket_id = 'card-media'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );

-- ---------------------------------------------------------------------------
-- 4. `print-files` — the fulfilment bucket from 0008_fulfilment.sql.
--
-- PRIVATE, so reads go through the authenticated API and therefore DO consult
-- this policy. It is deliberately stricter than the other two: a print file
-- carries the customer's finished card and their shipping address on the spec
-- page, so access is an admin or the customer who owns the order — checked with a
-- subquery rather than against a column on this table, because a guest order has
-- no user_id and auth.uid() must still be matched against the real owner.
--
-- No write policy: service role only (the fulfil-order Edge Function). A client
-- that could write an artefact could lie about what it produced.
-- ---------------------------------------------------------------------------
drop policy if exists print_files_read_admin_or_owner on storage.objects;
create policy print_files_read_admin_or_owner on storage.objects
  for select using (
    bucket_id = 'print-files'
    and (
      public.is_admin()
      or exists (
        select 1 from public.orders o
        where o.id = (storage.foldername(name))[1]
          and o.user_id = auth.uid()
      )
    )
  );
