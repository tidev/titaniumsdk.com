import { API_VERSION, RESOLUTION_RULES } from '@/lib/registry-api/v1';
import { SITE_URL } from '@/lib/site';

/**
 * The API's own index: what it serves and how to read it.
 *
 * Self-describing because the CLI is not the only client — the ticket assumes
 * third parties, and a bare 404 at the root of a versioned API tells them
 * nothing about what they got wrong.
 */

export const dynamic = 'force-static';

export function GET() {
  return Response.json({
    apiVersion: API_VERSION,
    description: 'Titanium module registry. Generated data, served static.',
    documentation: `${SITE_URL}/registry`,
    endpoints: {
      modules: {
        path: '/registry/v1/modules',
        description:
          'Every module of either kind. Filter client-side: this is one small file rather than a query endpoint, so it can be cached whole.',
      },
      module: {
        path: '/registry/v1/modules/{moduleId}',
        description: 'One module: current release per platform, and every release.',
      },
      release: {
        path: '/registry/v1/modules/{moduleId}/v/{version}',
        description: 'One release: manifests, and the archive to download per platform.',
      },
    },
    resolution: RESOLUTION_RULES,
  });
}
