import { LegacyAnchor } from '@/components/docs/legacy-anchor';
import { OnThisPage } from '@/components/docs/toc';
import { referenceToc, TypeSection } from '@/components/modules/reference';
import { ModuleMasthead } from '@/components/modules/tabs';
import { PLATFORM_LABELS, platformsAtVersion } from '@/lib/docs/module-summary';
import { buildModuleReference, moduleLinker } from '@/lib/docs/module-view';
import { moduleIds, moduleIndex, referenceVersions } from '@/lib/docs/modules';
import { MAIN } from '@/lib/docs/registry';
import type { ModuleIndex } from '@/lib/registry';
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

        <ModuleMasthead index={index} active="api">
          {reference ? (
            <section aria-labelledby="reference" className="mt-10">
              <h2 id="reference" className="sr-only">
                API reference
              </h2>
              <ReferenceSources index={index} moduleId={moduleId} versions={reference.sources} />

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
 * Every version is named with its platform. A bare "compiled from 5.7.0 and
 * 7.3.1" left the reader to work out which number belonged to which — and for
 * ti.map the iOS release is both the higher version and the older one, so the
 * obvious guess is wrong. This is the same `Android 5.7.0` idiom the latest
 * release block above uses, for the same reason.
 */
function ReferenceSources({
  index,
  moduleId,
  versions,
}: {
  index: ModuleIndex;
  moduleId: string;
  versions: { version: string }[];
}) {
  if (versions.some((v) => v.version === MAIN)) {
    return (
      <p className="text-sm text-text-subtle">
        Compiled from the development branch. No released version of this module has a compiled
        reference yet.
      </p>
    );
  }

  return (
    <p className="text-sm text-text-subtle">
      Compiled from{' '}
      {versions.map((source, i) => {
        const platforms = platformsAtVersion(index, source.version);
        return (
          <span key={source.version}>
            {i > 0 && ' and '}
            {!!platforms.length && <>{platforms.map((p) => PLATFORM_LABELS[p]).join(' and ')} </>}
            <a
              href={`/modules/${moduleId}/v/${source.version}`}
              className="font-mono text-link hover:underline"
            >
              {source.version}
            </a>
          </span>
        );
      })}
      {versions.length > 1 ? ' — the newest release on each platform.' : ' — the newest release.'}
    </p>
  );
}
