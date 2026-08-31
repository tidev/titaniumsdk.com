import { notFoundJson } from '@/lib/registry-api/not-found';

/**
 * Anything under /registry that no other route claims.
 *
 * The compatibility files declare `dynamicParams = false`, so a name that was
 * not generated never reaches their handler — without this it would fall to the
 * site's HTML error page, in a namespace where every other answer is JSON. The
 * versioned API has its own catch-all one level down; this covers the rest.
 */

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  return notFoundJson(
    `No file at /registry/${path.join('/')}. GET /registry/branches.json lists the branches, or see /registry/v1 for the current API.`
  );
}
