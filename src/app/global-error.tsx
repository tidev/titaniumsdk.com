'use client';

import { THEME_INIT } from '@/lib/theme-init';
import './globals.css';

/**
 * The last resort: the root layout itself threw (TI-71).
 *
 * This file *replaces* the root layout rather than rendering inside it, which
 * has three consequences worth stating, because none of them is obvious and all
 * three are easy to get wrong:
 *
 *   - It must supply its own `<html>` and `<body>`.
 *   - It receives none of the app's global styles, so `globals.css` is imported
 *     here explicitly. Without it this page renders as unstyled black on white.
 *   - The theme script in the root layout never runs, so `data-theme` is never
 *     set and the page would follow the OS scheme regardless of what the reader
 *     chose. THEME_INIT is re-run here for that reason, from the shared
 *     constant rather than a second copy.
 *
 * It also cannot export `metadata` — error boundaries are Client Components —
 * so the title is React's `<title>` element instead.
 *
 * Fonts are deliberately not loaded: `next/font` here would pull a second copy
 * of the family into a page that renders when everything else has already
 * failed. The system stack is the right trade in that situation.
 *
 * The prop is `retry`, not `reset` — Next 16 renamed it, and the rename is
 * silent if you get it wrong.
 *
 * ## What this does and does not catch
 *
 * Client-side failures in the root layout. Verified by throwing from a client
 * component the layout renders: this page replaces the document, keeps its own
 * title, and applies the theme.
 *
 * It does **not** catch a root layout that throws during server rendering.
 * That was worth checking, since it is the obvious reading of "the root layout
 * failed": Next answers with a bare `Internal Server Error` body and 500, with
 * no React tree left to fall back into, and nothing written here can change
 * that. Recorded so the next person does not go looking for the bug.
 */

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Something went wrong — Titanium SDK</title>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className="min-h-full bg-bg text-text">
        <div className="mx-auto w-full max-w-2xl px-4 py-20 sm:px-6 lg:px-8">
          <p className="font-mono text-sm text-text-subtle">500</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Something went wrong</h1>
          <p className="mt-3 text-text-muted">
            The site failed to load. Trying again often works; if it does not, the failure is on our
            side rather than yours.
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
              <span className="font-mono text-text-muted">{error.digest}</span>.
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
