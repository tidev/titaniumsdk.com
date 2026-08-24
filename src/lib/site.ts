export const SITE_URL = "https://titaniumsdk.com";

/** Hosts that serve the public, indexable site. */
const INDEXABLE_HOSTS = new Set(["titaniumsdk.com", "www.titaniumsdk.com"]);

/**
 * Whether a request's Host header identifies the production site.
 *
 * Keyed on host rather than NODE_ENV or VERCEL_ENV because
 * preview.titaniumsdk.com is a custom domain on the *production* deployment —
 * both env vars report "production" there. The hostname is the only thing that
 * distinguishes them, and it keeps working unchanged through the cutover.
 */
export function isIndexableHost(host: string | null | undefined): boolean {
  if (!host) {
    return false;
  }
  return INDEXABLE_HOSTS.has(host.split(":")[0].toLowerCase());
}
