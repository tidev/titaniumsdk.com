import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';

/**
 * Captures the SDK release notes into the registry (TI-72).
 *
 * ## Where they actually live
 *
 * Not in the GitHub releases. Of the 71 GA releases in `registry/sdk/ga.json`,
 * 51 have an empty body and the other 20 carry nothing but a link back to the
 * old site — not one holds release notes. The in-repo changelogs are not it
 * either: `apidoc/Titanium/CHANGELOG/` stops at 3.4.0 in 2014.
 *
 * They live in `tidev/titanium-docs`, as generated markdown with frontmatter,
 * which is what the old site rendered. That repo is itself slated for archiving
 * in TI-52, so the notes are copied here rather than read across.
 *
 * Stored beside the version they describe, at
 * `registry/sdk/<version>/release-notes.md` — a release candidate shares its
 * version with the GA that follows, so it takes `release-notes.rc.md` in the
 * same directory. A directory holding only a note is inert to everything else,
 * because `sdkVersions()` keys on `contents.json` rather than on the directory
 * existing.
 *
 * The body is stored as it is. It is generated, so reformatting would only make
 * the next capture a diff. Two things are changed: links are rewritten, see
 * `rewrite` below, and the frontmatter gains `date`, `version` and `channel`.
 *
 * The date matters because the source bakes it into the title — "Titanium SDK
 * 13.4.1.GA - 25 August 2026" — so a page could only show it inside a heading.
 * It is taken from the release registry, which is the GitHub publish timestamp
 * and what the rest of the site already shows, and parsed out of the title for
 * the ten notes the registry does not list. Two of them disagreed with the
 * registry by a day, so the title no longer carries one: a page cannot
 * contradict itself about when a release happened.
 *
 * Deliberately not part of the build: a published release's notes never change,
 * so this is a decision someone makes, not something that happens on a schedule.
 *
 *   node scripts/capture-release-notes.ts          list what is there
 *   node scripts/capture-release-notes.ts --write  fetch and store
 */

const REPO = 'tidev/titanium-docs';
const ROOT = 'docs/guide/Titanium_SDK/Titanium_SDK_Release_Notes';
const SDK = join(process.cwd(), 'registry/sdk');
const write = process.argv.includes('--write');

const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
if (!token) throw new Error('GITHUB_TOKEN (or GH_TOKEN) is required');

