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
  builds: Build[];
  /** Set for CI builds, which the CLI can only install with `--branch`. */
  branch?: string;
  /** Name of the build to mark as current, if any is. */
  latest?: string;
}) {
  return (
    <ul className="mt-4 divide-y divide-border border-t border-border">
      {builds.map((build) => (
        <BuildRow key={build.name} build={build} branch={branch} latest={build.name === latest} />
      ))}
    </ul>
  );
}

function BuildRow({ build, branch, latest }: { build: Build; branch?: string; latest: boolean }) {
  const expiresAt = build.expires ? Date.parse(build.expires) : Number.NaN;

  const body = (
    <>
      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-center">
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
    <li className="py-5">
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
