import { Browse } from '@/components/modules/browse';
import { communityListings, moduleSummaries } from '@/lib/docs/modules';
import { markdownAlternate } from '@/lib/markdown-copy';
import { SITE_URL } from '@/lib/site';
import type { Metadata } from 'next';

/**
 * Every module anyone has published, of either kind.
 *
 * The curated ones have pages here. The community ones are GitHub repositories
 * carrying the `titanium` topic, which is the closest thing Titanium has to a
 * module registry - the list is what tidev/module-search-www served, taken over
 * so there is one place to look rather than two.
 *
 * Read from `registry/modules/` on disk - no network at build time, which is
 * what keeps rebuilds fast and preview deploys reproducible.
 */

export const metadata: Metadata = {
  title: 'Modules - Titanium SDK',
  description:
    'Native modules for Titanium: Maps, Bluetooth, NFC, Facebook, biometrics, and more, for iOS and Android.',
  alternates: {
    canonical: `${SITE_URL}/modules`,
    types: {
      ...markdownAlternate('/modules'),
      'application/rss+xml': [
        { url: `${SITE_URL}/modules/feed.xml`, title: 'New Titanium modules' },
      ],
    },
  },
};

export default function ModulesIndex() {
  const official = moduleSummaries();
  const listings = communityListings();
  const releases = official.reduce((n, m) => n + m.releases, 0);
  // Counted from `source` rather than from the two arrays, because the split
  // this sentence describes is the curation one and not the has-a-page-here
  // one. See `docs/module-curation.md`.
  const vouched = listings.filter((m) => m.source === 'community').length;
  const found = listings.length - vouched;

  return (
    <div className="max-w-5xl py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Modules</h1>
      <p className="mt-3 max-w-2xl text-text-muted">
        Native functionality Titanium does not ship in the core SDK, packaged per platform.{' '}
        <strong className="font-medium text-text">{official.length} official modules</strong> are
        maintained by TiDev and documented here, with {releases.toLocaleString()} releases between
        them and an API reference for each.
        {vouched > 0 && (
          <>
            {' '}
            {vouched === 1
              ? 'Another is a community module'
              : `Another ${vouched} are community modules`}{' '}
            TiDev has reviewed and vouches for.
          </>
        )}{' '}
        A further {found.toLocaleString()} were found by their <code>titanium</code> topic on GitHub
        and link straight to their repositories. Those are listed, not reviewed.
      </p>
      <p className="mt-3 text-sm text-text-muted">
        {/* Not a Link: the feed is a route handler, so client-side navigation
            would try to render XML as a page. */}
        <a
          href="/modules/feed.xml"
          className="text-link hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          RSS feed of new modules
        </a>
      </p>

      <Browse modules={[...official, ...listings]} />
    </div>
  );
}
