'use client';

import { useEffect } from 'react';

/**
 * The 500, for a render that threw below the root layout (TI-71).
 *
 * Rendered inside that layout, so the header, footer and theme survive: only
 * the page is replaced. A failure in the layout itself is `global-error.tsx`,
 * which is a different and much barer thing.
 *
 * ## `retry`, not `reset`
 *
 * Next 16 renamed the prop. Every example in circulation still says `reset`,
 * and the difference is silent — the button simply does nothing. Checked
 * against node_modules/next/dist/docs, not from memory.
 *
 * ## What the reader is told
 *
 * The digest and nothing else. In production Next deliberately withholds the
 * message from the client to avoid leaking what threw, and `error.message`
 * there is a generic string; printing it would suggest we had said something.
 * The digest is what ties this screen to the server log entry, so it is the
 * one thing worth showing.
 */

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Reporting proper is TI-50. This is the hook it will replace, and until
    // then the console is what a developer looking at a broken page has.
    console.error('Unhandled render error', error.digest ?? '', error);
  }, [error]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-20 sm:px-6 lg:px-8">
      <p className="font-mono text-4xl text-text-subtle">500</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-3 text-text-muted">
        This page failed to render. It is not something you did, and trying again often works — the
        reference is generated per request, so a transient failure does not repeat.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-md border border-border bg-field px-3 py-2 text-sm text-text transition-colors hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          Try again
        </button>
        <a href="/" className="text-sm text-link underline underline-offset-2">
          Go to the home page
        </a>
      </div>

      {error.digest && (
        <p className="mt-8 text-sm text-text-subtle">
          If you report this, quote{' '}
          <span className="font-mono text-text-muted">{error.digest}</span> — it identifies this
          failure in the server log.
        </p>
      )}
    </div>
  );
}
