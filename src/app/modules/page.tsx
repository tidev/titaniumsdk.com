import { Browse } from '@/components/modules/browse';
import { communityListings, moduleSummaries } from '@/lib/docs/modules';
import { SITE_URL } from '@/lib/site';
import type { Metadata } from 'next';

/**
 * Every module anyone has published, of either kind.
 *
 * The curated ones have pages here. The community ones are GitHub repositories
 * carrying the `titanium` topic, which is the closest thing Titanium has to a
 * module registry — the list is what tidev/module-search-www served, taken over
 * so there is one place to look rather than two.
 *
 * Read from `registry/modules/` on disk — no network at build time, which is
 * what keeps rebuilds fast and preview deploys reproducible.
 */

export const metadata: Metadata = {
  title: 'Modules — Titanium SDK',
  description:
    'Native modules for Titanium: Maps, Bluetooth, NFC, Facebook, biometrics, and more, for iOS and Android.',
  alternates: { canonical: `${SITE_URL}/modules` },
};

export default function ModulesIndex() {
  const official = moduleSummaries();
  const community = communityListings();
  const releases = official.reduce((n, m) => n + m.releases, 0);

  return (
    <div className="max-w-5xl py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Modules</h1>
      <p className="mt-3 max-w-2xl text-text-muted">
        Native functionality Titanium does not ship in the core SDK, packaged per platform.{' '}
        <strong className="font-medium text-text">{official.length} official modules</strong> are
        documented here, with {releases.toLocaleString()} releases between them and an API reference
        for each. Another {community.length} are published by the community on GitHub and link
        straight to their repositories.
      </p>

      <Browse modules={[...official, ...community]} />
    </div>
  );
}
