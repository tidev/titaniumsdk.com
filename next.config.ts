import { latestSdkVersion } from './src/lib/docs/registry.ts';
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

const nextConfig: NextConfig = {
  reactCompiler: true,
  redirects: async () => latestRedirects(),
};

export default nextConfig;
