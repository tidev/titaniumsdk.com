import { AssetLinks } from '@/components/downloads/asset-links';
import { InstallCommand } from '@/components/downloads/install-command';
import { hasReleaseNote } from '@/lib/docs/release-notes';
import { formatDate, installCommand } from '@/lib/downloads/format';
import { branchList, CHANNELS, latestRelease, releases } from '@/lib/downloads/registry';
import { SITE_URL } from '@/lib/site';
import type { Metadata } from 'next';
import Link from 'next/link';

/**
 * What to run to get the SDK, and the one release almost everybody wants.
 *
 * Replaces the downloads-www home page, which was the install instructions and
 * nothing else — the latest GA was named in the command but not downloadable
 * without a second click.
 */

export const metadata: Metadata = {
  title: 'Downloads — Titanium SDK',
  description:
    'Install the Titanium SDK with the Titanium CLI, or download a GA, RC, beta, or CI build directly.',
  alternates: { canonical: `${SITE_URL}/downloads` },
};

export default function DownloadsOverview() {
  const latest = latestRelease();
  const releaseCount = CHANNELS.reduce((total, channel) => total + releases(channel).length, 0);
  const branches = branchList();
  // Counted at build time and not re-checked on the reader's clock, unlike the
  // download links themselves. A build lapsing after this page was generated
  // makes the number one too high; it cannot make a dead link look alive, which
  // is the failure worth spending client JavaScript on.
  const buildCount = branches.reduce((total, branch) => total + branch.count, 0);

  return (
    <div className="grid gap-10 py-8 lg:grid-cols-2 lg:gap-12">
      <section aria-labelledby="install">
        <h2 id="install" className="text-xl font-semibold tracking-tight">
          Install with the CLI
        </h2>
        <p className="mt-2 text-text-muted">
          The{' '}
          <a
            href="https://github.com/tidev/titanium-cli"
            target="_blank"
            rel="noreferrer"
            className="text-link hover:underline"
          >
            Titanium CLI
          </a>{' '}
          installs and manages SDK versions for you. You can have as many installed at once as you
          like, and switch per project.
        </p>

        <ol className="mt-5 flex flex-col gap-5">
          <li>
            <p className="text-sm font-medium">1. Install the CLI</p>
            <div className="mt-2">
              <InstallCommand command="npm i -g titanium" label="Copy the npm install command" />
            </div>
          </li>
          <li>
            <p className="text-sm font-medium">2. Install the SDK</p>
            <div className="mt-2">
              <InstallCommand
                command={installCommand(latest ? latest.name : 'latest')}
                label="Copy the SDK install command"
              />
            </div>
          </li>
        </ol>

        <p className="mt-5 text-sm text-text-subtle">
          Rather have the archive? The download links on these pages are the same files the CLI
          fetches.
        </p>
      </section>

      <section aria-labelledby="latest">
        <h2 id="latest" className="text-xl font-semibold tracking-tight">
          Latest release
        </h2>

        {latest ? (
          <div className="mt-3 rounded-lg border border-border bg-surface p-5">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-mono text-lg font-semibold">{latest.name}</span>
              {/* Not "release notes": every GA release body on GitHub is empty
                  or a link back to this site, measured across all 71 in TI-72.
                  The notes live here now, and are linked beside it. */}
              <a
                href={latest.url}
                target="_blank"
                rel="noreferrer"
                title="Release tag on GitHub"
                className="text-xs text-text-subtle hover:text-link focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                Released {formatDate(latest.date)}
              </a>
              {latest.version && hasReleaseNote(latest.version) && (
                <Link
                  href={`/docs/sdk/${latest.version}/release-notes`}
                  className="text-xs text-link hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  Release notes
                </Link>
              )}
            </div>

            <div className="mt-4">
              <AssetLinks assets={latest.assets} />
            </div>
          </div>
        ) : (
          // Only reachable if ga.json is empty, which would mean the registry
          // never regenerated. Say so rather than rendering an empty box.
          <p className="mt-3 text-text-muted">No releases are listed in the registry yet.</p>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Card
            href="/downloads/releases"
            title="All releases"
            detail={`${releaseCount} GA, RC, and beta ${releaseCount === 1 ? 'build' : 'builds'}`}
          />
          <Card
            href="/downloads/builds"
            title="CI builds"
            detail={`${buildCount} live across ${branches.length} ${
              branches.length === 1 ? 'branch' : 'branches'
            }`}
          />
        </div>
      </section>
    </div>
  );
}

function Card({ href, title, detail }: { href: string; title: string; detail: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg border border-border p-4 transition-colors hover:border-border-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      <span className="block text-sm font-medium">{title}</span>
      <span className="mt-1 block text-sm text-text-subtle">{detail}</span>
    </Link>
  );
}
