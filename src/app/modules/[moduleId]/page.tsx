import { LegacyAnchor } from '@/components/docs/legacy-anchor';
import { Prose } from '@/components/docs/prose';
import { ModuleMasthead } from '@/components/modules/tabs';
import { buildModuleReference, moduleLinker } from '@/lib/docs/module-view';
import {
  moduleAliases,
  moduleIds,
  moduleIndex,
  moduleReadme,
  readmeRelativeBase,
  referenceVersions,
} from '@/lib/docs/modules';
import { SITE_URL } from '@/lib/site';
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';

/**
 * What a module's authors wrote about it, rendered as written.
 *
 * The install steps, the reference and the release list are each their own
 * route — see `components/modules/tabs.tsx` for why.
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

  // Only so the readme's `api:` references resolve to the reference tab; the
  // types themselves are rendered there, not here.
  const reference = buildModuleReference(moduleId, referenceVersions(moduleId, index));
  const link = reference ? moduleLinker(reference) : () => null;

  return (
    <article className="max-w-4xl py-10">
      {/* The 174 legacy /api/modules/** URLs all land here, and the old site
          slugged its anchors to lowercase. See the component. */}
      <LegacyAnchor />

      <ModuleMasthead index={index} active="readme">
        {readme ? (
          <section aria-labelledby="readme" className="mt-10">
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
          <section aria-labelledby="readme" className="mt-10">
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
