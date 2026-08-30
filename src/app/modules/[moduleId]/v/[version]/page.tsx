import { LegacyAnchor } from '@/components/docs/legacy-anchor';
import { OnThisPage, SectionJump, type TocLink } from '@/components/docs/toc';
import { PlatformChips } from '@/components/modules/badges';
import { ModuleHeader } from '@/components/modules/header';
import { Install } from '@/components/modules/install';
import { Manifests } from '@/components/modules/manifests';
import { referenceToc, TypeSection } from '@/components/modules/reference';
import { formatDate } from '@/lib/docs/format';
import type { InstallRelease } from '@/lib/docs/install';
import { latestPerPlatform } from '@/lib/docs/module-summary';
import { buildModuleReference, moduleLinker } from '@/lib/docs/module-view';
import {
  moduleHasDocs,
  moduleIds,
  moduleIndex,
  moduleRelease,
  moduleVersions,
} from '@/lib/docs/modules';
import { blobUrl, type CompiledSource } from '@/lib/docs/registry';
import { SITE_URL } from '@/lib/site';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

/**
 * One pinned release.
 *
 * The `/v/` segment is in the URL and not in the registry path, and that is
 * deliberate on both sides. On disk a version is just a directory under the
 * module, which keeps `registry/modules/<id>/<version>/` uniform with the SDK's
 * tree; in a URL a bare `/modules/ti.map/5.7.0` would be indistinguishable from
 * a module whose id happens to look like a version, so the address says which
 * it is — the same reason npm writes `/package/ti.map/v/5.7.0`.
 *
 * 292 of the 339 version directories carry no compiled reference. That is the
 * normal case, not a gap to apologise for: a release is a zip and a manifest,
 * and apidoc was only ever compiled for a few of them.
 */

export const dynamicParams = false;

export function generateStaticParams() {
  return moduleIds().flatMap((moduleId) =>
    moduleVersions(moduleId).map((version) => ({ moduleId, version }))
  );
}

export async function generateMetadata({
  params,
}: PageProps<'/modules/[moduleId]/v/[version]'>): Promise<Metadata> {
  const { moduleId, version } = await params;
  const index = moduleIndex(moduleId);
  const release = moduleRelease(moduleId, version);
  if (!index || !release) return {};

  return {
    title: `${index.moduleId} ${version} — Titanium modules`,
    description: index.description,
    alternates: { canonical: `${SITE_URL}/modules/${moduleId}/v/${version}` },
  };
}

