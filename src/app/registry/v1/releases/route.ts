import { apiReleases } from '@/lib/registry-api/sdk';
import { API_VERSION } from '@/lib/registry-api/v1';

/** Every published SDK release: GA, release candidates and betas. */

export const dynamic = 'force-static';

export function GET() {
  const releases = apiReleases();
  return Response.json({
    apiVersion: API_VERSION,
    count: releases.length,
    releases,
  });
}
