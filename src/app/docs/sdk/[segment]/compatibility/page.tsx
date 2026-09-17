import { VersionSwitcher, OlderVersionNotice } from '@/components/docs/version-switcher';
import { Terminal } from '@/components/ui/terminal';
import {
  requirementSections,
  targetSection,
  readToolchains,
  type CompatRow,
  type CompatSection,
} from '@/lib/docs/compat';
import { renderInline } from '@/lib/docs/markdown';
import { MAIN, sdkToolchain } from '@/lib/docs/registry';
import { canonicalPath, isIndexedVersion, newerVersion, versionOptions } from '@/lib/docs/versions';
import { readCliReleases } from '@/lib/downloads/cli';
import { formatDate } from '@/lib/downloads/format';
import { releaseForVersion } from '@/lib/downloads/registry';
import { NOINDEX } from '@/lib/seo';
import { SITE_URL } from '@/lib/site';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

/**
 * What one SDK release needs from your machine, and what it builds for (TI-94).
 *
 * A static segment beside `[type]`, exactly like `release-notes`, so
 * `/docs/sdk/13.4.1/compatibility` resolves here rather than being read as a
 * type of that name. `ia.test.ts` holds both segments reserved.
 *
 * ## Why this exists beside `/docs/reference/compatibility`
 *
 * That page is the cross-release view: every release in one table, which is
 * what answers "when did Java 17 become the floor". This is the single-release
 * view, and the reader it is for has already answered that question by being on
 * `/docs/sdk/13.4.1` - they picked a release and want its column.
 *
 * Neither is a copy of the other and both read the same capture. Nothing here
 * restates a range: `src/lib/docs/compat.ts` turns one `toolchain.json` into
 * rows, and `minimumCli` decides the CLI floor for this page and that one
 * alike.
 *
 * ## Prerendered, and every version
 *
 * All 20 compiled versions carry a `toolchain.json`, `main` included, so
 * `generateStaticParams` covers the set and `dynamicParams` is off. They are 20
 * pages of a few rows each, against the 5,680 type pages that are deliberately
 * not prerendered.
 *
 * Older versions are served but not indexed, on the same reasoning as the
 * reference itself (`isIndexedVersion`): twenty near-identical tables asking a
 * search engine to rank between them is twenty ways to land on the wrong one.
 */

export const dynamicParams = false;

export function generateStaticParams() {
  return readToolchains().map((toolchain) => ({ segment: toolchain.version }));
}

export async function generateMetadata({
  params,
}: PageProps<'/docs/sdk/[segment]/compatibility'>): Promise<Metadata> {
  const { segment: version } = await params;
  if (!sdkToolchain(version)) return {};

  return {
    title: `Compatibility ${version} - Titanium SDK`,
    description:
      `The Node.js, Titanium CLI, Java, Android and Xcode versions Titanium SDK ${version} ` +
      `supports, and the minimum Android and iOS versions it builds for.`,
    // Self-canonical rather than collapsed onto the latest the way
    // `canonicalPath` does for the reference: there is no unversioned copy of
    // this page, so there is nothing to collapse onto.
    alternates: { canonical: `${SITE_URL}/docs/sdk/${version}/compatibility` },
    ...(isIndexedVersion(version) ? {} : { robots: NOINDEX }),
  };
}

/**
 * One component and the range this release accepts for it.
 *
 * A description list rather than a table. The value is a range and the note
 * beside it is a sentence, and a two-column table gives the sentence a cell as
 * wide as the widest range - which on a phone is a column of one word per line.
 * `dt`/`dd` is also what this data is: a term and what is said about it.
 */
function Row({ row }: { row: CompatRow }) {
  return (
    <div className="grid gap-x-6 gap-y-1 border-t border-border py-3 sm:grid-cols-[14rem_minmax(0,1fr)]">
      <dt className="text-sm text-text-muted">{row.label}</dt>
      <dd className="min-w-0">
        {/* The range exactly as the SDK declares it, which is the string
            `ti info` prints beside "Supported:". Restating `>=23.x <=36.x` as
            "23 to 36" would be this page paraphrasing a constraint it does not
            own, and the paraphrase is what a reader would then compare against
            their machine. */}
        <code className="font-mono text-sm text-text">{row.value}</code>
        {row.note && (
          <p
            className="prose-docs mt-1 text-sm text-text-subtle"
            // Sanitized in renderMarkdown; see the allowlist there.
            dangerouslySetInnerHTML={{ __html: renderInline(row.note, {}) }}
          />
        )}
      </dd>
    </div>
  );
}

