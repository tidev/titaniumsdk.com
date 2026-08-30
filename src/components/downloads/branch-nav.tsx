import { branchHref, type BranchSummary } from '@/lib/downloads/registry';
import Link from 'next/link';

/**
 * The branches with builds left to download.
 *
 * Chips that wrap on a phone and a rail at `lg`, from one list — the branch
 * names are long enough (`backport-14489-13_3_X`) that a fixed-width rail at
 * 320px would either truncate them or push the builds off screen.
 */
export function BranchNav({ branches, current }: { branches: BranchSummary[]; current: string }) {
  return (
    <nav aria-label="Branches" className="lg:sticky lg:top-20">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-text-subtle">Branches</h2>
      <ul className="mt-3 flex flex-wrap gap-1.5 lg:flex-col lg:gap-0.5">
        {branches.map((branch) => {
          const active = branch.name === current;
          return (
            <li key={branch.name}>
              <Link
                href={branchHref(branch.name)}
                aria-current={active ? 'page' : undefined}
                className={`flex items-baseline gap-2 rounded-md px-2.5 py-1.5 font-mono text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                  active
                    ? 'bg-surface font-semibold text-text'
                    : 'text-text-muted hover:bg-surface hover:text-link'
                }`}
              >
                <span className="min-w-0 break-all">{branch.name}</span>
                <span className="ml-auto text-xs text-text-subtle">{branch.count}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
