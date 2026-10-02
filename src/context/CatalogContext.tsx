/**
 * Catalog context: the single live view of the card catalog for React.
 *
 * Mounted once near the root (see App.tsx) so every page reads database-backed
 * templates. Pages that previously imported `ALL_TEMPLATES` should use
 * `useCatalog()` instead, which is what makes admin deletions visible
 * everywhere immediately.
 *
 * `subscribeToCatalog` is a module-level singleton subscription — the provider
 * holds the only Postgres listener and fans the result out to consumers.
 */

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { CardTemplate } from '../types/template';
import { useAuth } from './AuthContext';
import {
  subscribeToCatalog,
  deleteTemplate,
  restoreTemplate,
  bulkDeleteTemplate,
  bulkRestoreTemplate,
  purgeTemplate,
  purgeRetiredTemplates,
  upsertTemplate,
  fetchAllCatalogDocuments,
  type CatalogDocument,
  type CatalogStatus,
} from '../services/catalogService';

interface CatalogContextValue {
  /** Live catalog, retired templates removed. */
  templates: CardTemplate[];
  /** Every document in Postgres, retired ones included — admin screens only. */
  documents: CatalogDocument[];
  status: CatalogStatus;
  /** True while the first snapshot is in flight. */
  loading: boolean;
  refreshDocuments: () => Promise<void>;
  upsertTemplate: (template: CardTemplate) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  restoreTemplate: (id: string) => Promise<void>;
  /** Soft delete many at once; resolves with the number retired. */
  bulkDeleteTemplates: (ids: string[], onProgress?: (done: number, total: number) => void) => Promise<number>;
  /** Restore many at once; resolves with the number restored. */
  bulkRestoreTemplates: (ids: string[], onProgress?: (done: number, total: number) => void) => Promise<number>;
  purgeTemplate: (id: string) => Promise<void>;
  /** Erase retired rows for good; refuses live or already-sold cards. */
  purgeRetiredTemplates: (ids: string[]) => Promise<number>;
}

const CatalogContext = createContext<CatalogContextValue | undefined>(undefined);

export const CatalogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [templates, setTemplates] = useState<CardTemplate[]>([]);
  const [documents, setDocuments] = useState<CatalogDocument[]>([]);
  const [status, setStatus] = useState<CatalogStatus>({ source: 'loading', templateCount: 0 });
  const [loading, setLoading] = useState(true);

  // One Postgres listener for the whole app.
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToCatalog(
      (next) => {
        setTemplates(next);
        setLoading(false);
      },
      setStatus
    );
    return unsubscribe;
  }, []);

  const refreshDocuments = React.useCallback(async () => {
    try {
      setDocuments(await fetchAllCatalogDocuments());
    } catch (e) {
      console.warn('Could not load catalog documents:', e);
    }
  }, []);

  // Recorded on the tombstone so it is auditable which account removed a card.
  const actorEmail = useAuth().user?.email;

  const value = useMemo<CatalogContextValue>(
    () => ({
      templates,
      documents,
      status,
      loading,
      refreshDocuments,
      upsertTemplate,
      // Stamp the acting admin onto the tombstone so it is auditable which
      // account removed a card.
      deleteTemplate: (id: string) => deleteTemplate(id, actorEmail ?? 'unknown'),
      restoreTemplate,
      bulkDeleteTemplates: (ids: string[], onProgress?: (done: number, total: number) => void) =>
        bulkDeleteTemplate(ids, actorEmail ?? 'unknown', onProgress),
      bulkRestoreTemplates: (ids: string[], onProgress?: (done: number, total: number) => void) =>
        bulkRestoreTemplate(ids, onProgress),
      purgeTemplate,
      purgeRetiredTemplates,
    }),
    [templates, documents, status, loading, refreshDocuments, actorEmail]
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
};

export function useCatalog(): CatalogContextValue {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog must be used within a CatalogProvider');
  return ctx;
}
