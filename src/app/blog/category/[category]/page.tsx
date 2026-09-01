import { PostList } from '@/components/blog/post-list';
import { activeCategories, postsInCategory, CATEGORIES } from '@/lib/blog/posts';
import { SITE_URL } from '@/lib/site';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

/**
 * One category's archive.
 *
 * Only categories with posts in them get a page — an empty archive is a dead
 * end that still appears in the sitemap.
 */

export const dynamicParams = false;

export function generateStaticParams() {
  return activeCategories().map(({ category }) => ({ category: category.toLowerCase() }));
}

const nameFor = (slug: string) => CATEGORIES.find((c) => c.toLowerCase() === slug);

export async function generateMetadata({
  params,
}: PageProps<'/blog/category/[category]'>): Promise<Metadata> {
  const { category } = await params;
  const name = nameFor(category);
  if (!name) return {};

  return {
    title: `${name} — Titanium SDK blog`,
    description: `Blog posts filed under ${name}.`,
    alternates: { canonical: `${SITE_URL}/blog/category/${category}` },
  };
}

export default async function CategoryArchive({ params }: PageProps<'/blog/category/[category]'>) {
  const { category } = await params;
  const name = nameFor(category);
  if (!name) notFound();

  const posts = postsInCategory(name);

  return (
    <div className="py-10">
      <p className="text-sm">
        <a href="/blog" className="text-link hover:underline">
          Blog
        </a>
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">{name}</h1>
      <p className="mt-3 text-text-muted">
        {posts.length} post{posts.length === 1 ? '' : 's'}.
      </p>
      <PostList posts={posts} />
    </div>
  );
}
