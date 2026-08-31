import {
  legacyBranch,
  legacyBranches,
  legacyChannel,
  legacyFiles,
} from '@/lib/registry-api/sdk';
import { CHANNELS, type Channel } from '@/lib/downloads/registry';
import { notFoundJson } from '@/lib/registry-api/not-found';

/**
 * The paths the shipped Titanium CLI reads, kept answering.
 *
 * `tidev/titanium-cli` hard-codes `registry/branches.json`,
 * `registry/<branch>.json` and `registry/{ga,rc,beta}.json`. Served rather than
 * redirected, deliberately: the CLI calls undici's `request` without
 * `maxRedirections`, so it does not follow a 3xx at all, and the bodies here
 * are a bare array and a bare object where `/registry/v1/*` answers with an
 * envelope. A redirect would break both ways at once.
 *
 * So these are frozen. `/registry/v1/releases` and `/registry/v1/branches` are
 * the contract going forward; this is the compatibility surface, and its shapes
 * were taken from the live responses rather than from what we assumed they
 * contained.
 */

export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return legacyFiles().map((file) => ({ file }));
}

const isChannel = (name: string): name is Channel => (CHANNELS as readonly string[]).includes(name);

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const name = file.replace(/\.json$/, '');

  if (name === 'branches') return Response.json(legacyBranches());
  if (isChannel(name)) return Response.json(legacyChannel(name));
  if (file.endsWith('.json')) return Response.json(legacyBranch(name));

  return notFoundJson(`No file at /registry/${file}.`);
}
