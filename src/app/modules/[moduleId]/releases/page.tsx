import { Releases } from '@/components/modules/releases';
import { ModuleMasthead } from '@/components/modules/tabs';
import { moduleIds, moduleIndex } from '@/lib/docs/modules';
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
}: PageProps<'/modules/[moduleId]/releases'>): Promise<Metadata> {
  const { moduleId } = await params;
  const index = moduleIndex(moduleId);
  if (!index) return {};

  return {
    title: `${index.moduleId} releases — Titanium modules`,
    description: `Every published release of the ${index.moduleId} Titanium module.`,
    alternates: { canonical: `${SITE_URL}/modules/${index.moduleId}/releases` },
  };
}

export default async function ModuleReleasesPage({
  params,
}: PageProps<'/modules/[moduleId]/releases'>) {
  const { moduleId } = await params;

  const index = moduleIndex(moduleId);
  if (!index) notFound();

  return (
    <article className="max-w-4xl py-10">
      <ModuleMasthead index={index} active="releases">
        <Releases index={index} className="mt-8" />
      </ModuleMasthead>
    </article>
  );
}
