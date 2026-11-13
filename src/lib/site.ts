export const SITE_URL = 'https://titaniumsdk.com';

/** Hosts that serve the public, indexable site. */
const INDEXABLE_HOSTS = new Set(['titaniumsdk.com', 'www.titaniumsdk.com']);

/**
 * Whether a request's Host header identifies the production site.
 *
 * Keyed on host rather than NODE_ENV or VERCEL_ENV because the production
 * deployment answers on more than the production domain:
 * `previewtitaniumsdkcom.vercel.app` is the same deployment, and both env vars
 * report "production" there. The hostname is the only thing that distinguishes
 * them.
 */
export function isIndexableHost(host: string | null | undefined): boolean {
  if (!host) {
    return false;
  }
  return INDEXABLE_HOSTS.has(host.split(':')[0].toLowerCase());
}

/**
 * `X-Robots-Tag: noindex` on every response from a host that is not
 * production, as a `headers()` rule for `next.config.ts` (TI-100).
 *
 * A header rather than a `<meta>` tag so it also covers non-HTML responses:
 * the sitemap, JSON, the registry files, the Markdown corpus, public assets and
 * build output. The proxy used to set it, which meant running the proxy on
 * every request to change almost none of them.
 *
 * Vercel's own default does not make this redundant. It sends `noindex` on a
 * preview deployment's URLs, which sit behind Vercel Authentication anyway,
 * and not on the production deployment's other domains - and
 * `previewtitaniumsdkcom.vercel.app` is one of those, publicly reachable,
 * serving the whole site. Checked with curl on 2026-11-13: its `/favicon.ico`,
 * which the proxy never ran on, carried no `X-Robots-Tag` at all.
 *
 * Built from `INDEXABLE_HOSTS` so the header, `robots.txt` and the sitemap's
 * host guard cannot disagree about which host is production. A `missing` host
 * condition rather than a `has` one, because the hosts to leave alone are the
 * short, known list and the ones to mark are everything else, `localhost` and
 * any domain added later included. Next matches the value as an anchored
 * regular expression against the hostname without its port, so the dots are
 * escaped.
 *
 * @returns The rule, to spread into `headers()`.
 */
export function noindexHeaders() {
  return [
    {
      source: '/:path*',
      missing: [...INDEXABLE_HOSTS].map((host) => ({
        type: 'host' as const,
        value: host.replaceAll('.', String.raw`\.`),
      })),
      headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
    },
  ];
}
