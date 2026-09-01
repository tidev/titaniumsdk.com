import { publishedPosts } from '@/lib/blog/posts';
import { renderMarkdown } from '@/lib/docs/markdown';
import { SITE_URL } from '@/lib/site';

/**
 * RSS 2.0, at the path readers guess.
 *
 * Built by hand rather than with a library: a feed is a dozen fields, and the
 * one thing that matters is that every one of them is escaped. `escape` runs
 * over all interpolated text; post bodies go through CDATA after the same
 * sanitising the site itself applies, so the feed can never carry markup the
 * pages would have stripped.
 *
 * Drafts are excluded — a feed is the one surface a reader cannot un-see.
 */

export const dynamic = 'force-static';

const escape = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/** RFC 822, which is what RSS requires — not the ISO date the frontmatter uses. */
const rfc822 = (date: string) => new Date(`${date}T00:00:00Z`).toUTCString();

export function GET() {
  const posts = publishedPosts();
  const updated = posts[0] ? rfc822(posts[0].date) : new Date(0).toUTCString();

  const items = posts
    .map((post) => {
      // `]]>` inside a post would close the CDATA early and break the feed.
      const html = renderMarkdown(post.body, {}).replace(/]]>/g, ']]&gt;');
      return `    <item>
      <title>${escape(post.title)}</title>
      <link>${SITE_URL}/blog/${post.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/blog/${post.slug}</guid>
      <pubDate>${rfc822(post.date)}</pubDate>
      <category>${escape(post.category)}</category>
${post.authors.map((a) => `      <dc:creator>${escape(a)}</dc:creator>`).join('\n')}
      <description>${escape(post.description)}</description>
      <content:encoded><![CDATA[${html}]]></content:encoded>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Titanium SDK blog</title>
    <link>${SITE_URL}/blog</link>
    <description>Release announcements, guides, and news from the Titanium SDK project.</description>
    <language>en</language>
    <lastBuildDate>${updated}</lastBuildDate>
    <atom:link href="${SITE_URL}/blog/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      'content-type': 'application/rss+xml; charset=utf-8',
      'cache-control': 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
