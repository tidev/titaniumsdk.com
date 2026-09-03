/** Plain text where the title had to be trimmed off, HTML otherwise. */
export type Detail = { html: string } | { text: string } | null;

/**
 * Turns Pagefind's excerpt into the line shown under a result.
 *
 * A symbol's indexed text starts with its own name, twice — qualified and
 * bare — because that is what makes a search for `addEventListener` find the
 * member rather than a page mentioning it. The excerpt therefore opens by
 * repeating the title that is already on the line above. Where that happens
 * the prefix is dropped and the rest shown as plain text; the title is the
 * match, so losing the `<mark>` costs nothing. Prose excerpts do not start
 * with their title and keep their highlighting.
 */
export function resultDetail(title: string, excerpt: string): Detail {
  if (!excerpt) return null;
  const text = excerpt
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const bare = title.split('.').pop() ?? '';
  const prefix = new RegExp(
    `^${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(${bare.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*)?`,
    'i'
  );
  const trimmed = text.replace(prefix, '').trim();
  if (trimmed !== text) return trimmed ? { text: trimmed } : null;
  return { html: excerpt };
}
