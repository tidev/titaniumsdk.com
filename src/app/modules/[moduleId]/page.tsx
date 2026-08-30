import { LegacyAnchor } from '@/components/docs/legacy-anchor';
import { Prose } from '@/components/docs/prose';
import { OnThisPage, SectionJump, type TocLink } from '@/components/docs/toc';
import { LatestPerPlatform } from '@/components/modules/badges';
import { ModuleHeader } from '@/components/modules/header';
import { Install } from '@/components/modules/install';
import { referenceToc, TypeSection } from '@/components/modules/reference';
import { Releases } from '@/components/modules/releases';
import type { InstallRelease } from '@/lib/docs/install';
import { latestPerPlatform } from '@/lib/docs/module-summary';
import { buildModuleReference, moduleLinker } from '@/lib/docs/module-view';
import {
  moduleAliases,
  moduleIds,
  moduleIndex,
  moduleReadme,
  moduleRelease,
  referenceVersions,
} from '@/lib/docs/modules';
import { MAIN } from '@/lib/docs/registry';
import { SITE_URL } from '@/lib/site';
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';

/**
 * One page per module: what it is, how to install it, and its whole API.
 *
 * The reference is the union of the latest release per platform, because there
 * is no single latest — ti.map is android 5.7.0 and iOS 7.3.1 at the same time.
 *
 * Everything is read from `registry/modules/` on disk — no network at build
 * time, which is what keeps rebuilds fast and preview deploys reproducible.
 */

export const dynamicParams = false;

export function generateStaticParams() {
  return [
    ...moduleIds().map((moduleId) => ({ moduleId })),
    // The repository names that differ from the published id, so
    // /modules/titanium-identity answers instead of 404ing. They redirect.
    ...moduleAliases().map(({ alias }) => ({ moduleId: alias })),
  ];
}

export async function generateMetadata({
  params,
}: PageProps<'/modules/[moduleId]'>): Promise<Metadata> {
  const { moduleId } = await params;
  const index = moduleIndex(moduleId);
  if (!index) return {};

  return {
    title: `${index.moduleId} — Titanium modules`,
    description: index.description,
    alternates: { canonical: `${SITE_URL}/modules/${index.moduleId}` },
  };
}

export default async function ModulePage({ params }: PageProps<'/modules/[moduleId]'>) {
  const { moduleId } = await params;

  const alias = moduleAliases().find((a) => a.alias === moduleId);
  if (alias) permanentRedirect(`/modules/${alias.moduleId}`);

  const index = moduleIndex(moduleId);
  if (!index) notFound();

  const readme = moduleReadme(moduleId);
  const latest = latestPerPlatform(index);
  const versions = referenceVersions(moduleId, index);
  const reference = buildModuleReference(moduleId, versions);
  const link = reference ? moduleLinker(reference) : () => null;

  // The archives to unpack are the latest release on each platform, which is
  // not one release: each platform's newest is downloaded separately unless the
  // publisher shipped one universal zip.
  const installReleases: InstallRelease[] = latest.map(({ platform, version }) => ({
    platform,
    version,
    asset: moduleRelease(moduleId, version)?.assets.find((a) => a.platform === platform),
  }));

  const groups = reference ? referenceToc(reference) : [];
  const links: TocLink[] = [
    ...(installReleases.length ? [{ id: 'install', title: 'Install' }] : []),
    ...(readme ? [{ id: 'readme', title: 'Readme' }] : []),
    ...(reference ? [{ id: 'reference', title: 'API reference', count: groups.length }] : []),
    { id: 'releases', title: 'Releases', count: index.versions.length },
  ];

  // The README is third-party markdown written against a repository checkout,
  // so its relative links and images point at files this domain does not serve.
  // `HEAD` rather than a branch name: the registry records which commit the docs
  // were compiled from, but not which one the README was read at, and GitHub
  // resolves HEAD to the default branch whatever it is called.
  const slug = index.repo?.replace(/^https:\/\/github\.com\//, '').replace(/\.git$/, '');
  const readmeRelative = slug
    ? {
        images: `https://raw.githubusercontent.com/${slug}/HEAD`,
        links: `https://github.com/${slug}/blob/HEAD`,
      }
    : undefined;

  return (
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_14rem] xl:gap-8">
      <article className="min-w-0 max-w-4xl py-10 xl:col-start-1 xl:row-start-1">
        {/* The 174 legacy /api/modules/** URLs all land here, and the old site
            slugged its anchors to lowercase. See the component. */}
        <LegacyAnchor />

        <ModuleHeader
          index={index}
          crumbs={[
            { label: 'Modules', href: '/modules' },
            { label: index.moduleId, mono: true },
          ]}
        />

        <div className="mt-6 border-y border-border py-4">
          <p className="text-sm font-medium">Latest release</p>
          <LatestPerPlatform
            latest={latest}
            href={(version) => `/modules/${moduleId}/v/${version}`}
            className="mt-1"
          />
        </div>

        <SectionJump links={links} className="mt-4 xl:hidden" />

        <Install moduleId={moduleId} releases={installReleases} className="mt-12 scroll-mt-24" />

        {readme && (
          <section aria-labelledby="readme" className="mt-16">
            <h2 id="readme" className="scroll-mt-24 text-2xl font-semibold tracking-tight">
              Readme
            </h2>
            <p className="mt-1 text-xs text-text-subtle">
              From the module&rsquo;s repository, rendered as written.
            </p>
            <Prose markdown={readme} link={link} relative={readmeRelative} className="mt-4" />
          </section>
        )}

        {reference ? (
          <section aria-labelledby="reference" className="mt-16">
            <h2 id="reference" className="scroll-mt-24 text-2xl font-semibold tracking-tight">
              API reference
            </h2>
            <ReferenceSources moduleId={moduleId} versions={reference.sources} />

            {reference.types.map((view) => (
              <TypeSection
                key={view.type.name}
                view={view}
                link={link}
                imageBase={`/docs/modules/${moduleId}/${reference.sources[0].version}/images`}
              />
            ))}
          </section>
        ) : (
          <section aria-labelledby="reference" className="mt-16">
            <h2 id="reference" className="scroll-mt-24 text-2xl font-semibold tracking-tight">
              API reference
            </h2>
            <p className="mt-2 text-text-muted">
              No compiled reference for this module yet. Its releases carry manifests and a README,
              which is what the registry has.
            </p>
          </section>
        )}

        <Releases index={index} className="mt-16" />
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
 * Which releases the reference above was assembled from.
 *
 * Worth saying out loud: the two versions listed are usually months apart and
 * describe different platforms, and a reader who assumes one number covers both
 * will pick the wrong one.
 */
function ReferenceSources({
  moduleId,
  versions,
}: {
  moduleId: string;
  versions: { version: string }[];
}) {
  const development = versions.some((v) => v.version === MAIN);

  return (
    <p className="mt-2 text-sm text-text-subtle">
      {development ? 'Compiled from the development branch — ' : 'Compiled from '}
      {versions.map((source, i) => (
        <span key={source.version}>
          {i > 0 && ' and '}
          <a
            href={`/modules/${moduleId}/v/${source.version}`}
            className="font-mono text-link hover:underline"
          >
            {source.version}
          </a>
        </span>
      ))}
      {development
        ? '. No released version of this module has a compiled reference yet.'
        : ', the newest release on each platform.'}
    </p>
  );
}
