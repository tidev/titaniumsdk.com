import type { Post } from '@/lib/blog/posts';
import { formatDate } from '@/lib/docs/format';

/** One post in a list: enough to decide whether to open it, and nothing more. */
export function PostCard({ post }: { post: Post }) {
  return (
    <li className="border-t border-border py-6 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-subtle">
        <a
          href={`/blog/category/${post.category.toLowerCase()}`}
          className="rounded border border-border px-1.5 py-0.5 hover:border-border-strong hover:text-text"
        >
          {post.category}
        </a>
        <time dateTime={post.date}>{formatDate(post.date)}</time>
        <span>{post.readingMinutes} min read</span>
        {post.draft && (
          <span className="rounded border border-warning px-1.5 py-0.5 font-mono text-warning">
            draft
          </span>
        )}
      </div>

      <h2 className="mt-2 text-xl font-semibold tracking-tight">
        <a
          href={`/blog/${post.slug}`}
          className="hover:text-link focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {post.title}
        </a>
      </h2>

      {post.description && <p className="mt-1 text-text-muted">{post.description}</p>}

      <p className="mt-2 text-sm text-text-subtle">{post.authors.join(', ')}</p>
    </li>
  );
}

export function PostList({ posts }: { posts: Post[] }) {
  if (!posts.length) {
    return <p className="mt-8 text-text-muted">Nothing published here yet.</p>;
  }
  return (
    <ul className="mt-8">
      {posts.map((post) => (
        <PostCard key={post.slug} post={post} />
      ))}
    </ul>
  );
}

/**
 * Numbered pages rather than infinite scroll.
 *
 * The archive is read by people looking for a specific release announcement,
 * and a page number is something they can return to.
 */
export function Pagination({ page, pages }: { page: number; pages: number }) {
  if (pages <= 1) return null;
  const href = (n: number) => (n === 1 ? '/blog' : `/blog/page/${n}`);

  return (
    <nav aria-label="Pagination" className="mt-10 flex flex-wrap items-center gap-2">
      {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
        <a
          key={n}
          href={href(n)}
          aria-current={n === page ? 'page' : undefined}
          className={`rounded-md border px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
            n === page
              ? 'border-border-strong bg-surface text-text'
              : 'border-border text-text-muted hover:text-text'
          }`}
        >
          {n}
        </a>
      ))}
    </nav>
  );
}
