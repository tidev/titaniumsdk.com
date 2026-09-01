import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';

/**
 * Fills in each post's `social` frontmatter — the text the share buttons
 * pre-fill (TI-53).
 *
 * Prefers what was actually posted. The Bluesky account is public, so its feed
 * is fetched and matched to posts by version; everything else is generated from
 * the house template.
 *
 * X is not readable. Its API needs a bearer token and the public profile is a
 * JavaScript shell containing none of the post text, so nothing can be
 * recovered from there without credentials. That matters less than it sounds:
 * both accounts run the same copy, so a Bluesky match is the X post too.
 *
 *   node scripts/generate-social-posts.ts [--check]
 */

const CONTENT = join(import.meta.dirname, '../content/blog');
const SITE = 'https://titaniumsdk.com';
const HASHTAGS = '#titaniumsdk #mobiledev #javascript';

/**
 * Bluesky's ceiling. X allows 280 but counts a URL as 23 regardless of length,
 * so anything that fits Bluesky fits X.
 */
const MAX = 300;

type Kind = 'sdk' | 'cli' | 'alloy' | 'other';

const kindOf = (title: string): Kind =>
  /^Titanium SDK \d/.test(title)
    ? 'sdk'
    : /^Titanium CLI \d/.test(title)
      ? 'cli'
      : /^Alloy \d/.test(title)
        ? 'alloy'
        : 'other';

const versionOf = (title: string) => title.match(/\d+\.\d+\.\d+(\.(GA|RC|Beta)\d*)?/)?.[0];

/**
 * How each kind is installed. The template's `ti sdk i` line is right for an
 * SDK release and wrong for everything else — the CLI and Alloy come from npm,
 * and a post like Hacktoberfest has nothing to install at all.
 */
function installLine(kind: Kind, version: string | undefined) {
  if (!version) return undefined;
  if (kind === 'sdk') return `Install: ti sdk i ${version}`;

  const pkg = kind === 'cli' ? 'titanium' : kind === 'alloy' ? 'alloy' : undefined;
  if (!pkg) return undefined;

  // npm never sees the SDK's `.RC` spelling. A prerelease is published as
  // `7.0.0-rc`, so `titanium@7.0.0.RC` would fail to resolve. The posts
  // themselves say `@next`, but that tag has since moved on to a later major.
  const tag = version.replace(/\.(RC|Beta)/, (_, s) => `-${s.toLowerCase()}`);
  return `Install: npm i -g ${pkg}@${tag}`;
}

/**
 * The line of the template that highlights what shipped.
 *
 * A post's `description` is the default, but roughly half of them are either
 * a title-cased fragment ("Gradle 8 Support") or pure boilerplate ("The stable
 * version (GA) ... is now available") that says nothing. These are written from
 * each post's own body — the substance is in the prose, not in a field a script
 * can lift.
 */
