/**
 * Catalog service — `public.templates` in Postgres.
 *
 * The catalog is the database. There is no bundled fallback: if Supabase is
 * empty or unreachable the storefront is genuinely empty and says so, rather
 * than silently showing a stale copy of a seed.
 *
 * Reads:  `subscribeToCatalog` fetches once, registers the caller, and notifies
 *         it again on every reload — `CatalogProvider` holds the only
 *         subscription and fans the result out to React.
 * Writes: every admin write reloads the catalog before it resolves, so a
 *         retired card disappears everywhere without a refresh. This is a
 *         refetch rather than a realtime channel on purpose: there is one
 *         operator, and a channel would add a publication migration and a
 *         reconnect path to save one SELECT after a write the admin just made.
 *         Add Supabase Realtime on `templates` if a second admin ever needs to
 *         watch the storefront live.
 *
 * `deleteTemplate` is a SOFT delete — it stamps `deleted_at` instead of
 * removing the row, because past orders, saved designs and favourites all
 * reference `templateId`. RLS keeps retired rows readable for that reason and
 * the storefront filters them out (see `mergeCatalog`).
 */

import { getLiveCatalog, setLiveCatalog } from '../data/templates';
import { getCustomUploadedTemplates } from '../utils/occasionTemplateLoader';
import { CardTemplate } from '../types/template';
import { buildTemplateFacets } from '../utils/templateFacets';
import { isSupabaseConfigured, db } from './supabase';
import { rowToTemplate, templateToRow } from './templateRows';

const TABLE = 'templates';

/** A stored template plus the admin lifecycle fields. */
export interface CatalogDocument extends CardTemplate {
  deletedAt?: string | null;
  deletedBy?: string | null;
  updatedAt?: string | null;
}

const toCatalogDocument = (t: CardTemplate): CatalogDocument => {
  // Every browse facet is filled in on write, so a row written from anywhere
  // carries a real, filterable recipients/styles/season/tags/colors set rather
  // than the ones the caller happened to remember.
  const facets = buildTemplateFacets({
    occasion: t.category,
    imageUrl: t.thumbnail,
    previewColors: t.previewColors,
    existing: t,
  });
  return { ...t, ...facets };
};

/**
 * Fill in any facet a stored row is missing.
 *
 * Templates written before facets were stored (or hand-edited) are completed at
 * load time from the artwork, mirroring how `utils/frontCover.ts` cleans up
 * cards stored before the artwork-only-front rule existed. This is why no data
 * migration is needed: the data corrects itself on read. A legacy scalar
 * `recipient`/`style` is widened to an array here, which is how those rows
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

/** Locally created (Occasion Studio) templates, which have no DB row yet. */
const localCustomTemplates = (): CardTemplate[] => {
  try {
    return getCustomUploadedTemplates();
  } catch {
    return [];
  }
};

const isRetired = (d: CatalogDocument): boolean => Boolean(d.deletedAt);

/**
 * Merge database rows with locally created templates, drop retired ones, and
 * de-duplicate by id (database wins, since an admin may have edited it).
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

export interface CatalogStatus {
  /** `loading` until the first fetch; `empty` when the table has no rows. */
  source: 'loading' | 'database' | 'empty' | 'offline' | 'error';
  templateCount: number;
  error?: string;
}

export interface CatalogSnapshot {
  templates: CardTemplate[];
  status: CatalogStatus;
}

type Listener = (snapshot: CatalogSnapshot) => void;

const listeners = new Set<Listener>();

const notify = (snapshot: CatalogSnapshot) => {
  for (const listener of listeners) listener(snapshot);
};

const localSnapshot = (status: CatalogStatus['source']): CatalogSnapshot => {
  const templates = mergeCatalog([]);
  return { templates, status: { source: status, templateCount: templates.length } };
};

/** All rows, retired included. Admin screens only — RLS hides retired rows from everyone else. */
export async function fetchAllCatalogDocuments(): Promise<CatalogDocument[]> {
  const { data, error } = await db().from(TABLE).select('*');
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToTemplate) as CatalogDocument[];
}

/** Documents that have been soft deleted, for the "retired" view. */
export async function fetchRetiredTemplateIds(): Promise<string[]> {
  const { data, error } = await db().from(TABLE).select('id').not('deleted_at', 'is', null);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.id as string);
}

let lastSnapshot: CatalogSnapshot = { templates: [], status: { source: 'loading', templateCount: 0 } };

/**
 * Re-read the catalog and tell every subscriber. Called after each write and
 * by `recomputeTemplateRating`, so a rating change reaches the storefront too.
 */
