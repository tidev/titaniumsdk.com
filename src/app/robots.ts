import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { SITE_URL, isIndexableHost } from "@/lib/site";

/**
 * Reading headers() makes this a request-time route instead of a value baked in
 * at build, which is what lets one deployment serve different rules per host.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  if (!isIndexableHost((await headers()).get("host"))) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
