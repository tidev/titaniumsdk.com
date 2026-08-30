import { BuildList } from '@/components/downloads/build-list';
import {
  CHANNELS,
  CHANNEL_BLURBS,
  CHANNEL_LABELS,
  latestRelease,
  releases,
  type Channel,
} from '@/lib/downloads/registry';
import { SITE_URL } from '@/lib/site';
import type { Metadata } from 'next';

/**
 * Every published release, grouped by channel.
 *
 * downloads-www merges the three channels into one list sorted by date, which
 * interleaves 13.0.0.RC with 12.8.0.GA and leaves a reader to work out which is
 * which from the version suffix. Grouping states it instead, and it is the only
 * arrangement in which an empty channel can say it is empty.
 */

export const metadata: Metadata = {
  title: 'SDK releases — Titanium SDK',
  description:
    'Every Titanium SDK release: GA, release candidates, and betas, with downloads for macOS, Windows, and Linux.',
  alternates: { canonical: `${SITE_URL}/downloads/releases` },
};

export default function ReleasesPage() {
  const channels = CHANNELS.map((channel) => ({ channel, builds: releases(channel) }));
  // Asked for by name rather than taken from the first channel, so reordering
  // CHANNELS cannot quietly badge the newest RC instead.
  const latest = latestRelease('ga')?.name;

  return (
    <div className="max-w-4xl py-8">
      <p className="text-text-muted">
        Release archives are hosted on GitHub and stay downloadable indefinitely. Install any of
        them with <code className="font-mono text-sm">ti sdk install</code>, or unpack the archive
        into your Titanium SDK directory.
      </p>

      <nav aria-label="Channels" className="mt-5 flex flex-wrap gap-2">
        {channels.map(({ channel, builds }) => (
          <a
            key={channel}
            href={`#channel-${channel}`}
            className="rounded-md border border-border px-2.5 py-1.5 text-sm text-text-muted transition-colors hover:border-border-strong hover:text-link focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {CHANNEL_LABELS[channel]}{' '}
            <span className="font-mono text-xs text-text-subtle">{builds.length}</span>
          </a>
        ))}
      </nav>

      {channels.map(({ channel, builds }) => (
        <section key={channel} aria-labelledby={`channel-${channel}`} className="mt-12">
          <h2
            id={`channel-${channel}`}
            className="scroll-mt-20 text-xl font-semibold tracking-tight"
          >
            {CHANNEL_LABELS[channel]}{' '}
            <span className="font-mono text-sm font-normal text-text-subtle">{builds.length}</span>
          </h2>
          <p className="mt-1 text-sm text-text-muted">{CHANNEL_BLURBS[channel]}</p>

          {builds.length ? (
            <BuildList builds={builds} latest={channel === 'ga' ? latest : undefined} />
          ) : (
            <Empty channel={channel} />
          )}
        </section>
      ))}
    </div>
  );
}

/**
 * beta.json is empty today and has been for some time, so this is the state
 * the page is normally in rather than an edge case worth hiding.
 */
function Empty({ channel }: { channel: Channel }) {
  return (
    <p className="mt-4 rounded-lg border border-dashed border-border px-4 py-6 text-sm text-text-subtle">
      Nothing published in this channel right now. {CHANNEL_LABELS[channel]} appear here during a
      release cycle.
    </p>
  );
}
