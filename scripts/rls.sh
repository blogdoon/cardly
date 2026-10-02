#!/usr/bin/env bash
# Apply the Supabase migrations to a throwaway Postgres and run the RLS
# behaviour tests against it.
#
# Why this exists: in Postgres, a table with RLS enabled and no policy is
# silently locked, and a policy written `using (true)` silently publishes the
# table. Nothing errors either way. The only way to know the policies enforce
# what they claim is to exercise them, so this does that on every run.
#
#   scripts/rls.sh                 # ephemeral cluster in a temp dir, torn down after
#   DATABASE_URL=postgres://... scripts/rls.sh    # run against an existing database
#
# The `auth` schema is stubbed because Supabase's auth service owns it here;
# auth.uid() is the only part the policies depend on.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PGBIN="${PGBIN:-$(ls -d "$HOME"/.local/share/mise/installs/postgres/*/bin 2>/dev/null | head -1 || true)}"
if [ -z "$PGBIN" ] && command -v psql >/dev/null 2>&1; then
  PGBIN="$(dirname "$(command -v psql)")"
fi
if [ -z "$PGBIN" ] || [ ! -x "$PGBIN/psql" ]; then
  echo "rls: no Postgres binaries found (set PGBIN)" >&2
  exit 127
fi
export PATH="$PGBIN:$PATH"

WORKDIR=""
OWN_CLUSTER=0
cleanup() {
  if [ "$OWN_CLUSTER" = "1" ] && [ -n "$WORKDIR" ]; then
    pg_ctl -D "$WORKDIR/pgdata" -m immediate stop >/dev/null 2>&1 || true
    rm -rf "$WORKDIR"
  fi
}
trap cleanup EXIT

if [ -n "${DATABASE_URL:-}" ]; then
  CONN="$DATABASE_URL"
  PSQL=(psql "$CONN" -v ON_ERROR_STOP=1 -q)
else
  WORKDIR="$(mktemp -d "${TMPDIR:-/tmp}/cardly-rls.XXXXXX")"
  PORT="${RLS_TEST_PORT:-5433}"
  mkdir -p "$WORKDIR/pgdata" "$WORKDIR/sock"
  initdb -D "$WORKDIR/pgdata" -U postgres --auth=trust -E UTF8 >/dev/null 2>&1
  pg_ctl -D "$WORKDIR/pgdata" \
    -o "-p $PORT -k $WORKDIR/sock -c listen_addresses=''" \
    -l "$WORKDIR/pg.log" start >/dev/null 2>&1
  OWN_CLUSTER=1
  for _ in $(seq 1 30); do
    psql -h "$WORKDIR/sock" -p "$PORT" -U postgres -c 'select 1' >/dev/null 2>&1 && break
    sleep 0.5
  done
  CONN="host=$WORKDIR/sock port=$PORT user=postgres dbname=cardly"
  createdb -h "$WORKDIR/sock" -p "$PORT" -U postgres cardly
  PSQL=(psql -h "$WORKDIR/sock" -p "$PORT" -U postgres -d cardly -v ON_ERROR_STOP=1 -q)
fi

echo "rls: stubbing the auth schema (Supabase owns it in production)"
"${PSQL[@]}" <<'SQL'
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_app_meta_data jsonb not null default '{}'::jsonb,
  user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
-- The only part of Supabase's auth the policies depend on: it resolves to the
-- authenticated caller's uuid from the JWT.
create or replace function auth.uid() returns uuid language sql stable as $fn$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$fn$;
-- Test fixtures are inserted as the admin/buyer/stranger accounts. RLS is not
-- yet enabled at this point, so these inserts are plain.
SQL

echo "rls: applying migrations"
for migration in "$ROOT"/supabase/migrations/*.sql; do
  "${PSQL[@]}" -f "$migration" >/dev/null
done

echo "rls: running behaviour tests"
OUT="$("${PSQL[@]}" -f "$ROOT/supabase/tests/rls.sql" 2>&1 || true)"

PASSES="$(printf '%s\n' "$OUT" | grep -c 'PASS' || true)"
FAILS="$(printf '%s\n' "$OUT" | grep -c 'FAIL' || true)"

if printf '%s\n' "$OUT" | grep -q 'FAIL'; then
  printf '%s\n' "$OUT" | grep -E 'FAIL|ERROR' >&2
  echo "rls: FAILED ($PASSES passed, $FAILS failed)" >&2
  exit 1
fi
if [ "$PASSES" -lt 20 ]; then
  printf '%s\n' "$OUT" | tail -20 >&2
  echo "rls: FAILED — only $PASSES assertions ran, expected at least 20" >&2
  exit 1
fi

echo "rls: ok ($PASSES policy assertions)"
