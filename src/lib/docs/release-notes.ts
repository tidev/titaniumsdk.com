import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';

/**
 * The captured SDK release notes (TI-72).
 *
 * Written by `scripts/capture-release-notes.ts` from `tidev/titanium-docs`,
 * which is where they actually live — the GitHub releases carry none, and the
 * in-repo changelogs stop in 2014. See that script for the full account.
 *
 * ## They sit with their version
 *
 * `registry/sdk/<version>/release-notes.md`, beside that version's compiled
 * reference where one exists. Most versions have a note and no reference:
 * notes go back to 8.0.0 and only twenty versions are compiled. A directory
 * holding nothing but a note is inert to everything else, because
 * `sdkVersions()` keys on `contents.json` rather than on the directory
 * existing — checked, not assumed.
 *
 * A release candidate shares its version with the GA that follows, so it sits
 * in the same directory under `release-notes.rc.md`. Nothing renders those yet.
 *
 * ## The date is a field, not part of the title
 *
 * Titles were written "Titanium SDK 13.4.1.GA - 25 August 2026", so a page had
 * to show the date inside its heading or not at all. It is now `date` in the
 * frontmatter, taken from the release registry where the release is listed and
 * parsed out of the old title otherwise. Two of them disagreed with the
 * registry by a day, which is why the title no longer carries one: the page
 * cannot contradict itself.
 */

const SDK = join(process.cwd(), 'registry/sdk');

export type ReleaseNote = {
  version: string;
  title: string;
  /** ISO date, or null for the one note whose date nothing records. */
  date: string | null;
  /** Markdown body, frontmatter removed. */
  body: string;
};

const cache = new Map<string, ReleaseNote | null>();

const notePath = (version: string) => join(SDK, version, 'release-notes.md');

/** Versions with a GA release note, newest first. */
export function versionsWithNotes(): string[] {
  if (!existsSync(SDK)) return [];
  return readdirSync(SDK, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(notePath(e.name)))
    .map((e) => e.name)
    .sort((a, b) => {
      const [x, y] = [a.split('.').map(Number), b.split('.').map(Number)];
      for (let i = 0; i < 3; i++) if ((y[i] ?? 0) !== (x[i] ?? 0)) return (y[i] ?? 0) - (x[i] ?? 0);
      return 0;
    });
}

export function releaseNote(version: string): ReleaseNote | null {
  const cached = cache.get(version);
  if (cached !== undefined) return cached;

  // The version reaches this from a URL segment, so it must not be able to
  // escape the registry. Versions are dotted numbers and nothing else.
  const value = /^\d+\.\d+\.\d+$/.test(version) ? read(version) : null;
  cache.set(version, value);
  return value;
}

function read(version: string): ReleaseNote | null {
  const path = notePath(version);
  if (!existsSync(path) || !statSync(path).isFile()) return null;

  const text = readFileSync(path, 'utf8');
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (!m) return null;

  const front = parseYaml(m[1]) as { title?: unknown; date?: unknown };
  return {
    version,
    // Falling back rather than throwing: a note whose frontmatter drifts should
    // still render, since the body is the content.
    title: typeof front.title === 'string' ? front.title : `Titanium SDK ${version}`,
    date: typeof front.date === 'string' ? front.date : null,
    body: text.slice(m[0].length),
  };
}

export const hasReleaseNote = (version: string): boolean => releaseNote(version) !== null;
