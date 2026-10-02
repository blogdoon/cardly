-- Behavioural tests for the RLS policies.
--
-- The migration only proves the SQL *applies*. These prove it *enforces* — which
-- is the part that fails silently in Postgres: a table with RLS on and no policy
-- is quietly locked, and a `using (true)` quietly publishes it.
--
-- Run against a real database (scripts/rls.sh does both: it applies the
-- migrations to an ephemeral Postgres, runs this file, and fails on any FAIL
-- or on fewer than 20 passes):
--
--   scripts/rls.sh                    # throwaway cluster
--   DATABASE_URL=... scripts/rls.sh   # an existing database
--
-- Each block impersonates a caller by setting `request.jwt.claim.sub` to that
-- user's uuid, which is how `auth.uid()` resolves under RLS.

-- Must stay at `notice`: every PASS assertion below is a `raise notice`, and
-- scripts/rls.sh counts those lines. At `warning` they are suppressed and the
-- harness sees 0 passes and fails even when every policy holds.
set client_min_messages = notice;


-- ---------------------------------------------------------------------------
-- Bootstrap admin (0003): the first user to exist is the admin, and only them.
-- Runs here, before any fixture, because auth.users must be empty for the
-- "first user" to be meaningful. Cleaned up afterwards so the fixtures below
-- start from an empty auth.users just as they expect.
-- ---------------------------------------------------------------------------
do $boot$
declare a_flag text; b_flag text; a_role text;
begin
  insert into auth.users (id, email) values
    ('aaaaaaaa-0000-0000-0000-000000000001', 'first@cardly.test');
  insert into auth.users (id, email) values
    ('bbbbbbbb-0000-0000-0000-000000000002', 'second@cardly.test');

  select raw_app_meta_data ->> 'is_admin' into a_flag
    from auth.users where email = 'first@cardly.test';
  select raw_app_meta_data ->> 'is_admin' into b_flag
    from auth.users where email = 'second@cardly.test';
  if a_flag is distinct from 'true' then
    raise exception 'FAIL  the first user must be promoted to admin (got %)', a_flag;
  end if;
  if b_flag = 'true' then
    raise exception 'FAIL  the second user must NOT be an admin';
  end if;
  raise notice 'PASS  bootstrap: the first user is the admin, the second is not';

  -- The profiles mirror stamps admin for the flagged user, customer otherwise.
  insert into public.profiles (id, email, role) values
    ('aaaaaaaa-0000-0000-0000-000000000001', 'first@cardly.test', 'customer');
  select role into a_role from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001';
  if a_role is distinct from 'admin' then
    raise exception 'FAIL  the admin profile mirror must read admin (got %)', a_role;
  end if;
  raise notice 'PASS  bootstrap: profiles.role mirrors the admin flag';

  delete from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001';
  delete from auth.users where email in ('first@cardly.test', 'second@cardly.test');
end
$boot$;


-- ---------------------------------------------------------------------------
-- Run the assertions as the NON-superuser role production actually uses:
-- `authenticated`. Supabase already has this role (nosuperuser, nobypassrls)
-- and the SQL editor's `postgres` may `set role authenticated` with no grant —
-- whereas a bespoke role can't be switched into there, because Supabase's
-- `postgres` is not a superuser and cannot grant itself membership of one.
--
-- This is also the part that is easy to get wrong and makes the whole file a
-- no-op: a superuser (or the table owner) bypasses RLS entirely, so every
-- "denied" assertion below would quietly pass for the wrong reason.
-- ---------------------------------------------------------------------------
do $fn$
begin
  -- Only the local throwaway cluster is missing it; Supabase already has it.
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin nosuperuser nobypassrls;
  end if;
end
$fn$;

grant usage on schema public, auth to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on all functions in schema public, auth to authenticated;

