import { activeCategories, pageCount, publishedPosts } from '@/lib/blog/posts';
import { SITE_URL } from '@/lib/site';
import type { MetadataRoute } from 'next';

/**
 * The sitemap, covering what exists today.
 *
 * Deliberately partial: the docs and module trees are large and their
 * canonical-versus-pinned story is still being settled (TI-48, TI-59), and
 * listing a URL we may redirect next week is worse than not listing it. Blog
 * posts have settled URLs, so they are here in full.
 *
 * Drafts are excluded, which is the third of the three places TI-53 requires —
 * the index and the feed being the others.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const posts = publishedPosts();
  const newest = posts[0]?.date;

  return [
    { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/downloads`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/modules`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${SITE_URL}/registry`, changeFrequency: 'monthly', priority: 0.3 },
    {
      url: `${SITE_URL}/blog`,
      ...(newest ? { lastModified: newest } : {}),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    // Page one is /blog, so pagination starts at two.
    ...Array.from({ length: Math.max(0, pageCount() - 1) }, (_, i) => ({
      url: `${SITE_URL}/blog/page/${i + 2}`,
      changeFrequency: 'weekly' as const,
      priority: 0.3,
    })),
    ...activeCategories().map(({ category }) => ({
      url: `${SITE_URL}/blog/category/${category.toLowerCase()}`,
      changeFrequency: 'weekly' as const,
      priority: 0.4,
    })),
    ...posts.map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: post.date,
      changeFrequency: 'yearly' as const,
      priority: 0.6,
    })),
  ];
}
