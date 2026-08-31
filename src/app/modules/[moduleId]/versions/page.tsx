import { Releases } from '@/components/modules/releases';
import { ModuleMasthead } from '@/components/modules/tabs';
import { buildModuleReference } from '@/lib/docs/module-view';
import { moduleIds, moduleIndex, referenceVersions } from '@/lib/docs/modules';
import { SITE_URL } from '@/lib/site';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

/** Every release of one module. */

export const dynamicParams = false;

export function generateStaticParams() {
  return moduleIds().map((moduleId) => ({ moduleId }));
}

export async function generateMetadata({
  params,
}: PageProps<'/modules/[moduleId]/versions'>): Promise<Metadata> {
  const { moduleId } = await params;
  const index = moduleIndex(moduleId);
  if (!index) return {};

  return {
    title: `${index.moduleId} releases — Titanium modules`,
    description: `Every published release of the ${index.moduleId} Titanium module.`,
    alternates: { canonical: `${SITE_URL}/modules/${index.moduleId}/versions` },
  };
}

export default async function ModuleVersionsPage({
  params,
}: PageProps<'/modules/[moduleId]/versions'>) {
  const { moduleId } = await params;

  const index = moduleIndex(moduleId);
  if (!index) notFound();

  // Only for the tab's type count — the reference itself is a route away.
  const reference = buildModuleReference(moduleId, referenceVersions(moduleId, index));

  return (
    <article className="max-w-4xl py-10">
      <ModuleMasthead index={index} active="versions" types={reference?.types.length}>
        <Releases index={index} className="mt-10" />
      </ModuleMasthead>
    </article>
  );
}
