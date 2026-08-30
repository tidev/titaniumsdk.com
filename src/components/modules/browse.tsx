'use client';

import { CurationBadge, LatestPerPlatform } from './badges';
import { PLATFORM_LABELS, PLATFORM_ORDER, type ModuleSummary } from '@/lib/docs/module-summary';
import type { Platform } from '@/lib/registry';
import { useMemo, useState } from 'react';

/**
 * The module list, filtered in the browser.
 *
 * A client component, but not a client-rendered list: every module is in the
 * prerendered HTML and every card is a plain link, so the page browses fine
 * with scripting off. The state only ever hides rows.
 *
 * Sixteen modules do not need a search index or pagination, and building either
 * would cost more bytes than the entire list does. What they do need is the
 * platform filter — half the registry is one platform only, and "does this run
 * on Android" is the question the list is actually asked.
 */

type Filter = Platform | 'all';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  ...PLATFORM_ORDER.map((p) => ({ value: p as Filter, label: PLATFORM_LABELS[p] })),
];

export function Browse({ modules }: { modules: ModuleSummary[] }) {
  const [query, setQuery] = useState('');
  const [platform, setPlatform] = useState<Filter>('all');

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return modules.filter((m) => {
      if (platform !== 'all' && !m.latest.some((l) => l.platform === platform)) return false;
      if (!needle) return true;
      return `${m.id} ${m.description ?? ''}`.toLowerCase().includes(needle);
    });
  }, [modules, query, platform]);

  return (
    <>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <label className="flex-1 min-w-56">
          <span className="sr-only">Filter modules</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by name or description"
            className="w-full rounded-md border border-border bg-surface-raised px-3 py-2 text-sm placeholder:text-text-subtle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          />
        </label>

        <div className="flex items-center gap-1" role="group" aria-label="Filter by platform">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={platform === f.value}
              onClick={() => setPlatform(f.value)}
              className={`rounded-md border px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                platform === f.value
                  ? 'border-border-strong bg-surface text-text'
                  : 'border-border text-text-muted hover:text-text'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Announced rather than only drawn: with the list filtered down to
          nothing, a screen reader user gets no other signal that anything
          happened. */}
      <p aria-live="polite" className="mt-4 text-sm text-text-subtle">
        {shown.length} of {modules.length} modules
      </p>

      <ul className="mt-4 grid gap-4 sm:grid-cols-2">
        {shown.map((m) => (
          <li
            key={m.id}
            className="flex flex-col rounded-lg border border-border bg-surface-raised p-4 transition-colors hover:border-border-strong"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h2 className="font-mono text-base font-semibold break-all">
                <a
                  href={`/modules/${m.id}`}
                  className="text-link hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  {m.id}
                </a>
              </h2>
              <CurationBadge curation={m.curation} />
            </div>

            {m.description && <p className="mt-2 text-sm text-text-muted">{m.description}</p>}

            <LatestPerPlatform latest={m.latest} className="mt-3" />

            <p className="mt-2 text-xs text-text-subtle">
              {m.releases} release{m.releases === 1 ? '' : 's'}
            </p>
          </li>
        ))}
      </ul>

      {!shown.length && (
        <p className="mt-8 text-sm text-text-muted">
          Nothing matches that. Modules are keyed on the id you write in{' '}
          <code className="font-mono">tiapp.xml</code> — try <code className="font-mono">ti.</code>{' '}
          or a platform.
        </p>
      )}
    </>
  );
}
