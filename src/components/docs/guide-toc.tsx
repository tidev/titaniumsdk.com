import type { Heading } from '@/lib/docs/headings';

/**
 * On-this-page for a guide.
 *
 * `OnThisPage` in `toc.tsx` serves the API reference, where the contents are
 * groups of members with counts and disclosure. A guide's contents are just its
 * headings, two levels deep, so this renders that rather than bending the other
 * component around a shape it was not built for. They share the heading, the
 * sticky rail and the type scale so a reader crossing between them sees one
 * site.
 *
 * Hidden below `xl`, matching the reference: at that width the rail would push
 * the article into a column too narrow to read code in.
 *
 * Entries are full-strength `text`, the same as the sidebar. These are links,
 * and a link at rest should not be dimmer than the body copy it points into.
 */
export function GuideToc({ headings }: { headings: Heading[] }) {
  // One heading is not a table of contents — it is a restatement of the title.
  if (headings.length < 2) return null;

  return (
    <aside className="hidden xl:block" aria-label="On this page">
      <nav className="sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto text-sm">
        <p className="font-medium text-text">On this page</p>
        <ul className="mt-2 border-l border-border">
          {headings.map((heading) => (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                className={`block border-l-2 border-transparent py-0.5 text-text hover:border-border-strong hover:text-link ${
                  heading.level === 3 ? 'pl-6 text-xs' : 'pl-3'
                }`}
              >
                {heading.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
