import { resolveSource } from './sources.ts';
/**
 * Fails unless the named repo is an allowed source.
 *
 * Runs before the source checkout so a `repository_dispatch` naming an
 * arbitrary repository is refused rather than cloned.
 *
 *   node scripts/docgen/check-source.ts tidev/ti.map
 */

const repo = process.argv[2];
if (!repo) {
  console.error('usage: node scripts/docgen/check-source.ts <owner/name>');
  process.exit(1);
}

try {
  const source = resolveSource(repo);
  console.log(`${repo} is an allowed ${source.kind} source`);
} catch (err) {
  console.error(`\n${(err as Error).message}`);
  process.exit(1);
}