const api = async <T>(path: string): Promise<T> => {
  const res = await fetch(`https://api.github.com/${path}`, {
    headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
  return res.json() as Promise<T>;
};

type TreeEntry = { path: string; type: string };
const tree = await api<{ tree: TreeEntry[] }>(`repos/${REPO}/git/trees/main?recursive=1`);

/**
 * `Titanium_SDK_13.4.1.GA_Release_Note.md` -> `13.4.1.GA`.
 *
 * The separator before the channel is a dot in most files and an underscore in
 * six of them — 9.2.0, 9.3.0 and 9.3.1 are all written `9.2.0_GA` — and 12.3.0
 * has an `RC2`. Matching only the common shape silently dropped those six,
 * which is how three of them came to be reported as having no release notes at
 * all. Both separators, and a numbered RC.
 */
const releaseOf = (p: string) => {
  const m = /Titanium_SDK_(\d+\.\d+\.\d+)[._](GA|RC\d*)_Release_Note\.md$/.exec(p);
  return m ? `${m[1]}.${m[2]}` : null;
};

const notes = tree.tree
  .filter((e) => e.type === 'blob' && e.path.startsWith(ROOT))
  .map((e) => ({ path: e.path, release: releaseOf(e.path) }))
  .filter((e): e is { path: string; release: string } => e.release !== null)
  .sort((a, b) => a.release.localeCompare(b.release));

// `.endsWith('.RC')` would miss 12.3.0.RC2 and report a total that does not add up.
const ga = notes.filter((n) => n.release.endsWith('.GA'));
console.log(
  `${notes.length} release notes in ${REPO}: ${ga.length} GA, ${notes.length - ga.length} pre-release`
);

/**
 * Points the prose at addresses that still exist.
 *
 * Only two rules, because only two shapes occur. Counted across all 79 source
 * files: 1,042 links to `github.com/tidev/titanium_mobile`, the repository's
 * name before it was renamed `titanium-sdk` — GitHub redirects those, but the
 * old name outlives the redirect's usefulness — and zero links into the old
 * site's `/guide` tree, which is why there is no rule rewriting those.
 *
 * The absolute-origin rule catches whatever else points at titaniumsdk.com, so
 * a captured note references this site by path rather than by hostname.
 *
 * Prose is rewritten only where the word names the repository. Four commit
 * subjects read "fix windows build of Titanium SDK - titanium_mobile", which is
 * the repository, and are renamed.
 *
 * Two are deliberately left: "replace titanium_mobile URLs" is a commit that
 * replaced exactly those URLs, so renaming it would make the sentence describe
 * the opposite of what happened. A blanket substitution would have corrupted a
 * quoted commit subject to say something untrue.
 */
function rewrite(body: string): string {
  return (
    body
      .replace(
        /https:\/\/github\.com\/tidev\/titanium_mobile\b/g,
        'https://github.com/tidev/titanium-sdk'
      )
      // A commit subject naming the repository, not a URL: "fix windows build of
      // Titanium SDK - titanium_mobile". Four of these across 11.0.0.
      .replace(/(Titanium SDK - )titanium_mobile\b/g, '$1titanium-sdk')
      .replace(/https:\/\/titaniumsdk\.com\//g, '/')
  );
}

if (!write) {
  console.log('\ndry run — pass --write to fetch and store');
  process.exit(0);
}

/** Release name -> publish date, from the channels the registry tracks. */
const published = new Map<string, string>();
for (const channel of ['ga', 'rc']) {
  const file = join(SDK, `${channel}.json`);
  if (!existsSync(file)) continue;
  for (const r of JSON.parse(readFileSync(file, 'utf8')) as { name: string; date: string }[]) {
    published.set(r.name, r.date);
  }
}

let stored = 0;
let dated = 0;
const undatedNotes: string[] = [];

for (const note of notes) {
  const blob = await api<{ content: string }>(`repos/${REPO}/contents/${encodeURI(note.path)}`);
  const raw = rewrite(Buffer.from(blob.content, 'base64').toString('utf8'));

  const front = /^---\n([\s\S]*?)\n---\n?/.exec(raw);
  const parsed = (front ? (parseYaml(front[1]) as { title?: unknown }) : {}) ?? {};
  const title = typeof parsed.title === 'string' ? parsed.title : `Titanium SDK ${note.release}`;

  const version = note.release.replace(/\.(GA|RC\d*)$/, '');
  const channel = /\.(GA|RC\d*)$/.exec(note.release)?.[1] ?? 'GA';

  // The registry is the GitHub publish timestamp and is what the rest of the
  // site shows; the title is the author-written fallback for the ten notes it
  // does not list.
  const fromTitle = /-\s*(\d{1,2}\s+\w+\s+\d{4})\s*$/.exec(title);
  const date =
    published.get(note.release) ??
    (fromTitle ? new Date(`${fromTitle[1]} UTC`).toISOString() : undefined);
  if (date) dated++;
  else undatedNotes.push(note.release);

  const yaml = [
    `title: ${title.replace(/\s*-\s*\d{1,2}\s+\w+\s+\d{4}\s*$/, '').trim()}`,
    date ? `date: ${date.slice(0, 10)}` : null,
    `version: ${version}`,
    `channel: ${channel}`,
  ]
    .filter(Boolean)
    .join('\n');

  const dir = join(SDK, version);
  mkdirSync(dir, { recursive: true });
  const name = channel === 'GA' ? 'release-notes.md' : `release-notes.${channel.toLowerCase()}.md`;
  const body = front ? raw.slice(front[0].length) : raw;
  writeFileSync(join(dir, name), `---\n${yaml}\n---\n${body.endsWith('\n') ? body : `${body}\n`}`);
  stored++;
}

console.log(`\n${stored} stored under registry/sdk/<version>/, ${dated} with a date`);
if (undatedNotes.length) {
  console.log(`  no date anywhere for: ${undatedNotes.join(', ')}`);
}
