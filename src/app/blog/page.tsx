import { Pagination, PostList } from '@/components/blog/post-list';
import { activeCategories, pageCount, postsOnPage, publishedPosts } from '@/lib/blog/posts';
import { SITE_URL } from '@/lib/site';
import type { Metadata } from 'next';

/** The blog index, newest first. Page one; the rest live under /blog/page/N. */

export const metadata: Metadata = {
  title: 'Blog — Titanium SDK',
  description: 'Release announcements, guides, and news from the Titanium SDK project.',
  alternates: {
    canonical: `${SITE_URL}/blog`,
    types: { 'application/rss+xml': `${SITE_URL}/blog/feed.xml` },
  },
};

export default function BlogIndex() {
  const posts = publishedPosts();

  return (
    <div className="max-w-3xl py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Blog</h1>
      <p className="mt-3 text-text-muted">
        Release announcements and news from the Titanium SDK project. {posts.length} posts, or{' '}
        <a href="/blog/feed.xml" className="text-link hover:underline">
          subscribe by RSS
        </a>
        .
      </p>

      <nav aria-label="Categories" className="mt-6 flex flex-wrap gap-2">
        {activeCategories().map(({ category, count }) => (
          <a
            key={category}
            href={`/blog/category/${category.toLowerCase()}`}
            className="rounded-md border border-border px-2.5 py-1.5 text-sm text-text-muted transition-colors hover:border-border-strong hover:text-text"
          >
            {category} <span className="font-mono text-xs text-text-subtle">{count}</span>
          </a>
        ))}
      </nav>

      <PostList posts={postsOnPage(1)} />
      <Pagination page={1} pages={pageCount()} />
    </div>
  );
}
