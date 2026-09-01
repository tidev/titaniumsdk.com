import { Pagination, PostList } from '@/components/blog/post-list';
import { pageCount, postsOnPage } from '@/lib/blog/posts';
import { SITE_URL } from '@/lib/site';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

/**
 * Pages two and up.
 *
 * Page one is `/blog`, not `/blog/page/1` — one canonical URL for the same
 * list. `/blog/page/1` redirects rather than 404ing, since it is the obvious
 * thing to type after seeing page 2.
 */

export const dynamicParams = false;

export function generateStaticParams() {
  return Array.from({ length: pageCount() }, (_, i) => ({ page: String(i + 1) }));
}

export async function generateMetadata({
  params,
}: PageProps<'/blog/page/[page]'>): Promise<Metadata> {
  const { page } = await params;
  return {
    title: `Blog, page ${page} — Titanium SDK`,
    alternates: { canonical: `${SITE_URL}/blog/page/${page}` },
  };
}

export default async function BlogPage({ params }: PageProps<'/blog/page/[page]'>) {
  const { page } = await params;
  const n = Number(page);
  if (n === 1) redirect('/blog');
  if (!Number.isInteger(n) || n < 1 || n > pageCount()) notFound();

  return (
    <div className="max-w-3xl py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Blog</h1>
      <p className="mt-3 text-text-muted">
        Page {n} of {pageCount()}.
      </p>
      <PostList posts={postsOnPage(n)} />
      <Pagination page={n} pages={pageCount()} />
    </div>
  );
}
