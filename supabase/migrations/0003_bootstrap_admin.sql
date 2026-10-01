-- Cardly — the only user is the admin.
--
-- "Granting admin" was a two-statement snippet an operator had to run by hand
-- (see the header of 0002_rls.sql). For a single-operator store that is a
-- footgun: forget it and the catalog cannot be managed; run it against the
-- wrong row and a customer can. This makes it automatic and unforgeable.
--
-- The rule: the FIRST user to exist becomes the admin, and only them. Every
-- later sign-up is a customer. There is no email hardcoded anywhere — whoever
-- boots the store owns it, which is exactly "the only user is the admin".
--
-- `is_admin()` reads auth.users.raw_app_meta_data, which the browser cannot
-- write, so setting the flag here (server side, in a trigger) is the real
-- authorization. `profiles.role` stays a display mirror; the client reads the
-- same flag off its own JWT so the admin UI and RLS never disagree.

-- ---------------------------------------------------------------------------
-- Promote the first user on insert.
--
-- BEFORE INSERT so we can set raw_app_meta_data on NEW directly, before the JWT
-- for this user is ever minted. The `not exists` check is what keeps it to ONE
-- admin: once anyone carries the flag, no later row is promoted.
-- ---------------------------------------------------------------------------
create or replace function public.grant_first_user_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from auth.users
    where raw_app_meta_data ->> 'is_admin' = 'true'
  ) then
    new.raw_app_meta_data :=
      coalesce(new.raw_app_meta_data, '{}'::jsonb) || '{"is_admin":"true"}'::jsonb;
  end if;
  return new;
end;
$$;

drop trigger if exists users_grant_first_admin on auth.users;
create trigger users_grant_first_admin
  before insert on auth.users
  for each row execute function public.grant_first_user_admin();

-- ---------------------------------------------------------------------------
-- Keep profiles.role in step with the flag (display mirror).
--
-- The client upserts its profile with role forced to 'customer' by RLS, so this
-- security-definer trigger is what stamps 'admin' onto the mirror afterwards. It
-- only ever promotes to match the auth flag; it never demotes, so it cannot
-- fight an admin's own edits.
-- ---------------------------------------------------------------------------
create or replace function public.mirror_admin_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from auth.users
    where id = new.id and raw_app_meta_data ->> 'is_admin' = 'true'
  ) then
    new.role := 'admin';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_mirror_admin on public.profiles;
create trigger profiles_mirror_admin
  before insert or update on public.profiles
  for each row execute function public.mirror_admin_role();

-- ---------------------------------------------------------------------------
-- Backfill: if the store already has users but no admin, promote the earliest
-- one. Idempotent — a no-op once an admin exists. This is what "make the only
-- user the admin" does for a store that was already signed into.
-- ---------------------------------------------------------------------------
do $$
declare first_id uuid;
begin
  if not exists (
    select 1 from auth.users where raw_app_meta_data ->> 'is_admin' = 'true'
  ) then
    select id into first_id from auth.users order by created_at asc limit 1;
    if first_id is not null then
      update auth.users
        set raw_app_meta_data =
          coalesce(raw_app_meta_data, '{}'::jsonb) || '{"is_admin":"true"}'::jsonb
        where id = first_id;
      update public.profiles set role = 'admin' where id = first_id;
    end if;
  end if;
end $$;
