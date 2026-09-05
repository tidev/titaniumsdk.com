import { SECTIONS, type DocPage } from '@/lib/docs/ia';
import Link from 'next/link';

/**
 * The guide sidebar, rendered from `ia.ts` rather than from what exists on disk.
 *
 * The whole tree is shown from the start, including pages nobody has written
 * yet. That is deliberate: the structure was agreed up front and M3 fills it in
 * over many tickets, so a nav built from the filesystem would reshuffle itself
 * every time a page landed, and a reader would have no way to tell "not written"
 * from "does not exist". Unwritten pages are visibly dimmed and not links.
 *
 * Sibling of `ApiNav`, which does the same job for `/docs/sdk` — that one is a
 * disclosure tree over 45,610 types, this one is a fixed list of about forty
 * pages, so they share an idea and no code.
 */

export type GuideNavProps = {
  /** The current `/docs`-rooted path, for marking the active page. */
  current: string;
  /** Paths that have content. Everything else renders as pending. */
  written: ReadonlySet<string>;
};

function Row({
  href,
  title,
  active,
  written,
  depth,
}: {
  href: string;
  title: string;
  active: boolean;
  written: boolean;
  depth: 0 | 1;
}) {
  const indent = depth === 1 ? 'pl-3' : '';

  if (!written) {
    return (
      <li>
        <span
          className={`block py-1 text-sm text-text-subtle ${indent}`}
          // Says why it is not a link, for anyone who wonders whether the page
          // is missing or simply not yet written.
          title="Not written yet"
        >
          {title}
        </span>
      </li>
    );
  }

  return (
    <li>
      <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        className={`block py-1 text-sm ${indent} ${
          active ? 'font-medium text-link' : 'text-text-muted hover:text-link'
        }`}
      >
        {title}
      </Link>
    </li>
  );
}

export function GuideNav({ current, written }: GuideNavProps) {
  return (
    <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto">
      <nav aria-label="Documentation">
        {SECTIONS.map((section) => {
          const base = `/docs/${section.slug}`;
          return (
            <div key={section.slug} className="mb-5">
              <Row
                href={base}
                title={section.title}
                active={current === base}
                written={written.has(base)}
                depth={0}
              />
              <ul className="mt-0.5 ml-1.5 border-l border-border pl-2">
                {section.pages.map((page: DocPage) => {
                  const path = `${base}/${page.slug}`;
                  return (
                    <li key={page.slug}>
                      <ul>
                        <Row
                          href={path}
                          title={page.title}
                          active={current === path}
                          written={written.has(path)}
                          depth={0}
                        />
                      </ul>
                      {!!page.pages?.length && (
                        <ul>
                          {page.pages.map((child) => {
                            const childPath = `${path}/${child.slug}`;
                            return (
                              <Row
                                key={child.slug}
                                href={childPath}
                                title={child.title}
                                active={current === childPath}
                                written={written.has(childPath)}
                                depth={1}
                              />
                            );
                          })}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
