import { OlderVersionNotice, VersionSwitcher } from '@/components/docs/version-switcher';
import { sdkIndex, sdkVersions, resolveVersion, MAIN } from '@/lib/docs/registry';
import { hasReleaseNote } from '@/lib/docs/release-notes';
import { newerVersion, versionOptions } from '@/lib/docs/versions';
import { SITE_URL } from '@/lib/site';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

/** The type list for one compiled SDK version. */

export const dynamicParams = false;

export function generateStaticParams() {
  return sdkVersions().map((version) => ({ version }));
}

export async function generateMetadata({
  params,
}: PageProps<'/docs/sdk/[version]'>): Promise<Metadata> {
  const { version } = await params;
  const resolved = resolveVersion(version);
  if (!resolved) return {};
  return {
    title: `SDK API reference ${resolved} — Titanium SDK`,
    description: `Every Titanium SDK type, method, property, and event in ${resolved}.`,
    alternates: { canonical: `${SITE_URL}/docs/sdk/${resolved}` },
  };
}

const KIND_ORDER = ['module', 'proxy', 'view', 'pseudo'] as const;
const KIND_LABELS: Record<string, string> = {
  module: 'Modules',
  proxy: 'Proxies',
  view: 'Views',
  pseudo: 'Dictionaries and namespaces',
};

export default async function VersionIndex({ params }: PageProps<'/docs/sdk/[version]'>) {
  const { version } = await params;
  const resolved = resolveVersion(version);
  if (!resolved) notFound();

  const index = sdkIndex(resolved);
  if (!index) notFound();

  const base = `/docs/sdk/${resolved}`;
  const newer = newerVersion(resolved);
  const byKind = new Map<string, typeof index.types>();
  for (const t of index.types) {
    byKind.set(t.kind, [...(byKind.get(t.kind) ?? []), t]);
  }

  return (
    // The same two-column grid a type page uses, with nothing in the second
    // column but the version switcher. That is deliberate: it puts the switcher
    // at the head of the same column, so it lands in exactly the position it
    // occupies on a type page rather than at a hand-computed offset that would
    // drift the moment the rail or the control changed width.
    <div className="py-10 xl:grid xl:grid-cols-[minmax(0,1fr)_13rem] xl:gap-8">
      <div className="min-w-0 max-w-4xl xl:col-start-1 xl:row-start-1">
        <header>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">SDK API reference</h1>
            {/* Below `xl` there is no second column, so this is the end of the
              heading row — which is where a type page puts it at that width too. */}
            <VersionSwitcher
              current={resolved}
              options={versionOptions()}
              className="ml-auto xl:hidden"
            />
          </div>
          <p className="mt-2 text-text-muted">
            <span className="font-mono">{resolved}</span>
            {resolved === MAIN && ' — compiled from the development branch, not a release'}
            {' · '}
            {index.counts.types} types, {index.counts.members.toLocaleString()} declared members
            {hasReleaseNote(resolved) && (
              <>
                {' · '}
                <a
                  href={`/docs/sdk/${resolved}/release-notes`}
                  className="text-link hover:underline"
                >
                  Release notes
                </a>
              </>
            )}
          </p>
          {newer && <OlderVersionNotice current={resolved} newer={newer} />}
        </header>

        {KIND_ORDER.filter((k) => byKind.has(k)).map((kind) => (
          <section key={kind} aria-labelledby={kind} className="mt-10">
            <h2 id={kind} className="text-xl font-semibold tracking-tight">
              {KIND_LABELS[kind]}{' '}
              <span className="font-mono text-sm font-normal text-text-subtle">
                {byKind.get(kind)!.length}
              </span>
            </h2>
            <ul className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2">
              {byKind.get(kind)!.map((t) => (
                <li key={t.name} className="truncate">
                  <a
                    href={`${base}/${t.name}`}
                    className="font-mono text-sm text-link hover:underline"
                  >
                    {t.name}
                  </a>
                  {t.deprecated && <span className="ml-2 text-xs text-danger">deprecated</span>}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* The switcher's own column, empty otherwise. Matches the head of the
          rail on a type page. */}
      <div className="hidden xl:col-start-2 xl:row-start-1 xl:block">
        <VersionSwitcher current={resolved} options={versionOptions()} />
      </div>
    </div>
  );
}
