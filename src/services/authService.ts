/**
 * Authentication.
 *
 * Supabase Auth replaced Supabase Auth. The shape of this module is unchanged —
 * `AuthContext` still calls `loginWithGoogle` / `logoutUser` / `subscribeToAuth`
 * — but three things are different, and better:
 *
 *   * Sign-in is an OAuth popup opened at the URL Supabase hands back. The popup
 *     writes the session to this origin's storage and broadcasts it here, so the
 *     wait below is a cross-tab event, not a redirect.
 *   * `role` comes from `profiles.role`, which only an admin may change (a
 *     trigger in `supabase/migrations/0002_rls.sql` blocks self-promotion). The
 *     hardcoded admin email is gone; granting admin is one statement run as the
 *     service role, documented in AGENTS.md.
 *   * There is no anonymous sign-in. A signed-out visitor keeps their designs,
 *     favorites and orders in localStorage, which is what the app already did
 *     for guests — the anonymous session only ever synced them to a throwaway
 *     uid that the next visit could not find again.
 */

import type { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, db } from './supabase';
import { UserProfile } from '../types/user';

const DEMO_USER_STORAGE_KEY = 'cardly_demo_user_session';

/**
 * The local developer fallback hands out an admin session. That is fine on a
 * laptop and a backdoor in production, so it is hard-gated to loopback.
 */
const isLoopback = (): boolean => {
  if (typeof location === 'undefined') return false;
  const h = location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h.endsWith('.localhost');
};

const DEFAULT_AVATAR = (uid: string) =>
  `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`;

/** Build the profile from the auth user, then correct it from the profile row. */
async function loadProfile(user: User): Promise<UserProfile> {
  const meta = (user.user_metadata ?? {}) as Record<string, string | undefined>;
  // Admin is decided by app_metadata.is_admin — the same field `is_admin()` reads
  // in the RLS (0002_rls.sql), set server-side by the bootstrap trigger
  // (0003_bootstrap_admin.sql). Reading it off the JWT here means the admin UI
  // and the database can never disagree, and the profiles.role mirror only has
  // to catch up for display.
  const appMeta = (user.app_metadata ?? {}) as Record<string, unknown>;
  const isAdmin = appMeta.is_admin === 'true' || appMeta.is_admin === true;
  const profile: UserProfile = {
    uid: user.id,
    email: user.email ?? null,
    displayName: meta.full_name || meta.name || 'Cardly Member',
    photoURL: meta.avatar_url || meta.picture || DEFAULT_AVATAR(user.id),
    role: isAdmin ? 'admin' : 'customer',
    createdAt: user.created_at || new Date().toISOString(),
  };

  if (!isSupabaseConfigured) return profile;

  try {
    // First sign-in creates the row. `ignoreDuplicates` keeps this a no-op for
    // returning users — an UPDATE would have to carry `role`, and a customer
    // may not write that column.
    const { error: insertError } = await db().from('profiles').upsert(
      {
        id: user.id,
        email: profile.email,
        display_name: profile.displayName,
        photo_url: profile.photoURL,
      },
      { onConflict: 'id', ignoreDuplicates: true }
    );
    if (insertError) console.warn('Could not sync profile:', insertError.message);

    // Only createdAt is read back; the role above is authoritative (from the JWT).
    const { data, error } = await db()
      .from('profiles')
      .select('created_at')
      .eq('id', user.id)
      .maybeSingle();
    if (error) {
      console.warn('Could not read profile:', error.message);
    } else if (data?.created_at) {
      profile.createdAt = data.created_at;
    }
  } catch (e) {
    console.warn('Profile sync failed:', e);
  }

  return profile;
}

/**
 * Sign in with Google in a popup and resolve with the resulting profile.
 *
 * The session is written by the popup and broadcast to this tab by supabase-js,
 * so this waits for that event rather than polling storage.
 */
export async function loginWithGoogle(): Promise<UserProfile> {
  if (!isSupabaseConfigured) return getFallbackDemoProfile();

  const { data, error } = await db().auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: location.origin,
      skipBrowserRedirect: true,
    },
  });
  if (error) throw new Error(error.message || 'Failed to start Google sign-in');

  const popup = window.open(data.url, 'cardly-google-oauth', 'width=520,height=640');
  if (!popup) {
    throw new Error('The sign-in window was blocked. Allow pop-ups for this site and try again.');
  }

  try {
    const user = await waitForUser(90_000);
    return await loadProfile(user);
  } finally {
    if (!popup.closed) popup.close();
  }
}

/** Wait for a session to arrive from the sign-in popup. */
function waitForUser(timeoutMs: number): Promise<User> {
  const auth = db().auth;
  return new Promise<User>((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = () => {
      if (timer) clearTimeout(timer);
      subscription.unsubscribe();
    };
    const { data: { subscription } } = auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        stop();
        resolve(session.user);
      }
    });
    timer = setTimeout(() => {
      stop();
      reject(
        new Error(
          'Google sign-in timed out. Add this origin to the Redirect URLs of the Google provider in Supabase.'
        )
      );
    }, timeoutMs);
  });
}

/**
 * Off-loopback there is no fallback: being signed out is recoverable, a
 * production backdoor is not. On localhost the app still boots without Supabase
 * keys, so a demo session keeps the admin console usable.
 */
function getFallbackDemoProfile(): UserProfile {
  if (!isLoopback()) {
    throw new Error(
      'Google sign-in is unavailable and the local developer fallback only runs on localhost. ' +
        'Check the Supabase redirect URLs for this host.'
    );
  }
  const demoProfile: UserProfile = {
    uid: 'demo_user_google_108',
    email: 'blogdoontv@gmail.com',
    displayName: 'Alex Morgan',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    role: 'admin',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString(),
    savedAddresses: [
      {
        id: 'addr-1',
        name: 'Alex Morgan',
        line1: '12 Merrion Square',
        city: 'Dublin',
        county: 'Leinster',
        postcode: 'D02 AF30',
        country: 'Ireland',
        isDefault: true,
      },
    ],
  };

  localStorage.setItem(DEMO_USER_STORAGE_KEY, JSON.stringify(demoProfile));
  return demoProfile;
}

/** Email + password sign-in. The profile arrives through `subscribeToAuth`. */
export async function loginWithPassword(email: string, password: string): Promise<void> {
  const { error } = await db().auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

/**
 * Create an email + password account. Returns true when the project requires
 * email confirmation (no session yet), so the UI can say "check your inbox".
 */
export async function signUpWithPassword(email: string, password: string): Promise<boolean> {
  const { data, error } = await db().auth.signUp({
    email,
    password,
    options: { emailRedirectTo: location.origin },
  });
  if (error) throw new Error(error.message);
  return !data.session;
}

export async function logoutUser(): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      await db().auth.signOut();
    } catch (e) {
      console.warn('Error signing out from Supabase:', e);
    }
  }
  localStorage.removeItem(DEMO_USER_STORAGE_KEY);
}

export function getStoredDemoUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(DEMO_USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function subscribeToAuth(callback: (user: UserProfile | null) => void): () => void {
  if (!supabase) {
    callback(getStoredDemoUser());
    return () => {};
  }

  let cancelled = false;
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    if (!session?.user) {
      if (!cancelled) callback(getStoredDemoUser());
      return;
    }
    // `loadProfile` only talks to PostgREST, never back into auth, so running it
    // inside this callback cannot deadlock the auth lock.
    void loadProfile(session.user).then((profile) => {
      if (!cancelled) callback(profile);
    });
  });

  return () => {
    cancelled = true;
    subscription.unsubscribe();
  };
}
