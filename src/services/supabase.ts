import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * The single Supabase client.
 *
 * Replaces `services/firebase.ts`: Postgres is the catalog, orders and designs;
 * Supabase Auth is the identity provider. Configuration comes from two env vars
 * (see `.env.example`) — no config file is checked in, because the anon key is
 * public but the project ref is not a secret either and a checked-in config
 * file only ever rotted.
 *
 * When the keys are absent the app still boots: every service falls back to its
 * localStorage path and the storefront reports an empty catalog rather than
 * crashing (see `CatalogStatus.source === 'offline'`).
 */

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // The OAuth return lands back in this SPA with the tokens in the URL.
        detectSessionInUrl: true,
      },
    })
  : null;

/**
 * The client, or a thrown error naming the missing env vars.
 *
 * Callers branch on `isSupabaseConfigured` first when a local-only fallback
 * exists (designs, favorites, orders); this is for the paths that genuinely
 * need a database and should fail loudly.
 */
export function db(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.'
    );
  }
  return supabase;
}

/** Storage bucket for customer photos. Mirrors the old Supabase Storage path. */
export const PHOTO_BUCKET = 'user-photos';

/**
 * The signed-in user's id (Supabase auth uuid), or null. Async because the
 * session lives in IndexedDB/localStorage; replaces Supabase's synchronous
 * `auth.currentUser.uid`. Reads the cached session, so it does not hit the network.
 */
export async function currentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}
