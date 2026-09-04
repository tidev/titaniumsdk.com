import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';

/**
 * The captured SDK release notes (TI-72).
 *
 * Written by `scripts/capture-release-notes.ts` from `tidev/titanium-docs`,
 * which is where they actually live — the GitHub releases carry none, and the
 * in-repo changelogs stop in 2014. See that script for the full account.
 *
 * Only GA notes get pages. The 23 pre-release notes are captured because they
 * are part of the record and cost nothing to keep, but a URL for them would
 * need a version segment the registry does not have: `sdk/rc.json` tracks RC
 * builds, and `/docs/sdk/<version>` is a compiled reference, not a channel. If
 * RC pages are ever wanted, that is the thing to settle first.
 */

const DIR = join(process.cwd(), 'registry/sdk/release-notes');

export type ReleaseNote = {
  version: string;
  /** From the note's own frontmatter: "Titanium SDK 13.4.1.GA - 25 August 2026". */
  title: string;
  /** Markdown body, frontmatter removed. */
  body: string;
};

const cache = new Map<string, ReleaseNote | null>();

/** GA versions that have a note, newest first. */
export function versionsWithNotes(): string[] {
  if (!existsSync(DIR)) return [];
  return readdirSync(DIR)
    .filter((f) => f.endsWith('.GA.md'))
    .map((f) => f.replace(/\.GA\.md$/, ''))
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
  // escape the directory. Registry versions are dotted numbers and nothing else.
  const value = /^\d+\.\d+\.\d+$/.test(version) ? read(version) : null;
  cache.set(version, value);
  return value;
}

function read(version: string): ReleaseNote | null {
  const path = join(DIR, `${version}.GA.md`);
  if (!existsSync(path)) return null;

  const text = readFileSync(path, 'utf8');
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (!m) return null;

  const front = parseYaml(m[1]) as { title?: unknown };
  return {
    version,
    // Falling back to the version rather than throwing: a note whose
    // frontmatter drifts should still render, since the body is the content.
    title: typeof front.title === 'string' ? front.title : `Titanium SDK ${version}`,
    body: text.slice(m[0].length),
  };
}

export const hasReleaseNote = (version: string): boolean => releaseNote(version) !== null;
