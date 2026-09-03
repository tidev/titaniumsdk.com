import { NotFoundDetail } from '@/components/not-found-detail';
import Link from 'next/link';

/**
 * The 404 (TI-71).
 *
 * Rendered inside the root layout, so it keeps the header, footer, theme and
 * skip link — which the built-in page does not, and which matters here more
 * than on most sites: the old documentation's URLs are widely linked and TI-39
 * is still building the redirect map, so this page is a migration surface
 * rather than an edge case.
 *
 * ## What it offers
 *
 * Search first. A wrong URL under `/docs` is usually a half-remembered symbol
 * name, and TI-47 shipped a search that answers exactly that — so the useful
 * thing is to say it exists and how to reach it, rather than to apologise.
 *
 * The message itself comes from `NotFoundDetail`, which reads the address that
 * missed: a type under `/docs/sdk/<version>` gets told which version it looked
 * in, and a legacy `/guide/...` URL gets told those pages were retired. This
 * stays a server component so it can still export `metadata`.
 *
 * The section links below are the four places anything lives. A 404 that only
 * says "not found" makes the reader go back to the address bar.
 */

export const metadata = {
  title: 'Page not found — Titanium SDK',
  // Next injects `noindex` on a 404 response by itself, but the metadata is
  // what a share card and a browser tab show.
  description: 'That address does not exist on this site.',
};

const PLACES = [
  { href: '/docs/sdk/latest', label: 'API reference', hint: 'Every SDK type, method and event' },
  { href: '/modules', label: 'Modules', hint: 'Official and community native modules' },
  { href: '/downloads', label: 'Downloads', hint: 'Releases and CI builds' },
  { href: '/blog', label: 'Blog', hint: 'Release notes and announcements' },
];

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-20 sm:px-6 lg:px-8">
      <p className="font-mono text-sm text-text-subtle">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">This page does not exist</h1>
      <NotFoundDetail />

      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {PLACES.map((place) => (
          <li key={place.href}>
            <Link
              href={place.href}
              className="block rounded-md border border-border p-3 transition-colors hover:border-border-strong"
            >
              <span className="block font-medium text-link">{place.label}</span>
              <span className="mt-0.5 block text-sm text-text-muted">{place.hint}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
