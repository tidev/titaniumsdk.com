import { readFileSync } from 'node:fs';

/**
 * Vercel's Ignored Build Step: builds a preview only when a code owner wrote
 * the commit. Production always builds.
 *
 *   node scripts/preview-gate.ts
 *
 * Wired up by `ignoreCommand` in `vercel.json`. Vercel reads the exit code
 * backwards from every other tool: 1 means "build", 0 means "skip". A crash
 * exits 1 too, so if this script breaks, deploys go back to building every
 * commit, the way they did before this script existed. That is deliberate. The
 * other failure mode would be a production deploy that skips itself.
 *
 * ## Why gate previews at all
 *
 * Every preview takes up space in the free tier's 10 GB of Deployment Storage,
 * and most pull requests here come from forks: directory listings, showcase
 * entries, small doc fixes. A reviewer of those needs the diff, not a site
 * build. Previews are for the people who change the site itself.
 *
 * ## Who counts as a code owner
 *
 * Any `@login` named anywhere in `.github/CODEOWNERS`. Ownership of the
 * changed paths does not matter. Team entries (`@org/team`) and email entries
 * are skipped, because resolving them needs the GitHub API, and unauthenticated
 * calls from Vercel's shared build IPs run out of rate limit. That is why
 * CODEOWNERS names people by login.
 *
 * ## Whose commit
 *
 * The commit author, from `VERCEL_GIT_COMMIT_AUTHOR_LOGIN`. Vercel does not
 * expose who opened the pull request. In practice the two are the same person,
 * and the difference helps: to get a preview of a contributor's pull request,
 * push a commit to it (an empty one is fine) and that commit builds.
 *
 * ## This is not a security boundary
 *
 * It keeps storage down, and it keeps no one out. A commit's author is
 * whatever email it carries, and both this script and CODEOWNERS are read from
 * the pull request's own tree, so a fork can edit them. Doing that only gets a
 * fork the preview that every pull request got before this script. Keeping
 * secrets away from fork builds is the job of Vercel's Git Fork Protection
 * setting, not this script.
 */

const BUILD = 1;
const SKIP = 0;

function decide(): number {
  const env = process.env.VERCEL_ENV;
  if (env === 'production') {
    console.log('Production deploy: building.');
    return BUILD;
  }

  const login = process.env.VERCEL_GIT_COMMIT_AUTHOR_LOGIN?.trim() ?? '';
  if (!login) {
    // No GitHub account is linked to the commit's email address, so
    // there is no login to compare against CODEOWNERS.
    console.log('Commit author has no GitHub login: skipping the preview.');
    return SKIP;
  }

  let owners: Set<string>;
  try {
    owners = codeOwners(readFileSync('.github/CODEOWNERS', 'utf8'));
  } catch (err) {
    console.log(
      `Could not read .github/CODEOWNERS (${(err as Error).message}): skipping the preview.`
    );
    return SKIP;
  }

  if (owners.has(login.toLowerCase())) {
    console.log(`@${login} is a code owner: building the preview.`);
    return BUILD;
  }

  console.log(`@${login} is not in .github/CODEOWNERS: skipping the preview.`);
  return SKIP;
}

/** Every individual `@login` in a CODEOWNERS file, lowercased: GitHub logins ignore case. */
function codeOwners(source: string): Set<string> {
  const owners = new Set<string>();
  for (const raw of source.split('\n')) {
    const line = raw.replace(/#.*/, '').trim();
    if (!line) continue;
    // The first token is the path pattern, and the rest are owners.
    for (const owner of line.split(/\s+/).slice(1)) {
      if (owner.startsWith('@') && !owner.includes('/')) owners.add(owner.slice(1).toLowerCase());
    }
  }
  return owners;
}

process.exit(decide());
