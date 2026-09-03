/**
 * Admonitions in rendered prose (TI-10).
 *
 * Syntax is GitHub's alert form, which is what people writing markdown in 2026
 * already know and what every editor previews:
 *
 *   > [!NOTE]
 *   > Windows are not modal by default.
 *
 * `DEPRECATED` is ours — TI-10 asks for it and GitHub has no equivalent. The
 * other five are GitHub's exactly, so a guide pasted from a README keeps
 * working.
 *
 * ## Why this runs after sanitizing
 *
 * The same reason highlighting does. Emitting `<div class="callout">` from the
 * markdown renderer would mean allowing `class` on `div` through the sanitizer,
 * and `renderMarkdown` also renders module READMEs written by other people —
 * that would hand them every class the site defines. Rewriting afterwards means
 * the sanitizer stays as tight as it was and the only classes that can appear
 * are the six below.
 *
 * A README that writes `> [!NOTE]` gets a callout, which is correct: it is a
 * markdown feature they used, not markup they injected.
 */

/** Label as rendered. Order is the match order, so longest-first is not needed. */
const KINDS = {
  NOTE: 'Note',
  TIP: 'Tip',
  IMPORTANT: 'Important',
  WARNING: 'Warning',
  CAUTION: 'Caution',
  DEPRECATED: 'Deprecated',
} as const;

type Kind = keyof typeof KINDS;

/**
 * Rewrites `[!KIND]` blockquotes into callouts.
 *
 * The body match is non-greedy, so a blockquote nested inside a callout would
 * close it early. Nothing in the corpus nests them, and the failure mode is a
 * callout that ends too soon rather than broken markup.
 */
export function renderCallouts(html: string): string {
  return html.replace(
    /<blockquote>\s*<p>\[!([A-Z]+)\]\s*([\s\S]*?)<\/blockquote>/g,
    (whole, raw: string, body: string) => {
      const kind = raw as Kind;
      const label = KINDS[kind];
      if (!label) return whole;
      const slug = kind.toLowerCase();
      // A leading <br> or newline is what the line break after `[!NOTE]` leaves
      // behind once the marker is gone.
      const cleaned = body.replace(/^\s*(?:<br\s*\/?>)?\s*/, '');
      return (
        `<div class="callout callout-${slug}">` +
        `<p class="callout-label">${label}</p>` +
        `<p>${cleaned}` +
        `</div>`
      );
    }
  );
}