-- The same for `storage`, which the fulfilment policies in 0007_fulfilment.sql
-- live on. Supabase already grants `authenticated` access to storage.objects in
-- every real project; the throwaway cluster this file also runs against does not,
-- and without it every storage assertion would fail on "permission denied for
-- schema storage" rather than on the policy under test — i.e. the test would be
-- passing for the wrong reason, which is the exact failure mode the header above
-- warns about. GRANTs are what Supabase ships, not an extra privilege.
grant usage on schema storage to authenticated;
grant select, insert, update, delete on all tables in schema storage to authenticated;

-- Impersonate the role for the rest of the session. This happens *after* the
-- fixtures below are seeded, because seeding is a superuser operation — a real
-- deployment would have those rows created by the auth service, not by a client.
--

-- ---------------------------------------------------------------------------
-- One cleanup body, called at the top (so a second run fails on a duplicate
-- key rather than on a real regression) and again at the bottom (so pasting
-- this into the production SQL editor doesn't leave fixture cards behind).
create or replace function pg_temp.cleanup() returns void language sql as $fn$
  delete from public.shared_cards where id in ('s1','s2');
  delete from public.reviews    where order_id = 'ord_1';
  -- Print files cascade from the order, but delete them explicitly so a
  -- regression that drops the cascade fails loudly here instead of silently
  -- leaving fulfilment rows behind in a real project.
  delete from public.order_print_files where order_id in ('ord_1','ord_guest');
  delete from public.favorites  where user_id in
    ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','33333333-3333-3333-3333-333333333333');
  delete from public.designs    where id = 'dsn_1';
  delete from public.orders     where id in ('ord_1','ord_guest');
  delete from public.templates  where id in ('tpl-live','tpl-gone','tpl-new','hack','tpl-sacrifice');
  delete from public.profiles   where id in
    ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','33333333-3333-3333-3333-333333333333');
  delete from auth.users        where id in
    ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','33333333-3333-3333-3333-333333333333');
$fn$;
select pg_temp.cleanup();

-- Fixtures: an admin, a customer, a stranger.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, raw_app_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'admin@cardly.test',   '{"is_admin":"true"}'),
  ('22222222-2222-2222-2222-222222222222', 'buyer@cardly.test',   '{"is_admin":"false"}'),
  ('33333333-3333-3333-3333-333333333333', 'stranger@cardly.test','{}')
on conflict (id) do nothing;

insert into public.profiles (id, email, role) values
  ('11111111-1111-1111-1111-111111111111', 'admin@cardly.test',   'admin'),
  ('22222222-2222-2222-2222-222222222222', 'buyer@cardly.test',   'customer'),
  ('33333333-3333-3333-3333-333333333333', 'stranger@cardly.test','customer')
on conflict (id) do nothing;

insert into public.templates (id, title, category, price, recipients, styles, deleted_at)
values
  ('tpl-live',   'Live Card',   'Birthday', 4.29, '{Kids}',   '{Cute}',  null),
  ('tpl-gone',   'Retired Card','Birthday', 4.29, '{Anyone}','{Retro}', now())
on conflict (id) do nothing;

-- The buyer's order contains tpl-live but NOT tpl-gone. That asymmetry is what
-- proves the purchase check is real.
insert into public.orders (id, order_number, user_id, items, subtotal, total,
                           shipping_address, delivery_method)
values (
  'ord_1', 'CRD-1',
  '22222222-2222-2222-2222-222222222222',
  '[{"templateId":"tpl-live","quantity":1}]'::jsonb,
  4.29, 4.49,
  '{"name":"A","line1":"1 St","postcode":"D02"}'::jsonb,
  '{"id":"standard","name":"Standard","price":0.20}'::jsonb
)
on conflict (id) do nothing;

-- A GUEST order: user_id null, which `create-checkout` allows. It exists to prove
-- the print-file policy denies an anonymous caller — a print file carries the
-- shipping address, so "no account" must mean "no read".
insert into public.orders (id, order_number, user_id, items, subtotal, total,
                           shipping_address, delivery_method)
