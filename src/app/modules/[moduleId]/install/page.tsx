import { Install } from '@/components/modules/install';
import { ModuleMasthead } from '@/components/modules/tabs';
import type { InstallRelease } from '@/lib/docs/install';
import { latestPerPlatform } from '@/lib/docs/module-summary';
import { moduleIds, moduleIndex, moduleRelease } from '@/lib/docs/modules';
import { SITE_URL } from '@/lib/site';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

/**
 * How to get one module into a project.
 *
 * Its own route rather than the top of the readme: the readme is the author's
 * own document and usually opens by explaining what the module is for, so
 * putting our install steps above it interrupted their first sentence.
 */

export const dynamicParams = false;

export function generateStaticParams() {
  return moduleIds().map((moduleId) => ({ moduleId }));
}

export async function generateMetadata({
  params,
}: PageProps<'/modules/[moduleId]/install'>): Promise<Metadata> {
  const { moduleId } = await params;
  const index = moduleIndex(moduleId);
  if (!index) return {};

  return {
    title: `Install ${index.moduleId} — Titanium modules`,
    description: `How to install the ${index.moduleId} Titanium module into a project.`,
    alternates: { canonical: `${SITE_URL}/modules/${index.moduleId}/install` },
  };
}

export default async function ModuleInstallPage({
  params,
}: PageProps<'/modules/[moduleId]/install'>) {
  const { moduleId } = await params;

  const index = moduleIndex(moduleId);
  if (!index) notFound();

  // The archives to unpack are the latest release on each platform, which is
  // not one release: each platform's newest is downloaded separately unless the
  // publisher shipped one universal zip.
  const releases: InstallRelease[] = latestPerPlatform(index).map(({ platform, version }) => ({
    platform,
    version,
    asset: moduleRelease(moduleId, version)?.assets.find((a) => a.platform === platform),
  }));

  return (
    <article className="max-w-4xl py-10">
      <ModuleMasthead index={index} active="install">
        {releases.length ? (
          <Install moduleId={moduleId} releases={releases} className="mt-10" />
        ) : (
          <p className="mt-10 text-text-muted">
            The registry has no published archive for this module, so there is nothing to unpack.
            Its repository is the place to look.
          </p>
        )}
      </ModuleMasthead>
    </article>
  );
}
