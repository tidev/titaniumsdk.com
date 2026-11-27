import { robotsRules } from '@/lib/seo';
import { SITE_URL, isIndexableHost } from '@/lib/site';
import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';

/**
 * Reading headers() makes this a request-time route instead of a value baked in
 * at build, which is what lets one deployment serve different rules per host.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  if (!isIndexableHost((await headers()).get('host'))) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }

  return {
    // One rule for everybody. Per-agent blocks are how a robots.txt starts
    // being wrong quietly: the rule a crawler obeys is the most specific block
    // that names it, so an `Allow` added to the `*` block later would never
    // reach an agent that had a block of its own. See `robotsRules` in lib/seo
    // for what is excluded and what is deliberately not.
    rules: { userAgent: '*', ...robotsRules() },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
