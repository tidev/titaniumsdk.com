import './lib/env.ts';
import { BlockedListSchema } from '../src/lib/registry/packages.ts';
import { excludedBecause, type Exclusion } from './lib/community-filter.ts';
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
 * `titanium`, `titanium-module` or `titanium-sdk` topic. Nothing else about a
 * community module can be known without cloning it.
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
 * The topics that register a module.
 *
 * `titanium` is the query module-search-www used, unchanged. `titanium-module`
 * and `titanium-sdk` are the topics a good share of authors picked instead, so a
 * repo carrying any of them is listed. `in:topics` is doing the real work; the
 * language filters only keep each result set inside the search API's
 * 1,000-item ceiling.
 *
 * One search per topic rather than a single `OR`, because the repository search
 * does not reliably honour boolean operators. A repo tagged with several shows
 * up in several result sets and is listed once, keyed on its slug.
 */
const LANGUAGES = 'language:objc language:swift language:java language:kotlin language:javascript';
const QUERIES = ['titanium', 'titanium-module', 'titanium-sdk'].map(
  (topic) => `${topic} in:topics ${LANGUAGES}`
);

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
  fork: boolean;
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
  listedAt: string;
};

/**
 * Repos this site already speaks for, so nothing is listed twice.
 *
 * Two sources, because they catch different things. `sources.json` is the
 * docgen allowlist, which is what excludes tidev/titanium-sdk - the SDK has
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

/**
 * Repos a person has decided must never be listed (TI-23).
 *
 * Separate from the fork and archived filters below, which are mechanical. This
 * is for judgement: a broken module, a name-squat, a repo whose owner asked to
 * be delisted. Each entry carries its reason, so the list can be re-reviewed by
 * someone who was not there. See `docs/module-curation.md`.
 */
function blockedRepos(): Set<string> {
  const file = join(root, MODULES_DIR, 'blocked.json');
  if (!existsSync(file)) return new Set();
  const parsed = BlockedListSchema.parse(JSON.parse(readFileSync(file, 'utf8')));
  return new Set(parsed.modules.map((m) => m.repo.toLowerCase()));
}

/**
 * When each listed repo was first seen, keyed on its lowercased slug.
 *
 * Read from the committed file, because GitHub has no such date: `created_at`
 * is when the repository was made, and a module from 2015 that gains the topic
 * today is new to this list today. A slug that is not in the previous file gets
 * the time of this run, and `/modules/feed.xml` orders on the result.
 */
function previouslyListed(): Map<string, string> {
  if (!existsSync(OUT)) return new Map();
  const previous = JSON.parse(readFileSync(OUT, 'utf8')) as {
    modules?: { id: string; listedAt?: string }[];
  };
  return new Map(
    (previous.modules ?? []).flatMap((m) =>
      m.listedAt ? [[m.id.toLowerCase(), m.listedAt] as const] : []
    )
  );
}

const listed = previouslyListed();
// To the second, the precision GitHub uses for `pushed_at`.
const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');

const curated = curatedRepos();
console.log(`${curated.size} curated repos will be skipped`);

const blocked = blockedRepos();
console.log(`${blocked.size} repos are blocked`);

const seen = new Map<string, SearchRepo>();
for (const q of QUERIES) {
  let hits = 0;
  for await (const page of paginate<SearchRepo>('/search/repositories', { q, sort: 'stars' })) {
    for (const repo of page) {
      hits++;
      seen.set(repo.full_name.toLowerCase(), repo);
    }
  }
  console.log(`${hits} repos match "${q}"`);
}
const candidates = [...seen.values()];
console.log(`${candidates.length} distinct repos carry a topic`);

// Ahead of the platform test below, which is a network round trip per repo, so
// anything dropped here costs nothing. The rules are in `community-filter.ts`,
// where they can be tested without a token.
const dropped: Record<Exclusion, number> = { curated: 0, blocked: 0, archived: 0, fork: 0 };
const fresh = candidates.filter((r) => {
  const why = excludedBecause(r, curated, blocked);
  if (why) dropped[why]++;
  return why === null;
});
console.log(
  `${fresh.length} remain (dropped ${dropped.curated} curated, ${dropped.blocked} blocked, ${dropped.archived} archived, ${dropped.fork} forks)`
);

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
    listedAt: listed.get(repo.full_name.toLowerCase()) ?? now,
  });
}

// Sorted here rather than at render time, so the committed file has a stable
// order and a regen that changes nothing produces no diff.
modules.sort((a, b) => b.stars - a.stars || a.id.localeCompare(b.id));

console.log(`${modules.length} have a platform directory`);
console.log(`  ${modules.filter((m) => m.listedAt === now).length} are new to the list`);
console.log(`  ${modules.filter((m) => m.platforms.length === 2).length} ship both platforms`);

const payload = {
  $comment: 'Generated by scripts/generate-community-modules.ts - do not edit by hand.',
  source: { queries: QUERIES, repos: modules.length },
  modules,
};
const json = `${JSON.stringify(payload, null, 2)}\n`;

if (checkOnly) {
  const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
  if (current === json) {
    console.log('Committed index is current.');
  } else {
    console.error('Committed index is stale - rerun without --check.');
    process.exit(1);
  }
} else {
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, json);
  console.log(`Wrote ${OUT}`);
}
