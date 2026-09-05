import { execFileSync } from 'node:child_process';

/**
 * When a guide was last actually changed, from git rather than frontmatter.
 *
 * A hand-maintained date is wrong the first time someone forgets it, and every
 * page in the legacy corpus that carried one is now years out of step with its
 * content. The commit date cannot drift from the file it describes.
 *
 * Returns undefined rather than a guess when git cannot answer — a shallow
 * clone with no history for the file, an untracked page during `next dev`, or
 * no git at all. The page then shows no date, which is honest; showing today's
 * date for a page written in 2019 would not be.
 */

const cache = new Map<string, string | undefined>();

export function lastUpdated(repoPath: string): string | undefined {
  const hit = cache.get(repoPath);
  if (hit !== undefined || cache.has(repoPath)) return hit;

  let date: string | undefined;
  try {
    // %cs is the committer date as YYYY-MM-DD, already the format the site
    // formats from, with no timezone to get wrong.
    const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', repoPath], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    // Empty for a file git knows nothing about, which is not an error here.
    date = /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : undefined;
  } catch {
    date = undefined;
  }

  cache.set(repoPath, date);
  return date;
}
