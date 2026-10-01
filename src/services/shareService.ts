import { db, isSupabaseConfigured, currentUserId } from './supabase';
import { UserDesign } from '../types/design';

/**
 * Read-only "proof" links: a customer shares a card for approval before
 * ordering. Backed by `public.shared_cards` (not localStorage) because the
 * recipient is a different person on a different device.
 *
 * The share id is the only secret. The select policy is public, so the id must
 * be unguessable — hence crypto.randomUUID. The table stores only `pages` +
 * title + owner, never an address or order detail (the row is world-readable).
 */

const TABLE = 'shared_cards';

export interface SharedProof {
  shareId: string;
  ownerId: string;
  title: string;
  design: UserDesign;
  createdAt: string;
  /** ISO date after which the proof should be treated as dead. */
  expiresAt: string;
}

/** Proofs are disposable; 30 days is long enough to collect opinions. */
const PROOF_TTL_DAYS = 30;

const expiryOf = (createdAt: string): string =>
  new Date(new Date(createdAt).getTime() + PROOF_TTL_DAYS * 86_400_000).toISOString();

export function isShareAvailable(): boolean {
  return isSupabaseConfigured;
}

export function sharePath(shareId: string): string {
  return `/shared/${shareId}/`;
}

export async function createShareProof(design: UserDesign): Promise<SharedProof> {
  const ownerId = await currentUserId();
  if (!ownerId) throw new Error('Sign in to share a card proof.');

  const shareId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const { error } = await db().from(TABLE).insert({
    id: shareId,
    owner_id: ownerId,
    title: design.title,
    pages: design.pages,
  });
  if (error) throw new Error(error.message);

  return {
    shareId,
    ownerId,
    title: design.title,
    design,
    createdAt,
    expiresAt: expiryOf(createdAt),
  };
}

export async function getShareProof(shareId: string): Promise<SharedProof | null> {
  if (!isSupabaseConfigured || !shareId) return null;
  try {
    const { data, error } = await db()
      .from(TABLE)
      .select('*')
      .eq('id', shareId)
      .maybeSingle();
    if (error || !data) return null;

    const createdAt = (data.created_at as string) ?? new Date().toISOString();
    const expiresAt = expiryOf(createdAt);
    // Soft expiry: the client refuses a stale link.
    if (new Date(expiresAt).getTime() < Date.now()) return null;

    // Only `pages` is stored; reconstruct the minimal design the viewer needs.
    const design = { pages: data.pages, title: data.title } as unknown as UserDesign;
    return {
      shareId,
      ownerId: (data.owner_id as string) ?? '',
      title: (data.title as string) ?? '',
      design,
      createdAt,
      expiresAt,
    };
  } catch (e) {
    console.warn('Could not load share proof:', e);
    return null;
  }
}

export async function revokeShareProof(shareId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    await db().from(TABLE).delete().eq('id', shareId);
  } catch (e) {
    console.warn('Could not revoke share proof:', e);
  }
}
