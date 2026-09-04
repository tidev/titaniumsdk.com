import { Prose } from '@/components/docs/prose';
import { VersionSwitcher } from '@/components/docs/version-switcher';
import { formatDate } from '@/lib/docs/format';
import { releaseNote, versionsWithNotes } from '@/lib/docs/release-notes';
import { SITE_URL } from '@/lib/site';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

/**
 * One release's notes (TI-72).
 *
 * A static segment beside `[type]`, so `/docs/sdk/13.4.1/release-notes` resolves
 * here rather than being read as a type named `release-notes`.
 *
 * ## Only the recent ones are prerendered
 *
 * All 56 were, until the deployment was measured: they came to 18.7MB of the
 * 105.8MB build, against TI-25's 100MB cap, and 8.0.0 alone is a 1.5MB page —
 * a major release's changelog is enormous. The reasoning for prerendering them
 * was sound and the cost was never checked.
 *
 * The newest few stay prerendered because they are the ones anything links to:
 * the landing page's latest-release line, the version index, the top of
 * /downloads. The rest are an archive reached by someone who went looking, and
 * a cold render is around a tenth of a second before it is cached for good.
 */

/** Enough to cover what the site links to, and little enough to stay cheap. */
const PRERENDERED = 5;

export const dynamicParams = true;
export const revalidate = false;

export function generateStaticParams() {
  return versionsWithNotes()
    .slice(0, PRERENDERED)
    .map((version) => ({ version }));
}

export async function generateMetadata({
  params,
}: PageProps<'/docs/sdk/[version]/release-notes'>): Promise<Metadata> {
  const { version } = await params;
  const note = releaseNote(version);
  if (!note) return {};
  return {
    title: `${note.title} — Titanium SDK`,
    description: `Release notes for Titanium SDK ${version}.`,
    alternates: { canonical: `${SITE_URL}/docs/sdk/${version}/release-notes` },
  };
}

export default async function ReleaseNotes({
  params,
}: PageProps<'/docs/sdk/[version]/release-notes'>) {
  const { version } = await params;
  const note = releaseNote(version);
  if (!note) notFound();

  const all = versionsWithNotes();
  const at = all.indexOf(version);
  const newer = at > 0 ? all[at - 1] : null;
  const older = at >= 0 && at < all.length - 1 ? all[at + 1] : null;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <p className="text-sm text-text-subtle">
          <Link href={`/docs/sdk/${version}`} className="text-link hover:underline">
            SDK {version}
          </Link>{' '}
          · Release notes
        </p>
        {/* Every option lands on that version's *reference*, not its notes:
            15 of the 71 GA releases have no note, so a switcher across notes
            would offer dead ends. */}
        <VersionSwitcher
          current={version}
          options={versionsWithNotes().map((v) => ({
            version: v,
            href: `/docs/sdk/${v}/release-notes`,
            present: true,
            latest: v === all[0],
            unreleased: false,
          }))}
          className="ml-auto"
        />
      </div>

      <h1 className="mt-3 text-3xl font-semibold tracking-tight">{note.title}</h1>
      {note.date && (
        <p className="mt-1 text-sm text-text-subtle">
          Released <time dateTime={note.date}>{formatDate(note.date)}</time>
        </p>
      )}

      {/* The notes are generated markdown carrying hand-written tables of
          per-module versions, and `renderMarkdown` sanitizes on the way out. */}
      <Prose markdown={note.body} className="prose-docs mt-6" />

      <nav
        aria-label="Other releases"
        className="mt-10 flex flex-wrap justify-between gap-4 border-t border-border pt-6 text-sm"
      >
        {older ? (
          <Link href={`/docs/sdk/${older}/release-notes`} className="text-link hover:underline">
            ← {older}
          </Link>
        ) : (
          <span />
        )}
        {newer && (
          <Link href={`/docs/sdk/${newer}/release-notes`} className="text-link hover:underline">
            {newer} →
          </Link>
        )}
      </nav>
    </div>
  );
}