function Section({ section }: { section: CompatSection }) {
  const id = section.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return (
    <section aria-labelledby={id} className="mt-10">
      <h2 id={id} className="text-xl font-semibold tracking-tight">
        {section.title}
      </h2>
      {section.blurb && <p className="mt-1 text-sm text-text-muted">{section.blurb}</p>}
      <dl className="mt-4 border-b border-border">
        {section.rows.map((row) => (
          <Row key={row.label} row={row} />
        ))}
      </dl>
    </section>
  );
}

export default async function Compatibility({
  params,
}: PageProps<'/docs/sdk/[segment]/compatibility'>) {
  const { segment: version } = await params;
  const toolchain = sdkToolchain(version);
  if (!toolchain) notFound();

  // Captured to `registry/cli/releases.json` by `pnpm registry:cli`. Absent, the
  // CLI row states nothing rather than the page failing: every other row comes
  // from the SDK itself and is still worth serving.
  const cliReleases = readCliReleases()?.releases ?? [];
  const sections = requirementSections(toolchain, cliReleases);
  const targets = targetSection(toolchain);

  const release = releaseForVersion(version);
  const newer = newerVersion(version);

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-sm text-text-subtle">
          <Link href={canonicalPath(version)} className="text-link hover:underline">
            SDK {version}
          </Link>{' '}
          · Compatibility
        </p>
        {/* Every compiled version has a capture, so every option lands on the
            same page at that version rather than on an index. `present` is
            true throughout for that reason. */}
        <VersionSwitcher
          current={version}
          options={versionOptions().map((option) => ({
            ...option,
            href: `/docs/sdk/${option.version}/compatibility`,
            present: true,
          }))}
          className="ml-auto"
        />
      </div>

      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Compatibility</h1>
      <p className="mt-1 text-sm text-text-subtle">
        <span className="font-mono">{version}</span>
        {version === MAIN && ' - the development branch, not a release'}
        {release && (
          <>
            {' · '}
            Released <time dateTime={release.date}>{formatDate(release.date)}</time>
          </>
        )}
      </p>

      {/* Repointed at this page in the newer release. `newerVersion` answers
          for the reference, so its href is the newer version's *index* - and
          the notice says "See this page in 13.4.1", which would then be a link
          to a different page. Every compiled version has a capture, so the
          destination always exists. */}
      {newer && (
        <OlderVersionNotice
          current={version}
          newer={{ version: newer.version, href: `/docs/sdk/${newer.version}/compatibility` }}
        />
      )}

      <p className="mt-6 text-text-muted">
        Every range below is read out of the release itself, so this page can only be wrong if the
        SDK is wrong about itself. Each is printed as the SDK declares it, which is the string{' '}
        <code className="font-mono text-sm text-text">ti info</code> puts beside
        &quot;Supported:&quot;.
      </p>

      {/* Ahead of the tables rather than after them. `ti info` reads the same
          declarations this page does and reports them against the machine the
          reader is actually sitting at, so it answers their question better
          than the tables do - and the tables are still here for the reader
          deciding what to install before they have an SDK at all. */}
      <div className="mt-6">
        <Terminal commands={['ti info']} />
      </div>

      {sections.map((section) => (
        <Section key={section.title} section={section} />
      ))}

      <Section section={targets} />

      <footer className="mt-10 border-t border-border pt-6 text-sm text-text-subtle">
        <p>
          Read out of <code className="font-mono">{toolchain.source.repo}</code> at commit{' '}
          <code className="font-mono">{toolchain.source.commit.slice(0, 7)}</code>, the same commit
          this release&apos;s{' '}
          <Link href={canonicalPath(version)} className="text-link hover:underline">
            API reference
          </Link>{' '}
          was compiled from.
        </p>
        <p className="mt-2">
          <Link href="/docs/reference/compatibility" className="text-link hover:underline">
            Every release side by side
          </Link>{' '}
          ·{' '}
          <Link href="/docs/setup" className="text-link hover:underline">
            Environment setup
          </Link>
        </p>
      </footer>
    </div>
  );
}
