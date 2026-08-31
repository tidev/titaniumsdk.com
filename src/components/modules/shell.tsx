import { ModuleHeader } from './header';
import { formatDate } from '@/lib/docs/format';
import { PLATFORM_LABELS } from '@/lib/docs/module-summary';
import { latestReleases } from '@/lib/docs/modules';
import type { ModuleIndex } from '@/lib/registry';
import Link from 'next/link';

/**
 * The frame every module view is drawn in: identity, tabs, and the rail.
 *
 * Four routes rather than one page with anchors. A module's reference is the
 * bulk of it — ti.nfc compiles to 30 types — and a reader who came for the
 * install command should not pay for that, nor scroll past it to reach the
 * release list.
 *
 * The active tab is a prop, not `usePathname()`: unlike the downloads nav this
 * lives in the pages themselves rather than a layout, so each one already knows
 * which view it is. That keeps the whole shell out of the client bundle.
 *
 * A tab is never hidden for being empty. A module with no compiled reference
 * still has an API Docs tab, which says so — navigation that changes shape from
 * module to module is harder to trust than a tab that admits it has nothing.
 */

export type ModuleTab = 'readme' | 'install' | 'api' | 'releases';

/**
 * Which release is current, which is not one answer.
 *
 * A line per platform, because a module has a current release on each and they
 * are routinely years apart: ti.map's Android 5.7.0 shipped in 2025 and its iOS
 * 7.3.1 in 2024, so the higher number is the older build. Anything that folds
 * these into one "latest" is wrong about one of them.
 *
 * Each line carries the SDK that release requires, for the same reason: ti.map
 * needs 12.7.0 on Android and 10.0.0 on iOS, and it is the first thing that
 * decides whether the module is usable at all.
 */
export function LatestRelease({
  index,
  className = '',
}: {
  index: ModuleIndex;
  className?: string;
}) {
  const latest = latestReleases(index);
  if (!latest.length) return null;

  return (
    <aside className={`rounded-lg border border-border p-4 ${className}`}>
      <p className="text-sm font-medium">Latest release</p>

      <ul className="mt-3 space-y-3">
        {latest.map(({ platform, version, publishedAt, minsdk }) => {
          const date = formatDate(publishedAt);
          return (
            <li key={platform}>
              <p className="text-xs text-text-subtle">{PLATFORM_LABELS[platform]}</p>
              <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
                <Link
                  href={`/modules/${index.moduleId}/v/${version}`}
                  className="font-mono text-sm text-link hover:underline"
                >
                  {version}
                </Link>
                {date && <span className="text-xs text-text-subtle">{date}</span>}
              </p>
              {/* Verbatim from the manifest, suffix and all — some say
                  `10.0.0.GA`. Normalising would invent precision. */}
              {minsdk && (
                <p className="text-xs text-text-subtle">
                  Requires SDK <span className="font-mono">{minsdk}</span>+
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

/**
 * The page frame: article on the left, rail on the right.
 *
 * The rail is hidden below `xl`, where there is no room for a second column, so
 * the latest release is rendered a second time inside the article for those
 * widths. Both are cheap, and the alternative — one instance moved by grid
 * placement — would put it either above the module's own title or below the
 * whole page, depending on which side of the breakpoint you are on.
 *
 * `rail` is the slot for anything that belongs beside the article; only the API
 * reference uses it, for its table of contents. Its presence is also what
 * decides whether the release box sticks: with a table of contents underneath,
 * the box scrolls away and the contents pin instead, because two sticky
 * elements at the same offset would sit on top of each other.
 */
export function ModuleLayout({
  index,
  active,
  rail,
  children,
}: {
  index: ModuleIndex;
  active: ModuleTab;
  rail?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const moduleId = index.moduleId;

  const tabs: { id: ModuleTab; href: string; label: string; count?: number }[] = [
    { id: 'readme', href: `/modules/${moduleId}`, label: 'Readme' },
    { id: 'install', href: `/modules/${moduleId}/install`, label: 'Install' },
    { id: 'api', href: `/modules/${moduleId}/api`, label: 'API Docs' },
    {
      id: 'releases',
      href: `/modules/${moduleId}/releases`,
      label: 'Releases',
      count: index.versions.length,
    },
  ];

  return (
    // Explicit placement rather than source order: the rail has to come second
    // on screen, and first in the DOM would put it above the title on a phone.
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_15rem] xl:gap-8">
      <article className="min-w-0 max-w-4xl py-10 xl:col-start-1 xl:row-start-1">
        <ModuleHeader
          index={index}
          crumbs={[
            { label: 'Modules', href: '/modules' },
            { label: moduleId, mono: true },
          ]}
        />

        <LatestRelease index={index} className="mt-6 xl:hidden" />

        <nav aria-label="Module" className="mt-6 border-b border-border">
          {/* Scrolls rather than wraps, matching the downloads nav: four tabs
              are already more than fit at 320px. */}
          <ul className="-mb-px flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              // The anchor carries the underline, so it has to be as tall as
              // the row: a flex item stretches, an inline-flex child of a plain
              // li does not. Without this the tallest tab sets the row height
              // and every other underline floats above the rule — which is what
              // the count capsule did until it was made small enough to hide it.
              <li key={tab.id} className="flex">
                <Link
                  href={tab.href}
                  aria-current={tab.id === active ? 'page' : undefined}
                  className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                    tab.id === active
                      ? 'border-link text-text'
                      : 'border-transparent text-text-muted hover:text-text'
                  }`}
                >
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className="rounded-full bg-surface-raised px-1.5 py-0.5 font-mono text-2xs text-text-subtle">
                      {tab.count}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {children}
      </article>

      <div className="hidden py-10 xl:col-start-2 xl:row-start-1 xl:block">
        <LatestRelease index={index} className={rail ? '' : 'sticky top-20'} />
        {rail}
      </div>
    </div>
  );
}
