'use client';

import { CurationBadge, CURATION_STRIPE, LatestPerPlatform, PlatformChips } from './badges';
import { formatDate } from '@/lib/docs/format';
import {
  listingPlatforms,
  orderListings,
  PLATFORM_LABELS,
  PLATFORM_ORDER,
  type CommunityListing,
  type ModuleListing,
  type ModuleSummary,
  type SortKey,
} from '@/lib/docs/module-summary';
import type { Platform } from '@/lib/registry';
import { useMemo, useState } from 'react';

/**
 * The module list, filtered in the browser.
 *
 * A client component, but not a client-rendered list: every module is in the
 * prerendered HTML and every card is a plain link, so the page browses fine
 * with scripting off. The state only ever hides rows.
 *
 * Two kinds of entry sit in one list. A registry module has a page here, with
 * versions and usually a compiled reference; a community module is a GitHub
 * repository carrying the `titanium` topic and nothing more, so its card links
 * out. They are told apart by the stripe, the badge, and the arrow — not by
 * being in separate lists, because the question being asked is "is there a
 * module for this", and the answer should not depend on guessing which list to
 * read first.
 */

type PlatformFilter = Platform | 'all';
type CurationFilter = 'all' | 'registry' | 'community';

const PLATFORMS: { value: PlatformFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  ...PLATFORM_ORDER.map((p) => ({ value: p as PlatformFilter, label: PLATFORM_LABELS[p] })),
];

/**
 * "Curation", not "Source".
 *
 * The axis is whether this site documents and verifies a module, which is not
 * the same as who wrote it: tidev/ti.worker is a TiDev repository that lists as
 * Community because nothing here documents it. `curation` is also what the
 * registry schema calls the field, so the control and the data agree.
 */
const CURATIONS: { value: CurationFilter; label: string }[] = [
  { value: 'all', label: 'All modules' },
  { value: 'registry', label: 'Official' },
  { value: 'community', label: 'Community' },
];

/**
 * Default is not a sort so much as an answer to "which should I use": official
 * first, then community by stars. The other two are plain orderings, offered
 * because that default buries a well-maintained community module under sixteen
 * curated ones no matter how good it is.
 */
const SORTS: { value: SortKey; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'name', label: 'Name' },
  { value: 'updated', label: 'Updated' },
];

export function Browse({ modules }: { modules: ModuleListing[] }) {
  const [query, setQuery] = useState('');
  const [platform, setPlatform] = useState<PlatformFilter>('all');
  const [curation, setCuration] = useState<CurationFilter>('all');
  const [sort, setSort] = useState<SortKey>('default');

  const ordered = useMemo(() => orderListings(modules, sort), [modules, sort]);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return ordered.filter((m) => {
      if (curation !== 'all' && m.source !== curation) return false;
      if (platform !== 'all' && !listingPlatforms(m).includes(platform)) return false;
      if (!needle) return true;
      // The owner is searchable for community entries: several authors publish
      // a dozen modules each, and "everything by hansemannn" is a real query.
      return `${m.id} ${m.description ?? ''}`.toLowerCase().includes(needle);
    });
  }, [ordered, query, platform, curation]);

  return (
    <>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <label className="min-w-56 flex-1">
          <span className="sr-only">Filter modules</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by name, owner, or description"
            className="w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm placeholder:text-text-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          />
        </label>

        <Select label="Curation" options={CURATIONS} value={curation} onChange={setCuration} />
        <Select label="Platform" options={PLATFORMS} value={platform} onChange={setPlatform} />
        <Select label="Sort" options={SORTS} value={sort} onChange={setSort} />
      </div>

      {/* Announced rather than only drawn: with the list filtered down to
          nothing, a screen reader user gets no other signal that anything
          happened. */}
      <p aria-live="polite" className="mt-4 text-sm text-text-subtle">
        {shown.length} of {modules.length} modules
      </p>

      <ul className="mt-4 grid gap-4 sm:grid-cols-2">
        {shown.map((m) =>
          m.source === 'registry' ? (
            <RegistryCard key={m.id} module={m} />
          ) : (
            <CommunityCard key={m.id} module={m} />
          )
        )}
      </ul>

      {!shown.length && (
        <p className="mt-8 text-sm text-text-muted">
          Nothing matches that. Official modules are keyed on the id you write in{' '}
          <code className="font-mono">tiapp.xml</code>; community ones on their repository name.
        </p>
      )}
    </>
  );
}

