import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShieldCheck,
  Search,
  Database,
  Package,
  Layers,
  CheckCircle,
  Eye,
  Edit,
  ArrowLeft,
  DollarSign,
  TrendingUp,
  AlertCircle,
  FolderHeart,
  Trash2,
  RotateCcw,
  UploadCloud,
  Loader2
} from 'lucide-react';
import { getLiveCatalog, unregisterCustomTemplate } from '../data/templates';
import { CardTemplate } from '../types/template';
import { Order } from '../types/order';
import { formatPrice } from '../utils/currency';
import { useAuth } from '../context/AuthContext';
import { useCatalog } from '../context/CatalogContext';
import { upsertTemplate } from '../services/catalogService';
import { TemplateFacetEditor } from '../components/Admin/TemplateFacetEditor';
import { isSupabaseConfigured } from '../services/supabase';
import { OccasionStudio } from '../components/Admin/OccasionStudio';
import { AdminOrdersPanel } from '../components/Admin/AdminOrdersPanel';
import { AdminReviewsPanel } from '../components/Admin/AdminReviewsPanel';
import type { BrowseFacets } from '../utils/routes';

interface AdminProps {
  onNavigate: (route: string, param?: string, facets?: BrowseFacets) => void;
}

/** Rows rendered per page in the catalog table. Selection is scoped to these. */
const PAGE_SIZE = 50;

/** A deletion held until the admin confirms — one card, or a whole selection. */
interface PendingDelete {
  /** Ids to remove. */
  ids: string[];
  /** Ids that exist only in this browser (Occasion Studio) and are removed outright. */
  customIds: string[];
  /** Title shown in the dialog; the full list when several are selected. */
  title: string;
}

