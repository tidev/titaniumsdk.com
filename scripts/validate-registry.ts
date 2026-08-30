import {
  ApiIndexSchema,
  ApiTypeSchema,
  BranchesSchema,
  BuildListSchema,
  PrunedListSchema,
  ModuleIndexSchema,
  ModuleVersionSchema,
  SdkVersionSchema,
} from '../src/lib/registry/index.ts';
/**
 * Validates everything under registry/ against the Zod schemas, plus the
 * build-data shapes inherited from tidev/downloads-www.
 *
 * The schemas are a public contract — the Titanium CLI reads them through the
 * registry API — so a malformed entry has to fail CI rather than ship.
 *
 *   node scripts/validate-registry.ts [dir]
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ZodType } from 'zod';

const root = process.argv[2]
  ? process.argv[2]
  : fileURLToPath(new URL('../registry', import.meta.url));

/** Picks the schema from where a file sits, so layout mistakes surface too. */
function schemaFor(rel: string): ZodType | null {
  const parts = rel.split('/');
  const file = parts.at(-1)!;

  if (parts[0] === 'builds') {
    if (file === 'branches.json') return BranchesSchema;
    // pruned/<branch>.pruned.json holds tombstones, not builds
    if (parts[1] === 'pruned') return PrunedListSchema;
    return BuildListSchema;
  }

  // docgen rebuilds from scratch when it cannot read its own manifest, so a
  // corrupt one costs time rather than correctness. Nothing to enforce.
  if (file === 'docgen-manifest.json') return null;

  if (parts[0] === 'sdk') {
    // sdk/{ga,rc,beta}.json are release lists; sdk/<version>/ is one compiled
    // version, shaped like a module version directory.
    if (parts.length === 2) return BuildListSchema;
    if (parts.includes('types')) return ApiTypeSchema;
    if (file === 'index.json') return ApiIndexSchema;
    if (file === 'metadata.json') return SdkVersionSchema;
  }

  if (parts[0] === 'modules') {
    // modules/<id>/index.json describes the package: versions, platforms, repo.
    // modules/<id>/v/<version>/index.json is the compiled API reference for one
    // version. Same filename, different schema — distinguished by depth, since
    // routing them together is exactly the mistake that shipped a module's API
    // index into the package-index schema.
    if (parts.length === 3 && file === 'index.json') return ModuleIndexSchema;
    if (parts.includes('types')) return ApiTypeSchema;
    if (file === 'index.json') return ApiIndexSchema;
    if (file === 'metadata.json') return ModuleVersionSchema;
  }

  return null;
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (name.endsWith('.json')) out.push(full);
  }
  return out;
}

let ok = 0;
let failed = 0;
let skipped = 0;

for (const file of walk(root).sort()) {
  const rel = relative(root, file);
  const schema = schemaFor(rel);
  if (!schema) {
    console.log(`  skip  ${rel}  (no schema for this path)`);
    skipped++;
    continue;
  }

  let data: unknown;
  try {
    data = JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    console.log(`  FAIL  ${rel}  not valid JSON: ${(err as Error).message}`);
    failed++;
    continue;
  }

  const result = schema.safeParse(data);
  if (result.success) {
    ok++;
  } else {
    failed++;
    console.log(`  FAIL  ${rel}`);
    for (const issue of result.error.issues.slice(0, 4)) {
      console.log(`          ${issue.path.join('.') || '<root>'}: ${issue.message}`);
    }
  }
}

console.log(`\n${ok} valid, ${failed} invalid, ${skipped} skipped`);
process.exit(failed === 0 ? 0 : 1);
