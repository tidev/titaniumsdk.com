import { publishedPosts } from '../src/lib/blog/posts.ts';
import { anchorAllocator } from '../src/lib/docs/links.ts';
import { apiIndexAt, apiTypeAt, latestSdkVersion } from '../src/lib/docs/registry.ts';
import { viewOf } from '../src/lib/docs/type-view.ts';
import { existsSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import * as pagefind from 'pagefind';

/**
 * Builds the Pagefind index that backs site search (TI-47).
 *
 * ## One record per symbol, not per page
 *
 * Pagefind normally indexes rendered HTML, and TI-46 measured that: it scores
 * 3/7 on a realistic query set, because it ranks *pages*. `addEventListener`
 * is on ~200 of them — every proxy inherits it — so page-level scoring cannot
 * say which one is meant. Indexing each symbol as its own record instead takes
 * the same query set to 6/7, and it is cheaper per query: a symbol's fragment
 * is a line, where a page's fragment carries the whole page.
 *
 * ## Why this runs before `next build`
 *
 * `public/` is collected during the build, so an index written afterwards is
 * never deployed. Custom records are built from `registry/` and `content/`
 * rather than from rendered HTML, which means this can run first — and the
 * pages render from exactly the same source, so the index still cannot
 * describe something the site does not have.
 *
 * The output is generated, never committed, so it cannot go stale: a release
 * commits to `registry/`, which deploys, which reruns this.
 *
 *   node scripts/generate-search-index.ts
 */

const OUT = join(import.meta.dirname, '../public/_pagefind');

/** What the results list groups by. Guides join this when TI-32 lands. */
type Kind = 'api' | 'module' | 'blog';

type Entry = {
  url: string;
  title: string;
  kind: Kind;
  /** Indexed text. The title is repeated so a name match outweighs prose. */
  body: string;
  /**
   * Shown under the title instead of Pagefind's excerpt.
   *
   * The excerpt is drawn from `body`, which starts with the name so that a name
   * match ranks — so the excerpt reads "util.types.isMap isMap Returns true…",
   * repeating the title directly beneath it. This is the sentence a reader
   * actually wants. Blog posts have none and keep the excerpt, where a snippet
   * around the match is the useful thing.
   */
  summary?: string;
};

const records: Entry[] = [];

/**
 * Reduces apidoc prose to the words worth indexing.
 *
 * Link targets go first and deliberately: summaries are full of
 * `[Titanium.UI.Window](api:Titanium.UI.Window)`, and stripping the brackets
 * before the targets leaves `Titanium.UI.Window api:Titanium.UI.Window` in
 * every excerpt — the cross-reference syntax read as content.
 */
const plain = (s: string | undefined) =>
  (s ?? '')
    .replace(/<[^>]+>/g, ' ')
    // [label](target) -> label, and bare <api:...> style targets dropped
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\bapi:[\w.]+/g, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[`*_[\]()#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// ---- SDK reference ----------------------------------------------------------
const version = latestSdkVersion();
if (!version) throw new Error('no SDK version in the registry; nothing to index');

const sdkIndex = apiIndexAt(join(process.cwd(), 'registry/sdk', version));
if (!sdkIndex) throw new Error(`no API index at registry/sdk/${version}`);

for (const entry of sdkIndex.types) {
  const type = apiTypeAt(join(process.cwd(), 'registry/sdk', version), entry.name);
  if (!type) continue;

  records.push({
    url: `/docs/sdk/${version}/${entry.name}`,
    title: entry.name,
    kind: 'api',
    body: `${entry.name} ${plain(entry.summary ?? type.summary)} ${plain(type.description)}`,
    summary: plain(entry.summary ?? type.summary),
  });

  // The same view the page renders, and the same anchors allocated from it.
  // A member's id is not simply its name: Window has a method `open()` and an
  // event `open`, so one of the two is suffixed (TI-26). Recomputing that here
  // from declared members in a different group order would produce links to
  // anchors that do not exist, for the 41 types where the names collide.
  const view = viewOf(
    (name) => apiTypeAt(join(process.cwd(), 'registry/sdk', version), name),
    type
  );
  const groups = [view.properties, view.methods, view.events];
  const anchor = anchorAllocator(groups, ['property', 'method', 'event']);

  for (const members of groups) {
    // Declared members only, as before: every proxy inherits addEventListener,
    // and indexing the inherited copies is precisely the "205 results, none
    // relevant" failure TI-46 measured. Taken from the view rather than from
    // the type because the view rebuilds each member as a new object — an
    // identity the allocator needs, and which a declared-member loop would not
    // have, falling back silently to an anchor the page does not render.
    for (const member of members.filter((m) => !m.inheritedFrom)) {
      records.push({
        url: `/docs/sdk/${version}/${entry.name}#${anchor(member)}`,
        title: `${entry.name}.${member.name}`,
        kind: 'api',
        // The bare name as well as the qualified one, and it is load-bearing:
        // Pagefind keeps `Titanium.Proxy.addEventListener` whole, so without
        // the bare token a search for `addEventListener` matches the wrong
        // records. Measured — dropping it turned an exact hit into
        // `Titanium.UI.ListItem`.
        body: `${entry.name}.${member.name} ${member.name} ${plain(member.summary)}`,
        summary: plain(member.summary),
      });
    }
  }
}

