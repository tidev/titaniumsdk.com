import { LegacyAnchor } from '@/components/docs/legacy-anchor';
import { OnThisPage } from '@/components/docs/toc';
import { PlatformChips } from '@/components/modules/badges';
import { referenceToc, TypeSection } from '@/components/modules/reference';
import { ModuleLayout } from '@/components/modules/shell';
import { platformsAtVersion } from '@/lib/docs/module-summary';
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
    <ModuleLayout index={index} active="api" rail={<OnThisPage groups={groups} className="mt-6" />}>
      <LegacyAnchor />

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
    </ModuleLayout>
  );
}

/**
 * Which releases the reference was assembled from.
 *
 * A labelled list rather than a sentence. "Compiled from 5.7.0 and 7.3.1, the
 * newest release on each platform" made the reader match numbers to platforms
 * from word order, and for ti.map the obvious guess is wrong twice over: the
 * iOS release is the higher version *and* the older build. Set out as rows it
 * needs no explaining, and it is the shape the version pages already use —
 * version, then the platforms it shipped for.
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
    <div>
      <p className="text-sm font-medium">Compiled from</p>
      <ul className="mt-2 space-y-1.5">
        {versions.map((source) => (
          <li key={source.version} className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <a
              href={`/modules/${moduleId}/v/${source.version}`}
              className="font-mono text-sm text-link hover:underline"
            >
              {source.version}
            </a>
            <PlatformChips platforms={platformsAtVersion(index, source.version)} />
          </li>
        ))}
      </ul>
    </div>
  );
}
