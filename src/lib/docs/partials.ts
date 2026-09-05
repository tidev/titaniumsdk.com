/**
 * Source-level directives for guide content (TI-32).
 *
 * Two of them, both resolved on the raw markdown before it is rendered:
 *
 *   :::include install-cli          splice in a shared fragment
 *   :::only macos, linux            keep this block only on those platforms
 *   :::
 *
 * ## Why these run before rendering, when callouts run after
 *
 * `renderCallouts` and `highlightCodeBlocks` deliberately run on *sanitized*
 * HTML, because the same renderer also handles third-party module READMEs and
 * anything that writes markup before the allowlist would be granting that
 * privilege to whoever wrote the README.
 *
 * These are the opposite case and must run earlier: a partial contains markdown
 * that has to be parsed as part of the page, so splicing it in after rendering
 * would emit its source as text. That is only safe because partials are files
 * in this repository, never user content — enforced by resolving names against
 * `content/docs/_partials` and rejecting anything that is not a bare slug, so a
 * page cannot reach out of the directory.
 *
 * ## Why `:::only` exists rather than three hand-written pages
 *
 * `setup/macos`, `setup/windows` and `setup/linux` open with the same steps:
 * install the Titanium CLI, install the SDK. Written out three times they
 * drift, and the current install docs are what that looks like after a decade.
 * One partial with platform-scoped blocks keeps the shared half shared, and
 * keeps the differences visible next to what they differ from.
 *
 * It reuses the `platforms` frontmatter the page already declares rather than
 * introducing a variable system, so there is exactly one place a page says what
 * it applies to.
 */

export class DirectiveError extends Error {}

/** `:::only macos, android` — the platforms a block is scoped to. */
const ONLY_OPEN = /^:::only[ \t]+([a-z0-9,\s-]+?)[ \t]*$/;
/**
 * Any other block opener: `:::tabs`, `:::platform ios`, `:::since 12.1.0`.
 *
 * Those are resolved much later, on rendered HTML (`blocks.ts`), so their text
 * passes through here untouched. They still have to be *counted*, because they
 * close with the same `:::` this does — without that, a tab group inside an
 * `:::only` block would close the `:::only` at its own closing fence.
 */
const OTHER_OPEN = /^:::[a-z][a-z-]*(?:[ \t]|$)/;
/** `:::include install-cli` — a bare slug, so no path can escape the directory. */
const INCLUDE = /^:::include[ \t]+([a-z0-9-]+)[ \t]*$/;
const CLOSE = /^:::[ \t]*$/;

/** Reads a partial by name. Separate so tests need no filesystem. */
export type PartialReader = (name: string) => string | undefined;

export type ExpandOptions = {
  /**
   * What the including page applies to. An empty or absent list means the page
   * is platform-agnostic and every `:::only` block is kept — a page that has
   * not said what it targets should not silently lose content.
   */
  platforms?: readonly string[];
  readPartial?: PartialReader;
};

/**
 * Resolves `:::only` blocks against the page's platforms.
 *
 * An `:::only` inside another is rejected rather than mis-parsed — the closing
 * fences would be indistinguishable, and content that wants it reads better as
 * two blocks. Other block directives may nest freely: they are counted so the
 * right `:::` closes this one, and are otherwise left for `blocks.ts`.
 */
function applyOnly(source: string, platforms: readonly string[] | undefined): string {
  const lines = source.split('\n');
  const out: string[] = [];
  let keep: boolean | undefined;
  let openedAt = 0;
  // Other `:::` blocks open inside this one. Counted, not parsed: all this
  // needs is to know which `:::` is the one that closes the `:::only`.
  let depth = 0;

  for (const [i, line] of lines.entries()) {
    const open = ONLY_OPEN.exec(line);
    if (open) {
      if (keep !== undefined) {
        throw new DirectiveError(
          `nested :::only at line ${i + 1} (opened at line ${openedAt}) — write two blocks instead`
        );
      }
      const wanted = open[1]
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
      // No declared platforms means the page is universal, so nothing is cut.
      keep = !platforms?.length || wanted.some((p) => platforms.includes(p));
      openedAt = i + 1;
      continue;
    }

    if (keep !== undefined && OTHER_OPEN.test(line)) {
      depth += 1;
    } else if (CLOSE.test(line) && keep !== undefined) {
      if (depth > 0) {
        depth -= 1;
      } else {
        keep = undefined;
        continue;
      }
    }

    if (keep === undefined || keep) out.push(line);
  }

  if (keep !== undefined) {
    throw new DirectiveError(`unclosed :::only opened at line ${openedAt}`);
  }
  return out.join('\n');
}

/**
 * Expands includes and platform blocks.
 *
 * Includes resolve recursively so a partial can build on another, with the
 * chain tracked to name a cycle rather than overflowing the stack. A partial
 * inherits the including page's platforms, which is what makes one shared
 * install fragment able to say different things on macOS and Windows.
 */
export function expandDirectives(source: string, options: ExpandOptions = {}): string {
  const read = options.readPartial;

  const expand = (text: string, chain: string[]): string => {
    const lines = text.split('\n');
    const out: string[] = [];

    for (const line of lines) {
      const include = INCLUDE.exec(line);
      if (!include) {
        out.push(line);
        continue;
      }

      const name = include[1];
      if (chain.includes(name)) {
        throw new DirectiveError(`include cycle: ${[...chain, name].join(' -> ')}`);
      }
      if (!read) throw new DirectiveError(`:::include ${name} but no partial reader was given`);

      const body = read(name);
      if (body === undefined) {
        throw new DirectiveError(`no such partial: ${name}`);
      }
      out.push(expand(body, [...chain, name]));
    }

    return out.join('\n');
  };

  // Includes first, so a partial's own `:::only` blocks are resolved against
  // the page that pulled it in rather than against nothing.
  return applyOnly(expand(source, []), options.platforms);
}

/** Every partial a source references, for link and orphan checking. */
export function referencedPartials(source: string): string[] {
  const names = new Set<string>();
  for (const line of source.split('\n')) {
    const m = INCLUDE.exec(line);
    if (m) names.add(m[1]);
  }
  return [...names];
}