/**
 * One filter, as a menu.
 *
 * These were three rows of buttons — eleven of them — which cost more width
 * than the list they were filtering. A native `<select>` collapses each to its
 * current value, and gets keyboard handling, mobile pickers and the platform's
 * own long-list behaviour for free.
 *
 * The `<label>` wraps the control rather than pointing at it with `htmlFor`, so
 * there is no id to keep unique across three instances.
 */
function Select<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2">
      <span className="text-xs text-text-subtle">{label}</span>
      <span className="relative inline-flex">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          // `appearance-none` so the control matches the search field beside
          // it; the chevron below replaces the one that removes.
          className="appearance-none rounded-md border border-border bg-surface-raised py-2 pr-8 pl-2.5 text-sm text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <svg
          viewBox="0 0 16 16"
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-2.5 size-3 -translate-y-1/2 fill-none stroke-current stroke-2 text-text-subtle"
        >
          <path d="m4 6 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </label>
  );
}

/**
 * The card shell both kinds share.
 *
 * Flat: the background is the page's own, so the grid reads as a set of ruled
 * boxes rather than a wall of panels. The one piece of colour is the stripe,
 * which carries the official/community distinction at a glance.
 */
function Card({ stripe, children }: { stripe: string; children: React.ReactNode }) {
  return (
    <li
      className={`relative flex flex-col overflow-hidden rounded-lg border border-border py-4 pr-4 pl-5 transition-colors before:absolute before:inset-y-0 before:left-0 before:w-1 hover:border-border-strong ${stripe}`}
    >
      {children}
    </li>
  );
}

function RegistryCard({ module: m }: { module: ModuleSummary }) {
  return (
    <Card stripe={CURATION_STRIPE[m.curation]}>
      {/* `ml-auto` on the badge rather than `justify-between` on the row: with
          a long id the two wrap onto separate lines, and justify-between then
          leaves one item per line and stops aligning anything. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="font-mono text-base font-semibold break-all">
          <a
            href={`/modules/${m.id}`}
            className="text-link hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {m.id}
          </a>
        </h2>
        <span className="ml-auto">
          <CurationBadge curation={m.curation} />
        </span>
      </div>

      {m.description && <p className="mt-2 text-sm text-text-muted">{m.description}</p>}

      <LatestPerPlatform latest={m.latest} className="mt-3" />
    </Card>
  );
}

/**
 * A repository, presented as one.
 *
 * No version and no release count, because neither is knowable without cloning
 * it. What is on offer instead is the evidence a reader would go looking for
 * anyway: how many people starred it and when it was last touched.
 */
function CommunityCard({ module: m }: { module: CommunityListing }) {
  const pushed = formatDate(m.pushedAt);

  return (
    <Card stripe={CURATION_STRIPE.community}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="font-mono text-base font-semibold break-all">
          <a
            href={m.url}
            rel="noopener noreferrer"
            className="inline-flex items-baseline gap-1 text-link hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {m.name}
            <svg
              viewBox="0 0 24 24"
              aria-hidden
              className="size-3 self-center fill-none stroke-current stroke-2"
            >
              <path d="M7 17 17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </h2>
        <span className="ml-auto flex flex-wrap items-center gap-2">
          <CurationBadge curation="community" />
          {m.archived && (
            <span
              title="The author archived this repository"
              className="rounded border border-warning px-1.5 py-0.5 font-mono text-xs text-warning"
            >
              archived
            </span>
          )}
        </span>
      </div>

      <p className="mt-1 text-xs text-text-subtle">
        by <span className="font-mono">{m.owner}</span>
      </p>

      {m.description && <p className="mt-2 text-sm text-text-muted">{m.description}</p>}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <PlatformChips platforms={m.platforms} />
      </div>

      <p className="mt-2 flex flex-wrap gap-x-3 text-xs text-text-subtle">
        <span>
          {m.stars} star{m.stars === 1 ? '' : 's'}
        </span>
        {pushed && <span>updated {pushed}</span>}
      </p>
    </Card>
  );
}