const HIGHLIGHTS = new Map([
  [
    'sdk-12-6-0-ga',
    'Stable Gradle 8 support for Material 3, faster list views, native iOS 18 dark mode app icons, and Ti.Calendar APIs up to 150x faster.',
  ],
  [
    'sdk-12-6-0-rc',
    'Stable Gradle 8 support for Material 3 themes, list view performance improvements, and native iOS 18 dark mode app icons.',
  ],
  ['sdk-12-6-1-ga', 'Fixes a click event regression on iOS introduced in 12.6.0.GA.'],
  ['sdk-12-6-2-ga', 'Fixes bugs across all platforms and improves general stability.'],
  [
    'sdk-12-6-3-ga',
    'Fixes several high-priority Gradle issues and ANR (application not responding) errors on Android.',
  ],
  [
    'sdk-12-6-4-ga',
    'Restores compatibility with Xcode 16.3 and later, required to build for iOS 18.4+.',
  ],
  [
    'sdk-12-4-0-ga',
    'Opt-in support for Android API level 34, which Google requires for all new apps and updates from August 2024.',
  ],
  [
    'sdk-12-4-0-rc',
    'Opt-in support for Android API level 34, which Google requires for all new apps and updates from August 2024.',
  ],
  [
    'sdk-12-5-0-ga',
    'Android API level 34 is now the default, plus official support for iOS 18, iPadOS 18, watchOS 18 and Xcode 16.',
  ],
  [
    'sdk-12-5-0-rc',
    'Android API level 34 becomes the default, plus official support for iOS 18, iPadOS 18, watchOS 18 and Xcode 16.',
  ],
  [
    'sdk-12-5-1-ga',
    'CLI fixes for the Xcode 16 toolset, plus Android list view fixes for the performance work in 12.5.0.',
  ],
  [
    'sdk-12-2-0-ga',
    'Full support for iOS 17 and Xcode 15, new Android APIs, and iOS stability improvements.',
  ],
  [
    'sdk-12-2-0-rc',
    'Support for iOS 17 and Xcode 15, new Android APIs, and iOS stability improvements.',
  ],
  [
    'sdk-12-2-1-ga',
    'Fixes Android camera overlays and iOS 17 crashes involving backgroundRepeat, navTintColor and VideoPlayer.',
  ],
  [
    'sdk-12-3-1-ga',
    'Bug fixes, plus support and documentation for the Apple privacy manifests required from May 1, 2024.',
  ],
  [
    'sdk-12-3-1-rc',
    'Bug fixes, plus support and documentation for the Apple privacy manifests required from May 1, 2024.',
  ],
  [
    'sdk-12-7-0-ga',
    'More iOS/Android parity with Tab#popToRootWindow, Ti.App.keyboardVisible and Label.letterSpacing, plus updated Google Play Services.',
  ],
  ['sdk-12-7-1-ga', 'Fixes two Android issues for better stability across the build target.'],
  [
    'sdk-12-8-0-ga',
    'Compatibility with Android target SDK 35, plus bug fixes and improvements across iOS and Android.',
  ],
  ['sdk-12-1-2-ga', 'Fixes issues from 12.1.1.GA and updates Hyperloop to 7.0.5.'],
  ['sdk-12-1-1-ga', 'Restores building with older versions of Xcode, which broke in 12.1.0.GA.'],
  [
    'sdk-12-1-0-ga',
    'Support for Node.js 19, enhanced Android 13 and macOS support, and more parity APIs between iOS and Android.',
  ],
  [
    'sdk-12-1-0-rc',
    'Support for Node.js 19, enhanced Android 13 and macOS support, and more parity APIs between iOS and Android.',
  ],
  [
    'sdk-12-0-0-ga',
    'iOS gains Dynamic Island support and a new error page, while Android moves to targetSDK 33 with Material 3 themes.',
  ],
  [
    'sdk-12-0-0-rc',
    'iOS gains Dynamic Island support and a new error page, while Android moves to targetSDK 33 with Material 3 themes.',
  ],
  [
    'sdk-11-1-1-ga',
    'Fixes an iOS crash from a deprecated API log, an Android crash with modules built on 11.1.0, and testing on Apple Silicon.',
  ],
  [
    'sdk-11-1-0-ga',
    'Early support for iOS 16 and Xcode 14, plus parity and stability improvements across the board.',
  ],
  [
    'sdk-11-1-0-rc',
    'The first release candidate for 11.1.0, addressing high-priority issues from previous releases.',
  ],
  [
    'sdk-11-ga',
    'The first GA release under TiDev, with 62+ features and fixes from TiDev staff and the Titanium community.',
  ],
  [
    'release-sdk-11',
    'After months of work, the 11.0.0 release candidate arrives with a large batch of features and bug fixes.',
  ],
  [
    'cli-7-0-0-ga',
    'A complete refactor. The CLI is now ESM, which unlocks modern dependencies and updates to the SDK build code.',
  ],
  [
    'cli-7-0-0-rc',
    'The first major CLI release in two years — an ESM refactor that unblocks dependency and SDK build updates.',
  ],
  [
    'cli-7-1-0-ga',
    'Async hook init() support, surfaced SDK install errors, and fixes for ti sdk rm, ti project and module reinstalls.',
  ],
  [
    'alloy-2-1-0',
    'Refreshed dependencies including underscore 1.13.6 and moment.js 2.29.4, an updated default template, and parser fixes.',
  ],
  [
    'hacktoberfest2022',
    'Titanium is taking part again: the SDK and documentation repos are Hacktoberfest repos, so fix docs, add examples or write code.',
  ],
]);

