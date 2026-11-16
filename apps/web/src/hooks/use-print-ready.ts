'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    /** Set by a print page once its data is on screen; the server PDF waits for it (#202). */
    __ddrPrintReady?: boolean;
  }
}

/**
 * Tells a headless browser that the print page is complete: `window.__ddrPrintReady` turns true
 * once `ready` is true, the fonts have loaded and the page has been painted.
 */
export function usePrintReady(ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    document.fonts.ready.then(() =>
      requestAnimationFrame(() => {
        if (!cancelled) window.__ddrPrintReady = true;
      }),
    );
    return () => {
      cancelled = true;
      window.__ddrPrintReady = false;
    };
  }, [ready]);
}