export default async function ModuleVersionPage({
  params,
}: PageProps<'/modules/[moduleId]/v/[version]'>) {
  const { moduleId, version } = await params;

  const index = moduleIndex(moduleId);
  const release = moduleRelease(moduleId, version);
  if (!index || !release) notFound();

  const reference = moduleHasDocs(moduleId, version)
    ? buildModuleReference(moduleId, [version])
    : null;
  const link = reference ? moduleLinker(reference) : () => null;

  // A mutable directory is a snapshot of a branch, not something you can pin:
  // there is no archive and no version string to name in tiapp.xml.
  const installReleases: InstallRelease[] = release.mutable
    ? []
    : release.platforms.map((platform) => ({
        platform,
        version,
        asset: release.assets.find((a) => a.platform === platform),
      }));

  const groups = reference ? referenceToc(reference) : [];
  const links: TocLink[] = [
    ...(installReleases.length ? [{ id: 'install', title: 'Install' }] : []),
    ...(release.manifests.length ? [{ id: 'manifests', title: 'Manifest' }] : []),
    ...(reference ? [{ id: 'reference', title: 'API reference', count: groups.length }] : []),
  ];

  const source = release.source as CompiledSource | undefined;
  const published = formatDate(release.publishedAt);
  const current = latestPerPlatform(index).some((l) => l.version === version);

  return (
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_14rem] xl:gap-8">
      <article className="min-w-0 max-w-4xl py-10 xl:col-start-1 xl:row-start-1">
        <LegacyAnchor />

        <ModuleHeader
          index={index}
          crumbs={[
            { label: 'Modules', href: '/modules' },
            { label: index.moduleId, href: `/modules/${moduleId}`, mono: true },
            { label: version, mono: true },
          ]}
        >
          {release.mutable && (
            <span className="rounded border border-warning px-1.5 py-0.5 text-xs text-warning">
              development branch
            </span>
          )}
        </ModuleHeader>

        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-border py-4 text-sm">
          <span className="font-mono text-base font-semibold">{version}</span>
          <PlatformChips platforms={release.platforms} />
          {published && <span className="text-text-subtle">{published}</span>}
          {release.tag && (
            <span className="font-mono text-xs text-text-subtle" title="Git tag">
              {release.tag}
            </span>
          )}
          {!current && !release.mutable && (
            <a href={`/modules/${moduleId}`} className="ml-auto text-link hover:underline">
              Not the current release &rarr;
            </a>
          )}
        </div>

        <SectionJump links={links} className="mt-4 xl:hidden" />

        {release.mutable ? (
          <p className="mt-8 text-text-muted">
            Compiled from the module&rsquo;s default branch, so it can describe APIs that no release
            ships yet. Nothing is published for it — install a release from{' '}
            <a href={`/modules/${moduleId}`} className="text-link hover:underline">
              the module page
            </a>
            .
          </p>
        ) : (
          <Install moduleId={moduleId} releases={installReleases} className="mt-12 scroll-mt-24" />
        )}

        <Manifests manifests={release.manifests} className="mt-16" />

        <section aria-labelledby="reference" className="mt-16">
          <h2 id="reference" className="scroll-mt-24 text-2xl font-semibold tracking-tight">
            API reference
          </h2>

          {reference ? (
            <>
              <p className="mt-2 text-sm text-text-subtle">
                Compiled from{' '}
                <code className="font-mono">
                  {source?.repo ?? moduleId}
                  {source?.ref ? `@${source.ref}` : ''}
                </code>
                {source?.commit && (
                  <>
                    {' '}
                    (
                    <a
                      href={`https://github.com/${source.repo}/tree/${source.commit}`}
                      rel="noopener noreferrer"
                      className="text-link hover:underline"
                    >
                      {source.commit.slice(0, 7)}
                    </a>
                    )
                  </>
                )}
                .
              </p>
              {reference.types.map((view) => (
                <TypeSection
                  key={view.type.name}
                  view={view}
                  link={link}
                  imageBase={`/docs/modules/${moduleId}/${version}/images`}
                />
              ))}
            </>
          ) : (
            <NoReference moduleId={moduleId} />
          )}
        </section>

        {reference && <SourceFooter source={source} types={reference.types.map((v) => v.type)} />}
      </article>

      <OnThisPage
        links={links}
        groups={groups}
        className="hidden py-10 xl:col-start-2 xl:row-start-1 xl:block"
      />
    </div>
  );
}

/**
 * What a release with no compiled apidoc says.
 *
 * A full section rather than an empty one: this is 292 of 339 pages, and a
 * heading over nothing reads as a rendering failure. The manifest above it is
 * the real content of these pages.
 */
function NoReference({ moduleId }: { moduleId: string }) {
  return (
    <p className="mt-2 text-text-muted">
      This release was published without compiled API documentation — most were. The{' '}
      <a href={`/modules/${moduleId}`} className="text-link hover:underline">
        module&rsquo;s current reference
      </a>{' '}
      covers the same API, though it describes a later version.
    </p>
  );
}

/** Where each type on the page came from, for anyone checking the rendering against the source. */
function SourceFooter({
  source,
  types,
}: {
  source: CompiledSource | undefined;
  types: { name: string; source: string }[];
}) {
  const files = [...new Set(types.map((t) => t.source))].sort();
  if (!files.length) return null;

  return (
    <footer className="mt-16 border-t border-border pt-4 text-xs text-text-subtle">
      <p>
        Compiled from {files.length} apidoc file{files.length === 1 ? '' : 's'}:
      </p>
      <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
        {files.map((file) => {
          const href = blobUrl(source, file);
          return (
            <li key={file} className="font-mono break-all">
              {href ? (
                <a href={href} rel="noopener noreferrer" className="text-link hover:underline">
                  {file}
                </a>
              ) : (
                file
              )}
            </li>
          );
        })}
      </ul>
    </footer>
  );
}
