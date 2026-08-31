import { AssetLinks } from './asset-links';
import { ExpiryGate } from './expiry-gate';
import { InstallCommand } from './install-command';
import { formatDate, installCommand } from '@/lib/downloads/format';
import type { Build } from '@/lib/registry';

/**
 * The list of downloads, used for both release channels and CI branches.
 *
 * A list of blocks rather than the table this data invites: a row is a version,
 * a command, three platform links and a date, and none of that survives being
 * squeezed into 320px of table.
 */
export function BuildList({
  builds,
  branch,
  latest,
}: {
  /**
   * `prerelease` marks a row the releases page can fold away. It is rendered as
   * a `data-prerelease` attribute and nothing else — which rows are visible is
   * the page's business, not this component's.
   */
  builds: readonly (Build & { prerelease?: boolean })[];
  /** Set for CI builds, which the CLI can only install with `--branch`. */
  branch?: string;
  /** Name of the build to mark as current, if any is. */
  latest?: string;
}) {
  return (
    // The rule is on each row rather than `divide-y` on the list: a folded-away
    // prerelease still counts for `:first-child`, so the divider would land in
    // the wrong place — or double up against the list's own top border —
    // whenever the hidden row happens to be the first one.
    <ul className="mt-4">
      {builds.map((build) => (
        <BuildRow key={build.name} build={build} branch={branch} latest={build.name === latest} />
      ))}
    </ul>
  );
}

function BuildRow({
  build,
  branch,
  latest,
}: {
  build: Build & { prerelease?: boolean };
  branch?: string;
  latest: boolean;
}) {
  const expiresAt = build.expires ? Date.parse(build.expires) : Number.NaN;

  const body = (
    <>
      {/* The command column takes the width of the command and no more, rather
          than a fixed track sized by hand: a branch build carries `--branch
          <name>` and a timestamped version, so the width depends on a branch
          name nobody here controls. A fixed track set for today's longest name
          is what put a scrollbar under the command. The `minmax(0,` floor lets
          it shrink anyway when the viewport is the tighter constraint, at which
          point the box scrolls on its own as designed.

          The single column below `lg` is spelled out for the same reason: an
          implicit grid column is `auto`, which sizes to the command and pushes
          the page sideways on a phone rather than letting the box scroll. */}
      <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(0,max-content)_minmax(0,1fr)] lg:items-center">
        <InstallCommand
          command={installCommand(build.name, branch)}
          label={`Copy the install command for ${build.name}`}
        />
        {build.assets.length ? (
          <AssetLinks assets={build.assets} />
        ) : (
          <p className="text-sm text-text-subtle">No archives were published for this build.</p>
        )}
      </div>

      {build.expires && (
        <p className="mt-2 text-xs text-text-subtle">
          Artifacts expire {formatDate(build.expires)}
        </p>
      )}
    </>
  );

  return (
    <li className="border-t border-border py-5" data-prerelease={build.prerelease ? '' : undefined}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="font-mono text-base font-semibold break-all">{build.name}</h3>
        {latest && (
          <span className="rounded border border-success px-1.5 py-0.5 font-mono text-xs text-success">
            latest
          </span>
        )}
        <a
          href={build.url}
          target="_blank"
          rel="noreferrer"
          // The date is the visible label, so say where it goes: a release tag
          // page for a release, the workflow run for a CI build.
          title={branch ? 'Workflow run on GitHub' : 'Release notes on GitHub'}
          className="text-xs text-text-subtle hover:text-link focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          {branch ? 'Built' : 'Released'} {formatDate(build.date)}
        </a>
      </div>

      {/* The command goes behind the gate along with the links: once the
          artifacts are gone `ti sdk install` cannot resolve the build either,
          and an expiry date in the future tense would be a second lie. */}
      {Number.isFinite(expiresAt) ? <ExpiryGate at={expiresAt}>{body}</ExpiryGate> : body}
    </li>
  );
}
