/**
 * Firestore-backed catalog service.
 *
 * The card catalog used to live entirely in the JS bundle (`data/templates.ts`),
 * which meant an admin could not add, edit or delete a card for real — the
 * Occasion Studio only mutated the current browser's memory. Firestore
 * `templates/` is now the source of truth and this module is the only place
 * that talks to it.
 *
 * Reads:  `subscribeToCatalog` keeps `data/templates.ts` live catalog in sync
 *         and gives callers a snapshot stream (used by CatalogContext).
 * Writes: `upsertTemplate` / `deleteTemplate` / `restoreTemplate` are the admin
 *         operations. Delete is a SOFT delete — it stamps `deletedAt` instead of
 *         removing the document, because past orders, saved designs and
 *         favourites all reference `templateId` and would otherwise 404.
 *
 * Fallback: if the collection is empty (never seeded) or the read fails, the
 * bundled `ALL_TEMPLATES` seed keeps the storefront working offline.
 */

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch,
  query,
  where,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { ALL_TEMPLATES, getLiveCatalog, setLiveCatalog } from '../data/templates';
import { getCustomUploadedTemplates } from '../utils/occasionTemplateLoader';
import { CardTemplate } from '../types/template';

const COLLECTION = 'templates';

/** Fields owned by the seed bundle; the admin-owned `deletedAt` is not one. */
const SEED_FIELDS = [
  'id',
  'title',
  'description',
  'category',
  'recipient',
  'style',
  'price',
  'rating',
  'reviewCount',
  'thumbnail',
  'coverImage',
  'isPhotoCard',
  'isPopular',
  'isBestSeller',
  'isNew',
  'milestoneAge',
  'tags',
  'pages',
  'cardSizes',
  'envelopeColors',
  'textStyle',
] as const;

/** A stored template plus the admin lifecycle fields. */
export interface CatalogDocument extends CardTemplate {
  deletedAt?: string | null;
  deletedBy?: string | null;
  updatedAt?: string | null;
}

const toCatalogDocument = (t: CardTemplate): CatalogDocument => {
  // Only copy known fields — page definitions are deep and Firestore rejects
  // `undefined`, so we let the SDK serialise what is actually present.
  const doc: CatalogDocument = { ...t };
  return doc;
};

/** Locally created (Occasion Studio) templates, which have no DB doc yet. */
const localCustomTemplates = (): CardTemplate[] => {
  try {
    return getCustomUploadedTemplates();
  } catch {
    return [];
  }
};

const isRetired = (d: CatalogDocument): boolean => Boolean(d.deletedAt);

/**
 * Merge Firestore documents with locally created templates, drop retired ones,
 * and de-duplicate by id (database wins, since an admin may have edited it).
 */
const mergeCatalog = (remote: CatalogDocument[]): CardTemplate[] => {
  const byId = new Map<string, CardTemplate>();
  for (const t of ALL_TEMPLATES) byId.set(t.id, t);
  for (const t of localCustomTemplates()) byId.set(t.id, t);
  for (const d of remote) {
    if (isRetired(d)) continue;
    const { deletedAt, deletedBy, updatedAt, ...template } = d;
    byId.set(template.id, template as CardTemplate);
  }
  return Array.from(byId.values());
};

/**
 * Subscribe to the live catalog.
 *
 * @param onTemplates Called with the merged, retired-filtered catalog. Fires
 *   immediately with the bundled seed if the database is empty, then again on
 *   every change.
 * @param onStatus Optional status callback so the admin UI can show whether the
 *   catalog is database-backed or still on the seed.
 */
