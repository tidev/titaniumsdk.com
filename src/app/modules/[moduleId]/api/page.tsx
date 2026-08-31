import { LegacyAnchor } from '@/components/docs/legacy-anchor';
import { OnThisPage } from '@/components/docs/toc';
import { referenceToc, TypeSection } from '@/components/modules/reference';
import { ModuleMasthead } from '@/components/modules/tabs';
import { buildModuleReference, moduleLinker } from '@/lib/docs/module-view';
import { moduleIds, moduleIndex, referenceVersions } from '@/lib/docs/modules';
import { MAIN } from '@/lib/docs/registry';
import { SITE_URL } from '@/lib/site';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

/**
 * A module's whole compiled API.
 *
 * The reference is the union of the latest release per platform, because there
 * is no single latest — ti.map is android 5.7.0 and iOS 7.3.1 at the same time.
 *
 * No aliases in `generateStaticParams`, unlike the readme route: an alias only
 * ever appears as `/modules/<alias>`, which redirects before it can get here.
 */

export const dynamicParams = false;

export function generateStaticParams() {
  return moduleIds().map((moduleId) => ({ moduleId }));
}

export async function generateMetadata({
  params,
}: PageProps<'/modules/[moduleId]/api'>): Promise<Metadata> {
  const { moduleId } = await params;
  const index = moduleIndex(moduleId);
  if (!index) return {};

  return {
    title: `${index.moduleId} API — Titanium modules`,
    description: `The compiled API reference for the ${index.moduleId} Titanium module.`,
    alternates: { canonical: `${SITE_URL}/modules/${index.moduleId}/api` },
  };
}

export default async function ModuleApiPage({ params }: PageProps<'/modules/[moduleId]/api'>) {
  const { moduleId } = await params;

  const index = moduleIndex(moduleId);
  if (!index) notFound();

  const versions = referenceVersions(moduleId, index);
  const reference = buildModuleReference(moduleId, versions);
  const link = reference ? moduleLinker(reference) : () => null;
  const groups = reference ? referenceToc(reference) : [];

  return (
    // Explicit placement rather than source order: the rail has to come second
    // on screen, and first in the DOM would put it above the title on a phone.
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_14rem] xl:gap-8">
      <article className="min-w-0 max-w-4xl py-10 xl:col-start-1 xl:row-start-1">
        <LegacyAnchor />

        <ModuleMasthead index={index} active="api" types={reference?.types.length}>
          {reference ? (
            <section aria-labelledby="reference" className="mt-10">
              <h2 id="reference" className="sr-only">
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
            <p className="mt-10 text-text-muted">
              No compiled reference for this module yet. Its releases carry manifests and a README,
              which is what the registry has.
            </p>
          )}
        </ModuleMasthead>
      </article>

      <OnThisPage groups={groups} className="hidden py-10 xl:col-start-2 xl:row-start-1 xl:block" />
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
    <p className="text-sm text-text-subtle">
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
