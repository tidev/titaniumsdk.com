import { BranchNav } from './branch-nav';
import { BuildList } from './build-list';
import type { BranchSummary } from '@/lib/downloads/registry';
import type { Build } from '@/lib/registry';

/**
 * One branch's CI builds, with the branch rail beside them.
 *
 * Shared by `/downloads/builds` (main) and `/downloads/builds/[branch]`, which
 * are the same page over different data — main is served without a segment so
 * the branch nearly everybody wants has one canonical URL.
 */

/**
 * main carries about a quarter's worth of nightly runs, so this never fires
 * today. It is here because the list is bounded by GitHub's 90-day artifact
 * retention and nothing else: if the SDK starts building per-commit, this page
 * would otherwise grow without limit.
 */
const MAX_BUILDS = 100;

export function BranchBuilds({
  branch,
  branches,
  builds,
}: {
  branch: string;
  branches: BranchSummary[];
  builds: Build[];
}) {
  const shown = builds.slice(0, MAX_BUILDS);

  return (
    <div className="py-8">
      <p className="rounded-lg border border-warning/40 bg-surface px-4 py-3 text-sm text-text-muted">
        CI builds are not releases. They are unsigned, untested beyond CI, and should never ship in
        production. If one misbehaves,{' '}
        <a
          href="https://github.com/tidev/titanium-sdk/issues/new/choose"
          target="_blank"
          rel="noreferrer"
          className="text-link hover:underline"
        >
          open an issue
        </a>
        .
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10">
        <BranchNav branches={branches} current={branch} />

        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight">
            <span className="font-mono break-all">{branch}</span>{' '}
            <span className="font-mono text-sm font-normal text-text-subtle">{builds.length}</span>
          </h2>
          <p className="mt-1 text-sm text-text-muted">
            Built by GitHub Actions. The archives are proxied from the workflow run and GitHub
            deletes them 90 days later, so this list only holds what is still downloadable.
          </p>

          {shown.length ? (
            <>
              <BuildList builds={shown} branch={branch} />
              {builds.length > shown.length && (
                <p className="mt-4 text-sm text-text-subtle">
                  Showing the {shown.length} most recent of {builds.length}.
                </p>
              )}
            </>
          ) : (
            <p className="mt-4 rounded-lg border border-dashed border-border px-4 py-6 text-sm text-text-subtle">
              Nothing on this branch is downloadable right now. Builds appear here as CI publishes
              them and drop off 90 days later, when GitHub deletes the artifacts.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
