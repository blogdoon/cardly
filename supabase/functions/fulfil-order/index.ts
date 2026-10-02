/**
 * fulfil-order — turns a PAID order into a print-ready file. (AGENTS.md blocker 2.)
 *
 * Until now a paid customer received nothing: `stripe-webhook` moved an order to
 * `processing` and that was the end of it. Each order item already carries the
 * customer's `designSnapshot` inside `items`, so the raw material was on the row
 * and unused. This function is what finally uses it.
 *
 * Flow, for every item on the order:
 *   1. read the `designSnapshot` (falling back to the template's default pages,
 *      flagged as a WARNING, because a blank card is worse than a slow one);
 *   2. resolve media elements to `/media/<id>/` scan URLs and sticker art;
 *   3. render through `_shared/printLayout.ts` — the same pure renderer contract
 *      the browser's PrintPreview follows, so the file cannot drift from the
 *      layout the customer approved;
 *   4. upload to the PRIVATE `print-files` bucket (0008_fulfilment.sql);
 *   5. record a row in `order_print_files` (0008_fulfilment.sql).
 *
 * Then, if a printer is configured, hand off — and otherwise leave the file for
 * an operator to download and print by hand, which is a legitimate end state and
 * the minimum needed to actually take money: see `_shared/printer.ts`.
 *
 * WHY IT IS A FUNCTION AND NOT A CLIENT CALL. The browser cannot be trusted to
 * trigger fulfilment: a client that could write its own print file could lie
 * about what was produced, and a client that can be told "this order is ready"
 * can be told it by anyone. Everything here runs on the service role.
 *
 * AUTH. Two callers, both legitimate:
 *   * `stripe-webhook`, on `checkout.session.completed`, via the service role —
 *     so the happy path is automatic and needs no operator action.
 *   * an admin retrying from the console, via their JWT.
 * Anything else is refused. Note the asymmetry with `stripe-webhook`, which must
 * be deployed `--no-verify-jwt` because Stripe cannot present one; this function
 * keeps JWT verification ON, and the service-role path is recognised by the key
 * rather than by bypassing verification.
 *
 * Deploy: supabase functions deploy fulfil-order
 * Secrets: SITE_ORIGIN, and optionally PRINTER_API_URL / PRINTER_API_KEY /
 *   PRINTER_NAME (all three, or none — a half-configured printer is refused).
 */

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { json, preflight } from '../_shared/cors.ts';
import { printSizeFor, type PrintCardSize } from '../_shared/printSizes.ts';
import {
  renderPrintDocument,
  type PrintablePage,
  type PrintJobPages,
  type StickerArt,
} from '../_shared/printLayout.ts';
import { handOffToPrinter, describePrinterConfig, readPrinterConfig } from '../_shared/printer.ts';
import { STICKER_CATALOG } from '../../../src/data/elements.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SITE_ORIGIN = (Deno.env.get('SITE_ORIGIN') ?? '').replace(/\/$/, '');

/** Must match `PRINT_BUCKET` in src/services/printService.ts. */
const PRINT_BUCKET = 'print-files';

