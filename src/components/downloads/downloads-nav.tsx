'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * The three views of the registry: what to install, what has shipped, what CI
 * built last night.
 *
 * A client component for the same single reason as the API rail — a layout's
 * `params` stop at its own segment, so `usePathname()` is the only way to know
 * which tab is current. Every route under it is prerendered, so `aria-current`
 * ships inside the static HTML and hydration has nothing to correct.
 */
const TABS = [
  { href: '/downloads', label: 'Overview' },
  { href: '/downloads/releases', label: 'Releases' },
  { href: '/downloads/builds', label: 'CI builds' },
];

export function DownloadsNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Downloads" className="mt-6 border-b border-border">
      {/* Scrolls rather than wraps: three tabs fit at 320px, a fourth would not. */}
      <ul className="-mb-px flex gap-1 overflow-x-auto">
        {TABS.map((tab) => {
          // Branch pages nest under /downloads/builds and belong to that tab.
          const active =
            tab.href === '/downloads' ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={`inline-block whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                  active
                    ? 'border-link text-text'
                    : 'border-transparent text-text-muted hover:text-text'
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
