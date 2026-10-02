/**
 * Fulfilment, from the browser: list an order's print files, re-run fulfilment,
 * and download the file to print.
 *
 * Read access is RLS-scoped (0008_fulfilment.sql): an admin sees everything, a
 * customer sees only their own orders, and a guest order is visible to nobody but
 * an admin — there is no account to scope the read to. So this service never
 * decides who may see a file; it asks, and the database answers.
 *
 * Downloads go through `createSignedUrl`, not `getPublicUrl`. `print-files` is a
 * PRIVATE bucket and always will be: a print file carries the customer's finished
 * card and their shipping address on the spec page. This is the fix the header of
 * 0005_storage.sql asks for on the photo path too — a public URL does not exist
 * for a private bucket, so `getPublicUrl` there returns a URL that 404s.
 */

import { db, isSupabaseConfigured } from './supabase';

/** Must match `PRINT_BUCKET` in supabase/functions/fulfil-order/index.ts. */
export const PRINT_BUCKET = 'print-files';

export interface PrintFile {
  id: string;
  orderId: string;
  itemIndex: number;
  kind: 'print_sheet' | 'source_html';
  storagePath: string;
  byteSize?: number;
  checksum?: string;
  qty: number;
  sheetMm?: string;
  /** Set when the item had no personalised design. Never ignore this one. */
  warning?: string;
  printer?: string;
  printerRef?: string;
  createdAt: string;
}

const rowToPrintFile = (r: Record<string, unknown>): PrintFile => ({
  id: r.id as string,
  orderId: r.order_id as string,
  itemIndex: Number(r.item_index ?? 0),
  kind: r.kind as PrintFile['kind'],
  storagePath: r.storage_path as string,
  byteSize: r.byte_size === null || r.byte_size === undefined ? undefined : Number(r.byte_size),
  checksum: (r.checksum as string) ?? undefined,
  qty: Number(r.qty ?? 1),
  sheetMm: (r.sheet_mm as string) ?? undefined,
  warning: (r.warning as string) ?? undefined,
  printer: (r.printer as string) ?? undefined,
  printerRef: (r.printer_ref as string) ?? undefined,
  createdAt: (r.created_at as string) ?? '',
});

/** An order's print files, newest first. Admin or the order's owner (RLS). */
export async function fetchPrintFiles(orderId: string): Promise<PrintFile[]> {
  const { data, error } = await db()
    .from('order_print_files')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => rowToPrintFile(r as Record<string, unknown>));
}

/** Whether an order has anything to print yet. */
export async function hasPrintFiles(orderId: string): Promise<boolean> {
  const { count, error } = await db()
    .from('order_print_files')
    .select('id', { count: 'exact', head: true })
    .eq('order_id', orderId);
  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

export interface FulfilResult {
  ok: boolean;
  orderId: string;
  files: PrintFile[];
  /** Non-fatal issues: a missing design, a PDF renderer that was not configured. */
  problems: string[];
  printer?: string;
}

/**
 * Ask the server to (re)produce an order's print files.
 *
 * The client cannot render them itself: that is the whole point of `fulfil-order`
 * running on the service role (see its header). This is a retry button — the
 * normal path is the webhook calling it automatically when payment lands.
 */
export async function fulfilOrder(orderId: string): Promise<FulfilResult> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured in this environment.');
  }
  const { data, error } = await db().functions.invoke('fulfil-order', {
    body: { orderId },
  });
  if (error) {
    const status = error.context?.status;
    let message: string | undefined;
    if (status && typeof error.context?.json === 'function') {
      try {
        message = ((await error.context.json()) as { error?: string }).error;
      } catch {
        /* body already consumed */
      }
    }
    if (status === 404) {
      throw new Error(
        'Fulfilment is not deployed on this environment yet (the fulfil-order function is missing).'
      );
    }
    throw new Error(message || error.message || 'Could not produce the print file.');
  }
  const result = (data ?? {}) as {
    ok?: boolean;
    orderId?: string;
    files?: Record<string, unknown>[];
    problems?: string[];
    printer?: string;
  };
  return {
    ok: Boolean(result.ok),
    orderId: result.orderId ?? orderId,
    files: (result.files ?? []).map((f) => rowToPrintFile(f)),
    problems: result.problems ?? [],
    printer: result.printer,
  };
}

/**
 * A short-lived download URL for one print file.
 *
 * Expiry is deliberately short (5 minutes): the file is handed to a print queue or
 * a printer dashboard, not published, and a URL that works for years would be a
 * permanent copy of someone's address sitting in a browser history.
 */
export async function printFileUrl(storagePath: string, expiresInSeconds = 300): Promise<string> {
  const { data, error } = await db()
    .storage.from(PRINT_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error) throw new Error(error.message);
  if (!data?.signedUrl) throw new Error('Could not create a download link for that file.');
  return data.signedUrl;
}

/** The file an operator should print: the PDF if there is one, else the render. */
export const preferredPrintFile = (files: PrintFile[]): PrintFile | undefined =>
  files.find((f) => f.kind === 'print_sheet') ?? files[0];
