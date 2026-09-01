import { SHOW_CATEGORIES, type Post } from '@/lib/blog/posts';
import { formatDate } from '@/lib/docs/format';

/**
 * One post as a card.
 *
 * No cover image, deliberately: 26 of the 50 posts share the same generic
 * artwork and 20 have none, so a grid of them would repeat one picture down
 * the page and leave gaps where posts lack it. The title is doing the work.
 */
export function PostCard({ post }: { post: Post }) {
  return (
    <li className="relative flex flex-col rounded-lg border border-border p-4 transition-colors hover:border-border-strong">
      {/* With the date down in the byline this row is empty for almost every
          post, so it is only rendered when it has something to show. */}
      {(SHOW_CATEGORIES || post.draft) && (
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-subtle">
          {SHOW_CATEGORIES && (
            <span className="rounded border border-border px-1.5 py-0.5">{post.category}</span>
          )}
          {post.draft && (
            <span className="rounded border border-warning px-1.5 py-0.5 font-mono text-warning">
              draft
            </span>
          )}
        </div>
      )}

      <h2 className="text-lg font-semibold tracking-tight text-balance">
        {/* Stretched over the whole card, so the target is the card rather than
            the few words of the title. */}
        <a
          href={`/blog/${post.slug}`}
          className="text-link after:absolute after:inset-0 hover:text-link-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {post.title}
        </a>
      </h2>

      {/* Full-strength text, not muted: the description is the card's prose, and
          the byline below it is the only part that should read as metadata. */}
      {post.description && <p className="mt-2 text-sm text-text">{post.description}</p>}

      {/* `mt-auto` drops the byline to the bottom, so the stretched cards in a
          row share a baseline instead of trailing empty space. */}
      <p className="mt-auto pt-3 text-xs text-text-subtle">
        {post.authors.join(', ')}
        {' · '}
        <time dateTime={post.date}>{formatDate(post.date)}</time>
      </p>
    </li>
  );
}

export function PostList({ posts }: { posts: Post[] }) {
  if (!posts.length) {
    return <p className="mt-8 text-text-muted">Nothing published here yet.</p>;
  }
  return (
    // `auto-rows-fr` equalises every row to the tallest card on the page, not
    // just within its own row, so the grid reads as a grid. Cards stretch by
    // default; `items-start` would collapse each to its own content height.
    // Only from `sm:` up — in a single column there is nothing to line up with,
    // and padding every short card out to the tallest is just dead space.
    <ul className="mt-8 grid gap-4 sm:auto-rows-fr sm:grid-cols-2 lg:grid-cols-3">
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
