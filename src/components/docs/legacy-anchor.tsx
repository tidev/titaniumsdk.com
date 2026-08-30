'use client';

import { useEffect } from 'react';

/**
 * Rescues a deep link whose fragment only differs by case.
 *
 * The old site slugged member anchors to lowercase, so a forum or Stack
 * Overflow answer links `#backgroundcolor`. The new ids preserve the member's
 * real casing, and 70% of the 4,954 members are mixed-case, so those links land
 * on the right page and scroll nowhere.
 *
 * A fragment is never sent to the server, so a redirect cannot fix this — the
 * browser is the only thing that ever sees it.
 *
 * Runs only when the fragment matches nothing, so a correct link is untouched.
 */
export function LegacyAnchor() {
  useEffect(() => {
    const raw = decodeURIComponent(globalThis.location.hash.slice(1));
    if (!raw || document.getElementById(raw)) return;

    const wanted = raw.toLowerCase();
    const match = [...document.querySelectorAll<HTMLElement>('[id]')].find(
      (el) => el.id.toLowerCase() === wanted
    );
    if (!match) return;

    match.scrollIntoView();
    // Correct the address bar so a copied link is the canonical one.
    globalThis.history.replaceState(null, '', `#${match.id}`);
  }, []);

  return null;
}
