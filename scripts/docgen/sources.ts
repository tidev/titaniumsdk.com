import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The repositories the regen is allowed to fetch.
 *
 * The workflow is reachable by `repository_dispatch`, so the repo name arrives
 * from outside. Resolving it against this list before anything is cloned is what
 * stops the endpoint being used to fetch arbitrary repositories.
 */

export type SourceKind = 'sdk' | 'module';
export type Source = { repo: string; kind: SourceKind; apidoc: string };

const file = new URL('./sources.json', import.meta.url);
const table: Record<string, { kind: SourceKind; apidoc: string }> = JSON.parse(
  readFileSync(file, 'utf8')
).sources;

export const sources = (): Source[] => Object.entries(table).map(([repo, s]) => ({ repo, ...s }));

/**
 * The one source of kind `sdk`, which every module resolves its cross-repo
 * references into. Read from the table rather than spelled out, so the repo name
 * lives in exactly one place.
 */
export function sdkSource(): Source {
  const sdk = sources().find((s) => s.kind === 'sdk');
  if (!sdk) throw new Error('no source of kind "sdk" in scripts/docgen/sources.json');
  return sdk;
}

/** Throws rather than returning null: an unknown repo must stop the run, not skip a step. */
export function resolveSource(repo: string): Source {
  const entry = table[repo];
  if (!entry) {
    throw new Error(
      `"${repo}" is not an allowed source.\n` +
        'Add it to scripts/docgen/sources.json if it should be.\n' +
        `Known: ${Object.keys(table).join(', ')}`
    );
  }
  return { repo, ...entry };
}

/**
 * Reads a module's id from its manifest.
 *
 * Not derivable from the repository name — tidev/titanium-identity publishes as
 * `ti.identity` — so it is read from the checkout rather than guessed. Android
 * and iOS manifests carry the same `moduleid`; whichever exists is fine.
 */
export function moduleIdFrom(checkout: string): string {
  const candidates = ['android/manifest', 'ios/manifest', 'iphone/manifest', 'manifest'];
  for (const rel of candidates) {
    const path = join(checkout, rel);
    if (!existsSync(path)) continue;
    const m = /^moduleid:\s*(\S+)\s*$/m.exec(readFileSync(path, 'utf8'));
    if (m) return m[1];
  }
  throw new Error(`no moduleid found in ${checkout} (looked in ${candidates.join(', ')})`);
}
