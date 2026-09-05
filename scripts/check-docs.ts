import { validateGuides } from '../src/lib/docs/guides.ts';

/**
 * Fails the build on anything wrong with guide content (TI-32).
 *
 *   node scripts/check-docs.ts
 *
 * Catches, in one pass and reporting all of it rather than the first:
 *
 *   - a page whose frontmatter is missing, malformed, or has an unknown key
 *   - a `:::include` naming a partial that does not exist, or a cycle
 *   - an unclosed or nested `:::only` block
 *   - a content file with no entry in `ia.ts`, which would render at a URL that
 *     appears in no sidebar
 *   - an internal link to a `/docs` path the structure does not define
 *   - a structural mistake in `ia.ts` itself: a bad slug, too much depth, or a
 *     page claiming a reserved segment
 *
 * The link check is the reason this is a script and not a lint rule: it needs
 * the rendered HTML, which needs the whole pipeline, which needs the IA. A
 * broken link between two guides is otherwise invisible until someone clicks
 * it, and the legacy corpus has 21 pages whose links died exactly that way.
 */

const problems = validateGuides();

if (!problems.length) {
  console.log('Guide content is valid.');
  process.exit(0);
}

console.error(`${problems.length} problem(s) in guide content:\n`);
for (const { where, message } of problems) {
  console.error(`  ${where}\n    ${message}`);
}
process.exit(1);
