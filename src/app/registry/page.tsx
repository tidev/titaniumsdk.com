import { API_VERSION, listModules, RESOLUTION_RULES } from '@/lib/registry-api/v1';
import { SITE_URL } from '@/lib/site';
import type { Metadata } from 'next';

/**
 * The human half of the registry API.
 *
 * Sits at `/registry` with the JSON under `/registry/v1`, so a reader who trims
 * a path they found in a log lands on the documentation for it rather than a
 * 404. Third parties are expected here, not just the Titanium CLI.
 */

export const metadata: Metadata = {
  title: 'Registry API — Titanium SDK',
  description:
    'The public JSON API for Titanium modules: every module, its releases, and the archives to download.',
  alternates: { canonical: `${SITE_URL}/registry` },
};

const ENDPOINTS: { path: string; title: string; body: React.ReactNode }[] = [
  {
    path: '/registry/v1',
    title: 'Index',
    body: 'What this API serves, and the resolution rules below in machine-readable form.',
  },
  {
    path: '/registry/v1/modules',
    title: 'Every module',
    body: (
      <>
        One file, official and community together, each tagged with a{' '}
        <code className="font-mono">kind</code>. There are no query parameters — the whole list
        is small enough to fetch and filter locally, which is why it can be cached whole.
      </>
    ),
  },
  {
    path: '/registry/v1/modules/{moduleId}',
    title: 'One module',
    body: 'Its current release per platform, and every release it has ever published.',
  },
  {
    path: '/registry/v1/modules/{moduleId}/v/{version}',
    title: 'One release',
    body: 'The platform manifests, and the archive to download for each platform.',
  },
  {
    path: '/registry/v1/releases',
    title: 'SDK releases',
    body: 'Every published Titanium SDK release — GA, release candidates and betas — with the per-OS archives.',
  },
  {
    path: '/registry/v1/branches',
    title: 'CI branches',
    body: 'The branches with builds worth offering. Counts are recomputed rather than read from the committed map, because CI artifacts expire 90 days after their run.',
  },
  {
    path: '/registry/v1/branches/{branch}',
    title: 'CI builds',
    body: 'One branch\u2019s builds. A build whose artifacts have expired is never listed — its download URL would 404.',
  },
];

/** The paths the shipped CLI reads, which cannot change. */
const LEGACY = [
  '/registry/branches.json',
  '/registry/{branch}.json',
  '/registry/ga.json',
  '/registry/rc.json',
  '/registry/beta.json',
];

export default function RegistryApiPage() {
  const modules = listModules();
  const bytes = JSON.stringify(modules).length;

  return (
    // Gutters, the same as the modules and downloads trees get from their own
    // layouts. This route has no layout of its own — it is one page.
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Registry API</h1>
      <p className="mt-3 text-text-muted">
        The module registry as JSON, for the Titanium CLI and anything else that wants it. Generated
        at build time and served as static files, so it is safe to call often and safe to cache.
        Reads are open cross-origin.
      </p>

      <section aria-labelledby="endpoints" className="mt-10">
        <h2 id="endpoints" className="text-xl font-semibold tracking-tight">
          Endpoints
        </h2>
        <ul className="mt-4 space-y-4">
          {ENDPOINTS.map((e) => (
            <li key={e.path} className="rounded-lg border border-border p-4">
              <p className="font-mono text-sm break-all text-link">
                GET <span className="text-text">{e.path}</span>
              </p>
              <p className="mt-1 text-sm font-medium">{e.title}</p>
              <p className="mt-1 text-sm text-text-muted">{e.body}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-text-subtle">
          The paths mirror the pages, so one is guessable from the other:{' '}
          <code className="font-mono">/modules/ti.map/v/5.7.0</code> is a page and{' '}
          <code className="font-mono">/registry/v1/modules/ti.map/v/5.7.0</code> is its JSON. The
          full list is currently {(bytes / 1024).toFixed(0)}&nbsp;KB across {modules.length}{' '}
          modules.
        </p>
      </section>

      <section aria-labelledby="compat" className="mt-12">
        <h2 id="compat" className="text-xl font-semibold tracking-tight">
          Compatibility paths
        </h2>
        <p className="mt-2 text-text-muted">
          The Titanium CLI reads these, and older copies of it stay in use for years, so they keep
          answering in their original shape — a bare array, or a bare object for the branch counts.
          They are served rather than redirected: the CLI does not follow redirects. Prefer the
          versioned endpoints above for anything new.
        </p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {LEGACY.map((path) => (
            <li
              key={path}
              className="rounded-md border border-border px-2.5 py-1.5 font-mono text-xs text-text-muted"
            >
              {path}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="resolution" className="mt-12">
        <h2 id="resolution" className="text-xl font-semibold tracking-tight">
          Resolving a version
        </h2>
        <p className="mt-2 text-text-muted">
          A Titanium module is not an npm package. Releases are per platform, and picking the wrong
          one fails quietly rather than loudly, so these rules are part of the contract. They apply
          to modules; an SDK release is one build per OS and needs none of this.
        </p>
        <ul className="mt-4 space-y-2">
          {RESOLUTION_RULES.map((rule) => (
            <li key={rule} className="border-l-2 border-border pl-3 text-sm text-text-muted">
              {rule}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="caveats" className="mt-12">
        <h2 id="caveats" className="text-xl font-semibold tracking-tight">
          Known gaps
        </h2>
        <ul className="mt-4 space-y-3 text-sm text-text-muted">
          <li className="border-l-2 border-border pl-3">
            <strong className="font-medium text-text">
              Checksums are not upstream attestations.
            </strong>{' '}
            Every asset carries <code className="font-mono">checksum</code> as{' '}
            <code className="font-mono">sha256:&lt;hex&gt;</code>. 16 of them are the digest GitHub
            recorded at upload; the other 363 were computed by downloading the archive, because
            GitHub only began recording digests in September 2025 and does not backfill. Both
            record what GitHub served, not an independent signature, so a checksum detects
            corruption in transit and any later change to an archive — it does not prove the
            archive was untampered before it was recorded. Still treat a missing checksum as
            &ldquo;cannot verify&rdquo;, never as &ldquo;verified&rdquo;.
          </li>
          <li className="border-l-2 border-warning pl-3">
            <strong className="font-medium text-text">Community entries are repositories.</strong>{' '}
            They are listed so a search can find them, but they carry no version list and nothing to
            install. Only <code className="font-mono">&quot;kind&quot;: &quot;registry&quot;</code>{' '}
            entries are installable.
          </li>
        </ul>
      </section>

      <section aria-labelledby="stability" className="mt-12">
        <h2 id="stability" className="text-xl font-semibold tracking-tight">
          Stability
        </h2>
        <p className="mt-2 text-text-muted">
          The version lives in the path. Fields may be added to{' '}
          <code className="font-mono">v{API_VERSION}</code> responses; nothing will be removed or
          change meaning. A breaking change gets a new path segment, and this one keeps answering —
          CLI copies stay in the wild for years.
        </p>
        </section>
      </div>
    </div>
  );
}
