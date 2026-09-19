'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ComponentProps } from 'react';

/**
 * How long the pointer or focus has to rest on a link before it prefetches.
 *
 * A cursor sweeping down a rail of 28px rows, or a held Tab key repeating at
 * about 30 links a second, crosses each one in well under this. Someone about
 * to click has usually been on the link for a few hundred milliseconds, so the
 * timer costs a deliberate hover little of its head start and filters out the
 * links merely passed over.
 */
const DWELL_MS = 150;

/**
 * A `Link` that prefetches once the pointer settles on it, and not before.
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
 * (`docs/01-app/01-getting-started/04-linking-and-navigating.md`), with two
 * changes.
 *
 * The prop flips to `true` rather than to the default. A type page is not in
 * the prerender manifest, so the router treats it as dynamic and the default
 * prefetch fetches only the 1KB route tree - the click then still fetched the
 * 390KB page. `true` fetches the whole payload on hover, and the click makes no
 * request at all; measured in a headless browser against a production build.
 *
 * And the flip waits out a short dwell. `next/link` never cancels a prefetch
 * on mouseleave, only on unmount, so flipping on `mouseenter` alone would fetch
 * a page for every link the pointer crossed on its way to the one it wanted:
 * the same server cost `prefetch={false}` was there to prevent, moved from
 * page load to pointer movement. Leaving or blurring inside the dwell clears
 * the timer; once it has fired the prefetch is committed and the link stays
 * eager, which is what the guide's pattern does too. Focus is included so
 * keyboard navigation gets the same head start.
 */
export function HoverPrefetchLink(props: Omit<ComponentProps<typeof Link>, 'prefetch'>) {
  const [active, setActive] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // A click focuses the link as well as entering it, so both handlers can run
  // for one visit; the second finds the timer already armed and leaves it.
  const arm = () => {
    if (active || timer.current !== undefined) return;
    timer.current = setTimeout(() => {
      timer.current = undefined;
      setActive(true);
    }, DWELL_MS);
  };
  const disarm = () => {
    clearTimeout(timer.current);
    timer.current = undefined;
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <Link
      {...props}
      prefetch={active ? true : false}
      onMouseEnter={(e) => {
        arm();
        props.onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        disarm();
        props.onMouseLeave?.(e);
      }}
      onFocus={(e) => {
        arm();
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        disarm();
        props.onBlur?.(e);
      }}
    />
  );
}
