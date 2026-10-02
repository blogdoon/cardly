-- Cardly — Postgres schema.
--
-- Replaces the Firestore document tree. The shapes mirror what the app already
-- sends, so `src/types/*` did not have to change: camelCase columns are kept
-- rather than snake_cased, because the client maps rows to `CardTemplate` and
-- friends directly and a rename would mean a translation layer nobody asked for.
--
-- Two things are genuinely better in Postgres than in document rules, and both
-- are load-bearing (see 0002_rls.sql):
--   * `reviews` is keyed (order_id, template_id), so "one review per order per
--     card" is a primary key rather than a doc-id naming convention.
--   * RLS policies can *query other tables*, so the review insert policy can
--     finally verify the order actually contains the template. The old document
--     rules could not, and that gap used to be tracked in AGENTS.md as needing
--     a Cloud Function — it is closed here instead.
--
-- Money is in EUR as plain numbers (the store is euro-only, see AGENTS.md) and
-- is stored in minor units-free `numeric(10,2)` so arithmetic cannot drift.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles — one row per authenticated user, keyed by the auth.users id.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  email             text,
  display_name      text,
  photo_url         text,
  -- Display only. Authorization is decided by `is_admin()` in 0002_rls.sql,
  -- which reads auth.users.raw_app_meta_data — a field the client cannot write.
  -- This column is a mirror for display, and is NOT trusted for access control.
  role              text check (role in ('admin', 'customer')),
  created_at        timestamptz not null default now()
);
-- No address book here on purpose: `utils/addressBook.ts` keeps it in
-- localStorage, synchronously, and the app has never read it back from the
-- user doc. A column nothing writes would only pretend otherwise.

-- ---------------------------------------------------------------------------
-- templates — the catalog. The storefront reads this; admins write it.
-- ---------------------------------------------------------------------------
create table if not exists public.templates (
  id                text primary key,
  title             text not null,
  description       text not null default '',
  -- Browse facets. recipients/styles are arrays because a card can honestly be
  -- for a "Friend" and a "Best Friend" at once; see AGENTS.md.
  category          text not null,
  subcategory       text,
  recipients        text[] not null default '{}',
  styles            text[] not null default '{}',
  tone              text,
  season            text,
  personalization   text[] not null default '{text}',
  colors            text[] not null default '{}',
  tags              text[] not null default '{}',
  -- Standard-size price in EUR. The full band is derived from the size
  -- multipliers in the app, never stored, so it cannot drift from checkout.
  price             numeric(10,2) not null check (price >= 0),
  -- Owned by recomputeTemplateRating, which is the only writer.
  rating            numeric(2,1) not null default 0 check (rating >= 0 and rating <= 5),
  review_count      integer not null default 0 check (review_count >= 0),
  is_photo_card     boolean not null default false,
  is_popular        boolean not null default false,
  is_new            boolean not null default false,
  is_best_seller    boolean not null default false,
  milestone_age     integer,
  alt_text          text,
  thumbnail         text not null default '',
  preview_colors    text[] not null default '{}',
  -- The swatches `colors` is derived from. Stored (not just inferred) so an
  -- admin-set palette survives a reload instead of falling back to the
  -- artwork's default — see buildTemplateFacets.
  palette           text[] not null default '{}',
  default_pages     jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- Soft delete. A retired template keeps its id so past orders, saved designs
  -- and favourites still resolve. The storefront filters these out.
  deleted_at        timestamptz,
  deleted_by        text,
  -- Mirrors the app's `isNew` window so the badge can be queried, not just
  -- rendered. 90 days, matching NEW_FOR_DAYS in utils/templateFacets.ts.
  constraint templates_is_new_window check (not is_new or created_at > now() - interval '90 days')
);

-- Partial index: the storefront only ever reads live templates. Also the only
-- index the browse facets need, and it keeps the index small as the catalog grows.
create index if not exists templates_live_idx
  on public.templates (category)
  where deleted_at is null;
create index if not exists templates_recipients_idx on public.templates using gin (recipients);
create index if not exists templates_styles_idx     on public.templates using gin (styles);
create index if not exists templates_tags_idx       on public.templates using gin (tags);
create index if not exists templates_retired_idx     on public.templates (deleted_at)
  where deleted_at is not null;

