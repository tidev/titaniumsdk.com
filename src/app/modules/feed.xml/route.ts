import { moduleFeedEntries } from '@/lib/docs/module-feed';
import { communityListings, listedModuleIds, moduleIndex } from '@/lib/docs/modules';
import { SITE_URL } from '@/lib/site';
import { escapeXml as escape } from '@/lib/xml';

/**
 * RSS 2.0 of the modules that are new to `/modules`, newest first.
 *
 * New modules only, not new releases: one item per module, dated the day it
 * arrived and never touched again, so a reader sees each module once. What
 * "arrived" means for each kind is in `module-feed.ts`.
 *
 * Built by hand like the blog feed, and for the same reason. Every
 * interpolated string goes through `escape` - these descriptions are whatever
 * a stranger typed into a GitHub repository.
 */

export const dynamic = 'force-static';

const PLATFORM_NAME = { android: 'Android', ios: 'iOS' } as const;

/** RFC 822, which is what RSS requires - not the ISO timestamp the registry stores. */
const rfc822 = (date: string) => new Date(date).toUTCString();

export function GET() {
  const curated = listedModuleIds().flatMap((id) => moduleIndex(id) ?? []);
  const entries = moduleFeedEntries(curated, communityListings(), SITE_URL);
  const updated = entries[0] ? rfc822(entries[0].date) : new Date(0).toUTCString();

  const items = entries
    .map((entry) => {
      const platforms = entry.platforms.map((p) => PLATFORM_NAME[p]);
      // A GitHub description rarely ends its sentence, and the platform line
      // is a second one.
      const blurb = entry.description?.trim().replace(/([^.!?])$/, '$1.');
      const description = [blurb, platforms.length && `For ${platforms.join(' and ')}.`]
        .filter(Boolean)
        .join(' ');
      return `    <item>
      <title>${escape(entry.title)}</title>
      <link>${escape(entry.link)}</link>
      <guid isPermaLink="true">${escape(entry.link)}</guid>
      <pubDate>${rfc822(entry.date)}</pubDate>
${entry.author ? `      <dc:creator>${escape(entry.author)}</dc:creator>\n` : ''}${platforms
        .map((p) => `      <category>${escape(p)}</category>\n`)
        .join('')}      <description>${escape(description)}</description>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>New Titanium modules</title>
    <link>${SITE_URL}/modules</link>
    <description>Modules new to the Titanium SDK module list. Community modules are found by their titanium topic on GitHub and are listed, not reviewed.</description>
    <language>en</language>
    <lastBuildDate>${updated}</lastBuildDate>
    <atom:link href="${SITE_URL}/modules/feed.xml" rel="self" type="application/rss+xml"/>
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
