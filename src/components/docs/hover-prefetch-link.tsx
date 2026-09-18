'use client';

import Link from 'next/link';
import { useState, type ComponentProps } from 'react';

/**
 * A `Link` that prefetches once the pointer reaches it, and not before.
 *
 * The reference rails list every type in a version - 284 links - and a type
 * page renders on demand. Left to prefetch on sight, opening the tree would ask
 * the server to build most of a version, which is why they carried
 * `prefetch={false}`. But in the App Router `false` also disables the hover
 * prefetch, so every click waited for a round trip that could have started
 * when the pointer arrived: measured against the Vercel preview, 130ms for a
 * cached page and 0.6-3s for one nobody had opened since the deploy.
 *
 * This is the pattern Next's own guide gives for exactly that trade-off
 * (`docs/01-app/01-getting-started/04-linking-and-navigating.md`), with one
 * change: the prop flips to `true` rather than to the default. A type page is
 * not in the prerender manifest, so the router treats it as dynamic and the
 * default prefetch fetches only the 1KB route tree - the click then still
 * fetched the 390KB page. `true` fetches the whole payload on hover, and the
 * click makes no request at all; measured in a headless browser against a
 * production build. Focus is included so keyboard navigation gets the same
 * head start.
 */
export function HoverPrefetchLink(props: Omit<ComponentProps<typeof Link>, 'prefetch'>) {
  const [active, setActive] = useState(false);
  const activate = () => setActive(true);

  return (
    <Link
      {...props}
      prefetch={active ? true : false}
      onMouseEnter={(e) => {
        activate();
        props.onMouseEnter?.(e);
      }}
      onFocus={(e) => {
        activate();
        props.onFocus?.(e);
      }}
    />
  );
}
