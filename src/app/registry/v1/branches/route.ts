import { apiBranches } from '@/lib/registry-api/sdk';
import { API_VERSION } from '@/lib/registry-api/v1';

/**
 * The branches with CI builds worth offering.
 *
 * Counts are recomputed from the build files rather than read from the
 * committed map: artifacts expire 90 days after their run, so a count that was
 * true at the last sweep is not necessarily true now.
 */

export const dynamic = 'force-static';

export function GET() {
  const branches = apiBranches();
  return Response.json({ apiVersion: API_VERSION, count: branches.length, branches });
}
