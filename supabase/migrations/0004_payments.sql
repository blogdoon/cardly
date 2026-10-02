-- Payments: what the Stripe flow needs on `orders`.
--
-- Until now an order was created by the browser with a browser-computed total
-- (AGENTS.md blocker #1). It is now created by the `create-checkout` Edge
-- Function as `pending_payment`, and only the signed `stripe-webhook` moves it
-- to `processing`. This migration makes that possible and closes the old
-- client-side insert path behind it.

-- ---------------------------------------------------------------------------
-- 1. Payment states. `pending_payment` is an order that exists but has not been
--    charged; the fulfilment flow (`processing → …`) is unchanged and starts
--    only once the webhook says the money landed.
-- ---------------------------------------------------------------------------
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('pending_payment','processing','printed','dispatched',
                    'delivered','cancelled','refunded'));

-- ---------------------------------------------------------------------------
-- 2. Stripe linkage. The session id is what the success page lands on and what
--    an operator matches against the Stripe dashboard; `paid_at` is the
--    webhook's stamp (never a client claim).
-- ---------------------------------------------------------------------------
alter table public.orders add column if not exists stripe_session_id text;
alter table public.orders add column if not exists paid_at timestamptz;

create unique index if not exists orders_stripe_session_idx
  on public.orders (stripe_session_id) where stripe_session_id is not null;

-- ---------------------------------------------------------------------------
-- 3. Orders are created by the payments function (service role) only.
--
--    `orders_insert_own` let any caller write an order — with its own total,
--    which is exactly the number the client must never decide. Dropping it
--    means a customer cannot create, or price, an order from the browser at
--    all; guests are covered too (user_id null, inserted server-side), which
--    is how guest orders finally become visible to the admin console.
--
--    Select/update/delete policies are untouched: customers still read only
--    their own rows and may never update one; admins may still move fulfilment
--    forward and nothing else.
-- ---------------------------------------------------------------------------
drop policy if exists orders_insert_own on public.orders;
