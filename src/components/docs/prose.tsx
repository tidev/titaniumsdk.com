import { renderMarkdown } from '@/lib/docs/markdown';

/**
 * Renders a registry prose field.
 *
 * The HTML is produced and sanitized at build time in renderMarkdown, so this
 * only has to style it. Tables and pre blocks scroll inside themselves — the
 * source contains hand-written wide tables, and the page must not scroll
 * sideways on a phone because of one of them.
 */
export function Prose({
  markdown,
  base,
  className = '',
}: {
  markdown: string | undefined;
  base: string;
  className?: string;
}) {
  if (!markdown) return null;
  return (
    <div
      className={`prose-docs text-text-muted ${className}`}
      // Sanitized in renderMarkdown; see the allowlist there.
      dangerouslySetInnerHTML={{ __html: renderMarkdown(markdown, { base }) }}
    />
  );
}
