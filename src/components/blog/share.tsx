import type { Post } from '@/lib/blog/posts';
import { SITE_URL } from '@/lib/site';

/**
 * Share links that pre-fill a post.
 *
 * Both are the networks' current intent endpoints, checked rather than assumed:
 * `x.com/intent/post` resolves directly, and the older
 * `twitter.com/intent/tweet` only redirects to it. Bluesky's is
 * `bsky.app/intent/compose`.
 *
 * The text is the post's `social` frontmatter when it has one, and the title
 * otherwise, with the URL appended — so a share is useful even for the 50
 * imported posts, none of which carry `social` yet.
 */
export function Share({ post }: { post: Post }) {
  const url = `${SITE_URL}/blog/${post.slug}`;
  const text = encodeURIComponent(`${post.social ?? post.title}\n\n${url}`);

  const targets = [
    {
      name: 'X',
      href: `https://x.com/intent/post?text=${text}`,
      icon: (
        <path d="M18.9 1.6h3.4l-7.4 8.5L23.6 22h-6.8l-5.3-7-6.1 7H2l7.9-9.1L1.7 1.6h7l4.8 6.4ZM17.7 20h1.9L7.4 3.5H5.4Z" />
      ),
    },
    {
      name: 'Bluesky',
      href: `https://bsky.app/intent/compose?text=${text}`,
      icon: (
        <path d="M5.8 3.1C8.5 5.1 11.3 9.2 12 11.4c.7-2.2 3.6-6.3 6.3-8.3 1.9-1.4 5-2.5 5 1.1 0 .7-.4 6-.7 6.9-.8 3-3.9 3.8-6.6 3.3 4.7.8 5.9 3.5 3.3 6.1-4.9 5-7.1-1.3-7.6-2.9-.1-.3-.2-.4-.2-.3 0-.1-.1 0-.2.3-.5 1.6-2.7 7.9-7.6 2.9-2.6-2.6-1.4-5.3 3.3-6.1-2.7.5-5.8-.3-6.6-3.3C.3 10.2 0 4.9 0 4.2 0 .6 3.1 1.7 5 3.1Z" />
      ),
    },
  ];

  return (
    <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-border pt-6">
      <span className="text-sm text-text-subtle">Share</span>
      {targets.map((t) => (
        <a
          key={t.name}
          href={t.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Share on ${t.name}`}
          title={`Share on ${t.name}`}
          className="inline-flex size-8 items-center justify-center rounded-md border border-border text-text-muted transition-colors hover:border-border-strong hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          <svg viewBox="0 0 24 24" aria-hidden className="size-4 fill-current">
            {t.icon}
          </svg>
        </a>
      ))}
    </div>
  );
}
