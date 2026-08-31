import './lib/env.ts';
import { paginate } from './lib/github.ts';
import { MODULES_DIR } from './lib/registry-paths.ts';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The community module index.
 *
 * Replaces tidev/module-search-www, whose committed `data.json` was last
 * regenerated in March 2024. Same search it used, because that search is the
 * de-facto registration mechanism: there is no module registry to publish to,
 * so a module is discoverable exactly when its repository carries the
 * `titanium` topic. Nothing else about a community module can be known without
 * cloning it.
 *
 * What this cannot produce, and why these are not the same thing as the
 * curated modules in `registry/modules/<id>/`:
 *
 *   - No module id. That lives in each platform's `manifest`, which means
 *     reading two files per repo per release. The repository slug is the key
 *     instead, which is also the only thing a reader can act on.
 *   - No versions, assets, or compiled docs. Releases are attached to GitHub
 *     tags in whatever shape the author chose.
 *
 * So these entries link out rather than getting a page here, and the browse
 * list says which kind each one is.
 *
 * Usage: pnpm registry:community [--check]
 */

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(root, MODULES_DIR, 'community.json');
const checkOnly = process.argv.includes('--check');

/**
 * The query module-search-www used, unchanged.
 *
 * `in:topics` is doing the real work; the language filters only keep the result
 * set inside the search API's 1,000-item ceiling.
 */
const QUERY =
  'titanium in:topics language:objc language:swift language:java language:kotlin language:javascript';

/** A repo is a module if it has a platform directory. Same test as before. */
const PLATFORM_DIRS: Record<string, 'android' | 'ios'> = {
  android: 'android',
  ios: 'ios',
  // The pre-6.0 name for the iOS directory. Plenty of these are still the
  // newest thing their author published.
  iphone: 'ios',
};

type SearchRepo = {
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  updated_at: string;
  pushed_at: string;
  stargazers_count: number;
  archived: boolean;
  owner: { login: string; html_url: string };
};

type CommunityModule = {
  id: string;
  name: string;
  owner: string;
  ownerUrl: string;
  url: string;
  description?: string;
  platforms: ('android' | 'ios')[];
  stars: number;
  archived: boolean;
  pushedAt: string;
};

/**
 * Repos this site already speaks for, so nothing is listed twice.
 *
 * Two sources, because they catch different things. `sources.json` is the
 * docgen allowlist, which is what excludes tidev/titanium-sdk — the SDK has
 * `android/` and `ios/` directories and so passes the module test below, while
 * being the opposite of a module. The registry directories catch anything
 * curated that the allowlist does not name.
 */
function curatedRepos(): Set<string> {
  const dir = join(root, MODULES_DIR);
  const slugs = new Set<string>();

  const sources = JSON.parse(readFileSync(join(root, 'scripts/docgen/sources.json'), 'utf8')) as {
    sources: Record<string, unknown>;
  };
  for (const slug of Object.keys(sources.sources)) slugs.add(slug.toLowerCase());

  if (!existsSync(dir)) return slugs;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const indexPath = join(dir, entry.name, 'index.json');
    if (!existsSync(indexPath)) continue;
    const repo = (JSON.parse(readFileSync(indexPath, 'utf8')) as { repo?: string }).repo;
    if (repo) {
      slugs.add(
        repo
          .replace(/^https:\/\/github\.com\//, '')
          .replace(/\.git$/, '')
          .toLowerCase()
      );
    }
  }
  return slugs;
}

/**
 * Which platform directories a repo has at its default branch.
 *
 * A HEAD against the contents API rather than a GET: the answer is the status
 * code, and some of these directories are large.
 */
async function platformsOf(fullName: string): Promise<('android' | 'ios')[]> {
  const found = new Set<'android' | 'ios'>();

  await Promise.all(
    Object.entries(PLATFORM_DIRS).map(async ([dir, platform]) => {
      const res = await fetch(`https://api.github.com/repos/${fullName}/contents/${dir}`, {
        method: 'HEAD',
        headers: {
          accept: 'application/vnd.github+json',
          'user-agent': 'titaniumsdk.com',
          ...(process.env.GITHUB_TOKEN
            ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
            : {}),
        },
      });
      if (res.ok) found.add(platform);
    })
  );

  // Android before iOS, matching PLATFORM_ORDER on the site.
  return (['android', 'ios'] as const).filter((p) => found.has(p));
}

const curated = curatedRepos();
console.log(`${curated.size} curated repos will be skipped`);

const candidates: SearchRepo[] = [];
for await (const page of paginate<SearchRepo>('/search/repositories', {
  q: QUERY,
  sort: 'stars',
})) {
  candidates.push(...page);
}
console.log(`${candidates.length} repos carry the topic`);

const fresh = candidates.filter((r) => !curated.has(r.full_name.toLowerCase()));
console.log(`${fresh.length} are not already in the registry`);

const modules: CommunityModule[] = [];
for (const repo of fresh) {
  const platforms = await platformsOf(repo.full_name);
  if (!platforms.length) continue;

  modules.push({
    id: repo.full_name,
    name: repo.name,
    owner: repo.owner.login,
    ownerUrl: repo.owner.html_url,
    url: repo.html_url,
    ...(repo.description ? { description: repo.description } : {}),
    platforms,
    stars: repo.stargazers_count,
    archived: repo.archived,
    pushedAt: repo.pushed_at,
  });
}

// Sorted here rather than at render time, so the committed file has a stable
// order and a regen that changes nothing produces no diff.
modules.sort((a, b) => b.stars - a.stars || a.id.localeCompare(b.id));

console.log(`${modules.length} have a platform directory`);
console.log(`  ${modules.filter((m) => m.archived).length} archived`);
console.log(`  ${modules.filter((m) => m.platforms.length === 2).length} ship both platforms`);

const payload = {
  $comment: 'Generated by scripts/generate-community-modules.ts — do not edit by hand.',
  source: { query: QUERY, repos: modules.length },
  modules,
};
const json = `${JSON.stringify(payload, null, 2)}\n`;

if (checkOnly) {
  const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
  if (current === json) {
    console.log('Committed index is current.');
  } else {
    console.error('Committed index is stale — rerun without --check.');
    process.exit(1);
  }
} else {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, json);
  console.log(`Wrote ${OUT}`);
}
