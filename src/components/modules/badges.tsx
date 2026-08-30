import { formatDate } from '@/lib/docs/format';
import { PLATFORM_LABELS, type PlatformLatest } from '@/lib/docs/module-summary';
import type { Curation } from '@/lib/registry';

/**
 * Who stands behind a module.
 *
 * Everything in the registry is `tidev` today, so this says almost nothing yet
 * — but the schema has three values and a community tree is the point of the
 * field, so the page reads it rather than assuming.
 */
const CURATION: Record<Curation, { label: string; className: string; title: string }> = {
  tidev: {
    label: 'TiDev',
    className: 'border-success text-success',
    title: 'Published and maintained by TiDev',
  },
  community: {
    label: 'Community',
    className: 'border-border-strong text-text-subtle',
    title: 'Published by the community',
  },
  unverified: {
    label: 'Unverified',
    className: 'border-warning text-warning',
    title: 'Not reviewed by TiDev',
  },
};

export function CurationBadge({ curation }: { curation: Curation }) {
  const style = CURATION[curation];
  return (
    <span
      title={style.title}
      className={`rounded border px-1.5 py-0.5 font-mono text-xs ${style.className}`}
    >
      {style.label}
    </span>
  );
}

/**
 * The newest release on each platform, side by side.
 *
 * Two rows rather than one "latest", because there is no such thing: ti.map's
 * android 5.7.0 and iOS 7.3.1 are both current, from eighteen months apart, and
 * a reader who sees only one of them will install the wrong module.
 */
export function LatestPerPlatform({
  latest,
  href,
  className = '',
}: {
  latest: PlatformLatest[];
  /** Links each version to its own page when given. */
  href?: (version: string) => string;
  className?: string;
}) {
  if (!latest.length) return null;

  return (
    <ul className={`flex flex-wrap gap-x-4 gap-y-1 ${className}`}>
      {latest.map(({ platform, version, publishedAt }) => {
        const date = formatDate(publishedAt);
        return (
          <li key={platform} className="flex items-baseline gap-1.5 text-sm">
            <span className="text-text-subtle">{PLATFORM_LABELS[platform]}</span>
            {href ? (
              <a href={href(version)} className="font-mono text-link hover:underline">
                {version}
              </a>
            ) : (
              <span className="font-mono">{version}</span>
            )}
            {date && <span className="text-xs text-text-subtle">{date}</span>}
          </li>
        );
      })}
    </ul>
  );
}

/** Which platforms one release shipped for. */
export function PlatformChips({ platforms }: { platforms: readonly ('android' | 'ios')[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {platforms.map((p) => (
        <span
          key={p}
          className="rounded border border-border px-1.5 py-0.5 font-mono text-xs text-text-subtle"
        >
          {PLATFORM_LABELS[p]}
        </span>
      ))}
    </span>
  );
}
