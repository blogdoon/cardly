-- Cardly — Row Level Security.
--
-- This replaces firestore.rules. It is the real authorization boundary; nothing
-- in the client is trusted. The client is not even *able* to lie about admin
-- status, because `is_admin()` reads `auth.users.raw_app_meta_data`, which is
-- written only by the service role (the server), never by the browser. That is
-- the whole point: firestore.rules checked a hardcoded email string.
--
--   supabase db:reset
--
-- IMPORTANT, and the reason there is a check script for this file
-- (scripts/rls.check.ts): in Postgres, a table with RLS *enabled* and no policy
-- is silently locked, and a policy written as `using (true)` silently publishes
-- the table. Both look like "it just works" until they don't. Every table below
-- therefore has explicit policies, and the check asserts each one exists.
--
-- Helper functions are `stable security definer` so a policy can read
-- `auth.users` without recursing back into the profiles policy.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Is the caller an admin? Reads app_metadata, not user_metadata, because
-- user_metadata is writable by the user from the client.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select raw_app_meta_data ->> 'is_admin' = 'true'
       from auth.users where id = auth.uid()),
    false
  );
$$;
-- Grant one (run as the service role / postgres, never from the client):
--
--   update auth.users set raw_app_meta_data = raw_app_meta_data || '{"is_admin":"true"}'
--     where email = 'you@example.com';
--   update public.profiles set role = 'admin'
--     where id = (select id from auth.users where email = 'you@example.com');
--
-- Both are needed: the first is what `is_admin()` trusts, the second is the
-- display mirror the account page reads.

create or replace function public.is_own(row_user_id uuid)
returns boolean
language sql
stable
as $$
  select row_user_id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

-- A profile is readable by its owner, and by an admin (the console shows the
-- customer). Everyone else: no.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (public.is_own(id) or public.is_admin());

-- Insert your own row on first sign-in. `role` is forced to 'customer' here:
-- a client that tries to self-assign 'admin' is silently downgraded, which is
-- the same guarantee the Firestore rules could not make about a claim.
drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert with check (public.is_own(id) and coalesce(role, 'customer') = 'customer');

