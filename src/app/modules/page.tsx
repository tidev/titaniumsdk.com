import { Browse } from '@/components/modules/browse';
import { moduleSummaries } from '@/lib/docs/modules';
import { SITE_URL } from '@/lib/site';
import type { Metadata } from 'next';

/**
 * Every module in the registry.
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
  const modules = moduleSummaries();
  const releases = modules.reduce((n, m) => n + m.releases, 0);

  return (
    <div className="max-w-5xl py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Modules</h1>
      <p className="mt-3 max-w-2xl text-text-muted">
        Native functionality Titanium does not ship in the core SDK, packaged per platform.{' '}
        {modules.length} modules, {releases.toLocaleString()} releases. Each one is listed under the
        id you write in <code className="font-mono">tiapp.xml</code>.
      </p>

      <Browse modules={modules} />
    </div>
  );
}
