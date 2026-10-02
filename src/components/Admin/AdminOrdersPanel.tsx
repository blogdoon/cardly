/**
 * Admin order management panel.
 *
 * Replaces the old inline order list, which read the operator's own
 * `localStorage` — so it could only ever show that browser's orders and the
 * revenue cards could not report real money. Orders now come from Postgres via
 * `adminOrderService`, and the panel can move an order through its lifecycle,
 * attach a tracking number, and refund or cancel it.
 *
 * Guest checkout writes orders to localStorage only, so guest orders will not
 * appear here. That is a consequence of orders being created client-side and is
 * fixed by the payments work, not here.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Loader2,
  Package,
  Search,
  Truck,
  Undo2,
  Ban,
  RefreshCw,
  AlertCircle,
  Printer,
  Download,
  FileText,
  TriangleAlert,
} from 'lucide-react';
import {
  fetchAllOrders,
  updateOrderStatus,
  setOrderTracking,
  refundOrder,
  cancelOrder,
  isRefundable,
} from '../../services/adminOrderService';
import {
  fetchPrintFiles,
  fulfilOrder,
  printFileUrl,
  preferredPrintFile,
  type PrintFile,
} from '../../services/printService';
import { formatPrice } from '../../utils/currency';
import {
  ORDER_STATUS_FLOW,
  isTerminalStatus,
  type Order,
  type OrderStatus,
} from '../../types/order';

const ALL_STATUSES: OrderStatus[] = [
  'pending_payment',
  ...ORDER_STATUS_FLOW,
  'cancelled',
  'refunded',
];

const STATUS_TONE: Record<OrderStatus, string> = {
  pending_payment: 'bg-sky-50 text-sky-700',
  processing: 'bg-slate-100 text-slate-700',
  printed: 'bg-purple-50 text-purple-700',
  dispatched: 'bg-amber-100 text-amber-800',
  delivered: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-rose-50 text-rose-700',
  refunded: 'bg-rose-100 text-rose-800',
};

const formatDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const AdminOrdersPanel: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  // Which order has the tracking / refund / cancel form open.
  const [panel, setPanel] = useState<{ id: string; kind: 'tracking' | 'refund' | 'cancel' } | null>(null);
  const [trackingValue, setTrackingValue] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  // Print files (fulfilment). Loaded per-order on demand rather than with the
  // order list: they live in a second table and are only needed once an operator
  // is actually working on an order.
  const [printFiles, setPrintFiles] = useState<Record<string, PrintFile[]>>({});
  const [printBusyId, setPrintBusyId] = useState<string | null>(null);
  const [printNotice, setPrintNotice] = useState<{ id: string; text: string; bad?: boolean } | null>(
    null
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOrders(await fetchAllOrders());
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not load orders. Check that RLS policies allow admin reads of orders.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (!q) return true;
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        o.shippingAddress?.name?.toLowerCase().includes(q) ||
        o.shippingAddress?.postcode?.toLowerCase().includes(q) ||
        o.shippingAddress?.city?.toLowerCase().includes(q)
      );
    });
  }, [orders, query, statusFilter]);

  // Revenue counts what was actually paid: refunded, cancelled and not-yet-paid
  // orders are excluded rather than flattering the totals.
  const stats = useMemo(() => {
    const live = orders.filter(
      (o) => o.status !== 'refunded' && o.status !== 'cancelled' && o.status !== 'pending_payment'
    );
    const revenue = live.reduce((sum, o) => sum + o.total, 0);
    const refunded = orders
      .filter((o) => o.refund)
      .reduce((sum, o) => sum + (o.refund?.amount ?? 0), 0);
    return { revenue, refunded, count: orders.length, live: live.length };
  }, [orders]);

  const guard = useCallback(
    async (order: Order, action: () => Promise<unknown>) => {
      setBusyId(order.id);
      setError(null);
      try {
        await action();
        await load();
      } catch (e) {
        setError(
          e instanceof Error
            ? `${e.message} — check that RLS policies allow admin order updates.`
            : 'That action failed.'
        );
      } finally {
        setBusyId(null);
        setPanel(null);
      }
    },
    [load]
  );

  // --- fulfilment ----------------------------------------------------------
  // Fulfilment normally runs by itself: `stripe-webhook` calls `fulfil-order`
  // when payment lands. These are the manual paths — produce a file that failed
  // to render, re-produce after fixing a template, or download what was made.
  const loadPrintFiles = useCallback(async (order: Order) => {
    setPrintBusyId(order.id);
    setPrintNotice(null);
    try {
      // Awaited before the updater: a state setter must stay pure, so the fetch
      // cannot live inside the callback.
      const files = await fetchPrintFiles(order.id);
      setPrintFiles((prev) => ({ ...prev, [order.id]: files }));
    } catch (e) {
      setPrintNotice({
        id: order.id,
        text: e instanceof Error ? e.message : 'Could not load the print files.',
        bad: true,
      });
    } finally {
      setPrintBusyId(null);
    }
  }, []);

  const runFulfilment = useCallback(
    async (order: Order) => {
      setPrintBusyId(order.id);
      setPrintNotice(null);
      try {
        const result = await fulfilOrder(order.id);
        setPrintFiles((prev) => ({ ...prev, [order.id]: result.files }));
        // `problems` is where a missing design or an unconfigured PDF renderer
        // shows up. Surface it rather than letting the operator believe the file
        // is fine because a row appeared.
        setPrintNotice({
          id: order.id,
          text: result.problems.length ? result.problems.join(' · ') : `Produced ${result.files.length} print file(s).`,
          bad: result.problems.length > 0,
        });
      } catch (e) {
        setPrintNotice({
          id: order.id,
          text: e instanceof Error ? e.message : 'Could not produce the print file.',
          bad: true,
        });
      } finally {
        setPrintBusyId(null);
      }
    },
    []
  );

  const downloadPrintFile = useCallback(async (file: PrintFile) => {
    setPrintNotice(null);
    try {
      const url = await printFileUrl(file.storagePath);
      window.open(url, '_blank', 'noopener');
    } catch (e) {
      setPrintNotice({
        id: file.orderId,
        text: e instanceof Error ? e.message : 'Could not create a download link.',
        bad: true,
      });
    }
  }, []);

  const openPanel = (order: Order, kind: 'tracking' | 'refund' | 'cancel') => {
    setPanel({ id: order.id, kind });
    setTrackingValue(order.trackingNumber ?? '');
    setRefundAmount(String(order.total));
    setRefundReason('');
    setCancelReason('');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs flex items-center gap-2 text-xs text-slate-600 font-semibold">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading orders from the database…
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-slate-900 text-base">All Customer Orders</h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {stats.count} order{stats.count === 1 ? '' : 's'} in the database ·{' '}
            {stats.live} live · {formatPrice(stats.revenue)} revenue
            {stats.refunded > 0 && ` · ${formatPrice(stats.refunded)} refunded`}
          </p>
        </div>
        <button
          onClick={load}
          className="shrink-0 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] font-bold text-slate-700 flex items-center justify-center gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {error && (
        <p className="px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-px" />
          {error}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search order number, name, city or postcode..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-rose-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | OrderStatus)}
          className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-rose-500"
        >
          <option value="all">All statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s[0].toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-xs text-slate-500">
          {orders.length === 0
            ? 'No orders in the database yet. Orders are created by the checkout function when a customer pays.'
            : 'No orders match those filters.'}
        </p>
      ) : (
        <div className="space-y-4">
          {filtered.map((ord) => {
            const isBusy = busyId === ord.id;
            const terminal = isTerminalStatus(ord.status);
            const isOpen = panel?.id === ord.id;
            return (
              <div
                key={ord.id}
                className="p-5 rounded-2xl border border-slate-200 flex flex-col lg:flex-row justify-between items-start gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{ord.orderNumber}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${STATUS_TONE[ord.status]}`}>
                      {ord.status}
                    </span>
                    {ord.refund && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                        {formatPrice(ord.refund.amount)} refunded
                      </span>
                    )}
                    <span className="text-xs text-slate-500">
                      {new Date(ord.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 mt-1">
                    Ship to: <strong className="text-slate-800">{ord.shippingAddress?.name}</strong> ·{' '}
                    {ord.shippingAddress?.city}, {ord.shippingAddress?.postcode} ·{' '}
                    {ord.shippingAddress?.country}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {ord.items.map((i) => `${i.quantity}× ${i.title}`).join(', ')}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Arrives ~{formatDate(ord.estimatedArrival)} via {ord.deliveryMethod?.name}
                    {ord.dispatchedAt && ` · dispatched ${formatDate(ord.dispatchedAt)}`}
                  </div>
                  {ord.trackingNumber && (
                    <div className="text-xs text-emerald-700 mt-1 font-semibold">
                      {ord.carrier || 'Carrier'}: <span className="font-mono">{ord.trackingNumber}</span>
                    </div>
                  )}
                  {ord.cancelReason && (
                    <div className="text-xs text-rose-700 mt-1">{ord.cancelReason}</div>
                  )}
                  {ord.refund?.reason && (
                    <div className="text-xs text-rose-700 mt-0.5">
                      Refund: {ord.refund.reason}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-stretch gap-2 lg:w-64">
                  <div className="flex items-center justify-end gap-2">
                    <span className="font-black text-slate-900 text-sm">{formatPrice(ord.total)}</span>
                    <select
                      value={ord.status}
                      disabled={isBusy}
                      onChange={(e) =>
                        guard(ord, () =>
                          updateOrderStatus(ord, e.target.value as OrderStatus, 'admin')
                        )
                      }
                      className="p-1.5 border border-slate-300 rounded-lg text-xs font-semibold bg-white disabled:opacity-50"
                    >
                      {ALL_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s[0].toUpperCase() + s.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>

<div className="flex items-center justify-end gap-1.5">
                    {/* Fulfilment: produce or download the print file. Only shown
                        for a paid order — `fulfil-order` refuses to print an unpaid
                        one, so a button that could only ever error is not offered. */}
                    {!terminal && ord.status !== 'pending_payment' && (
                      <button
                        onClick={() =>
                          printFiles[ord.id] ? runFulfilment(ord) : loadPrintFiles(ord)
                        }
                        disabled={printBusyId === ord.id}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-700 text-white text-[10px] font-bold flex items-center gap-1 disabled:opacity-40"
                        title={
                          printFiles[ord.id]
                            ? 'Re-produce the print file'
                            : 'Load the print files for this order'
                        }
                      >
                        {printBusyId === ord.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Printer className="h-3 w-3" />
                        )}
                        Print file
                      </button>
                    )}
                    <button
                      onClick={() => openPanel(ord, 'tracking')}
                      disabled={isBusy || terminal}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-700 flex items-center gap-1 disabled:opacity-40"
                    >
                      <Truck className="w-3 h-3" />
                      {ord.trackingNumber ? 'Edit tracking' : 'Add tracking'}
                    </button>
                    {isRefundable(ord) && (
                      <>
                        <button
                          onClick={() => openPanel(ord, 'refund')}
                          disabled={isBusy}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-[10px] font-bold text-rose-700 flex items-center gap-1"
                        >
                          <Undo2 className="w-3 h-3" />
                          Refund
                        </button>
                        <button
                          onClick={() => openPanel(ord, 'cancel')}
                          disabled={isBusy}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-600 flex items-center gap-1"
                        >
                          <Ban className="w-3 h-3" />
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
{/* The print files themselves, once loaded. */}
                  {printFiles[ord.id] && (
                    <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                          Print files
                        </span>
                        {printFiles[ord.id].length > 0 && (
                          <span className="text-[10px] text-slate-500">
                            Print duplex, flip on the short edge. Do not scale to fit.
                          </span>
                        )}
                      </div>

                      {printNotice?.id === ord.id && (
                        <p
                          className={`text-[11px] font-semibold flex items-start gap-1.5 ${
                            printNotice.bad ? 'text-amber-700' : 'text-emerald-700'
                          }`}
                        >
                          <AlertCircle className="w-3 h-3 shrink-0 mt-px" />
                          {printNotice.text}
                        </p>
                      )}

                      {printFiles[ord.id].length === 0 ? (
                        <p className="text-[11px] text-slate-500">
                          Nothing produced yet. Use “Print file” to render it now — this also
                          re-runs a file that failed.
                        </p>
                      ) : (
                        <ul className="space-y-1.5">
                          {printFiles[ord.id].map((file) => (
                            <li
                              key={file.id}
                              className="flex flex-wrap items-center gap-2 rounded-lg bg-white border border-slate-200 px-2.5 py-2"
                            >
                              <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="text-[11px] font-bold text-slate-800">
                                Card {file.itemIndex + 1}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {file.kind === 'print_sheet' ? 'PDF' : 'render HTML'}
                                {file.sheetMm ? ` · ${file.sheetMm} mm` : ''} · ×{file.qty}
                              </span>
                              {file.printerRef && (
                                <span className="text-[10px] font-mono text-slate-500">
                                  {file.printer}: {file.printerRef}
                                </span>
                              )}
                              {file.warning && (
                                <span className="text-[10px] font-bold text-amber-700 flex items-center gap-1 basis-full">
                                  <TriangleAlert className="w-3 h-3 shrink-0" />
                                  {file.warning}
                                </span>
                              )}
                              <button
                                onClick={() => downloadPrintFile(preferredPrintFile([file]) ?? file)}
                                className="ml-auto px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-700 text-white text-[10px] font-bold flex items-center gap-1"
                              >
                                <Download className="w-3 h-3" />
                                Open
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {isOpen && panel && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                      {panel.kind === 'tracking' && (
                        <>
                          <label className="block text-[10px] font-bold text-slate-600">
                            Carrier tracking number
                          </label>
                          <input
                            value={trackingValue}
                            onChange={(e) => setTrackingValue(e.target.value)}
                            placeholder="e.g. 1234567890"
                            className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                          />
                          <button
                            onClick={() =>
                              guard(ord, () => setOrderTracking(ord, trackingValue))
                            }
                            disabled={isBusy || !trackingValue.trim()}
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[10px] font-bold disabled:opacity-50"
                          >
                            Save tracking
                          </button>
                        </>
                      )}

                      {panel.kind === 'refund' && (
                        <>
                          <p className="text-[10px] text-rose-700 font-semibold leading-relaxed">
                            This records a refund against the order. No money moves until payments are
                            live.
                          </p>
                          <label className="block text-[10px] font-bold text-slate-600">
                            Amount (EUR, max {formatPrice(ord.total)})
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max={ord.total}
                            value={refundAmount}
                            onChange={(e) => setRefundAmount(e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs"
                          />
                          <label className="block text-[10px] font-bold text-slate-600">Reason</label>
                          <input
                            value={refundReason}
                            onChange={(e) => setRefundReason(e.target.value)}
                            placeholder="e.g. Print defect, reprints offered"
                            className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs"
                          />
                          <button
                            onClick={() =>
                              guard(ord, () =>
                                refundOrder(
                                  ord,
                                  {
                                    amount: refundAmount === '' ? undefined : Number(refundAmount),
                                    reason: refundReason,
                                  },
                                  'admin'
                                )
                              )
                            }
                            disabled={isBusy}
                            className="w-full px-3 py-1.5 rounded-lg bg-rose-600 text-white text-[10px] font-bold disabled:opacity-50"
                          >
                            Record refund
                          </button>
                        </>
                      )}

                      {panel.kind === 'cancel' && (
                        <>
                          <label className="block text-[10px] font-bold text-slate-600">
                            Why is this cancelled?
                          </label>
                          <input
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            placeholder="e.g. Card could not be produced"
                            className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-xs"
                          />
                          <button
                            onClick={() => guard(ord, () => cancelOrder(ord, cancelReason, 'admin'))}
                            disabled={isBusy}
                            className="w-full px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[10px] font-bold disabled:opacity-50"
                          >
                            Cancel order
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {orders.length === 0 && (
        <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5" />
          Revenue above counts paid orders only, excluding refunds and cancellations.
        </p>
      )}
    </div>
  );
};
