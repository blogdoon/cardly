/**
 * Printer handoff — the Gelato/Prodigi seam.
 *
 * The print FILE is the part that has to be right, and `fulfil-order` produces it
 * either way. Handing it to a printer API is a separate concern with a separate
 * failure mode, so it lives here rather than inline: a printer outage must not
 * cost an order its print file.
 *
 * WHY IT IS A STUB BY DEFAULT. There is no printer account behind this yet, and
 * inventing a plausible-looking order POST would be worse than an honest seam —
 * an operator watching a fake order id appear in a queue has no way to know it
 * was never sent. So with no configuration this returns `skipped`, which the
 * admin console renders as "ready, waiting for a printer". That is a real, shippable
 * state: download the file, print it, post it.
 *
 * To wire a real printer, set all three secrets:
 *   PRINTER_API_URL   the API root, e.g. https://api.gelato.com/v2
 *   PRINTER_API_KEY   its bearer token
 *   PRINTER_NAME      which product/size to order, passed through as `printer`
 * All three or none: a half-configured printer is refused rather than guessed at,
 * because a request that will fail at the far end is a worse surprise than one
 * that never leaves.
 *
 * Deliberately pure apart from `fetch`, so Node can import and test the decision
 * logic (see scripts/printLayout.check.ts) without a network.
 */

export interface PrinterHandoff {
  /** 'sent' = the API accepted it; 'skipped' = nothing configured, ready for a human. */
  status: 'sent' | 'skipped';
  /** The printer's own reference, for the operator to match in the dashboard. */
  ref?: string;
  printer?: string;
  reason?: string;
}

export interface PrinterConfig {
  url?: string;
  apiKey?: string;
  printer?: string;
}

export function readPrinterConfig(env: Record<string, string | undefined>): PrinterConfig {
  return {
    url: (env.PRINTER_API_URL ?? '').trim() || undefined,
    apiKey: (env.PRINTER_API_KEY ?? '').trim() || undefined,
    printer: (env.PRINTER_NAME ?? '').trim() || undefined,
  };
}

/**
 * A one-line description for the admin console, so an operator can see WHY a job
 * is sitting unprinted without reading the deployment notes.
 */
export function describePrinterConfig(config: PrinterConfig): string {
  const missing = [
    !config.url && 'PRINTER_API_URL',
    !config.apiKey && 'PRINTER_API_KEY',
    !config.printer && 'PRINTER_NAME',
  ].filter(Boolean) as string[];
  if (missing.length === 3) return 'no printer configured — print by hand from the download';
  if (missing.length) return `printer not configured (missing ${missing.join(', ')})`;
  return `printer: ${config.printer} via ${config.url}`;
}

/**
 * Send one print file to the printer.
 *
 * `fileBase64` is the PDF body. The payload shape is deliberately generic
 * (a multipart-ish `{file, printer, reference}` envelope) rather than modelled on
 * one vendor's exact schema: guessing Gelato's field names without the spec in
 * front of me would produce a request that looks authoritative and 400s.
 */
export async function handOffToPrinter(input: {
  config: PrinterConfig;
  orderId: string;
  fileName: string;
  fileBase64: string;
  quantity: number;
  fetchImpl?: typeof fetch;
}): Promise<PrinterHandoff> {
  const { config } = input;
  const missing = !config.url || !config.apiKey || !config.printer;
  if (missing) {
    return {
      status: 'skipped',
      reason: describePrinterConfig(config),
      printer: config.printer,
    };
  }

  const doFetch = input.fetchImpl ?? fetch;
  const res = await doFetch(`${config.url!.replace(/\/$/, '')}/orders`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      reference: input.orderId,
      printer: config.printer,
      quantity: input.quantity,
      file: { name: input.fileName, content: input.fileBase64, encoding: 'base64' },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    // Not thrown: the print file is already stored, so the order is still
    // fulfillable by hand. This is reported, not fatal.
    return {
      status: 'skipped',
      printer: config.printer,
      reason: `printer rejected the job (${res.status})${body ? `: ${body.slice(0, 200)}` : ''}`,
    };
  }

  const data = (await res.json().catch(() => ({}))) as { id?: string; reference?: string };
  return {
    status: 'sent',
    printer: config.printer,
    ref: data.id ?? data.reference ?? undefined,
  };
}