export function subscribeToCatalog(
  onTemplates: (templates: CardTemplate[]) => void,
  onStatus?: (status: CatalogStatus) => void
): Unsubscribe {
  const fallback = mergeCatalog([]);
  onTemplates(fallback);
  onStatus?.({ source: 'seed', templateCount: fallback.length });

  if (!isFirebaseConfigured) {
    onStatus?.({ source: 'offline', templateCount: fallback.length });
    return () => {};
  }

  let cancelled = false;

  try {
    const unsub = onSnapshot(
      collection(db, COLLECTION),
      (snap) => {
        if (cancelled) return;
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CatalogDocument);
        if (docs.length === 0) {
          // Collection exists but is empty: still on the bundled seed.
          onStatus?.({ source: 'seed', templateCount: 0 });
          onTemplates(fallback);
          return;
        }
        const merged = mergeCatalog(docs);
        setLiveCatalog(merged);
        onTemplates(merged);
        onStatus?.({ source: 'database', templateCount: merged.length });
      },
      (err) => {
        if (cancelled) return;
        // Permission denied / offline: keep serving the seed rather than a blank store.
        console.warn('Catalog subscription failed, serving bundled catalog:', err.message);
        onTemplates(fallback);
        onStatus?.({ source: 'error', templateCount: fallback.length, error: err.message });
      }
    );
    return unsub;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    onStatus?.({ source: 'error', templateCount: fallback.length, error: message });
    return () => {};
  }
}

export interface CatalogStatus {
  source: 'database' | 'seed' | 'offline' | 'error';
  templateCount: number;
  error?: string;
}

/** Create or update a single template. Admin only (enforced by firestore.rules). */
export async function upsertTemplate(template: CardTemplate): Promise<void> {
  await setDoc(
    doc(db, COLLECTION, template.id),
    { ...toCatalogDocument(template), updatedAt: new Date().toISOString() },
    { merge: true }
  );
}

/**
 * Soft delete: stamp `deletedAt` so the card disappears from the storefront
 * immediately, everywhere, but the document survives for existing orders and
 * saved designs. Use `purgeTemplate` to actually remove it.
 */
export async function deleteTemplate(templateId: string, actorEmail: string): Promise<void> {
  await setDoc(
    doc(db, COLLECTION, templateId),
    { deletedAt: new Date().toISOString(), deletedBy: actorEmail },
    { merge: true }
  );
}

/** Undo a soft delete. */
export async function restoreTemplate(templateId: string): Promise<void> {
  await setDoc(
    doc(db, COLLECTION, templateId),
    { deletedAt: null, deletedBy: null, updatedAt: new Date().toISOString() },
    { merge: true }
  );
}

/**
 * Irreversibly remove the document. Only safe for templates that were never
 * sold, customised or favourited — prefer `deleteTemplate`.
 */
export async function purgeTemplate(templateId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, templateId));
}

/** All documents including retired ones, for the admin catalog screen. */
export async function fetchAllCatalogDocuments(): Promise<CatalogDocument[]> {
  const snap = await getDocs(collection(db, COLLECTION));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CatalogDocument);
}

/** Documents that have been soft deleted, for the "retired" view. */
export async function fetchRetiredTemplateIds(): Promise<string[]> {
  const snap = await getDocs(query(collection(db, COLLECTION), where('deletedAt', '!=', null)));
  return snap.docs.map((d) => d.id);
}

/**
 * One-time: write the bundled catalog into Firestore so it becomes
 * admin-manageable. Batched (Firestore caps writes at 500 per batch).
 * Existing documents are left alone — this seeds, it does not overwrite.
 *
 * @param onProgress Called with (written, total) as the batches land.
 */
export async function seedCatalogFromBundle(
  onProgress?: (written: number, total: number) => void
): Promise<number> {
  const existing = await fetchAllCatalogDocuments();
  const existingIds = new Set(existing.map((d) => d.id));
  const toWrite = ALL_TEMPLATES.filter((t) => !existingIds.has(t.id));

  const BATCH_SIZE = 400;
  let written = 0;

  for (let i = 0; i < toWrite.length; i += BATCH_SIZE) {
    const slice = toWrite.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    for (const t of slice) {
      batch.set(
        doc(db, COLLECTION, t.id),
        { ...toCatalogDocument(t), createdAt: serverTimestamp(), updatedAt: new Date().toISOString() },
        { merge: true }
      );
    }
    await batch.commit();
    written += slice.length;
    onProgress?.(written, toWrite.length);
  }

  return written;
}

/** The catalog currently in use, for callers that need it outside React. */
export const currentCatalog = (): CardTemplate[] => getLiveCatalog();