export const Admin: React.FC<AdminProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const {
    templates,
    documents,
    status,
    loading,
    refreshDocuments,
    deleteTemplate,
    restoreTemplate,
    bulkDeleteTemplates,
    bulkRestoreTemplates,
  } = useCatalog();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeTab, setActiveTab] = useState<'catalog' | 'orders' | 'reviews' | 'occasions' | 'system'>('catalog');

  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);
  const [showRetired, setShowRetired] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [seeding, setSeeding] = useState(false);

  // Multi-select. Ids currently ticked in the table.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Id most recently toggled, so shift-click can select a range.
  const [lastToggled, setLastToggled] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    void refreshDocuments();
  }, [refreshDocuments]);

  // Templates retired in the database, surfaced as a separate admin view.
  const retiredIds = useMemo(
    () => new Set(documents.filter((d) => d.deletedAt).map((d) => d.id)),
    [documents]
  );

  const categories = useMemo(
    () => ['All', ...Array.from(new Set(templates.map((t) => t.category))).sort()],
    [templates]
  );

  const filteredTemplates = useMemo(() => {
    const source = showRetired
      ? documents.filter((d) => d.deletedAt).map(({ deletedAt, deletedBy, updatedAt, ...t }) => t as CardTemplate)
      : templates;
    return source.filter((t) => {
      if (selectedCategory !== 'All' && t.category !== selectedCategory) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          t.title.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [showRetired, documents, templates, selectedCategory, search]);

  /** True for templates created locally in Occasion Studio (no Postgres doc). */
  const isLocallyCreated = useCallback(
    (id: string) => !documents.some((d) => d.id === id),
    [documents]
  );

  /** Rows actually rendered — selection and "select all" operate on these. */
  const visibleTemplates = useMemo(() => filteredTemplates.slice(0, PAGE_SIZE), [filteredTemplates]);

  // Drop ticked rows that scrolled out of view, so a bulk delete can never
  // silently remove a card the admin can no longer see.
  useEffect(() => {
    const visibleIds = new Set(visibleTemplates.map((t) => t.id));
    setSelected((prev) => {
      const next = new Set([...prev].filter((id) => visibleIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [visibleTemplates]);

  // Switching between the live and retired views invalidates the selection.
  useEffect(() => {
    setSelected(new Set());
    setLastToggled(null);
  }, [showRetired, selectedCategory]);

  const allVisibleSelected =
    visibleTemplates.length > 0 && visibleTemplates.every((t) => selected.has(t.id));
  const someVisibleSelected = visibleTemplates.some((t) => selected.has(t.id)) && !allVisibleSelected;

  const toggleOne = useCallback(
    (id: string, range: boolean) => {
      setSelected((prev) => {
        const next = new Set(prev);
        const ids = visibleTemplates.map((t) => t.id);
        const anchorIdx = lastToggled ? ids.indexOf(lastToggled) : -1;
        const targetIdx = ids.indexOf(id);

        if (range && anchorIdx >= 0 && targetIdx >= 0) {
          // Shift-click: apply the anchor's tick state across the range.
          const shouldSelect = !prev.has(lastToggled!);
          const [from, to] = anchorIdx < targetIdx ? [anchorIdx, targetIdx] : [targetIdx, anchorIdx];
          for (let i = from; i <= to; i++) {
            if (shouldSelect) next.add(ids[i]);
            else next.delete(ids[i]);
          }
        } else if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
      setLastToggled(id);
    },
    [lastToggled, visibleTemplates]
  );

  const toggleAllVisible = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) visibleTemplates.forEach((t) => next.delete(t.id));
      else visibleTemplates.forEach((t) => next.add(t.id));
      return next;
    });
    setLastToggled(null);
  }, [allVisibleSelected, visibleTemplates]);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
    setLastToggled(null);
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (!pendingDelete) return;
    const { ids, customIds, title } = pendingDelete;
    setPendingDelete(null);
    setBulkBusy(true);
    setBulkProgress({ done: 0, total: ids.length + customIds.length });
    try {
      // Locally created cards have no Postgres document to retire.
      customIds.forEach((id) => unregisterCustomTemplate(id));

      const dbIds = ids.filter((id) => !customIds.includes(id));
      const retired = await bulkDeleteTemplates(dbIds, (done, total) =>
        setBulkProgress({ done: done + customIds.length, total: total + customIds.length })
      );

      await refreshDocuments();
      const total = retired + customIds.length;
      setNotice({
        tone: 'ok',
        text:
          ids.length + customIds.length === 1
            ? `Removed "${title}" from the catalog.`
            : `Removed ${total} card${total === 1 ? '' : 's'} from the catalog.`,
      });
      clearSelection();
    } catch (e) {
      setNotice({
        tone: 'error',
        text:
          e instanceof Error
            ? `Bulk delete failed: ${e.message}. Check that RLS policies allow admin writes.`
            : 'Bulk delete failed.',
      });
    } finally {
      setBulkBusy(false);
      setBulkProgress(null);
    }
  }, [pendingDelete, bulkDeleteTemplates, refreshDocuments, clearSelection]);

  const handleBulkRestore = useCallback(async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBulkBusy(true);
    setBulkProgress({ done: 0, total: ids.length });
    try {
      const restored = await bulkRestoreTemplates(ids, (done, total) =>
        setBulkProgress({ done, total })
      );
      await refreshDocuments();
      setNotice({
        tone: 'ok',
        text: `Restored ${restored} card${restored === 1 ? '' : 's'}.`,
      });
      clearSelection();
    } catch (e) {
      setNotice({
        tone: 'error',
        text: e instanceof Error ? `Bulk restore failed: ${e.message}.` : 'Bulk restore failed.',
      });
    } finally {
      setBulkBusy(false);
      setBulkProgress(null);
    }
  }, [selected, bulkRestoreTemplates, refreshDocuments, clearSelection]);

  /** Open the confirm dialog for an arbitrary set of templates. */
  const requestDelete = useCallback(
    (targets: CardTemplate[]) => {
      if (targets.length === 0) return;
      const customIds = targets.filter((t) => isLocallyCreated(t.id)).map((t) => t.id);
      setPendingDelete({
        ids: targets.map((t) => t.id),
        customIds,
        title: targets.length === 1 ? targets[0].title : `${targets.length} selected cards`,
      });
    },
    [isLocallyCreated]
  );

  const handleToggleBestSeller = useCallback(
    async (template: CardTemplate) => {
      const next = { ...template, isBestSeller: !template.isBestSeller };
      setBusyId(template.id);
      try {
        await upsertTemplate(next);
        setNotice({ tone: 'ok', text: `Updated "${template.title}".` });
      } catch (e) {
        setNotice({
          tone: 'error',
          text: e instanceof Error ? e.message : 'Could not save that change.',
        });
      } finally {
        setBusyId(null);
      }
    },
    []
  );

  /**
   * Save edited browse facets.
   *
   * Facets were previously write-only — the only way to fix a card filed in the
   * wrong bucket was to delete and recreate it, which changes the id that past
   * orders and saved designs reference. This goes through the same
   * `upsertTemplate` the studio uses, so there is still one writer.
   */
  const handleSaveFacets = useCallback(async (next: CardTemplate) => {
    setBusyId(next.id);
    try {
      await upsertTemplate(next);
    } catch (e) {
      setNotice({
        tone: 'error',
        text: e instanceof Error ? e.message : 'Could not save those facets.',
      });
      // Re-thrown so the editor keeps the dialog open with the user's input
      // rather than closing over a failed write.
      throw e;
    } finally {
      setBusyId(null);
    }
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    const { ids, customIds, title } = pendingDelete;
    setPendingDelete(null);
    setBusyId(ids[0]);
    try {
      customIds.forEach((id) => unregisterCustomTemplate(id));
      const dbIds = ids.filter((id) => !customIds.includes(id));
      for (const id of dbIds) {
        await deleteTemplate(id);
      }
      await refreshDocuments();
      setNotice({ tone: 'ok', text: `Removed "${title}" from the catalog.` });
    } catch (e) {
      setNotice({
        tone: 'error',
        text:
          e instanceof Error
            ? `Could not delete: ${e.message}. Check that RLS policies allow admin writes.`
            : 'Could not delete that template.',
      });
    } finally {
      setBusyId(null);
    }
  }, [pendingDelete, deleteTemplate, refreshDocuments]);

  const handleRestore = useCallback(
    async (template: CardTemplate) => {
      setBusyId(template.id);
      try {
        await restoreTemplate(template.id);
        await refreshDocuments();
        setNotice({ tone: 'ok', text: `Restored "${template.title}".` });
      } catch (e) {
        setNotice({ tone: 'error', text: e instanceof Error ? e.message : 'Could not restore.' });
      } finally {
        setBusyId(null);
      }
    },
    [restoreTemplate, refreshDocuments]
  );


  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onNavigate('home')}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Admin Control Center</h1>
              <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 text-xs font-bold rounded-full uppercase">
                Staff Portal
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Logged in as {user?.email || 'unknown admin'}
            </p>
          </div>
        </div>

        {/* Navigation tabs */}
        <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-2xl text-xs font-bold">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`px-4 py-2 rounded-xl transition ${
              activeTab === 'catalog' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600'
            }`}
          >
            Catalog ({templates.length})
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl transition ${
              activeTab === 'orders' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600'
            }`}
          >
            Orders
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-4 py-2 rounded-xl transition ${
              activeTab === 'reviews' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600'
            }`}
          >
            Reviews
          </button>
          <button
            onClick={() => setActiveTab('occasions')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
              activeTab === 'occasions' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600'
            }`}
          >
            <FolderHeart className="w-3.5 h-3.5 text-rose-500" />
            Occasions & Studio
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`px-4 py-2 rounded-xl transition ${
              activeTab === 'system' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-600'
            }`}
          >
            System & Supabase
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-3xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Total Catalog Cards</span>
            <Layers className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-3xl font-black text-slate-900">{templates.length}</div>
          <div
            className={`text-[11px] font-semibold ${
              status.source === 'database' ? 'text-emerald-600' : 'text-amber-600'
            }`}
          >
            {status.source === 'database' && 'Database-backed, live for every visitor'}
            {status.source === 'loading' && 'Loading from the database…'}
            {status.source === 'empty' &&
              'Catalog is empty — create cards in Occasions & Studio'}
            {status.source === 'offline' && 'Supabase not configured — cannot load the catalog'}
            {status.source === 'error' && 'Database unavailable — cannot load the catalog'}
          </div>
        </div>

        <div className="p-6 bg-white rounded-3xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Retired Cards</span>
            <Package className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-slate-900">{retiredIds.size}</div>
          <div className="text-[11px] text-slate-500">Hidden, restorable from the catalog tab</div>
        </div>

        <div className="p-6 bg-white rounded-3xl border border-slate-200/90 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Documents In Database</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-slate-900">{documents.length}</div>
          <div className="text-[11px] text-slate-500">
            Revenue and order counts live in the Orders tab
          </div>
        </div>
      </div>

      {/* Tab: Catalog Management */}
      {activeTab === 'catalog' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                placeholder="Search templates by ID, title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-rose-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            <div className="flex items-center gap-3">
              {categories.length > 2 && (
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-rose-500"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={() => setShowRetired((v) => !v)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
                  showRetired
                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retired ({retiredIds.size})
              </button>
              <span className="text-xs text-slate-500">
                Showing {filteredTemplates.length} cards
              </span>
            </div>
          </div>

          {notice && (
            <div
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold ${
                notice.tone === 'ok'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border border-rose-200'
              }`}
            >
              {notice.text}
            </div>
          )}

          {status.source === 'empty' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200">
              <p className="text-xs text-amber-800 leading-relaxed">
                The catalog is empty. Nothing is bundled with the app any more — cards are created
                in <strong>Occasions &amp; Studio</strong> and written straight to the database,
                where they go live for every visitor.
              </p>
              <button
                onClick={() => setActiveTab('occasions')}
                className="shrink-0 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <FolderHeart className="w-3.5 h-3.5" />
                Open Occasions &amp; Studio
              </button>
            </div>
          )}

          {status.source === 'error' && (
            <div className="px-4 py-3 rounded-2xl bg-rose-50 border border-rose-200">
              <p className="text-xs text-rose-800 leading-relaxed">
                Could not read the catalog: {status.error}. Check your Supabase RLS policies and network.
              </p>
            </div>
          )}

          {/* Bulk action bar — only while something is ticked. */}
          {selected.size > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-slate-900 text-white">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold">
                  {selected.size} selected
                </span>
                {bulkBusy && bulkProgress && (
                  <span className="text-[11px] text-slate-300 flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {bulkProgress.done} / {bulkProgress.total}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearSelection}
                  disabled={bulkBusy}
                  className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-[11px] font-bold disabled:opacity-50"
                >
                  Clear selection
                </button>
                {showRetired ? (
                  <button
                    onClick={handleBulkRestore}
                    disabled={bulkBusy}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-[11px] font-bold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {bulkBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                    Restore {selected.size}
                  </button>
                ) : (
                  <button
                    onClick={() => requestDelete(visibleTemplates.filter((t) => selected.has(t.id)))}
                    disabled={bulkBusy}
                    className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-[11px] font-bold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {bulkBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    Delete {selected.size}
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someVisibleSelected;
                      }}
                      onChange={toggleAllVisible}
                      disabled={visibleTemplates.length === 0 || bulkBusy}
                      aria-label={
                        allVisibleSelected ? 'Clear selection' : 'Select all visible cards'
                      }
                      className="w-4 h-4 rounded accent-rose-500 cursor-pointer disabled:opacity-40"
                    />
                  </th>
                  <th className="py-3 px-4 font-bold">Thumbnail</th>
                  <th className="py-3 px-4 font-bold">Card Title</th>
                  <th className="py-3 px-4 font-bold">Category</th>
                  <th className="py-3 px-4 font-bold">Price</th>
                  <th className="py-3 px-4 font-bold">Type</th>
                  <th className="py-3 px-4 font-bold">Best Seller</th>
                  <th className="py-3 px-4 font-bold">Rating</th>
                  <th className="py-3 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleTemplates.map((t) => {
                  const isRetired = Boolean(retiredIds.has(t.id));
                  const isBusy = busyId === t.id;
                  const isSelected = selected.has(t.id);
                  return (
                    <tr
                      key={t.id}
                      className={`hover:bg-slate-50/80 transition ${
                        isRetired ? 'opacity-60' : ''
                      } ${isSelected ? 'bg-rose-50/50' : ''}`}
                    >
                      <td className="py-2 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) =>
                            toggleOne(
                              t.id,
                              (e.nativeEvent as MouseEvent).shiftKey === true
                            )
                          }
                          disabled={bulkBusy}
                          aria-label={`Select ${t.title}`}
                          className="w-4 h-4 rounded accent-rose-500 cursor-pointer disabled:opacity-40"
                        />
                      </td>
                      <td className="py-2 px-4">
                        <img
                          src={t.thumbnail}
                          alt="thumb"
                          className="w-10 h-14 object-contain rounded border border-slate-200 bg-white"
                        />
                      </td>
                      <td className="py-2 px-4">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          {t.title}
                          {isLocallyCreated(t.id) && (
                            <span
                              title="Created in Occasion Studio — only exists in this browser"
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700"
                            >
                              LOCAL
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">{t.id}</div>
                      </td>
                      <td className="py-2 px-4">
                        <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded font-medium">
                          {t.category}
                        </span>
                      </td>
                      <td className="py-2 px-4 font-bold text-slate-800">{formatPrice(t.price)}</td>
                      <td className="py-2 px-4">
                        {t.isPhotoCard ? (
                          <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-semibold text-[10px]">
                            Photo Card
                          </span>
                        ) : (
                          <span className="text-slate-500">Standard</span>
                        )}
                      </td>
                      <td className="py-2 px-4">
                        <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleBestSeller(t)}
                          disabled={isBusy || isRetired}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold disabled:opacity-50 ${
                            t.isBestSeller
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {t.isBestSeller ? 'Yes' : 'No'}
                        </button>
                        <TemplateFacetEditor
                          template={t}
                          onSave={handleSaveFacets}
                          onError={(text) => setNotice({ tone: 'error', text })}
                          onNotice={(text) => setNotice({ tone: 'ok', text })}
                        />
                        </div>
                      </td>
                      <td className="py-2 px-4 font-medium text-slate-700">★ {t.rating}</td>
                      <td className="py-2 px-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {isRetired ? (
                            <button
                              onClick={() => handleRestore(t)}
                              disabled={isBusy}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center gap-1 disabled:opacity-50"
                            >
                              {isBusy ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <RotateCcw className="w-3 h-3" />
                              )}
                              Restore
                            </button>
                          ) : (
                            <button
                              onClick={() => requestDelete([t])}
                              disabled={isBusy || bulkBusy}
                              aria-label={`Delete ${t.title}`}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold flex items-center gap-1 disabled:opacity-50"
                            >
                              <Trash2 className="w-3 h-3" />
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredTemplates.length > 50 && (
              <p className="text-[11px] text-slate-500 pt-3 text-center">
                Showing the first 50 of {filteredTemplates.length}. Use search or the category filter
                to narrow the list.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tab: Orders Management */}
      {activeTab === 'orders' && <AdminOrdersPanel />}

      {/* Tab: Reviews Moderation */}
      {activeTab === 'reviews' && <AdminReviewsPanel />}

      {/* Tab: Occasions Studio & Template Generator */}
      {activeTab === 'occasions' && (
        <OccasionStudio
          onNavigate={onNavigate}
          onTemplateCreated={async () => {
            // Occasion Studio still writes locally; pull the new document list so
            // the catalog screen reflects it without a manual refresh.
            await refreshDocuments();
          }}
        />
      )}

      {/* Tab: System & Supabase */}
      {activeTab === 'system' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-6">
          <h2 className="font-bold text-slate-900 text-base">System Configuration & Security</h2>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-700">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Security Rules Audit (RLS policies)</span>
            </div>
            <p className="leading-relaxed text-slate-600">
              Production security rules configured with request.auth checks, user isolation for
              designs & orders, and admin-only catalog write access via an{' '}
              <code className="font-mono text-rose-600">admin</code> custom claim.
            </p>
            <p className="leading-relaxed text-amber-700">
              Rules accept the claim first, with the legacy email still allowed as a fallback
              until the claim is minted. The console route is gated client-side only — the rules
              are the real boundary.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs text-slate-700">
            <div className="flex items-center gap-2 font-bold text-slate-900">
              <Database className="w-4 h-4 text-rose-500" />
              <span>Supabase Connection Status</span>
            </div>
            <p className="leading-relaxed text-slate-600">
              {isSupabaseConfigured
                ? 'Connected to live Supabase instance. Real authentication, Postgres persistence, and storage uploads active.'
                : 'Preview & LocalStorage Mode Active. All user actions, card editing, favorites, orders, and Google login are fully responsive and persistent.'}
            </p>
            <p className="leading-relaxed text-slate-600">
              Catalog source:{' '}
              <strong className="text-slate-800">
                {status.source === 'database'
                  ? 'Supabase `templates` (live)'
                  : status.source === 'offline'
                    ? 'empty (Supabase not configured)'
                    : status.source === 'error'
                      ? `empty (${status.error})`
                      : 'empty (no templates yet)'}
              </strong>
              {documents.length > 0 && ` · ${documents.length} documents, ${retiredIds.size} retired`}
            </p>
          </div>
        </div>
      )}

      {/* Confirmation dialog — deleting from the catalog is destructive. */}
      {pendingDelete && (() => {
        const count = pendingDelete.ids.length;
        const isBulk = count > 1;
        const dbCount = count - pendingDelete.customIds.length;
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-template-heading"
          >
            <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 p-6 shadow-2xl space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 id="delete-template-heading" className="font-bold text-slate-900">
                    {isBulk ? `Delete ${count} cards?` : 'Delete this card?'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-mono">
                    {isBulk ? `${count} selected` : pendingDelete.ids[0]}
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {isBulk ? (
                  <>
                    The {count} selected cards will disappear from the storefront for everyone.
                    {dbCount > 0 && (
                      <>
                        {' '}
                        {dbCount} will be retired rather than erased, so existing orders, saved
                        designs and favourites keep working.
                      </>
                    )}
                    {pendingDelete.customIds.length > 0 && (
                      <>
                        {' '}
                        {pendingDelete.customIds.length} created in Occasion Studio exist only in
                        this browser and will be removed outright.
                      </>
                    )}{' '}
                    You can restore the retired ones from the <strong>Retired</strong> tab.
                  </>
                ) : (
                  <>
                    &ldquo;{pendingDelete.title}&rdquo; will disappear from the storefront for
                    everyone.
                    {pendingDelete.customIds.length > 0 ? (
                      <>
                        {' '}
                        It was created in Occasion Studio and exists only in this browser, so it
                        will be removed outright.
                      </>
                    ) : (
                      <>
                        {' '}
                        It will be retired rather than erased, so existing orders, saved designs
                        and favourites keep working. You can restore it from the{' '}
                        <strong>Retired</strong> tab.
                      </>
                    )}
                  </>
                )}
              </p>

              {isBulk && (
                <ul className="max-h-32 overflow-y-auto text-[11px] text-slate-500 space-y-0.5 bg-slate-50 rounded-xl p-2.5 border border-slate-200">
                  {pendingDelete.ids.slice(0, 50).map((id) => (
                    <li key={id} className="font-mono truncate">
                      {id}
                    </li>
                  ))}
                  {count > 50 && <li className="font-semibold">…and {count - 50} more</li>}
                </ul>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setPendingDelete(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={isBulk ? handleBulkDelete : handleConfirmDelete}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
                >
                  {isBulk ? `Delete ${count} cards` : 'Delete card'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
