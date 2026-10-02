-- Cardly — Supabase Storage: the `user-photos` bucket and its access rules.
--
-- Why this file exists. `PHOTO_BUCKET` in src/services/supabase.ts is
-- 'user-photos', and uploadUserPhoto (src/services/cardStorage.ts) uploads to
-- it whenever VITE_USE_SUPABASE_STORAGE="true". Nothing created that bucket and
-- nothing scoped who could read it, so the flag was a lie waiting to be turned
-- on: the upload fails (no bucket), or it lands in a bucket whose objects have
-- no access control at all. This is the half of AGENTS.md production blocker 3
-- that did not exist — "Storage policies must go through the same is_admin()
-- helper". The table policies in 0002_rls.sql do not reach here: storage.objects
-- has its own RLS, and one `public` boolean on storage.buckets decides whether
-- the public object endpoint bypasses those policies entirely.
--
-- The rules, one line each:
--   * the bucket is PRIVATE. Every read goes through a policy below.
--   * a customer may only touch objects whose FIRST path segment is their own
--     uid — which is exactly what the client already writes:
--     `${effectiveUserId}/${Date.now()}_${sanitizedName}`.
--   * an admin may touch anything in the bucket, through the same
--     public.is_admin() helper the rest of the store authorizes with, so the
--     admin console UI and the database cannot disagree.
--
-- REQUIRED FOLLOW-UP, not fixable from this migration: uploadUserPhoto returns
-- getPublicUrl(path) (cardStorage.ts:358), and a public URL does not exist for
-- a private bucket. That caller has to move to createSignedUrl(), which the
-- select policy below is what makes possible. Until it does, turning on
-- VITE_USE_SUPABASE_STORAGE lands a photo the app cannot read back.
--
--   supabase db:reset   (or apply this file in the SQL editor)

-- ---------------------------------------------------------------------------
-- 0. The storage objects themselves.
--
--    In production every statement in this block is a no-op: Supabase owns
--    storage.buckets, storage.objects and storage.foldername. They are still
--    written defensively so scripts/rls.sh can prove the policies below against
--    a real Postgres, and so that a copy of this file applied to a project
--    without storage support fails loudly here rather than quietly protecting
--    nothing.
--
--    The stub is deliberately identical in shape to the real thing (same column
--    names, same `unique (bucket_id, name)`) so a policy cannot mean one thing
--    in CI and another in production.
-- ---------------------------------------------------------------------------
create schema if not exists storage;

do $fn$
begin
  if to_regclass('storage.buckets') is null then
    create table storage.buckets (
      id          text primary key,
      name        text not null,
      owner       uuid,
      public      boolean not null default false,
      created_at  timestamptz not null default now(),
      updated_at  timestamptz
    );
  end if;

  if to_regclass('storage.objects') is null then
    create table storage.objects (
      id         uuid primary key default gen_random_uuid(),
      bucket_id  text not null references storage.buckets (id),
      name       text not null,
      owner      uuid,
      created_at timestamptz not null default now(),
      updated_at timestamptz,
      unique (bucket_id, name)
    );
  end if;

  -- Same body as Supabase's own: the name split on '/', filename included. The
  -- policies below index [1] of it, so the two must not drift.
  if to_regprocedure('storage.foldername(text)') is null then
    create function storage.foldername(name text)
      returns text[] language sql immutable
      as $$ select string_to_array(name, '/') $$;
  end if;
end
$fn$;
-- ---------------------------------------------------------------------------
-- 1. The bucket, private, idempotently.
--
--    `on conflict (id) do update ... where` rather than `do nothing`: a bucket
--    created by hand in the dashboard (or created public by an earlier attempt
--    to fix the missing-bucket error) must still converge on the invariant, but
--    the `where` makes the statement a no-op for a bucket that is already
--    correct — re-running the migration must not touch a bucket the operator
--    manages, not even its updated_at.
--
--    Read the direction of the update carefully, because it is the whole safety
--    property of this statement: the only value this migration can ever write is
--    public = false. There is no code path in it that widens the bucket, so
--    applying it — for the first time, to a project that predates it, or to a
--    project that never enabled the flag — cannot turn customer photos
--    world-readable. Making this bucket public has to be a deliberate act,
--    written by a human, against this line.
-- ---------------------------------------------------------------------------
insert into storage.buckets as b (id, name, public)
values ('user-photos', 'user-photos', false)
on conflict (id) do update
  set public = false
  where b.public is distinct from false;