/**
 * Validates everything under registry/ against the Zod schemas, plus the
 * build-data shapes inherited from tidev/downloads-www.
 *
 * The schemas are a public contract — the Titanium CLI reads them through the
 * registry API — so a malformed entry has to fail CI rather than ship.
 *
 *   node scripts/validate-registry.ts [dir]
 */
import { CONTENTS, ContentsSchema, poolPath } from '../src/lib/docs/pool.ts';
import {
  ApiIndexSchema,
  ApiTypeSchema,
  BranchesSchema,
  BuildListSchema,
  PrunedListSchema,
  CommunityIndexSchema,
  ModuleIndexSchema,
  ModuleVersionSchema,
  SdkVersionSchema,
} from '../src/lib/registry/index.ts';
import { POOL_DIR } from './lib/pool.ts';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
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
    if (file === CONTENTS) return ContentsSchema;
    if (file === 'metadata.json') return SdkVersionSchema;
  }

  if (parts[0] === 'modules') {
    // The community index sits beside the curated directories rather than in
    // one of them: it describes repos this site does not host pages for.
    if (parts.length === 2 && file === 'community.json') return CommunityIndexSchema;

    // modules/<id>/index.json describes the package: versions, platforms, repo.
    // The compiled API reference for a version no longer collides with it —
    // that lives in the pool and is validated below, by the role its manifest
    // gives it rather than by where it sits.
    if (parts.length === 3 && file === 'index.json') return ModuleIndexSchema;
    if (file === CONTENTS) return ContentsSchema;
    if (file === 'metadata.json') return ModuleVersionSchema;
  }

  return null;
}

/** Every `.json` outside a pool: the pool is validated by role, not by path. */
function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === POOL_DIR) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (name.endsWith('.json')) out.push(full);
  }
  return out;
}

/** Directories carrying a version manifest, wherever they sit. */
function versionDirs(dir: string, depth = 4): string[] {
  if (depth < 0) return [];
  const found: string[] = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    if (!name.isDirectory() || name.name === POOL_DIR) continue;
    const full = join(dir, name.name);
    if (existsSync(join(full, CONTENTS))) found.push(full);
    else found.push(...versionDirs(full, depth - 1));
  }
  return found;
}

let ok = 0;
let failed = 0;
let skipped = 0;

function check(file: string, rel: string, schema: ZodType) {
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    console.log(`  FAIL  ${rel}  not valid JSON: ${(err as Error).message}`);
    failed++;
    return;
  }

  const result = schema.safeParse(data);
  if (result.success) {
    ok++;
    return;
  }
  failed++;
  console.log(`  FAIL  ${rel}`);
  for (const issue of result.error.issues.slice(0, 4)) {
    console.log(`          ${issue.path.join('.') || '<root>'}: ${issue.message}`);
  }
}

for (const file of walk(root).sort()) {
  const rel = relative(root, file);
  const schema = schemaFor(rel);
  if (!schema) {
    console.log(`  skip  ${rel}  (no schema for this path)`);
    skipped++;
    continue;
  }
  check(file, rel, schema);
}

/**
 * Pooled documents, under the schema the manifest that names them implies.
 *
 * A blob's path says nothing about what it holds — that is the point of content
 * addressing — so the role has to come from the manifest. This is stronger than
 * the depth rule it replaces: a document is checked as whatever a reader will
 * actually load it as, and a manifest naming the wrong kind of file fails here
 * rather than at render time. Each distinct blob is checked once however many
 * versions share it.
 */
const seen = new Set<string>();
for (const dir of versionDirs(root)) {
  const parsed = ContentsSchema.safeParse(JSON.parse(readFileSync(join(dir, CONTENTS), 'utf8')));
  // The manifest itself already failed in the walk above; do not report twice.
  if (!parsed.success) continue;
  const contents = parsed.data;

  for (const [entry, schema] of [
    [contents.index, ApiIndexSchema] as const,
    ...Object.values(contents.types).map((e) => [e, ApiTypeSchema] as const),
  ]) {
    const path = poolPath(dir, entry);
    if (!path || seen.has(path)) continue;
    seen.add(path);
    check(path, `${relative(root, dir)} -> ${entry}`, schema);
  }
}

console.log(`\n${ok} valid, ${failed} invalid, ${skipped} skipped`);
process.exit(failed === 0 ? 0 : 1);
