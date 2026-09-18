import { HoverPrefetchLink } from '@/components/docs/hover-prefetch-link';
import { OlderVersionNotice, VersionSwitcher } from '@/components/docs/version-switcher';
import { InstallRow } from '@/components/downloads/install-row';
import { OsIconDefs } from '@/components/downloads/os-icon';
import { sdkIndex, MAIN } from '@/lib/docs/registry';
import { hasReleaseNote } from '@/lib/docs/release-notes';
import { newerVersion, versionOptions } from '@/lib/docs/versions';
import { formatDate } from '@/lib/downloads/format';
import { releaseForVersion } from '@/lib/downloads/registry';
import { notFound } from 'next/navigation';

/**
 * The type list for one compiled SDK version (TI-79).
 *
 * Two routes render it: `/docs/sdk/13.4.1` pinned under `ApiNav`, and
 * `/docs/sdk` at the latest version inside the documentation. Only `linkBase`
 * differs - there are no images here, so this needs nothing like the
 * `imageRoot` split that `TypeReference` carries.
 *
 * The heading says "Titanium API" rather than "SDK API reference" so it agrees
 * with the sidebar row that leads here.
 */

const KIND_ORDER = ['module', 'proxy', 'view', 'pseudo'] as const;
const KIND_LABELS: Record<string, string> = {
  module: 'Modules',
  proxy: 'Proxies',
  view: 'Views',
  pseudo: 'Dictionaries and namespaces',
};

export function VersionIndex({ version, linkBase }: { version: string; linkBase: string }) {
  const index = sdkIndex(version);
  if (!index) notFound();

  const base = linkBase;
  const newer = newerVersion(version);
  const release = releaseForVersion(version);
  const byKind = new Map<string, typeof index.types>();
  for (const t of index.types) {
    byKind.set(t.kind, [...(byKind.get(t.kind) ?? []), t]);
  }

  return (
    // One column, unlike a type page. That page reserves a second for its "On
    // this page" rail; this one has no headings to list, so the column stood
    // empty at every width and cost the content a third of the row. The
    // switcher moves into the heading instead, which is where it already sat
    // below `xl`, and the width buys the install row a single line.
    <div className="py-10">
      <div className="min-w-0">
        <header>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">Titanium API</h1>
            <VersionSwitcher current={version} options={versionOptions()} className="ml-auto" />
          </div>
          <p className="mt-2 text-text-muted">
            <span className="font-mono">{version}</span>
            {version === MAIN && ' - compiled from the development branch, not a release'}
            {/* The date the version this reference documents was published. It
                comes from the release rather than from the compile, which can
                be days later and would date the page rather than the SDK. */}
            {release && (
              <>
                {' · '}
                Released {formatDate(release.date)}
              </>
            )}
            {hasReleaseNote(version) && (
              <>
                {' · '}
                <a
                  href={`/docs/sdk/${version}/release-notes`}
                  className="text-link hover:underline"
                >
                  Release notes
                </a>
              </>
            )}
          </p>
          {/* The same row the download lists carry. Someone reading the
              reference for a version is one of the people most likely to want
              that version on their machine, and until now the only way there
              was to leave for /downloads and find it again by name. `main` has
              no row: it is compiled from the branch, not published as a release
              `ti sdk install` can resolve. */}
          {release && (
            <div className="mt-4">
              {/* The chips draw their marks with `use href="#os-mark-..."`, so
                  the sprite has to be on the page. The downloads layout carries
                  it for its own routes; this one is outside that tree, and
                  without this the chips rendered correct markup and no icon. */}
              <OsIconDefs />
              <InstallRow build={release} />
            </div>
          )}
          {newer && <OlderVersionNotice current={version} newer={newer} />}
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
                  {/* Client-side, and prefetched only on hover: this list is
                      the whole version, and a type page renders on demand. */}
                  <HoverPrefetchLink
                    href={`${base}/${t.name}`}
                    className="font-mono text-sm text-link hover:underline"
                  >
                    {t.name}
                  </HoverPrefetchLink>
                  {t.deprecated && <span className="ml-2 text-xs text-danger">deprecated</span>}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
