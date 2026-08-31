import { notFoundJson } from '@/lib/registry-api/not-found';

/**
 * Anything under /registry/v1 that no other route claims.
 *
 * Dynamic on purpose, and the only handler here that is: it answers at request
 * time for paths nobody could enumerate at build time. It reads nothing from
 * disk, so it has no data that could be missing from a serverless bundle.
 *
 * It also catches the real routes' misses. The module and release endpoints
 * declare `dynamicParams = false`, so an id that was not generated never
 * reaches their handler — Next 404s first, and without this that 404 would be
 * the site's HTML error page landing in a client that asked for JSON.
 */

export const dynamic = 'force-dynamic';

/** `modules/<id>` and `modules/<id>/v/<version>`, so the message can say which. */
function describe(path: string[]): string {
  if (path[0] === 'modules' && path.length === 2) {
    return `No module with the id "${path[1]}". GET /registry/v1/modules lists every id.`;
  }
  if (path[0] === 'modules' && path.length === 4 && path[2] === 'v') {
    return `No release "${path[3]}" of "${path[1]}". GET /registry/v1/modules/${path[1]} lists its releases.`;
  }
  return `No endpoint at /registry/v1/${path.join('/')}. GET /registry/v1 lists them.`;
}

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return notFoundJson(describe(path));
}
