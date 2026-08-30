import { anchorFor } from '@/lib/docs/markdown';
import type { ResolvedMember } from '@/lib/docs/type-view';

/**
 * In-page navigation for a type's member sections.
 *
 * Resolved member counts run from 3 at the tenth percentile to 337 on
 * `Titanium.UI`, so one fixed treatment cannot serve both. A group opens with
 * its members listed when there are 20 or fewer — which covers the median type
 * at 16 — and stays a single collapsed row above that, where an open list would
 * be taller than the viewport and bury the group below it.
 */

export type TocGroup = {
  /** The section heading's id: `properties`, `methods`, `events`. */
  id: string;
  title: string;
  members: ResolvedMember[];
};

/** Above this, listing every member costs more than it gives. */
const OPEN_UP_TO = 20;

export function OnThisPage({
  groups,
  hasExamples,
  className = '',
}: {
  groups: TocGroup[];
  hasExamples: boolean;
  className?: string;
}) {
  const shown = groups.filter((g) => g.members.length);
  if (!shown.length && !hasExamples) return null;

  return (
    <aside className={className} aria-label="On this page">
      {/* Sticks a rem below the 4rem site header and scrolls on its own; the
          grid stretches this to the article's height, which is what sticky
          needs to have anything to travel along. */}
      <nav className="sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto text-sm">
        <p className="font-medium text-text">On this page</p>

        <SectionJump groups={shown} hasExamples={hasExamples} className="mt-2" />

        {shown.map((group) => (
          <details key={group.id} open={group.members.length <= OPEN_UP_TO} className="group mt-3">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 py-1 text-text-muted [&::-webkit-details-marker]:hidden">
              <svg
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="size-3 shrink-0 text-text-subtle transition-transform group-open:rotate-90"
              >
                <path d="M6 3l5 5-5 5" />
              </svg>
              {group.title}
              <span className="ml-auto font-mono text-xs text-text-subtle">
                {group.members.length}
              </span>
            </summary>
            <ul className="ml-1.5 border-l border-border pl-3">
              {group.members.map((m) => (
                <li key={m.name}>
                  <a
                    href={`#${anchorFor(m.name)}`}
                    className="block truncate py-0.5 font-mono text-xs text-text-muted hover:text-link"
                    title={m.name}
                  >
                    {m.name}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </nav>
    </aside>
  );
}

/**
 * The section headings on one line.
 *
 * Carries the whole in-page navigation below `xl`, where the rail is hidden and
 * a full member list above the article would push the type's own summary off
 * the first screen.
 */
export function SectionJump({
  groups,
  hasExamples,
  className = '',
}: {
  groups: TocGroup[];
  hasExamples: boolean;
  className?: string;
}) {
  const links = [
    ...(hasExamples ? [{ id: 'examples', title: 'Examples', count: 0 }] : []),
    ...groups
      .filter((g) => g.members.length)
      .map((g) => ({ id: g.id, title: g.title, count: g.members.length })),
  ];
  if (!links.length) return null;

  return (
    <nav aria-label="Sections" className={`flex flex-wrap gap-x-3 gap-y-1 text-sm ${className}`}>
      {links.map((link) => (
        <a key={link.id} href={`#${link.id}`} className="text-link hover:underline">
          {link.title}
          {link.count > 0 && (
            <span className="ml-1 font-mono text-xs text-text-subtle">{link.count}</span>
          )}
        </a>
      ))}
    </nav>
  );
}
