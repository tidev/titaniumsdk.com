import { mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

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
 * Stored as they are. They are generated, so reformatting them would only make
 * the next capture a diff. Links are rewritten — see `rewrite` below — because
 * the addresses they carry are the old site's, and this site is what replaces
 * it.
 *
 * Deliberately not part of the build: a published release's notes never change,
 * so this is a decision someone makes, not something that happens on a schedule.
 *
 *   node scripts/capture-release-notes.ts          list what is there
 *   node scripts/capture-release-notes.ts --write  fetch and store
 */

const REPO = 'tidev/titanium-docs';
const ROOT = 'docs/guide/Titanium_SDK/Titanium_SDK_Release_Notes';
const OUT = join(process.cwd(), 'registry/sdk/release-notes');
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

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

let stored = 0;
for (const note of notes) {
  const blob = await api<{ content: string }>(`repos/${REPO}/contents/${encodeURI(note.path)}`);
  const body = rewrite(Buffer.from(blob.content, 'base64').toString('utf8'));
  writeFileSync(join(OUT, `${note.release}.md`), body.endsWith('\n') ? body : `${body}\n`);
  stored++;
}

const bytes = readdirSync(OUT).reduce((n, f) => n + statSync(join(OUT, f)).size, 0);
console.log(`\n${stored} stored in registry/sdk/release-notes (${(bytes / 1024).toFixed(0)} KB)`);
