import { LatestPerPlatform } from './badges';
import { ModuleHeader } from './header';
import { latestPerPlatform } from '@/lib/docs/module-summary';
import type { ModuleIndex } from '@/lib/registry';
import Link from 'next/link';

/**
 * The identity block and tab bar every module view opens with.
 *
 * Three routes rather than one page with anchors. A module's reference is the
 * bulk of it — ti.nfc compiles to 30 types — and a reader who came for the
 * install command should not pay for that, nor scroll past it to reach the
 * release list.
 *
 * The active tab is a prop, not `usePathname()`: unlike the downloads nav this
 * lives in the pages themselves rather than a layout, so each one already knows
 * which view it is. That keeps the whole masthead out of the client bundle.
 *
 * A tab is never hidden for being empty. A module with no compiled reference
 * still has an API Docs tab, which says so — navigation that changes shape from
 * module to module is harder to trust than a tab that admits it has nothing.
 *
 * Only Releases is counted, and it reads "80 Releases" the way npm's version
 * tab does. A count against API Docs was a type total, which nobody could be
 * expected to guess from a bare number sitting next to the word "Docs".
 *
 * "Releases" rather than "Versions" because that is what the rest of the site
 * calls them, and what they are: the masthead says latest release, the install
 * page hands out release archives, and each row is a GitHub release with a
 * date and its own assets. A version is the string you write in tiapp.xml.
 */

export type ModuleTab = 'readme' | 'install' | 'api' | 'releases';

export function ModuleMasthead({
  index,
  active,
  children,
}: {
  index: ModuleIndex;
  active: ModuleTab;
  children?: React.ReactNode;
}) {
  const moduleId = index.moduleId;
  const latest = latestPerPlatform(index);

  const tabs: { id: ModuleTab; href: string; label: string }[] = [
    { id: 'readme', href: `/modules/${moduleId}`, label: 'Readme' },
    { id: 'install', href: `/modules/${moduleId}/install`, label: 'Install' },
    { id: 'api', href: `/modules/${moduleId}/api`, label: 'API Docs' },
    {
      id: 'releases',
      href: `/modules/${moduleId}/releases`,
      label: `${index.versions.length} Releases`,
    },
  ];

  return (
    <>
      <ModuleHeader
        index={index}
        crumbs={[
          { label: 'Modules', href: '/modules' },
          { label: moduleId, mono: true },
        ]}
      />

      {!!latest.length && (
        <div className="mt-6 border-y border-border py-4">
          <p className="text-sm font-medium">Latest release</p>
          <LatestPerPlatform
            latest={latest}
            href={(version) => `/modules/${moduleId}/v/${version}`}
            className="mt-1"
          />
        </div>
      )}

      <nav aria-label="Module" className="mt-6 border-b border-border">
        {/* Scrolls rather than wraps, matching the downloads nav: three tabs fit
            at 320px only just. */}
        <ul className="-mb-px flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <li key={tab.id}>
              <Link
                href={tab.href}
                aria-current={tab.id === active ? 'page' : undefined}
                className={`inline-block whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                  tab.id === active
                    ? 'border-link text-text'
                    : 'border-transparent text-text-muted hover:text-text'
                }`}
              >
                {tab.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {children}
    </>
  );
}