function generate(title: string, description: string, slug: string) {
  const kind = kindOf(title);
  const version = versionOf(title);
  const headline =
    kind === 'other' || !version ? title : `${title.replace(/\s+released$/, '')} is out!`;

  return [
    headline,
    '',
    HIGHLIGHTS.get(slug) ?? description,
    '',
    `Blog: ${SITE}/blog/${slug}`,
    installLine(kind, version),
    '',
    HASHTAGS,
  ]
    .filter((line) => line !== undefined)
    .join('\n');
}

/** Repoint the blog line at this site — the originals link to tidev.io. */
const repoint = (text: string, slug: string) =>
  text
    .replace(/^Blog: \S+$/m, `Blog: ${SITE}/blog/${slug}`)
    .replace(/Read more: \S+?\.?$/m, `Read more: ${SITE}/blog/${slug}`);

/** Frontmatter is single-quoted, so emit a literal block scalar rather than a quoted one. */
const toBlockScalar = (text: string) =>
  `social: |-\n${text
    .split('\n')
    .map((line) => (line ? `  ${line}` : ''))
    .join('\n')}`;

async function bluesky() {
  const posts: string[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < 20; page++) {
    const url = new URL('https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed');
    url.searchParams.set('actor', 'titaniumsdk.com');
    url.searchParams.set('limit', '100');
    if (cursor) url.searchParams.set('cursor', cursor);

    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`  ! Bluesky returned ${res.status}; generating every post`);
      return posts;
    }
    const json = (await res.json()) as {
      feed?: { reason?: unknown; post: { record: { text?: string; reply?: unknown } } }[];
      cursor?: string;
    };
    for (const item of json.feed ?? []) {
      if (item.reason || item.post.record.reply) continue;
      if (item.post.record.text) posts.push(item.post.record.text);
    }
    cursor = json.cursor;
    if (!cursor) break;
  }
  return posts;
}

const checkOnly = process.argv.includes('--check');
const feed = await bluesky();
console.log(`${feed.length} posts on Bluesky`);

let matched = 0;
let generated = 0;
const stale: string[] = [];
const overLong: string[] = [];

for (const file of readdirSync(CONTENT)
  .filter((f) => f.endsWith('.md'))
  .sort()) {
  const path = join(CONTENT, file);
  const text = readFileSync(path, 'utf8');
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(text);
  if (!m) continue;

  const front = m[1];
  const slug = file.replace(/\.md$/, '');
  const data = parseYaml(front) as { title: string; description?: string; social?: string };

  const version = versionOf(data.title);
  // Matched on version, not on the blog URL: Bluesky truncates the display URL
  // in the post text and keeps the real target in a facet.
  const hit = version ? feed.find((p) => p.includes(version)) : undefined;

  const social = hit ? repoint(hit, slug) : generate(data.title, data.description ?? '', slug);
  if (hit) matched++;
  else generated++;
  if ([...social].length > MAX) overLong.push(`${slug} (${[...social].length})`);

  if (data.social === social) continue;
  stale.push(slug);

  // `social` is always written last, so dropping the old one is a tail trim.
  const nextFront = `${front.replace(/\n?^social:[\s\S]*$/m, '')}\n${toBlockScalar(social)}`;
  if (!checkOnly) writeFileSync(path, text.replace(front, nextFront));
}

console.log(`  ${matched} taken from Bluesky, ${generated} generated`);
console.log(`  ${stale.length} ${checkOnly ? 'stale' : 'updated'}`);
for (const post of overLong) console.warn(`  ! over ${MAX} characters: ${post}`);

if (checkOnly && stale.length) {
  console.error('Committed social text is stale — rerun without --check.');
  process.exit(1);
}
