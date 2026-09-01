import { Share } from '@/components/blog/share';
import { Prose } from '@/components/docs/prose';
import { allPosts, postBySlug } from '@/lib/blog/posts';
import { formatDate } from '@/lib/docs/format';
import { SITE_URL } from '@/lib/site';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

/**
 * One post.
 *
 * Drafts render here so they can be reviewed by URL; they are kept out of the
 * index, the feed and the sitemap instead, and say so on the page.
 */

export const dynamicParams = false;

export function generateStaticParams() {
  return allPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps<'/blog/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const post = postBySlug(slug);
  if (!post) return {};

  return {
    title: `${post.title} — Titanium SDK`,
    description: post.description,
    alternates: { canonical: `${SITE_URL}/blog/${post.slug}` },
    // Excluded from search results while it is a draft, wherever it leaks from.
    ...(post.draft ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.description,
      publishedTime: post.date,
      authors: post.authors,
      ...(post.cover ? { images: [{ url: `${SITE_URL}${post.cover}` }] } : {}),
    },
  };
}

export default async function BlogPost({ params }: PageProps<'/blog/[slug]'>) {
  const { slug } = await params;
  const post = postBySlug(slug);
  if (!post) notFound();

  return (
    // `mx-auto` centres the column inside the layout's 7xl gutters; without it
    // a 3xl article hugs the left edge on a wide screen.
    <article className="mx-auto max-w-3xl py-10">
      <p className="text-sm">
        <a href="/blog" className="text-link hover:underline">
          Blog
        </a>
      </p>

      <header className="mt-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-subtle">
          <a
            href={`/blog/category/${post.category.toLowerCase()}`}
            className="rounded border border-border px-1.5 py-0.5 hover:border-border-strong hover:text-text"
          >
            {post.category}
          </a>
          <time dateTime={post.date}>{formatDate(post.date)}</time>
        </div>

        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance">{post.title}</h1>
        {post.description && <p className="mt-3 text-lg text-text-muted">{post.description}</p>}
        <p className="mt-3 text-sm text-text-subtle">{post.authors.join(', ')}</p>

        {post.draft && (
          <p className="mt-4 rounded-lg border border-warning px-4 py-3 text-sm text-text-muted">
            This is a draft. It is not listed on the blog, in the feed, or in the sitemap.
          </p>
        )}
      </header>

      <Prose markdown={post.body} className="mt-8" />

      {!!post.tags.length && (
        <ul className="mt-10 flex flex-wrap gap-2 border-t border-border pt-6">
          {post.tags.map((tag) => (
            <li key={tag}>
              <a
                href={`/blog/tag/${tag}`}
                className="rounded-md border border-border px-2.5 py-1 text-sm text-text-muted hover:border-border-strong hover:text-text"
              >
                {tag}
              </a>
            </li>
          ))}
        </ul>
      )}

      <Share post={post} />
    </article>
  );
}
