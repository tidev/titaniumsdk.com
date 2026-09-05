import legacyApi from './src/lib/docs/legacy-api-redirects.json';
import { MAIN, latestSdkVersion } from './src/lib/docs/registry.ts';
import type { NextConfig } from 'next';

/**
 * `/docs/sdk/latest/*` redirects to the concrete version rather than rendering
 * a second copy of every page. One canonical set of URLs, so the versioned and
 * unversioned paths never compete in search results.
 *
 * Not permanent: which version `latest` points at moves with each release.
 */
function latestRedirects() {
  const latest = latestSdkVersion();
  if (!latest) return [];
  return [
    // `/docs` used to redirect here, because the reference was all that lived
    // under it. TI-32 made `/docs` a real index over the guide tree, so that
    // rule is gone; this one stays, since `/docs/sdk` is still a bare prefix
    // with no page of its own.
    {
      source: '/docs/sdk',
      destination: `/docs/sdk/${latest}`,
      permanent: false,
    },
    {
      source: '/docs/sdk/latest',
      destination: `/docs/sdk/${latest}`,
      permanent: false,
    },
    {
      source: '/docs/sdk/latest/:path*',
      destination: `/docs/sdk/${latest}/:path*`,
      permanent: false,
    },
  ];
}

/**
 * The legacy titanium-docs `/api/*` reference, which moved wholesale.
 *
 * NEVER PUT A ROUTE HANDLER UNDER `app/api/` IN THIS REPO. `/api` is not
 * reserved by the App Router — a `route.ts` there is perfectly legal — but Next
 * checks redirects before the filesystem, so the handler would never run and
 * the only symptom is a 308 into the docs. Nothing warns you. The public JSON
 * API lives at `/registry/v1/*` for exactly this reason.
 *
 * The map is generated from the old file tree and committed, never a
 * `/api/:path*` wildcard. Two reasons: a wildcard would claim the whole prefix
 * rather than the pages that actually existed, leaving no way to see what is
 * spoken for; and it could not route `/api/titanium/ui/view.html` to the SDK
 * reference while sending `/api/modules/ble.html` to a different tree.
 * Regenerate with `pnpm redirects <path-to-titanium-docs>`.
 */
function legacyApiRedirects() {
  const latest = latestSdkVersion();
  if (!latest) return [];

  /**
   * The committed map names `latest`, so it stays correct as releases ship and
   * never has to be regenerated for a version bump. Serving it verbatim would
   * chain through latestRedirects() for a second hop, so the version is
   * resolved here instead — at build time, on every deploy.
   */
  const resolved = (destination: string) =>
    destination.replace('/docs/sdk/latest', `/docs/sdk/${latest}`);

  return [
    /**
     * Permanent everywhere except into `main`. A 308 is cached by the client
     * indefinitely, which is safe when it points at a released version —
     * those directories are immutable, so a stale one still answers correctly.
     * `main` is the single mutable tree, and it is what `latest` resolves to
     * until a release is compiled, so these stay temporary until then.
     */
    ...legacyApi.sdk.map((rule) => ({
      source: rule.source,
      destination: resolved(rule.destination),
      permanent: latest !== MAIN,
    })),
    /**
     * Module reference pages do not exist yet, so these 404 until that ships.
     * Permanent regardless: `moduleid` is the registry's canonical key, so
     * `/modules/<moduleid>` is already the final address, and it resolves to
     * the latest version without naming one.
     */
    ...legacyApi.modules.map((rule) => ({ ...rule, permanent: true })),
  ];
}

/**
 * The public registry API (TI-55).
 *
 * Open CORS because reads are the entire surface and the CLI is not the only
 * client. Cached hard because every one of these is a build artifact: the
 * content only changes when a deploy replaces it, so a stale copy is never
 * wrong for long and `stale-while-revalidate` means nobody waits on a miss.
 */
function registryApiHeaders() {
  return [
    {
      // Both the versioned API and the legacy files the CLI still reads. The
      // legacy paths are `/registry/*.json`, one segment deep, which is why
      // this matches the whole prefix rather than only `/v1`.
      source: '/registry/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: '*' },
        { key: 'Access-Control-Allow-Methods', value: 'GET, HEAD, OPTIONS' },
        {
          key: 'Cache-Control',
          value: 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
        },
      ],
    },
  ];
}

const nextConfig: NextConfig = {
  reactCompiler: true,
  headers: registryApiHeaders,
  redirects: async () => {
    const rules = [...latestRedirects(), ...legacyApiRedirects()];

    // A surviving `latest` in a legacy destination is the two-hop chain the
    // substitution above exists to prevent, and it would only show up as slow
    // redirects in production. Fail the build instead.
    const chained = rules.filter(
      (rule) => rule.source.startsWith('/api') && rule.destination.startsWith('/docs/sdk/latest')
    );
    if (chained.length) {
      throw new Error(`${chained.length} legacy /api redirect(s) still point at /docs/sdk/latest`);
    }

    return rules;
  },
};

export default nextConfig;
