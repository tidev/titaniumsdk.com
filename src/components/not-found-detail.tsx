'use client';

import { usePathname } from 'next/navigation';

/**
 * What the 404 can say once it knows the address that missed.
 *
 * A client component because `not-found.tsx` is handed no params and no URL —
 * `usePathname()` is the only way to read what was asked for, the same reason
 * `api-nav.tsx` is one.
 *
 * ## Why this is not a nested `not-found.tsx`
 *
 * The obvious shape was a `not-found.tsx` under `docs/sdk/[version]`, which
 * would also have kept the type sidebar. It does not engage: placed in either
 * that segment or in `[type]` itself, `notFound()` from the type page still
 * resolves to the root boundary. Since TI-25 these routes render on demand with
 * `dynamicParams` on, and that is the likely reason — not established, so it is
 * recorded as observed behaviour rather than explained.
 *
 * Adapting the root page gets the part that matters: naming the version and the
 * type, which is the reader's actual question. What it loses is the sidebar.
 *
 * ## What a reader without JavaScript sees
 *
 * The generic message. `usePathname()` does not resolve while the 404 is being
 * rendered on the server, so the server HTML always carries the fallback branch
 * and the specific one appears on hydration. Verified, not assumed: curl gets
 * the general text for a `/guide/...` URL where a browser gets the tailored
 * one. The heading, the links and the 404 status are all server-rendered, so
 * what degrades is one paragraph of helpfulness rather than the page.
 */

export function NotFoundDetail() {
  const pathname = usePathname();
  const parts = pathname.split('/').filter(Boolean);

  // /docs/sdk/<version>/<type>
  if (parts[0] === 'docs' && parts[1] === 'sdk' && parts.length >= 3) {
    const version = parts[2];
    const type = parts.length > 3 ? decodeURIComponent(parts.slice(3).join('/')) : '';
    return (
      <>
        <p className="mt-3 text-text-muted">
          {type ? (
            <>
              <span className="font-mono text-text">{type}</span> is not part of the{' '}
              <span className="font-mono text-text">{version}</span> reference. It may have been
              added in a later release, removed in an earlier one, or simply be misspelt.
            </>
          ) : (
            <>
              There is no <span className="font-mono text-text">{version}</span> reference here.
            </>
          )}
        </p>
        <p className="mt-3 text-text-muted">
          Search covers every version, which is the faster way in when only the spelling is wrong —
          press{' '}
          <kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-xs">⌘K</kbd>.
        </p>
      </>
    );
  }

  // The old documentation's URLs, which are widely linked and mostly retired.
  if (parts[0] === 'guide') {
    return (
      <p className="mt-3 text-text-muted">
        That is an address from the old documentation. Most of those pages have been retired or
        rewritten; the reference below is where the API documentation lives now. Search —{' '}
        <kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-xs">⌘K</kbd> —
        finds anything by name.
      </p>
    );
  }

  return (
    <p className="mt-3 text-text-muted">
      The address may be from the old documentation, or the page may have moved. Search finds
      anything in the reference by name — press{' '}
      <kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-xs">⌘K</kbd> or use
      the search box in the header.
    </p>
  );
}
