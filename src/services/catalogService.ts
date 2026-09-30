/**
 * Firestore-backed catalog service.
 *
 * The catalog is the database. There is no bundled fallback any more — the 340
 * templates that used to ship in `data/templates.ts` were removed, so if
 * Firestore is empty or unreachable the storefront is genuinely empty and says
 * so, rather than silently showing a stale copy of the seed.
 *
 * Reads:  `subscribeToCatalog` keeps the in-memory live catalog in sync and
 *         gives callers a snapshot stream (used by CatalogContext).
 * Writes: `upsertTemplate` / `deleteTemplate` / `restoreTemplate` are the admin
 *         operations. Delete is a SOFT delete — it stamps `deletedAt` instead of
 *         removing the document, because past orders, saved designs and
 *         favourites all reference `templateId` and would otherwise 404.
 *
 * Bulk writes are batched (Firestore caps a batch at 500 operations).
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
  type Unsubscribe,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { getLiveCatalog, setLiveCatalog } from '../data/templates';
import { getCustomUploadedTemplates } from '../utils/occasionTemplateLoader';
import { CardTemplate } from '../types/template';
import { buildTemplateFacets } from '../utils/templateFacets';

const COLLECTION = 'templates';

/** A stored template plus the admin lifecycle fields. */
export interface CatalogDocument extends CardTemplate {
  deletedAt?: string | null;
  deletedBy?: string | null;
  updatedAt?: string | null;
}

const toCatalogDocument = (t: CardTemplate): CatalogDocument => {
  // Every browse facet is filled in on write, so a doc written from anywhere
  // carries a real, filterable recipients/styles/season/tags/colors set rather
  // than the ones the caller happened to remember.
  const facets = buildTemplateFacets({
    occasion: t.category,
    imageUrl: t.thumbnail,
    previewColors: t.previewColors,
    existing: t,
  });
  // Page definitions are deep and Firestore rejects `undefined`, so we let the
  // SDK serialise what is actually present.
  const doc: CatalogDocument = { ...t, ...facets };
  return doc;
};

/**
 * Fill in any facet a stored doc is missing.
 *
 * Templates written before facets were stored (or hand-edited in Firestore) are
 * completed at load time from the artwork, mirroring how `utils/frontCover.ts`
 * cleans up cards stored before the artwork-only-front rule existed. This is why
 * no migration is needed: the data corrects itself on read. A legacy scalar
 * `recipient`/`style` is widened to an array here, which is how those documents
 * migrate themselves.
 */
const withFacets = (t: CardTemplate): CardTemplate => ({
  ...t,
  ...buildTemplateFacets({
    occasion: t.category,
    imageUrl: t.thumbnail,
    previewColors: t.previewColors,
    existing: t,
  }),
});

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
  for (const t of localCustomTemplates()) byId.set(t.id, withFacets(t));
  for (const d of remote) {
    if (isRetired(d)) continue;
    const { deletedAt, deletedBy, updatedAt, ...template } = d;
    byId.set(template.id, withFacets(template as CardTemplate));
  }
  return Array.from(byId.values());
};

/**
 * Subscribe to the live catalog.
 *
 * @param onTemplates Called with the merged, retired-filtered catalog. Fires
 *   immediately with any locally created templates, then again on every change.
 * @param onStatus Optional status callback so the admin UI can report whether the
 *   catalog is database-backed, empty, or unreachable.
 */
export function subscribeToCatalog(
  onTemplates: (templates: CardTemplate[]) => void,
  onStatus?: (status: CatalogStatus) => void
): Unsubscribe {
  const initial = mergeCatalog([]);
  onTemplates(initial);
  onStatus?.({ source: isFirebaseConfigured ? 'loading' : 'offline', templateCount: initial.length });

  if (!isFirebaseConfigured) {
    return () => {};
  }

  let cancelled = false;

  try {
    const unsub = onSnapshot(
      collection(db, COLLECTION),
      (snap) => {
        if (cancelled) return;
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as CatalogDocument);
        const merged = mergeCatalog(docs);
        setLiveCatalog(merged);
        onTemplates(merged);
        // An empty collection is a real, reportable state now that there is no
        // bundled seed to fall back to.
        onStatus?.({
          source: docs.length === 0 ? 'empty' : 'database',
          templateCount: merged.length,
        });
      },
      (err) => {
        if (cancelled) return;
        // Permission denied / offline: report it rather than pretending. The
        // storefront shows the empty state and the admin console shows why.
        console.warn('Catalog subscription failed:', err.message);
        onTemplates(initial);
        onStatus?.({ source: 'error', templateCount: initial.length, error: err.message });
      }
    );
    return unsub;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    onStatus?.({ source: 'error', templateCount: initial.length, error: message });
    return () => {};
  }
}

export interface CatalogStatus {
  /** `loading` until the first snapshot; `empty` when the collection has no docs. */
  source: 'loading' | 'database' | 'empty' | 'offline' | 'error';
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

/** Firestore accepts at most 500 writes per batch. */
const MAX_BATCH = 500;

/**
 * Soft delete many templates in as few round trips as possible.
 *
 * @param templateIds Ids to retire.
 * @param actorEmail Recorded on each tombstone.
 * @param onProgress Called after each batch with (completed, total).
 * @returns How many ids were retired.
 */
export async function bulkDeleteTemplate(
  templateIds: string[],
  actorEmail: string,
  onProgress?: (completed: number, total: number) => void
): Promise<number> {
  if (templateIds.length === 0) return 0;
  const stamp = new Date().toISOString();
  let done = 0;

  for (let i = 0; i < templateIds.length; i += MAX_BATCH) {
    const slice = templateIds.slice(i, i + MAX_BATCH);
    const batch = writeBatch(db);
    for (const id of slice) {
      batch.set(doc(db, COLLECTION, id), { deletedAt: stamp, deletedBy: actorEmail }, { merge: true });
    }
    await batch.commit();
    done += slice.length;
    onProgress?.(done, templateIds.length);
  }
  return done;
}

/** Restore many retired templates. Same batching as `bulkDeleteTemplate`. */
export async function bulkRestoreTemplate(
  templateIds: string[],
  onProgress?: (completed: number, total: number) => void
): Promise<number> {
  if (templateIds.length === 0) return 0;
  const stamp = new Date().toISOString();
  let done = 0;

  for (let i = 0; i < templateIds.length; i += MAX_BATCH) {
    const slice = templateIds.slice(i, i + MAX_BATCH);
    const batch = writeBatch(db);
    for (const id of slice) {
      batch.set(
        doc(db, COLLECTION, id),
        { deletedAt: null, deletedBy: null, updatedAt: stamp },
        { merge: true }
      );
    }
    await batch.commit();
    done += slice.length;
    onProgress?.(done, templateIds.length);
  }
  return done;
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

/** The catalog currently in use, for callers that need it outside React. */
export const currentCatalog = (): CardTemplate[] => getLiveCatalog();
