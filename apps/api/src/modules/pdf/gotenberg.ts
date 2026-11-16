import { UpstreamError } from '../../lib/errors';

// Server-generated PDF (v1.1.0, decided 2026-11-16): a Gotenberg container opens a print page
// of the web app in headless Chromium and prints it. The page is rendered with the caller's own
// session cookie, so it shows exactly what the caller may see, and the API holds no PDF layout.
// Gotenberg form fields: https://gotenberg.dev/docs/routes (Chromium, "URL into PDF").

export type RenderInput = {
  /** Absolute URL of the print page, as Gotenberg reaches it. */
  url: string;
  /** `Cookie` header for every request of the page (the caller's session). */
  cookie: string;
  /** Logged by Gotenberg as its trace id, so its log lines match the API's request. */
  requestId: string;
};

export type PdfRenderer = (input: RenderInput) => Promise<Uint8Array>;

/** Set by the print pages once their data is on screen (`usePrintReady` in the web app). */
const READY = 'window.__ddrPrintReady === true';
const TIMEOUT_MS = 60_000;

export const gotenbergRenderer =
  (baseUrl: string): PdfRenderer =>
  async ({ url, cookie, requestId }) => {
    const form = new FormData();
    form.append('url', url);
    form.append('extraHttpHeaders', JSON.stringify({ Cookie: cookie }));
    form.append('waitForExpression', READY);
    // The page sets its own size and orientation (`@page` in globals.css).
    form.append('preferCssPageSize', 'true');
    form.append('printBackground', 'true');
    form.append('emulatedMediaType', 'print');

    let response: Response;
    try {
      response = await fetch(new URL('/forms/chromium/convert/url', baseUrl), {
        method: 'POST',
        body: form,
        headers: { 'Gotenberg-Trace': requestId },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (cause) {
      throw new UpstreamError('PDF_RENDER_FAILED', 'The PDF service did not answer', {
        reason: cause instanceof Error ? cause.name : 'unknown',
      });
    }
    if (!response.ok) {
      throw new UpstreamError('PDF_RENDER_FAILED', 'The PDF could not be rendered', {
        status: response.status,
      });
    }
    return new Uint8Array(await response.arrayBuffer());
  };
