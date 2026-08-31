import { API_VERSION, releaseDetail, releaseParams } from '@/lib/registry-api/v1';
import { notFoundJson } from '@/lib/registry-api/not-found';

/** One release of one module: what to download, and what it requires. */

export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return releaseParams();
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ moduleId: string; version: string }> }
) {
  const { moduleId, version } = await params;
  const release = releaseDetail(moduleId, version);
  if (!release) return notFoundJson(`No release ${version} of "${moduleId}".`);

  return Response.json({ apiVersion: API_VERSION, ...release });
}
