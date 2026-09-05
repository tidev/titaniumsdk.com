import { slugify } from './ia.ts';

/**
 * Heading anchors and the on-this-page table of contents (TI-32).
 *
 * Runs on sanitized HTML, like `renderCallouts` and `highlightCodeBlocks` and
 * for the same reason: writing markup before the allowlist would extend that
 * permission to every third-party README the renderer also handles.
 *
 * Only `h2` and `h3` are collected. `h1` is the page title, which the layout
 * renders rather than the body, and anything below `h3` makes a contents list
 * longer than the section it describes.
 */

export type Heading = {
  /** The anchor, unique within the page. */
  id: string;
  text: string;
  level: 2 | 3;
};

/** Text content of a heading, with any inline markup dropped. */
function textOf(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#3[49];/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Adds an `id` to every h2 and h3 and returns the contents list.
 *
 * A heading that already carries an `id` keeps it — the source may have set one
 * deliberately to hold an inbound link stable — and that id still takes part in
 * uniqueness, so a later duplicate is suffixed rather than colliding with it.
 *
 * Two headings with the same words get `-2`, `-3`, and so on. Silently emitting
 * duplicate ids would make in-page links land on whichever the browser found
 * first, which is the kind of bug nobody reports.
 */
export function withHeadingAnchors(html: string): { html: string; toc: Heading[] } {
  const toc: Heading[] = [];
  const used = new Map<string, number>();

  const unique = (base: string): string => {
    const seen = used.get(base) ?? 0;
    used.set(base, seen + 1);
    return seen === 0 ? base : `${base}-${seen + 1}`;
  };

  const out = html.replace(
    /<h([23])([^>]*)>([\s\S]*?)<\/h\1>/g,
    (whole, levelText: string, attrs: string, inner: string) => {
      const level = Number(levelText) as 2 | 3;
      const text = textOf(inner);
      if (!text) return whole;

      const existing = /\bid="([^"]*)"/.exec(attrs);
      // An empty slug means the heading was punctuation or emoji only; fall
      // back to the level so the anchor still exists and stays unique.
      const id = unique(existing?.[1] || slugify(text) || `section-${level}`);

      toc.push({ id, text, level });

      const rest = existing ? attrs.replace(/\s*\bid="[^"]*"/, '') : attrs;
      return `<h${level}${rest} id="${id}">${inner}</h${level}>`;
    }
  );

  return { html: out, toc };
}