// ---- Modules ----------------------------------------------------------------
const MODULES = join(process.cwd(), 'registry/modules');
for (const id of readdirSync(MODULES)) {
  const dir = join(MODULES, id);
  if (!statSync(dir).isDirectory()) continue;
  const indexPath = join(dir, 'index.json');
  if (!existsSync(indexPath)) continue;

  const index = JSON.parse(readFileSync(indexPath, 'utf8')) as {
    description?: string;
    latest?: Record<string, string>;
  };

  records.push({
    url: `/modules/${id}`,
    title: id,
    kind: 'module',
    body: `${id} ${plain(index.description)}`,
    summary: plain(index.description),
  });

  // Latest released version per platform. `main` is the unreleased tree and is
  // left out: search should return what someone can install (TI-46).
  for (const released of new Set(Object.values(index.latest ?? {}).map(String))) {
    const api = apiIndexAt(join(dir, released));
    if (!api) continue;
    for (const entry of api.types) {
      records.push({
        // The module API page renders `id="<type>"` per type.
        url: `/modules/${id}/api#${entry.name}`,
        title: entry.name,
        kind: 'module',
        body: `${entry.name} ${id} ${plain(entry.summary)}`,
        summary: plain(entry.summary),
      });
    }
  }
}

// ---- Blog -------------------------------------------------------------------
for (const post of publishedPosts()) {
  records.push({
    url: `/blog/${post.slug}`,
    title: post.title,
    kind: 'blog',
    body: `${post.title} ${plain(post.description)} ${plain(post.body)}`,
  });
}

// ---- Write ------------------------------------------------------------------
rmSync(OUT, { recursive: true, force: true });

const { index, errors: createErrors } = await pagefind.createIndex({ forceLanguage: 'en' });
if (createErrors?.length) throw new Error(createErrors.join('\n'));
if (!index) throw new Error('pagefind returned no index');

// A url is the record's identity here, and two records sharing one would make
// the second unreachable. 26 SDK members repeat a name within their own type
// (TI-46), so this is a real case rather than a defensive one.
const seen = new Set<string>();
const duplicates: string[] = [];
for (const entry of records) {
  if (seen.has(entry.url)) {
    duplicates.push(entry.url);
    continue;
  }
  seen.add(entry.url);
  await index.addCustomRecord({
    url: entry.url,
    content: entry.body,
    language: 'en',
    // Only what the result list needs to render. Pagefind indexes meta values
    // as well as content — verified with a token present only in meta — so a
    // summary here would be indexed twice and dilute name matches.
    meta: { title: entry.title, kind: entry.kind },
    filters: { kind: [entry.kind] },
  });
}

const { errors: writeErrors } = await index.writeFiles({ outputPath: OUT });
if (writeErrors?.length) throw new Error(writeErrors.join('\n'));

const byKind = records.reduce<Record<string, number>>((acc, r) => {
  acc[r.kind] = (acc[r.kind] ?? 0) + 1;
  return acc;
}, {});

console.log(`indexed ${seen.size} records ${JSON.stringify(byKind)}`);
if (duplicates.length) console.log(`  ${duplicates.length} duplicate urls skipped`);
console.log(`  wrote ${OUT}`);