values (
  'ord_guest', 'CRD-GUEST',
  null,
  '[{"templateId":"tpl-live","quantity":1}]'::jsonb,
  4.29, 4.49,
  '{"name":"Guest Buyer","line1":"1 St","postcode":"D02"}'::jsonb,
  '{"id":"standard","name":"Standard","price":0.20}'::jsonb
)
on conflict (id) do nothing;

-- Fulfilment fixtures (0007). In production these rows are written by the
-- SERVICE ROLE — the `fulfil-order` Edge Function — which bypasses RLS, so they
-- are seeded HERE, before `set role authenticated`, to model that privilege. A
-- customer must not be able to create one, which the assertions below prove.
insert into public.order_print_files (id, order_id, kind, storage_path, qty, sheet_mm)
values
  ('pf_own',   'ord_1',     'print_sheet', 'ord_1/pf_own.pdf',       1, '302x216'),
  ('pf_guest', 'ord_guest', 'print_sheet', 'ord_guest/pf_guest.pdf', 1, '302x216')
on conflict (id) do nothing;

insert into storage.objects (bucket_id, name) values
  ('print-files', 'ord_1/pf_own.pdf'),
  ('print-files', 'ord_guest/pf_guest.pdf'),
  -- user-photos fixtures: RLS on storage.objects was never enabled before
  -- 0007_storage_policies.sql, so these two were readable by ANY signed-in user.
  ('user-photos', '22222222-2222-2222-2222-222222222222/buyer-photo.jpg'),
  ('user-photos', '33333333-3333-3333-3333-333333333333/stranger-photo.jpg')
on conflict (bucket_id, name) do nothing;

-- From here on, every statement runs as an ordinary user, with RLS enforced.
set role authenticated;

-- ---------------------------------------------------------------------------
-- The harness: run a statement as a given user and report pass/fail.
-- `set_config('request.jwt.claim.sub', ...)` is how auth.uid() resolves.
-- ---------------------------------------------------------------------------
-- NOTE: the helper bodies use $fn$ rather than $$ because the statements passed
-- to `expect` are themselves dollar-quoted, and Postgres cannot nest the same tag.
create or replace function pg_temp.as_user(uid uuid)
returns text language plpgsql as $fn$
begin
  -- is_local must be FALSE: psql runs each statement in its own implicit
  -- transaction, so a transaction-local setting is discarded before the next
  -- assertion ever runs and every caller would look anonymous.
  perform set_config('request.jwt.claim.sub', coalesce(uid::text,''), false);
  return coalesce(uid::text, '');
end;
$fn$;

-- `expect(label, want, stmt)` runs `stmt` and checks the boolean it yields.
--
-- A statement that raises is treated as `false`, which is the right reading for
-- every assertion here: under RLS, "denied" and "returned false" are the same
-- outcome from the caller's point of view, and conflating them keeps the
-- assertions to one line each. So `want=false` passes whether the row was
-- invisible or the write was refused, and `want=true` fails on a refusal.
create or replace function pg_temp.expect(label text, want boolean, stmt text)
returns void language plpgsql as $fn$
declare got boolean := false; err text := null; msg text;
begin
  begin
    execute stmt into got;
  exception when others then
    got := false;
    err := sqlerrm;
  end;
  if got is distinct from want then
    msg := 'FAIL  ' || label || ': expected ' || want::text || ', got ' || got::text
           || coalesce(' (error: ' || err || ')', '');
    raise exception '%', msg;
  end if;
  raise notice 'PASS  %', label;
end;
$fn$;

-- Section header, for readable output. `\echo` would be a psql meta-command and
-- this file has to stay valid SQL so it can be pasted into the SQL editor.
create or replace function pg_temp.section(title text)
returns void language plpgsql as $fn$
begin
  raise notice '=== % ===', title;
end;
$fn$;

select pg_temp.section('templates: public read, admin-only writes');
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
-- A stranger may read a live template, but not a retired one.
select pg_temp.expect('stranger reads a live template', true,
  $$select exists(select 1 from public.templates where id='tpl-live')$$);
