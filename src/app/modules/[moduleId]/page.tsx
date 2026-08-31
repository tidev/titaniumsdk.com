import { LegacyAnchor } from '@/components/docs/legacy-anchor';
import { Prose } from '@/components/docs/prose';
import { Install } from '@/components/modules/install';
import { ModuleMasthead } from '@/components/modules/tabs';
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
import { readmeRelativeBase } from '@/lib/docs/modules';
import { SITE_URL } from '@/lib/site';
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';

/**
 * A module's front page: how to install it, and what its authors wrote about it.
 *
 * The reference and the release list are their own routes — see
 * `components/modules/tabs.tsx` for why.
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

  // The archives to unpack are the latest release on each platform, which is
  // not one release: each platform's newest is downloaded separately unless the
  // publisher shipped one universal zip.
  const installReleases: InstallRelease[] = latest.map(({ platform, version }) => ({
    platform,
    version,
    asset: moduleRelease(moduleId, version)?.assets.find((a) => a.platform === platform),
  }));

  // Only so the readme's `api:` references resolve to the reference tab; the
  // types themselves are rendered there, not here.
  const reference = buildModuleReference(moduleId, referenceVersions(moduleId, index));
  const link = reference ? moduleLinker(reference) : () => null;

  return (
    <article className="max-w-4xl py-10">
      {/* The 174 legacy /api/modules/** URLs all land here, and the old site
          slugged its anchors to lowercase. See the component. */}
      <LegacyAnchor />

      <ModuleMasthead index={index} active="readme" types={reference?.types.length}>
        <Install moduleId={moduleId} releases={installReleases} className="mt-10 scroll-mt-24" />

        {readme ? (
          <section aria-labelledby="readme" className="mt-16">
            <h2 id="readme" className="scroll-mt-24 text-2xl font-semibold tracking-tight">
              Readme
            </h2>
            <p className="mt-1 text-xs text-text-subtle">
              From the module&rsquo;s repository, rendered as written.
            </p>
            <Prose
              markdown={readme}
              link={link}
              relative={readmeRelativeBase(index)}
              className="mt-4"
            />
          </section>
        ) : (
          <section aria-labelledby="readme" className="mt-16">
            <h2 id="readme" className="scroll-mt-24 text-2xl font-semibold tracking-tight">
              Readme
            </h2>
            <p className="mt-2 text-text-muted">
              This module&rsquo;s repository has no README the registry could read.
            </p>
          </section>
        )}
      </ModuleMasthead>
    </article>
  );
}
