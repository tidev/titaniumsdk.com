import { PostList } from '@/components/blog/post-list';
import { allTags, postsWithTag } from '@/lib/blog/posts';
import { SITE_URL } from '@/lib/site';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

/**
 * One tag's archive.
 *
 * Generates nothing today: none of the 50 imported posts carry tags, since the
 * old blog had no such field. The route exists so that adding `tags:` to a post
 * is all it takes — rather than a later PR discovering the archive was never
 * built.
 */

export const dynamicParams = false;

export function generateStaticParams() {
  return allTags().map(({ tag }) => ({ tag }));
}

export async function generateMetadata({
  params,
}: PageProps<'/blog/tag/[tag]'>): Promise<Metadata> {
  const { tag } = await params;
  return {
    title: `${tag} — Titanium SDK blog`,
    description: `Blog posts tagged ${tag}.`,
    alternates: { canonical: `${SITE_URL}/blog/tag/${tag}` },
  };
}

export default async function TagArchive({ params }: PageProps<'/blog/tag/[tag]'>) {
  const { tag } = await params;
  const posts = postsWithTag(tag);
  if (!posts.length) notFound();

  return (
    <div className="py-10">
      <p className="text-sm">
        <a href="/blog" className="text-link hover:underline">
          Blog
        </a>
      </p>
      <h1 className="mt-3 font-mono text-3xl font-semibold tracking-tight">{tag}</h1>
      <p className="mt-3 text-text-muted">
        {posts.length} post{posts.length === 1 ? '' : 's'}.
      </p>
      <PostList posts={posts} />
    </div>
  );
}
