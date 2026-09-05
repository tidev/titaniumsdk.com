import { Breadcrumbs, type Crumb } from '@/components/docs/breadcrumbs';
import { GuideNav } from '@/components/docs/guide-nav';
import { GuideToc } from '@/components/docs/guide-toc';
import { formatDate } from '@/lib/docs/format';
import { guide, writtenPaths, type Guide } from '@/lib/docs/guides';
import {
  allPaths,
  findPage,
  platformLabel,
  SECTIONS,
  type DocPage,
  type DocSection,
} from '@/lib/docs/ia';
import { lastUpdated } from '@/lib/docs/last-updated';
import { SITE_URL } from '@/lib/site';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

/**
 * Every guide page, and the section and docs indexes (TI-32).
 *
 * An optional catch-all, so one file serves `/docs`, `/docs/setup` and
 * `/docs/build/ui/layout`. `/docs/sdk/...` is a static segment and wins over
 * this one, which is what keeps the API reference where it is.
 *
 * Prerendered: the whole tree is about forty pages read from local markdown,
 * against 45,610 API type pages that are rendered on demand. There is no reason
 * for a guide to pay a cold render.
 *
 * ## A defined path with no content is not a 404
 *
 * The structure was agreed up front and M3 fills it in over many tickets, so
 * for a while most of these paths have no file. They still resolve, and say
 * plainly that the page is not written yet with links to what is. A 404 would
 * tell a reader the page does not exist, which is a different and untrue claim
 * — and would make every link written ahead of its target a build failure.
 *
 * A path the IA does *not* define is a genuine 404.
 */

export const dynamicParams = false;

export function generateStaticParams() {
  // `/docs` itself is the empty case: an optional catch-all takes no `slug`.
  return allPaths().map((path) => {
    const segments = path.split('/').slice(2);
    return segments.length ? { slug: segments } : { slug: undefined };
  });
}

const segmentsOf = (slug: string[] | undefined) => slug ?? [];

export async function generateMetadata({
  params,
}: PageProps<'/docs/[[...slug]]'>): Promise<Metadata> {
  const segments = segmentsOf((await params).slug);
  const path = ['/docs', ...segments].join('/');
  const page = guide(segments);
  const found = segments.length ? findPage(segments) : undefined;

  const title = page?.title ?? found?.page?.title ?? found?.section.title ?? 'Documentation';
  const description =
    page?.description ??
    found?.page?.blurb ??
    found?.section.blurb ??
    'Titanium SDK documentation.';

  return {
    title: `${title} — Titanium SDK`,
    description,
    alternates: { canonical: `${SITE_URL}${path}` },
  };
}

/** GitHub's edit view for the file behind a page. */
const editUrl = (sourcePath: string) =>
  `https://github.com/tidev/titaniumsdk.com/edit/main/${sourcePath}`;

function crumbsFor(segments: string[]): Crumb[] {
  const crumbs: Crumb[] = [{ label: 'Docs', href: '/docs' }];
  const found = segments.length ? findPage(segments) : undefined;
  if (!found) return crumbs;

  crumbs.push({ label: found.section.title, href: `/docs/${found.section.slug}` });
  // A third-level page sits under a parent that is itself a page.
  if (segments.length === 3) {
    const parent = found.section.pages.find((p) => p.slug === segments[1]);
    if (parent) {
      crumbs.push({ label: parent.title, href: `/docs/${found.section.slug}/${parent.slug}` });
    }
  }
  if (found.page) crumbs.push({ label: found.page.title });
  return crumbs;
}