/** sha256, hex. Proves the bytes an operator holds are the bytes we produced. */
async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as unknown as ArrayBuffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** HTML -> PDF. Chromium is the only thing here that knows how to lay out CSS. */
async function htmlToPdf(html: string): Promise<Uint8Array<ArrayBuffer>> {
  const endpoint = Deno.env.get('PDF_RENDER_URL');
  if (!endpoint) {
    throw new Error(
      'PDF_RENDER_URL is not set. The render HTML is still produced and stored as source_html; ' +
        'point PDF_RENDER_URL at a headless-Chromium service to get the print_sheet PDF.'
    );
  }
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ html, preferCSSPageSize: true, printBackground: true }),
  });
  if (!res.ok) throw new Error(`PDF renderer returned ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

/** Base64 in chunks — `String.fromCharCode(...bytes)` overflows on a large PDF. */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/**
 * Sticker art, resolved from the app's own catalogue.
 *
 * A template's sticker elements usually store only `stickerId` (see the comment
 * in `src/data/elements.ts`), so the SVG has to come from somewhere or the print
 * comes out with grey circles where the customer's balloons were. The catalogue is
 * a build-time constant with no secrets and no database dependency, so it is safe
 * — and correct — to import here.
 */
function stickerArt(): StickerArt {
  const art: StickerArt = {};
  for (const sticker of STICKER_CATALOG) {
    art[sticker.id] = {
      svg: sticker.svg,
      emoji: sticker.emoji,
      defaultColor: sticker.defaultColor,
    };
  }
  return art;
}

interface OrderItem {
  templateId?: string;
  designId?: string;
  title?: string;
  cardSize?: string;
  finish?: string;
  envelopeColor?: string;
  quantity?: number;
  designSnapshot?: { pages?: Partial<PrintJobPages> } | null;
}

interface OrderRow {
  id: string;
  order_number: string;
  user_id: string | null;
  items: OrderItem[];
  status: string;
}

const BLANK = (pageType: PrintablePage['pageType']): PrintablePage => ({
  pageType,
  backgroundColor: '#ffffff',
  elements: [],
});

/**
 * The four pages, with blanks for anything the snapshot did not carry.
 *
 * `insideLeft` is genuinely optional in the design type: a card may have no
 * left-hand page, and an absent one must render as a blank panel rather than
 * being copied from the right — duplicating the customer's message onto both
 * inside pages would be a visible print defect.
 */
const asPages = (pages: PrintJobPages | undefined): PrintJobPages => ({
  front: pages?.front ?? BLANK('front'),
  insideLeft: pages?.insideLeft,
  insideRight: pages?.insideRight ?? BLANK('inside-right'),
  back: pages?.back ?? BLANK('back'),
});

/**
 * Who is calling, and how much to trust them.
 *
 * `service` is the internal caller: the Stripe webhook, presenting the service
 * role key. `user` is somebody signed in. `invalid` is everything else, and it is
 * a distinct outcome on purpose.
 *
 * WHY THIS IS NOT A BOOLEAN. The first version returned `null` for "no user" and
 * treated `null` as trusted, which quietly meant the **public anon key** was
 * trusted too: it is a real JWT, so it passes Supabase's gateway verification with
 * `--verify-jwt` on, but it is not a user token, so `getUser` returns nobody and
 * the function fell through to the service-role branch. `VITE_SUPABASE_ANON_KEY`
 * ships in the browser bundle, so that would have let anyone with a copy of the
 * site produce print files for any order. An unresolvable credential is now an
 * explicit rejection rather than an implicit grant.
 */
type Caller =
  | { kind: 'service' }
  | { kind: 'user'; uid: string }
  | { kind: 'invalid'; reason: string };

async function identifyCaller(req: Request): Promise<Caller> {
  const header = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  // The service role key is not a user token, so it is matched before getUser —
  // otherwise an internal call would be reported as an invalid credential.
  if (header && header === SERVICE_ROLE_KEY) return { kind: 'service' };
  if (!header) return { kind: 'invalid', reason: 'Missing Authorization header.' };

  const { data, error } = await createClient(SUPABASE_URL, header, {
    auth: { persistSession: false },
  })
    .auth.getUser(header)
    .catch(() => ({ data: { user: null }, error: new Error('unreachable') }));
  if (error || !data?.user) {
    return { kind: 'invalid', reason: 'That token is not a signed-in user.' };
  }
  return { kind: 'user', uid: data.user.id };
}

/** Media elements -> `/media/<id>/`, the unguessable public scan route. */
async function resolveMediaUrls(
  admin: SupabaseClient,
  pages: PrintJobPages
): Promise<Record<string, string>> {
  const ids = new Set<string>();
  for (const page of Object.values(pages)) {
    for (const el of (page as PrintablePage | undefined)?.elements ?? []) {
      if (el.type === 'media' && el.mediaId) ids.add(el.mediaId);
    }
  }
  if (!ids.size || !SITE_ORIGIN) return {};
  const { data } = await admin
    .from('card_media')
    .select('id')
    .in('id', Array.from(ids));
  const found = new Set((data ?? []).map((r: { id: string }) => r.id));
  const urls: Record<string, string> = {};
  for (const id of ids) {
    // Only ids that actually exist get a URL. Printing a QR to a 404 would hand
    // the recipient a dead scan code, which looks like our fault and is.
    if (found.has(id)) urls[id] = `${SITE_ORIGIN}/media/${encodeURIComponent(id)}/`;
  }
  return urls;
}

/** Everything the admin console needs to show about a print file. */
interface PrintFileRecord {
  id: string;
  orderId: string;
  itemIndex: number;
  kind: string;
  storagePath: string;
  byteSize?: number;
  checksum?: string;
  qty: number;
  sheetMm?: string;
  warning?: string;
  printer?: string;
  printerRef?: string;
  createdAt: string;
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return json({ error: 'Function is not configured.' }, 503);

  let body: { orderId?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Expected a JSON body.' }, 400);
  }
  const orderId = String(body.orderId ?? '').trim();
  if (!orderId) return json({ error: 'orderId is required.' }, 400);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const { data: order, error: orderError } = await admin
    .from('orders')
    .select('id, order_number, user_id, items, status')
    .eq('id', orderId)
    .maybeSingle();
  if (orderError) return json({ error: orderError.message }, 500);
  if (!order) return json({ error: `Order ${orderId} was not found.` }, 404);

  const row = order as OrderRow;

  // Only paid orders may be fulfilled. Printing an unpaid order would let anyone
  // with a cart produce a free card, and `pending_payment` is exactly the state a
  // customer sits in while deciding whether to pay.
  const PAYABLE = ['processing', 'printed', 'dispatched', 'delivered'];
  if (!PAYABLE.includes(row.status)) {
    return json(
      { error: `Order ${orderId} is ${row.status}, not a paid order. Fulfilment starts once payment lands.` },
      409
    );
  }

  // Authorisation: the service role (the webhook calling in) may do anything; a
  // signed-in user may only retry an order they own, and an admin may do anything.
  // This check lives here and not only in RLS because this function writes with the
  // service role, which RLS does not constrain.
  const caller = await identifyCaller(req);
  if (caller.kind === 'invalid') {
    return json({ error: caller.reason }, 401);
  }
  if (caller.kind === 'user') {
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', caller.uid)
      .maybeSingle();
    const isAdmin = (profile as { role?: string } | null)?.role === 'admin';
    if (!isAdmin && row.user_id !== caller.uid) {
      return json({ error: 'You may only fulfil your own orders.' }, 403);
    }
  }

  const items = Array.isArray(row.items) ? row.items : [];
  if (!items.length) return json({ error: 'This order has no items to print.' }, 409);

  const produced: PrintFileRecord[] = [];
  const problems: string[] = [];
  const printerConfig = readPrinterConfig(Deno.env.toObject());

  for (const [index, item] of items.entries()) {
    const geometry = printSizeFor(item.cardSize);
    const cardSize = geometry.id as PrintCardSize;
    const pages = asPages(item.designSnapshot?.pages as PrintJobPages | undefined);

    // A missing snapshot is the failure mode worth shouting about: the customer
    // paid for a personalised card and we would print the template's blank art.
    // `warning` goes on the job spec page AND the stored row, so it cannot be
    // scrolled past.
    const hasArtwork = Object.values(pages).some(
      (p) => ((p as PrintablePage | undefined)?.elements ?? []).length > 0
    );
    const warning = hasArtwork
      ? undefined
      : 'No personalised design was stored for this item — printed from blank template art. Check with the customer before dispatch.';

    const mediaUrls = await resolveMediaUrls(admin, pages);
    const html = renderPrintDocument(
      {
        orderNumber: row.order_number,
        title: item.title ?? 'Card',
        cardSize,
        finish: item.finish,
        quantity: Math.max(1, Math.floor(Number(item.quantity ?? 1))),
        designUrl: item.designId ? `${SITE_ORIGIN}/?design=${encodeURIComponent(item.designId)}` : undefined,
        mediaUrls,
        stickerArt: stickerArt(),
        warning,
      },
      pages
    );

    const htmlBytes = new TextEncoder().encode(html);
    const base = `${row.id}/${index}-${geometry.id}`;
    const htmlPath = `${base}.html`;

    const { error: uploadError } = await admin.storage
      .from(PRINT_BUCKET)
      .upload(htmlPath, htmlBytes, { contentType: 'text/html; charset=utf-8', upsert: true });
    if (uploadError) {
      problems.push(`item ${index + 1}: could not store the render (${uploadError.message})`);
      continue;
    }

    // The PDF is best-effort: the render HTML is already stored, so a renderer
    // outage degrades to "open the HTML and print it" rather than losing the order.
    let pdfPath: string | undefined;
    let storedPath = htmlPath;
    let storedBytes = htmlBytes;
    let storedKind = 'source_html';
    let printer: string | undefined;
    let printerRef: string | undefined;
    try {
      const pdf = await htmlToPdf(html);
      const candidate = `${base}.pdf`;
      const { error: pdfError } = await admin.storage
        .from(PRINT_BUCKET)
        .upload(candidate, pdf, { contentType: 'application/pdf', upsert: true });
      if (pdfError) {
        problems.push(`item ${index + 1}: PDF upload failed (${pdfError.message})`);
      } else {
        pdfPath = candidate;
        storedPath = candidate;
        storedBytes = pdf;
        storedKind = 'print_sheet';
        const handoff = await handOffToPrinter({
          config: printerConfig,
          orderId: row.id,
          fileName: `card-${row.order_number}-${index + 1}.pdf`,
          // Chunked: `String.fromCharCode(...pdf)` blows the argument limit on a
          // multi-megabyte PDF.
          fileBase64: bytesToBase64(pdf),
          quantity: Math.max(1, Math.floor(Number(item.quantity ?? 1))),
        });
        printer = handoff.printer;
        printerRef = handoff.ref;
        if (handoff.status === 'skipped' && handoff.reason && !printer) {
          problems.push(`item ${index + 1}: ${handoff.reason}`);
        }
      }
    } catch (e) {
      problems.push(
        `item ${index + 1}: no PDF (${e instanceof Error ? e.message : 'unknown error'}) — the render HTML is stored and printable`
      );
    }

    const recordId = `pf_${row.id}_${index}_${Date.now().toString(36)}`;
    const geometryText = `${geometry.sheetMm.width}x${geometry.sheetMm.height}`;
    const insert = {
      id: recordId,
      order_id: row.id,
      item_index: index,
      kind: storedKind,
      storage_path: storedPath,
      byte_size: storedBytes.byteLength,
      // Checksum of exactly the bytes written, so an operator can prove the file
      // they are holding is the file this run produced.
      checksum: await sha256Hex(storedBytes),
      qty: Math.max(1, Math.floor(Number(item.quantity ?? 1))),
      sheet_mm: geometryText,
      warning: warning ?? null,
      printer: printer ?? null,
      printer_ref: printerRef ?? null,
    };

    const { error: rowError } = await admin.from('order_print_files').insert(insert);
    if (rowError) {
      problems.push(`item ${index + 1}: could not record the print file (${rowError.message})`);
      continue;
    }

    produced.push({
      id: insert.id,
      orderId: row.id,
      itemIndex: index,
      kind: insert.kind,
      storagePath: insert.storage_path,
      byteSize: insert.byte_size,
      checksum: insert.checksum,
      qty: insert.qty,
      sheetMm: insert.sheet_mm,
      warning: insert.warning ?? undefined,
      printer: insert.printer ?? undefined,
      printerRef: insert.printer_ref ?? undefined,
      createdAt: new Date().toISOString(),
    });
  }

  if (!produced.length) {
    return json({ error: 'Could not produce any print files.', problems }, 500);
  }

  // `print_files_ready_at` is the honest signal that this order CAN go to a
  // printer. It is deliberately not `status`: an order is `printed` only when a
  // human or a printer API says so, and conflating the two would let a render
  // count as having been printed.
  const { error: stampError } = await admin
    .from('orders')
    .update({ print_files_ready_at: new Date().toISOString() })
    .eq('id', row.id);
  if (stampError) problems.push(`could not stamp print_files_ready_at: ${stampError.message}`);

  return json({
    ok: true,
    orderId: row.id,
    files: produced,
    problems,
    printer: describePrinterConfig(printerConfig),
  });
});
