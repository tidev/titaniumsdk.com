/**
 * The upstream versions that guide content pins, and the rewrite that moves
 * them forward.
 *
 * A pin is a version written into a command a reader is told to run. It is not
 * a version Titanium supports: `node@24`, `setup_24.x` and Temurin 21 are
 * deliberate, tied to the SDK's support matrix, and moving them automatically
 * would be a bug. A pin is only ever "whatever the tool's current release is",
 * where being a year behind serves nobody.
 *
 * The pattern is anchored on the path that identifies the tool, so it can
 * match nothing but the URL it owns. Guide pages quote error messages and
 * download links that carry versions of their own, and a loose `v\d+\.\d+\.\d+`
 * would rewrite those into nonsense.
 */

export type Pin = {
  /** Named in the log and in the commit that lands the bump. */
  name: string;
  /** `owner/repo`, whose latest release names the version. */
  repo: string;
  /** Content files, relative to the repo root. */
  files: string[];
  /** Matches the version substring alone. No `g` — {@link repin} adds it. */
  pattern: RegExp;
};

export const PINS: Pin[] = [
  {
    name: 'nvm',
    repo: 'nvm-sh/nvm',
    files: ['content/docs/_partials/nodejs.md'],
    // nvm's own README pins the install URL to a tag rather than a branch, and
    // so do we: the alternative is telling a reader to pipe an unreviewed
    // moving target into bash.
    pattern: /(?<=raw\.githubusercontent\.com\/nvm-sh\/nvm\/)v[\d.]+(?=\/)/,
  },
];

/** A release tag we are willing to write into a command. */
export const TAG = /^v\d+\.\d+\.\d+$/;

/**
 * Replaces every occurrence of a pin's version in one file's text.
 *
 * Returns what it found as well as the new text: a pin that matches nothing has
 * lost track of the content it names, which is a failure rather than a no-op.
 * That is the way this kind of script rots — the doc gets rewritten, the regex
 * stops matching, and the check goes on passing while the version freezes.
 */
export function repin(
  source: string,
  pin: Pin,
  version: string
): { text: string; found: string[] } {
  const rx = new RegExp(pin.pattern.source, 'g');
  return { text: source.replace(rx, version), found: source.match(rx) ?? [] };
}
