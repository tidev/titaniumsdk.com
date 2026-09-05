import { PINS, TAG, repin } from './lib/doc-pins.ts';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Moves the upstream versions pinned in guide content to the current release.
 *
 *   node scripts/refresh-doc-pins.ts [--check]
 *
 * ## Why this is not part of the build
 *
 * TI-25 requires the build to read the filesystem and nothing else, and
 * `scripts/assert-offline.ts` enforces it. Fetching a version while rendering
 * would also make two builds of one commit produce different pages, which is
 * the property preview deploys rest on.
 *
 * So the version is baked into the content instead, exactly as
 * `scripts/fetch-fonts.ts` bakes in a font file, and this script is what bakes
 * it. `.github/workflows/refresh-doc-pins.yml` runs it weekly and commits the
 * result.
 *
 * ## Why it rewrites the markdown
 *
 * A placeholder resolved at render time would keep the value in one place, at
 * the cost of the install command in the source no longer being the command.
 * Guide sources are read directly on GitHub and copied out of pull requests,
 * and `{{nvm}}` in a shell line is worse for every one of those readers than a
 * committed diff bumping a tag.
 *
 * ## Why it is not in CI
 *
 * An nvm release would fail an unrelated pull request. The scheduled workflow
 * commits the bump instead; `--check` is for asking on demand.
 */

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** --check reports what would move without writing. */
const checkOnly = process.argv.includes('--check');

/**
 * The current release tag of a public repository.
 *
 * Unauthenticated by default, unlike `scripts/lib/github.ts`, which requires a
 * token because everything it reaches for is rate-limit-sensitive pagination.
 * This is one request against a public endpoint, and demanding a credential to
 * refresh a URL in a doc would just mean nobody runs it. CI passes a token
 * anyway, because runner IPs share the anonymous quota.
 */
async function latestTag(repo: string): Promise<string> {
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
    headers: {
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    throw new Error(`GET /repos/${repo}/releases/latest -> ${res.status} ${res.statusText}`);
  }

  const { tag_name: tag } = (await res.json()) as { tag_name?: unknown };
  if (typeof tag !== 'string' || !TAG.test(tag)) {
    throw new Error(`${repo} latest release is tagged ${String(tag)}, which is not a version`);
  }
  return tag;
}

let stale = 0;

for (const pin of PINS) {
  const version = await latestTag(pin.repo);
  const replaced = new Set<string>();

  for (const file of pin.files) {
    const path = join(ROOT, file);
    const source = readFileSync(path, 'utf8');
    const { text, found } = repin(source, pin, version);

    if (!found.length) {
      throw new Error(`${pin.name}: nothing matched in ${file} — the pin no longer names it`);
    }
    for (const was of found) {
      if (was !== version) replaced.add(was);
    }
    if (text !== source && !checkOnly) writeFileSync(path, text);
  }

  if (!replaced.size) {
    console.log(`${pin.name} ${version} — current`);
    continue;
  }

  stale++;
  const from = [...replaced].join(', ');
  console.log(`${pin.name} ${from} -> ${version}${checkOnly ? ' (not written)' : ''}`);
}

if (checkOnly && stale) {
  console.error(`\n${stale} pin(s) behind. Run: pnpm docs:pins`);
  process.exit(1);
}