/** A section's or the site's children, as cards. */
function PageList({
  base,
  pages,
  written,
}: {
  base: string;
  pages: DocPage[];
  written: ReadonlySet<string>;
}) {
  return (
    <ul className="mt-6 grid gap-3 sm:grid-cols-2">
      {pages.map((page) => {
        const href = `${base}/${page.slug}`;
        const ready = written.has(href);
        const body = (
          <>
            <span className="font-medium text-text">{page.title}</span>
            {!!page.blurb && (
              <span className="mt-1 block text-sm text-text-muted">{page.blurb}</span>
            )}
            {!ready && <span className="mt-2 block text-xs text-text-subtle">Not written yet</span>}
          </>
        );
        return (
          <li key={page.slug}>
            {ready ? (
              <Link
                href={href}
                className="block rounded-lg border border-border p-4 hover:border-border-strong"
              >
                {body}
              </Link>
            ) : (
              <div className="block rounded-lg border border-dashed border-border p-4 opacity-70">
                {body}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The six sections, on the docs landing.
 *
 * Deliberately carries no "N of M pages written" counter. That is our progress,
 * not the reader's business, and a page advertising how unfinished it is invites
 * them to leave. Which individual pages are pending is visible where it is
 * actionable — in the sidebar and on the section index.
 */
function SectionList() {
  return (
    <ul className="mt-8 grid gap-4 sm:grid-cols-2">
      {SECTIONS.map((section) => (
        <li key={section.slug}>
          <Link
            href={`/docs/${section.slug}`}
            className="block rounded-lg border border-border p-5 hover:border-border-strong"
          >
            <span className="font-medium text-text">{section.title}</span>
            <span className="mt-1 block text-sm text-text-muted">{section.blurb}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Where to go when the page a reader asked for has no content yet. */
function Pending({ section, page }: { section: DocSection; page?: DocPage }) {
  return (
    <div className="mt-8 rounded-lg border border-dashed border-border p-6">
      <p className="text-text">This page has not been written yet.</p>
      <p className="mt-2 text-sm text-text-muted">
        {page ? `${page.title} is part of ` : 'It belongs to '}
        <Link href={`/docs/${section.slug}`} className="text-link hover:underline">
          {section.title}
        </Link>
        , which is being written as part of the documentation rewrite. The{' '}
        <Link href="/docs/sdk/latest" className="text-link hover:underline">
          API reference
        </Link>{' '}
        is complete and searchable in the meantime.
      </p>
    </div>
  );
}

function Meta({ page }: { page: Guide }) {
  const updated = lastUpdated(page.sourcePath);
  return (
    <div className="mt-12 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-4 text-sm text-text-subtle">
      <a
        href={editUrl(page.sourcePath)}
        rel="noopener noreferrer"
        className="text-link hover:underline"
      >
        Edit this page on GitHub
      </a>
      {!!updated && <span>Last updated {formatDate(updated)}</span>}
    </div>
  );
}

export default async function DocsPage({ params }: PageProps<'/docs/[[...slug]]'>) {
  const segments = segmentsOf((await params).slug);
  const path = ['/docs', ...segments].join('/');

  const found = segments.length ? findPage(segments) : undefined;
  if (segments.length && !found) notFound();

  const page = guide(segments);
  const written = writtenPaths();

  // The page's own children, when it has any: a section index lists its pages,
  // and `build/ui` lists the four below it.
  const children = !found ? undefined : found.page ? found.page.pages : found.section.pages;

  const title = page?.title ?? found?.page?.title ?? found?.section.title ?? 'Documentation';
  const description = page?.description ?? found?.page?.blurb ?? found?.section.blurb ?? '';

  return (
    <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-x-8 px-4 py-8 sm:px-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:px-8 xl:grid-cols-[15rem_minmax(0,1fr)_13rem]">
      <GuideNav current={path} written={written} />

      <article className="min-w-0">
        <Breadcrumbs crumbs={crumbsFor(segments)} />
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text">{title}</h1>
        {!!description && <p className="mt-2 text-lg text-text-muted">{description}</p>}

        {!!page?.platforms?.length && (
          <p className="mt-3 text-sm text-text-subtle">
            Applies to {page.platforms.map(platformLabel).join(', ')}
          </p>
        )}

        {page ? (
          <div
            className="prose-docs mt-8 text-text-muted"
            // Sanitized in renderMarkdown; see the allowlist there.
            dangerouslySetInnerHTML={{ __html: page.html }}
          />
        ) : found ? (
          <Pending section={found.section} page={found.page} />
        ) : null}

        {!!children?.length && <PageList base={path} pages={children} written={written} />}
        {!segments.length && <SectionList />}

        {!!page && <Meta page={page} />}
      </article>

      {page ? <GuideToc headings={page.toc} /> : <div />}
    </div>
  );
}