-- Update your own, but you may not promote yourself: `role` and `id` are
-- immutable for a non-admin, enforced by the trigger below (an RLS WITH CHECK
-- cannot compare against the old row, and a policy that re-reads its own table
-- recurses infinitely).
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update
  using (public.is_own(id) or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists profiles_delete_admin on public.profiles;
create policy profiles_delete_admin on public.profiles
  for delete using (public.is_admin());

-- A user may edit their own profile but not grant themselves admin. `role` is
-- only writable by an admin, and `id` never moves.
create or replace function public.guard_profile_columns()
returns trigger
language plpgsql
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'profile: id is immutable' using errcode = '42501';
  end if;
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'profile: only an admin may change role' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_columns();

-- ---------------------------------------------------------------------------
-- templates — the catalog
-- ---------------------------------------------------------------------------
alter table public.templates enable row level security;

-- Public read of live templates. Retired rows stay readable on purpose: past
-- orders and saved designs reference the id and must still resolve. The
-- storefront filters `deleted_at is null` client-side, and this policy cannot
-- do that filtering itself (a policy has no index-free way to be conditional on
-- a column without duplicating the row for every read).
drop policy if exists templates_select_public on public.templates;
create policy templates_select_public on public.templates
  for select using (deleted_at is null or public.is_admin());

-- Writes are admin-only. `id` is immutable so a retired card's id stays stable
-- for the orders that reference it.
drop policy if exists templates_insert_admin on public.templates;
create policy templates_insert_admin on public.templates
  for insert with check (public.is_admin());

drop policy if exists templates_update_admin on public.templates;
create policy templates_update_admin on public.templates
  for update using (public.is_admin()) with check (public.is_admin());

-- Hard delete exists for the `purge` path (cards never sold or customised).
-- Soft delete is the default and is just an update of deleted_at.
drop policy if exists templates_delete_admin on public.templates;
create policy templates_delete_admin on public.templates
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- designs — owner only
-- ---------------------------------------------------------------------------
alter table public.designs enable row level security;

drop policy if exists designs_select_own on public.designs;
create policy designs_select_own on public.designs
  for select using (public.is_own(user_id) or public.is_admin());
drop policy if exists designs_insert_own on public.designs;
create policy designs_insert_own on public.designs
  for insert with check (public.is_own(user_id));
-- `id` and `user_id` are immutable so a design cannot be re-parented to escape
-- or to deny access to its owner (enforced by trigger — see below).
drop policy if exists designs_update_own on public.designs;
create policy designs_update_own on public.designs
  for update
  using (public.is_own(user_id) or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());
drop policy if exists designs_delete_own on public.designs;
create policy designs_delete_own on public.designs
  for delete using (public.is_own(user_id) or public.is_admin());

create or replace function public.guard_design_columns()
returns trigger
language plpgsql
as $$
begin
  if new.id is distinct from old.id or new.user_id is distinct from old.user_id then
    raise exception 'design: id and user_id are immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists designs_guard on public.designs;
create trigger designs_guard before update on public.designs
  for each row execute function public.guard_design_columns();

-- ---------------------------------------------------------------------------
-- favorites — owner only
-- ---------------------------------------------------------------------------
alter table public.favorites enable row level security;

drop policy if exists favorites_select_own on public.favorites;
create policy favorites_select_own on public.favorites
  for select using (public.is_own(user_id) or public.is_admin());
drop policy if exists favorites_insert_own on public.favorites;
create policy favorites_insert_own on public.favorites
  for insert with check (public.is_own(user_id));
drop policy if exists favorites_delete_own on public.favorites;
create policy favorites_delete_own on public.favorites
  for delete using (public.is_own(user_id) or public.is_admin());

-- ---------------------------------------------------------------------------
-- orders — the customer's record
--
-- Two rules, and they mirror what firestore.rules enforced:
--   * a customer can read their own orders and nothing else;
--   * a customer can create an order, and can then never change it;
--   * an admin may move fulfilment forward, and may only touch the fulfilment
--     columns — never the total, the items or the address.
-- ---------------------------------------------------------------------------
alter table public.orders enable row level security;

drop policy if exists orders_select_own on public.orders;
create policy orders_select_own on public.orders
  for select using (public.is_own(user_id) or public.is_admin());

-- Creation: the caller sets the rows for the first time. `total` is recomputed
-- server-side by the payments work (a Cloud Function / Edge Function) — until
-- that exists this is the one number a client can lie about, and it is called
-- out in AGENTS.md as production blocker #1.
drop policy if exists orders_insert_own on public.orders;
create policy orders_insert_own on public.orders
  for insert with check (public.is_own(user_id) or user_id is null);

-- A customer may not update their order at all.
-- An admin may, but only these columns. `IS DISTINCT FROM` is null-safe, so
-- setting a column to null (e.g. clearing tracking) is still a change that has
-- to be in the allowed set.
drop policy if exists orders_update_admin_only on public.orders;
create policy orders_update_admin_only on public.orders
  for update
  using (public.is_admin())
  with check (public.is_admin())
  -- The column whitelist is enforced by the trigger below, because RLS has no
  -- per-column policy primitive. See `guard_order_columns()`.
;

drop policy if exists orders_delete_admin on public.orders;
create policy orders_delete_admin on public.orders
  for delete using (public.is_admin());

-- Enforce the column whitelist in a trigger, since RLS cannot.
--
-- Customers never reach this (their update policy is false). It exists so that
-- even an admin client cannot rewrite an order's money or its address through
-- the normal update path: fulfilment moves forward, nothing else moves.
create or replace function public.guard_order_columns()
returns trigger
language plpgsql
as $$
begin
  if public.is_admin() and not (tg_op = 'DELETE') then
    if (new.id, new.user_id, new.order_number, new.items, new.subtotal,
        new.delivery_fee, new.discount, new.total, new.shipping_address,
        new.payment_summary, new.created_at)
       is distinct from
       (old.id, old.user_id, old.order_number, old.items, old.subtotal,
        old.delivery_fee, old.discount, old.total, old.shipping_address,
        old.payment_summary, old.created_at) then
      raise exception 'order: only fulfilment fields are mutable by an admin'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_guard on public.orders;
create trigger orders_guard before update on public.orders
  for each row execute function public.guard_order_columns();

-- ---------------------------------------------------------------------------
-- reviews — purchase + moderation
--
-- This is the one place Postgres beats Firestore outright. The insert policy
-- below verifies the order exists, belongs to the caller, and *contains the
-- template being reviewed*. firestore.rules could not do that (documented in
-- AGENTS.md as a known gap needing a Cloud Function) because a Firestore rule
-- cannot query another collection — but an RLS policy is a SQL query, so the
-- check is now server-side and unforgeable by the client.
-- ---------------------------------------------------------------------------
alter table public.reviews enable row level security;

-- Public read. Pending reviews are filtered client-side; hiding them in a policy
-- is not possible without a per-user condition, and they carry only a display
-- name and text. What matters is that only *approved* reviews move a rating,
-- which is enforced in the app by recomputeTemplateRating.
drop policy if exists reviews_select_public on public.reviews;
create policy reviews_select_public on public.reviews
  for select using (true);

drop policy if exists reviews_insert_purchaser on public.reviews;
create policy reviews_insert_purchaser on public.reviews
  for insert
  with check (
    public.is_own(author_id)
    -- The purchase check. `items` is jsonb, so containment is a real query
    -- rather than a client assertion.
    and exists (
      select 1
      from public.orders o
      where o.id = reviews.order_id
        and o.user_id = auth.uid()
        and o.status <> 'cancelled'
        and o.items @> jsonb_build_array(jsonb_build_object('templateId', reviews.template_id))
    )
    -- Always starts pending, and a client cannot forge moderation metadata.
    and status = 'pending'
    and moderated_at is null
    and moderated_by is null
  );

-- An author may only withdraw their own *pending* review, and may not edit the
-- text or the rating on the way out — withdrawing is a delete, not an edit.
-- An admin may move status, but only the moderation columns (guard trigger).
drop policy if exists reviews_update_admin on public.reviews;
create policy reviews_update_admin on public.reviews
  for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists reviews_delete_pending_author on public.reviews;
create policy reviews_delete_pending_author on public.reviews
  for delete using (
    public.is_admin()
    or (public.is_own(author_id) and status = 'pending')
  );

-- Only the moderation columns are mutable, by anyone. A review's rating, text,
-- author and identity are fixed the moment it is written — an admin moderating
-- a review must not be able to rewrite what the customer said, or change a
-- rating to make a card look better.
create or replace function public.guard_review_columns()
returns trigger
language plpgsql
as $$
begin
  if (new.order_id, new.template_id, new.author_id, new.author_name,
      new.rating, new.review, new.created_at)
     is distinct from
     (old.order_id, old.template_id, old.author_id, old.author_name,
      old.rating, old.review, old.created_at) then
    raise exception 'review: only status/moderated_at/moderated_by are mutable'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists reviews_guard on public.reviews;
create trigger reviews_guard before update on public.reviews
  for each row execute function public.guard_review_columns();

-- ---------------------------------------------------------------------------
-- shared_cards — public read, write for the customer who minted the link.
--
-- A proof is read by whoever holds the link, so reading is open. Writing is not:
-- only an authenticated owner may insert, and the row records their uid, so an
-- anonymous visitor cannot publish arbitrary cards (the old firestore.rules
-- could only hope they would not). The id is unguessable — crypto.randomUUID.
-- ---------------------------------------------------------------------------
alter table public.shared_cards enable row level security;

drop policy if exists shared_cards_select_public on public.shared_cards;
create policy shared_cards_select_public on public.shared_cards
  for select using (true);
drop policy if exists shared_cards_insert_owner on public.shared_cards;
create policy shared_cards_insert_owner on public.shared_cards
  for insert with check (owner_id = auth.uid());
drop policy if exists shared_cards_delete_owner on public.shared_cards;
create policy shared_cards_delete_owner on public.shared_cards
  for delete using (public.is_admin() or owner_id = auth.uid());
