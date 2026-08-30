import { resolveSource } from './sources.ts';
/**
 * Fails unless the named repo is an allowed source.
 *
 * Runs before the source checkout so a `repository_dispatch` naming an
 * arbitrary repository is refused rather than cloned.
 *
 *   node scripts/docgen/check-source.ts tidev/ti.map
 *
 * Reports the kind on GITHUB_OUTPUT as well, since the workflow has to know it
 * to decide whether the compile needs an SDK to resolve against — and this step
 * has already resolved the source, so deriving it twice would be a second place
 * for the answer to be wrong.
 */

const repo = process.argv[2];
if (!repo) {
  console.error('usage: node scripts/docgen/check-source.ts <owner/name>');
  process.exit(1);
}

try {
  const source = resolveSource(repo);
  console.log(`${repo} is an allowed ${source.kind} source`);
  if (process.env.GITHUB_OUTPUT) {
    const { appendFileSync } = await import('node:fs');
    appendFileSync(process.env.GITHUB_OUTPUT, `kind=${source.kind}\n`);
  }
} catch (err) {
  console.error(`\n${(err as Error).message}`);
  process.exit(1);
}
