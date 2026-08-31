import type { ResolvedMember } from '@/lib/docs/type-view';

/**
 * In-page navigation.
 *
 * Two parts, because two things are worth jumping to and they are not the same
 * size. `links` are the page's own sections — Examples on a type page, Install
 * and Releases on a module's — and always fit one line. `groups` are the long
 * lists: member counts run from 3 at the tenth percentile to 337 on
 * `Titanium.UI`, so one fixed treatment cannot serve both. A group opens with
 * its members listed when there are 20 or fewer — which covers the median type
 * at 16 — and stays a single collapsed row above that, where an open list would
 * be taller than the viewport and bury the group below it.
 *
 * A group is a member kind on an SDK type page and a whole type on a module
 * page, which is why the member's anchor comes from the group rather than from
 * the member's name alone.
 */

export type TocLink = { id: string; title: string; count?: number };

export type TocGroup = {
  /** The section heading's id: `properties` on a type page, `Modules.Map.View` on a module's. */
  id: string;
  title: string;
  members: ResolvedMember[];
  anchor: (member: string) => string;
};

/** Above this, listing every member costs more than it gives. */
const OPEN_UP_TO = 20;

export function OnThisPage({
  links = [],
  groups,
  className = '',
}: {
  links?: TocLink[];
  groups: TocGroup[];
  className?: string;
}) {
  const shown = groups.filter((g) => g.members.length);
  if (!shown.length && !links.length) return null;

  return (
    <aside className={className} aria-label="On this page">
      {/* Sticks a rem below the 4rem site header and scrolls on its own; the
          grid stretches this to the article's height, which is what sticky
          needs to have anything to travel along. */}
      <nav className="sticky top-20 max-h-[calc(100dvh-6rem)] overflow-y-auto text-sm">
        <p className="font-medium text-text">On this page</p>

        <SectionJump links={[...links, ...groupLinks(shown)]} className="mt-2" />

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
              <span className="min-w-0 truncate" title={group.title}>
                {group.title}
              </span>
              <span className="ml-auto font-mono text-xs text-text-subtle">
                {group.members.length}
              </span>
            </summary>
            <ul className="ml-1.5 border-l border-border pl-3">
              {/* Keyed by position, not by name: a module page's group is a whole
                  type, and 41 types in the registry declare a property and an
                  event under one name -- ti.map's View has both a `userLocation`
                  property and a `userLocation` event. */}
              {group.members.map((m, i) => (
                <li key={`${m.name}-${i}`}>
                  <a
                    href={`#${group.anchor(m.name)}`}
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

const groupLinks = (groups: TocGroup[]): TocLink[] =>
  groups.map((g) => ({ id: g.id, title: g.title, count: g.members.length }));

/**
 * The section headings on one line.
 *
 * Carries the whole in-page navigation below `xl`, where the rail is hidden and
 * a full member list above the article would push the page's own summary off
 * the first screen.
 */
export function SectionJump({ links, className = '' }: { links: TocLink[]; className?: string }) {
  if (!links.length) return null;

  return (
    <nav aria-label="Sections" className={`flex flex-wrap gap-x-3 gap-y-1 text-sm ${className}`}>
      {links.map((link) => (
        <a key={link.id} href={`#${link.id}`} className="text-link hover:underline">
          {link.title}
          {!!link.count && (
            <span className="ml-1 font-mono text-xs text-text-subtle">{link.count}</span>
          )}
        </a>
      ))}
    </nav>
  );
}

/** The one-line jump list for a set of groups, without the rail around it. */
export const jumpLinks = (groups: TocGroup[], lead: TocLink[] = []): TocLink[] => [
  ...lead,
  ...groupLinks(groups.filter((g) => g.members.length)),
];
