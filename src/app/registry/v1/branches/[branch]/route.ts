import { apiBranchBuilds, apiBranches } from '@/lib/registry-api/sdk';
import { notFoundJson } from '@/lib/registry-api/not-found';
import { API_VERSION } from '@/lib/registry-api/v1';

/** One branch's CI builds. Expired ones are never listed — their URLs 404. */

export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return apiBranches().map(({ name }) => ({ branch: name }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ branch: string }> }) {
  const { branch } = await params;
  const builds = apiBranchBuilds(branch);
  if (!builds) return notFoundJson(`No branch "${branch}".`);

  return Response.json({ apiVersion: API_VERSION, branch, count: builds.length, builds });
}
