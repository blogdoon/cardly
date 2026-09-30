import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured, auth } from './firebase';
import { UserDesign } from '../types/design';
import { handleFirestoreError, OperationType } from './firestoreErrors';

/**
 * Read-only "proof" links: a customer shares a card with someone for approval
 * before ordering it. Backed by Firestore rather than localStorage because the
 * recipient is a different person on a different device.
 *
 * The share id is the only secret. `firestore.rules` allows anonymous reads on
 * /shared/{shareId}, so the id must be unguessable — hence crypto.randomUUID.
 */

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

export function isShareAvailable(): boolean {
  return isFirebaseConfigured && Boolean(db) && Boolean(auth?.currentUser);
}

export function sharePath(shareId: string): string {
  return `/shared/${shareId}/`;
}

export async function createShareProof(design: UserDesign): Promise<SharedProof> {
  const user = auth?.currentUser;
  if (!db || !user) throw new Error('Sign in to share a card proof.');

  const shareId = crypto.randomUUID();
  const now = new Date();
  const expires = new Date(now.getTime() + PROOF_TTL_DAYS * 24 * 60 * 60 * 1000);

  const proof: SharedProof = {
    shareId,
    ownerId: user.uid,
    title: design.title,
    design,
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  };

  const path = `shared/${shareId}`;
  try {
    await setDoc(doc(db, 'shared', shareId), proof);
  } catch (e: any) {
    if (e?.code === 'permission-denied') {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
    throw e;
  }
  return proof;
}

/** A hung read must not leave the recipient staring at a spinner forever. */
const READ_TIMEOUT_MS = 8000;

export async function getShareProof(shareId: string): Promise<SharedProof | null> {
  if (!db || !shareId) return null;
  try {
    const read = (async () => {
      const snap = await getDoc(doc(db, 'shared', shareId));
      if (!snap.exists()) return null;
      return snap.data() as SharedProof;
    })();

    const proof = await Promise.race([
      read,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), READ_TIMEOUT_MS)),
    ]);

    // Soft expiry: rules cannot compare dates, so the client refuses a stale link.
    if (proof?.expiresAt && new Date(proof.expiresAt).getTime() < Date.now()) return null;
    return proof;
  } catch (e: any) {
    if (e?.code === 'permission-denied') {
      handleFirestoreError(e, OperationType.LIST, `shared/${shareId}`);
    }
    console.warn('Could not load share proof:', e);
    return null;
  }
}

export async function revokeShareProof(shareId: string): Promise<void> {
  if (!db) return;
  try {
    await deleteDoc(doc(db, 'shared', shareId));
  } catch (e) {
    console.warn('Could not revoke share proof:', e);
  }
}
