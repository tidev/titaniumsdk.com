import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

/**
 * The blog, read from `content/blog/*.md` (TI-53).
 *
 * Markdown with frontmatter, rendered through the same `renderMarkdown` the
 * docs and module READMEs use. The ticket warned against ending up with two
 * markdown pipelines, and the one already here — markdown-it plus a
 * sanitize-html allowlist — is that pipeline. Adding MDX for the blog alone
 * would have created exactly the split it cautioned about.
 */

const CONTENT = join(process.cwd(), 'content/blog');

/**
 * The taxonomy, fixed rather than accreting.
 *
 * A category not on this list fails the parse, which is the point: the imported
 * posts arrived with 49 "Release" and a single "RC", a field nobody had
 * revisited in four years. See `scripts/import-tidev-blog.ts` for the remapping.
 */
export const CATEGORIES = ['Releases', 'Tutorials', 'Community'] as const;
export type Category = (typeof CATEGORIES)[number];

const FrontmatterSchema = z
  .object({
    title: z.string().min(1),
    description: z.string().default(''),
    /** `YYYY-MM-DD`. Compared and sorted as a string, so the format is enforced. */
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
    /** One name or several — multi-author from the start, per TI-53. */
    author: z.union([z.string(), z.array(z.string()).min(1)]),
    category: z.enum(CATEGORIES),
    tags: z.array(z.string()).default([]),
    /** Kept out of the index, the feed and the sitemap; still reachable by URL. */
    draft: z.boolean().default(false),
    cover: z.string().optional(),
    /** Where this post was published before the migration, if it was. */
    source: z.url().optional(),
  })
  .strict();

export type Post = {
  slug: string;
  title: string;
  description: string;
  date: string;
  authors: string[];
  category: Category;
  tags: string[];
  draft: boolean;
  cover?: string;
  source?: string;
  body: string;
  /** Whole minutes, floored at one. */
  readingMinutes: number;
};

/** Words per minute, the conventional figure for technical prose. */
const WPM = 200;

function readingMinutes(body: string): number {
  // Code blocks are skimmed rather than read, and counting them makes a release
  // post full of changelog entries look like an essay.
  const prose = body.replace(/```[\s\S]*?```/g, ' ').replace(/`[^`]*`/g, ' ');
  return Math.max(1, Math.round(prose.split(/\s+/).filter(Boolean).length / WPM));
}

function parse(slug: string, text: string): Post {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!m) throw new Error(`${slug}: no frontmatter`);

  const front = FrontmatterSchema.parse(parseYaml(m[1]));
  const body = text.slice(m[0].length).trim();

  return {
    slug,
    title: front.title,
    description: front.description,
    date: front.date,
    authors: Array.isArray(front.author) ? front.author : [front.author],
    category: front.category,
    tags: front.tags,
    draft: front.draft,
    ...(front.cover ? { cover: front.cover } : {}),
    ...(front.source ? { source: front.source } : {}),
    body,
    readingMinutes: readingMinutes(body),
  };
}

let cache: Post[] | undefined;

/**
 * Every post including drafts, newest first.
 *
 * Drafts are filtered by the callers that must not show them rather than here,
 * so `/blog/<slug>` can still render one for review.
 */
export function allPosts(): Post[] {
  if (cache) return cache;
  if (!existsSync(CONTENT)) return (cache = []);

  const posts = readdirSync(CONTENT)
    .filter((f) => f.endsWith('.md'))
    .map((f) => parse(f.replace(/\.md$/, ''), readFileSync(join(CONTENT, f), 'utf8')));

  // Ties broken on slug so the order is total: several posts share a date.
  posts.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
  return (cache = posts);
}

/** What the index, the feed and the sitemap show. */
export const publishedPosts = (): Post[] => allPosts().filter((p) => !p.draft);

export const postBySlug = (slug: string): Post | undefined =>
  allPosts().find((p) => p.slug === slug);

export const postsInCategory = (category: string): Post[] =>
  publishedPosts().filter((p) => p.category === category);

export const postsWithTag = (tag: string): Post[] =>
  publishedPosts().filter((p) => p.tags.includes(tag));

/** Categories that actually have something in them, in declaration order. */
export function activeCategories(): { category: Category; count: number }[] {
  return CATEGORIES.map((category) => ({
    category,
    count: postsInCategory(category).length,
  })).filter((c) => c.count > 0);
}

export function allTags(): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const post of publishedPosts()) {
    for (const tag of post.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/** Posts per index page. */
export const PAGE_SIZE = 12;

export const pageCount = (): number => Math.max(1, Math.ceil(publishedPosts().length / PAGE_SIZE));

export const postsOnPage = (page: number): Post[] =>
  publishedPosts().slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

/**
 * Slugs the routes under `/blog` already claim.
 *
 * Next resolves a static segment before a dynamic one, so a post called
 * `page.md` would be shadowed by the pagination route and simply never render.
 * Checked rather than hoped for — see the test.
 */
export const RESERVED_SLUGS = ['page', 'category', 'tag', 'feed.xml'] as const;
