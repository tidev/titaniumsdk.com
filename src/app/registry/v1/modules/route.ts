import { API_VERSION, listModules } from '@/lib/registry-api/v1';

/**
 * Every module, in one file.
 *
 * No query parameters, which is a deliberate reading of the ticket rather than
 * an omission: the whole list is a few tens of kilobytes, and a static file a
 * CDN can hold forever beats a query endpoint that has to run. Clients filter
 * on name, id, description, platform or minsdk locally, and every field needed
 * to do that is here.
 */

export const dynamic = 'force-static';

export function GET() {
  const modules = listModules();

  return Response.json({
    apiVersion: API_VERSION,
    count: modules.length,
    counts: {
      registry: modules.filter((m) => m.source === 'registry').length,
      community: modules.filter((m) => m.source === 'community').length,
    },
    modules,
  });
}
