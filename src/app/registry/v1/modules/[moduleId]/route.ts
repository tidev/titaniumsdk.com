import { API_VERSION, moduleDetail } from '@/lib/registry-api/v1';
import { moduleIds } from '@/lib/docs/modules';
import { notFoundJson } from '@/lib/registry-api/not-found';

/** One module. Only the curated ones have a record here; see `notFoundJson`. */

export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return moduleIds().map((moduleId) => ({ moduleId }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  const module = moduleDetail(moduleId);
  if (!module) return notFoundJson(`No module with the id "${moduleId}".`);

  return Response.json({ apiVersion: API_VERSION, ...module });
}