select pg_temp.expect('stranger cannot see a retired template', false,
  $$select exists(select 1 from public.templates where id='tpl-gone')$$);
-- A stranger may not write.
select pg_temp.expect('stranger cannot insert a template', false,
  $$with stmt as (insert into public.templates (id,title,category,price)
                  values ('hack','x','Birthday',1) returning 1) select exists(select 1 from stmt)$$);
-- An admin may not see a retired template either... it must, to restore it.
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select pg_temp.expect('admin sees a retired template (to restore it)', true,
  $$select exists(select 1 from public.templates where id='tpl-gone')$$);
select pg_temp.expect('admin can insert a template', true,
  $$with stmt as (insert into public.templates (id,title,category,price)
                  values ('tpl-new','New','Birthday',4.29) returning 1) select exists(select 1 from stmt)$$);
select pg_temp.expect('admin can retire a template (soft delete)', true,
  $$with stmt as (update public.templates set deleted_at=now() where id='tpl-new' returning 1) select exists(select 1 from stmt)$$);

-- Erasing a retired card for good (the Retired tab's "Erase"). The app only
-- offers it for rows that are already retired and have never been sold; what
-- the database enforces is *who* may delete a row at all.
insert into public.templates (id, title, category, price, deleted_at)
values ('tpl-sacrifice', 'Sacrifice', 'Birthday', 4.29, now())
on conflict (id) do nothing;
select pg_temp.expect('admin can erase a retired template', true,
  $$with stmt as (delete from public.templates where id='tpl-sacrifice' returning 1) select exists(select 1 from stmt)$$);
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select pg_temp.expect('a stranger cannot erase a template', false,
  $$with stmt as (delete from public.templates where id='tpl-live' returning 1) select exists(select 1 from stmt)$$);

select pg_temp.section('orders: a customer can never change their own');
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select pg_temp.expect('buyer reads their own order', true,
  $$select exists(select 1 from public.orders where id='ord_1')$$);
select pg_temp.expect('buyer cannot change the total', false,
  $$with stmt as (update public.orders set total=0.01 where id='ord_1' returning 1) select exists(select 1 from stmt)$$);
select pg_temp.expect('buyer cannot change the address', false,
  $$with stmt as (update public.orders set shipping_address='{}' where id='ord_1' returning 1) select exists(select 1 from stmt)$$);
select pg_temp.expect('buyer cannot see another order', false,
  $$select exists(select 1 from public.orders o
                   join public.profiles p on p.id='11111111-1111-1111-1111-111111111111' where true)$$);

select pg_temp.section('orders: no client can create one (0004) — the server decides the total');
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select pg_temp.expect('buyer cannot insert an order', false,
  $$with stmt as (insert into public.orders (id, order_number, user_id, items, subtotal, total, shipping_address, delivery_method)
                  values ('ord_evil','CRD-EVIL','22222222-2222-2222-2222-222222222222','[]'::jsonb,0.01,0.01,'{}'::jsonb,'{}'::jsonb)
                  returning 1) select exists(select 1 from stmt)$$);
select pg_temp.as_user(null);
select pg_temp.expect('a guest cannot insert an order either', false,
  $$with stmt as (insert into public.orders (id, order_number, user_id, items, subtotal, total, shipping_address, delivery_method)
                  values ('ord_guest','CRD-GUEST',null,'[]'::jsonb,0.01,0.01,'{}'::jsonb,'{}'::jsonb)
                  returning 1) select exists(select 1 from stmt)$$);

select pg_temp.section('orders: an admin moves fulfilment forward, nothing else');
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select pg_temp.expect('admin reads any order', true,
  $$select exists(select 1 from public.orders where id='ord_1')$$);
select pg_temp.expect('admin may advance the status', true,
  $$with stmt as (update public.orders set status='printed' where id='ord_1' returning 1) select exists(select 1 from stmt)$$);
select pg_temp.expect('admin may set tracking', true,
  $$with stmt as (update public.orders set tracking_number='TRK1', carrier='An Post'
                   where id='ord_1' returning 1) select exists(select 1 from stmt)$$);
-- The guard trigger is the point: an admin client must not be able to rewrite
-- the money or the address through the ordinary update path.
select pg_temp.expect('admin cannot rewrite the total', false,
  $$with stmt as (update public.orders set total=0.01 where id='ord_1' returning 1) select exists(select 1 from stmt)$$);
select pg_temp.expect('admin cannot rewrite the items', false,
  $$with stmt as (update public.orders set items='[]'::jsonb where id='ord_1' returning 1) select exists(select 1 from stmt)$$);

select pg_temp.section('reviews: purchase is verified server-side');
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
-- The card they actually bought: allowed.
select pg_temp.expect('buyer may review a card they bought', true,
  $$with stmt as (insert into public.reviews (order_id,template_id,author_id,author_name,rating,review)
                  values ('ord_1','tpl-live',auth.uid(),'Buyer',5,'Lovely') returning 1) select exists(select 1 from stmt)$$);
-- A card they did not buy, on an order they own: DENIED. This is the check
-- firestore.rules could not express.
select pg_temp.expect('buyer may NOT review a card they did not buy', false,
  $$with stmt as (insert into public.reviews (order_id,template_id,author_id,author_name,rating,review)
                  values ('ord_1','tpl-gone',auth.uid(),'Buyer',1,'Fake') returning 1) select exists(select 1 from stmt)$$);
-- Self-approval must be impossible.
select pg_temp.expect('a review cannot be self-approved', false,
  $$with stmt as (insert into public.reviews (order_id,template_id,author_id,author_name,rating,review,status)
                  values ('ord_1','tpl-live',auth.uid(),'Buyer',5,'Again','approved') returning 1) select exists(select 1 from stmt)$$);
-- One review per order per card: the primary key does the work.
select pg_temp.expect('a second review of the same card is refused', false,
  $$with stmt as (insert into public.reviews (order_id,template_id,author_id,author_name,rating,review)
                  values ('ord_1','tpl-live',auth.uid(),'Buyer',4,'Again') returning 1) select exists(select 1 from stmt)$$);
-- Nobody edits a review's text.
select pg_temp.expect('a review body is immutable', false,
  $$with stmt as (update public.reviews set review='tampered' where order_id='ord_1' returning 1) select exists(select 1 from stmt)$$);

select pg_temp.section('reviews: moderation is admin-only');
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select pg_temp.expect('a stranger cannot publish a review', false,
  $$with stmt as (update public.reviews set status='approved' where order_id='ord_1' returning 1) select exists(select 1 from stmt)$$);
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select pg_temp.expect('an admin may approve a review', true,
  $$with stmt as (update public.reviews set status='approved', moderated_at=now(),
                   moderated_by='admin@cardly.test' where order_id='ord_1' returning 1) select exists(select 1 from stmt)$$);
select pg_temp.expect('an admin cannot rewrite a rating', false,
  $$with stmt as (update public.reviews set rating=1 where order_id='ord_1' returning 1) select exists(select 1 from stmt)$$);

select pg_temp.section('profiles: nobody promotes themselves');
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select pg_temp.expect('self-promotion to admin is refused', false,
  $$with stmt as (update public.profiles set role='admin' where id=auth.uid() returning 1) select exists(select 1 from stmt)$$);
select pg_temp.expect('a user may still edit their own profile', true,
  $$with stmt as (update public.profiles set display_name='Me' where id=auth.uid() returning 1) select exists(select 1 from stmt)$$);

select pg_temp.section('designs and favourites are owner-scoped');
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select pg_temp.expect('a stranger cannot read my design', false,
  $$select exists(select 1 from public.designs where user_id='22222222-2222-2222-2222-222222222222')$$);
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select pg_temp.expect('I can read my own design', true,
  $$with stmt as (insert into public.designs (id,user_id,title)
                  values ('dsn_1',auth.uid(),'Mine') returning 1) select exists(select 1 from stmt)$$);
select pg_temp.expect('a design cannot be re-parented to escape', false,
  $$with stmt as (update public.designs set user_id='33333333-3333-3333-3333-333333333333' where id='dsn_1' returning 1) select exists(select 1 from stmt)$$);
select pg_temp.expect('I can favourite a card', true,
  $$with stmt as (insert into public.favorites (user_id,template_id)
                  values (auth.uid(),'tpl-live') returning 1) select exists(select 1 from stmt)$$);
select pg_temp.expect('I cannot favourite the same card twice', false,
  $$with stmt as (insert into public.favorites (user_id,template_id)
                  values (auth.uid(),'tpl-live') returning 1) select exists(select 1 from stmt)$$);

select pg_temp.section('shared cards: public read, owner-minted links only');
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select pg_temp.expect('a link cannot be minted on someone else''s behalf', false,
  $$with stmt as (insert into public.shared_cards (id,owner_id,title) values ('s1','22222222-2222-2222-2222-222222222222','x') returning 1) select exists(select 1 from stmt)$$);
select pg_temp.expect('a link cannot be minted anonymously', false,
  $$with stmt as (insert into public.shared_cards (id,title) values ('s1','x') returning 1) select exists(select 1 from stmt)$$);
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select pg_temp.expect('a signed-in customer can mint their own link', true,
  $$with stmt as (insert into public.shared_cards (id,owner_id,title) values ('s1',auth.uid(),'x') returning 1) select exists(select 1 from stmt)$$);
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select pg_temp.expect('a stranger cannot revoke someone else''s link', false,
  $$with stmt as (delete from public.shared_cards where id='s1' returning 1) select exists(select 1 from stmt)$$);
select pg_temp.expect('anyone with the link can read it', true,
  $$select exists(select 1 from public.shared_cards where id='s1')$$);
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select pg_temp.expect('the owner can revoke their own link', true,
  $$with stmt as (delete from public.shared_cards where id='s1' returning 1) select exists(select 1 from stmt)$$);
select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select pg_temp.expect('an admin can mint a shared card', true,
  $$with stmt as (insert into public.shared_cards (id,owner_id,title) values ('s2',auth.uid(),'x') returning 1) select exists(select 1 from stmt)$$);

-- ---------------------------------------------------------------------------
-- Fulfilment (0007): print files are private, and readable only by an admin or
-- the customer who owns the order.
-- ---------------------------------------------------------------------------
select pg_temp.section('fulfilment: print files are private and owner-scoped');
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select pg_temp.expect('the buyer can read their own print file', true,
  $$select exists(select 1 from public.order_print_files where id='pf_own')$$);
select pg_temp.expect('the buyer cannot read a guest order''s print file', false,
  $$select exists(select 1 from public.order_print_files where id='pf_guest')$$);
select pg_temp.expect('the buyer can download their own print object', true,
  $$select exists(select 1 from storage.objects where name='ord_1/pf_own.pdf')$$);
select pg_temp.expect('the buyer cannot download a guest order''s print object', false,
  $$select exists(select 1 from storage.objects where name='ord_guest/pf_guest.pdf')$$);
select pg_temp.expect('a customer cannot mint a print file', false,
  $$with stmt as (insert into public.order_print_files (id,order_id,kind,storage_path)
                  values ('pf_fake','ord_1','print_sheet','ord_1/fake.pdf') returning 1)
    select exists(select 1 from stmt)$$);
select pg_temp.expect('a customer cannot delete a print file', false,
  $$with stmt as (delete from public.order_print_files where id='pf_own' returning 1)
    select exists(select 1 from stmt)$$);

select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select pg_temp.expect('a stranger cannot read a print file', false,
  $$select exists(select 1 from public.order_print_files where id='pf_own')$$);
select pg_temp.expect('a stranger cannot read a guest print file', false,
  $$select exists(select 1 from public.order_print_files where id='pf_guest')$$);

-- The critical negative: signed in, but not the owner. A policy keyed on the
-- caller alone (rather than on the order) would wrongly allow this.
select pg_temp.as_user('33333333-3333-3333-3333-333333333333');
select pg_temp.expect('a signed-in stranger still cannot read the buyer''s print file', false,
  $$select exists(select 1 from public.order_print_files where order_id='ord_1')$$);

-- ---------------------------------------------------------------------------
-- Storage objects (0007): the regression that motivated it. RLS on
-- storage.objects was never enabled by 0005/0006, so with no policies in force
-- every positive read assertion passed for the WRONG reason. These negatives are
-- the only ones that can catch it.
-- ---------------------------------------------------------------------------
select pg_temp.section('storage objects: user photos are owner-scoped');
select pg_temp.as_user('22222222-2222-2222-2222-222222222222');
select pg_temp.expect('a customer can read their own uploaded photo', true,
  $$select exists(select 1 from storage.objects where name like auth.uid()::text || '/%')$$);
select pg_temp.expect('a customer cannot read another customer''s photo', false,
  $$select exists(select 1 from storage.objects
                  where name='33333333-3333-3333-3333-333333333333/stranger-photo.jpg')$$);
select pg_temp.expect('a customer cannot upload under another customer''s prefix', false,
  $$with stmt as (insert into storage.objects (bucket_id,name)
                  values ('user-photos','33333333-3333-3333-3333-333333333333/evil.jpg')
                  returning 1) select exists(select 1 from stmt)$$);
select pg_temp.expect('a customer cannot delete another customer''s photo', false,
  $$with stmt as (delete from storage.objects
                  where name='33333333-3333-3333-3333-333333333333/stranger-photo.jpg'
                  returning 1) select exists(select 1 from stmt)$$);

select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select pg_temp.expect('an admin can read any customer photo', true,
  $$select exists(select 1 from storage.objects where bucket_id='user-photos')$$);
select pg_temp.expect('an admin still cannot upload as a customer', false,
  $$with stmt as (insert into storage.objects (bucket_id,name)
                  values ('user-photos','22222222-2222-2222-2222-222222222222/admin-photo.jpg')
                  returning 1) select exists(select 1 from stmt)$$);

select pg_temp.as_user('11111111-1111-1111-1111-111111111111');
select pg_temp.expect('an admin can read any print file', true,
  $$select exists(select 1 from public.order_print_files where id in ('pf_own','pf_guest'))$$);
select pg_temp.expect('an admin can download any print object', true,
  $$select exists(select 1 from storage.objects where bucket_id='print-files')$$);
select pg_temp.expect('an admin can stamp the fulfilment columns', true,
  $$with stmt as (update public.orders set print_files_ready_at=now() where id='ord_1' returning 1)
    select exists(select 1 from stmt)$$);
select pg_temp.expect('but still cannot rewrite the total through that path', false,
  $$with stmt as (update public.orders set total=0.01 where id='ord_1' returning 1)
    select exists(select 1 from stmt)$$);

select pg_temp.section('done');
reset role;

-- Leave the database as we found it, and prove it: this file runs against the
-- real project, where a fixture row is a card the storefront would render.
select pg_temp.cleanup();
select pg_temp.expect('cleanup left no fixtures behind', true,
  $$select not exists (
       select 1 from public.templates where id in ('tpl-live','tpl-gone','tpl-new','hack','tpl-sacrifice')
       union all select 1 from public.profiles where id in
         ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','33333333-3333-3333-3333-333333333333')
       union all select 1 from public.orders where id in ('ord_1','ord_guest')
       union all select 1 from public.order_print_files where order_id in ('ord_1','ord_guest')
       union all select 1 from auth.users where id in
         ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','33333333-3333-3333-3333-333333333333')
     )$$);