export async function reloadCatalog(): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const docs = await fetchAllCatalogDocuments();
    const templates = mergeCatalog(docs);
    setLiveCatalog(templates);
    lastSnapshot = {
      templates,
      status: {
        source: docs.length === 0 ? 'empty' : 'database',
        templateCount: templates.length,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    // Report it rather than pretending: the storefront shows the empty state
    // and the admin console shows why.
    console.warn('Catalog reload failed:', message);
    lastSnapshot = {
      templates: mergeCatalog([]),
      status: { source: 'error', templateCount: 0, error: message },
    };
  }
  notify(lastSnapshot);
}

/**
 * Subscribe to the live catalog.
 *
 * @param onTemplates Called with the merged, retired-filtered catalog.
 * @param onStatus Optional status callback so the admin UI can report whether
 *   the catalog is database-backed, empty, or unreachable.
 */
export function subscribeToCatalog(
  onTemplates: (templates: CardTemplate[]) => void,
  onStatus?: (status: CatalogStatus) => void
): () => void {
  const listener: Listener = (snapshot) => {
    onTemplates(snapshot.templates);
    onStatus?.(snapshot.status);
  };
  listeners.add(listener);

  if (!isSupabaseConfigured) {
    const snapshot = localSnapshot('offline');
    listener(snapshot);
    return () => listeners.delete(listener);
  }

  listener(lastSnapshot);
  void reloadCatalog();

  return () => {
    listeners.delete(listener);
  };
}

/** Create or update a single template. Admin only (enforced by RLS). */
export async function upsertTemplate(template: CardTemplate): Promise<void> {
  const row = templateToRow(toCatalogDocument(template));
  const { error } = await db().from(TABLE).upsert(row, { onConflict: 'id' });
  if (error) throw new Error(error.message);
  await reloadCatalog();
}

/**
 * Soft delete: stamp `deleted_at` so the card disappears from the storefront
 * immediately, everywhere, but the row survives for existing orders and saved
 * designs. Use `purgeTemplate` to actually remove it.
 */
export async function deleteTemplate(templateId: string, actorEmail: string): Promise<void> {
  await tombstone(templateId, { deleted_at: new Date().toISOString(), deleted_by: actorEmail });
}

/** Undo a soft delete. */
export async function restoreTemplate(templateId: string): Promise<void> {
  await tombstone(templateId, { deleted_at: null, deleted_by: null });
}

const tombstone = async (templateId: string, patch: Record<string, unknown>): Promise<void> => {
  const { error } = await db().from(TABLE).update(patch).eq('id', templateId);
  if (error) throw new Error(error.message);
  await reloadCatalog();
};

/**
 * Retire many templates in one round trip.
 *
 * @param templateIds Ids to retire.
 * @param actorEmail Recorded on each tombstone.
 * @param onProgress Called with (completed, total) once the batch lands.
 * @returns How many ids were retired.
 */
export async function bulkDeleteTemplate(
  templateIds: string[],
  actorEmail: string,
  onProgress?: (completed: number, total: number) => void
): Promise<number> {
  if (templateIds.length === 0) return 0;
  const { error } = await db()
    .from(TABLE)
    .update({ deleted_at: new Date().toISOString(), deleted_by: actorEmail })
    .in('id', templateIds);
  if (error) throw new Error(error.message);
  await reloadCatalog();
  onProgress?.(templateIds.length, templateIds.length);
  return templateIds.length;
}

/** Restore many retired templates. One statement, like `bulkDeleteTemplate`. */
export async function bulkRestoreTemplate(
  templateIds: string[],
  onProgress?: (completed: number, total: number) => void
): Promise<number> {
  if (templateIds.length === 0) return 0;
  const { error } = await db()
    .from(TABLE)
    .update({ deleted_at: null, deleted_by: null })
    .in('id', templateIds);
  if (error) throw new Error(error.message);
  await reloadCatalog();
  onProgress?.(templateIds.length, templateIds.length);
  return templateIds.length;
}

/**
 * Irreversibly remove the row. Only safe for templates that were never sold,
 * customised or favourited — prefer `deleteTemplate`.
 */
export async function purgeTemplate(templateId: string): Promise<void> {
  const { error } = await db().from(TABLE).delete().eq('id', templateId);
  if (error) throw new Error(error.message);
  await reloadCatalog();
}

/** The catalog currently in use, for callers that need it outside React. */
export const currentCatalog = (): CardTemplate[] => getLiveCatalog();