-- ---------------------------------------------------------------------------
-- designs — a customer's saved card. Owner-scoped.
-- ---------------------------------------------------------------------------
create table if not exists public.designs (
  id                    text primary key,
  user_id               uuid not null references public.profiles (id) on delete cascade,
  template_id           text references public.templates (id) on delete set null,
  title                 text not null default 'Untitled card',
  preview_thumbnail     text,
  pages                 jsonb not null default '{}'::jsonb,
  current_page          text,
  selected_element_id   text,
  history               jsonb not null default '[]'::jsonb,
  history_index         integer,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists designs_user_idx on public.designs (user_id, updated_at desc);

-- ---------------------------------------------------------------------------
-- favorites — join table, so one card cannot be favourited twice.
-- ---------------------------------------------------------------------------
create table if not exists public.favorites (
  user_id       uuid not null references public.profiles (id) on delete cascade,
  template_id   text not null references public.templates (id) on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (user_id, template_id)
);

-- ---------------------------------------------------------------------------
-- orders — the customer's record.
--
-- `items` is jsonb because a cart line is a snapshot of the card as bought: the
-- template may later be edited or retired and the order must not change. That is
-- deliberate denormalisation, not laziness.
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id                    text primary key,
  order_number          text not null unique,
  user_id               uuid references public.profiles (id) on delete set null,
  items                 jsonb not null default '[]'::jsonb,
  subtotal              numeric(10,2) not null check (subtotal >= 0),
  delivery_fee          numeric(10,2) not null default 0 check (delivery_fee >= 0),
  discount              numeric(10,2) not null default 0 check (discount >= 0),
  total                 numeric(10,2) not null check (total >= 0),
  status                text not null default 'processing'
                          check (status in ('processing','printed','dispatched','delivered','cancelled','refunded')),
  shipping_address      jsonb not null,
  delivery_method       jsonb not null,
  delivery_type         text not null default 'direct_to_recipient'
                          check (delivery_type in ('direct_to_recipient','back_to_me')),
  dispatch_date         timestamptz,
  estimated_arrival     timestamptz,
  requested_delivery_date date,
  -- Fulfilment fields. Only an admin may ever write these; see 0002_rls.sql.
  tracking_number       text,
  carrier               text,
  dispatched_at         timestamptz,
  refund                jsonb,
  cancel_reason         text,
  admin_note            text,
  payment_summary       jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists orders_user_idx    on public.orders (user_id, created_at desc);
create index if not exists orders_recent_idx  on public.orders (created_at desc);
create index if not exists orders_status_idx  on public.orders (status);

-- ---------------------------------------------------------------------------
-- reviews — moderated, and one per order per card.
--
-- The composite primary key enforces "one review per order per template"
-- structurally. Firestore could only enforce it by pinning the *document id* to
-- `${orderId}_${templateId}`, which is a naming convention a rule can only
-- police indirectly; here a second attempt is a primary-key violation.
-- ---------------------------------------------------------------------------
create table if not exists public.reviews (
  order_id       text not null references public.orders (id) on delete cascade,
  template_id    text not null references public.templates (id) on delete cascade,
  author_id      uuid not null references public.profiles (id) on delete cascade,
  author_name    text not null check (char_length(author_name) between 1 and 80),
  rating         integer not null check (rating between 1 and 5),
  review         text not null check (char_length(review) between 1 and 2000),
  -- Every review starts unpublished. Only an admin may publish one, and only by
  -- touching status/moderated_at/moderated_by (enforced in 0002_rls.sql).
  status         text not null default 'pending' check (status in ('pending','approved','rejected')),
  moderated_at   timestamptz,
  moderated_by   text,
  created_at     timestamptz not null default now(),
  primary key (order_id, template_id)
);

-- The moderation queue: newest pending first, across all templates.
create index if not exists reviews_pending_idx on public.reviews (created_at desc)
  where status = 'pending';
create index if not exists reviews_template_idx on public.reviews (template_id);

-- ---------------------------------------------------------------------------
-- shared_cards — public read-only links to a finished card.
-- ---------------------------------------------------------------------------
create table if not exists public.shared_cards (
  id            text primary key,
  -- Who minted the link: only the owner (or an admin) may revoke it.
  owner_id      uuid references public.profiles (id) on delete cascade,
  -- The card as shared. Public by design, so it must never contain a customer's
  -- address or order details — `shareService` writes nothing but the design.
  title         text not null default '',
  design        jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  -- Soft expiry: a shared proof is dead after this. Enforced on read by the
  -- client, and cheap to check server-side later if links ever leak.
  expires_at    timestamptz
);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists templates_touch on public.templates;
create trigger templates_touch before update on public.templates
  for each row execute function public.touch_updated_at();

drop trigger if exists designs_touch on public.designs;
create trigger designs_touch before update on public.designs
  for each row execute function public.touch_updated_at();

drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();
