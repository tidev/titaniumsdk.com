import { formatDate } from '@/lib/docs/format';
import { PLATFORM_LABELS, type PlatformLatest } from '@/lib/docs/module-summary';
import type { Curation } from '@/lib/registry';

/**
 * What backs a module, which is not the same as who owns it.
 *
 * The badge said "TiDev" and was read as a statement about the owner. It never
 * was: `tidev` means the module is curated here, with verified releases and a
 * compiled reference, and the giveaway is tidev/ti.worker — a TiDev repository
 * that nothing on this site documents, so it lists as community. Naming the
 * status rather than the org is what makes the two readable together.
 */
const CURATION: Record<Curation, { label: string; className: string; title: string }> = {
  tidev: {
    label: 'Official',
    className: 'border-success text-success',
    title: 'Maintained by TiDev: verified releases and a compiled API reference here',
  },
  community: {
    label: 'Community',
    className: 'border-border-strong text-text-subtle',
    title: 'Published on GitHub by its author; not documented here',
  },
  unverified: {
    label: 'Unverified',
    className: 'border-warning text-warning',
    title: 'Not reviewed by TiDev',
  },
};

/**
 * The card stripe, keyed to the same three values as the badge.
 *
 * A background on a pseudo-element rather than `border-l-*`: the card's border
 * changes colour on hover, and a left border would be overwritten by it.
 */
export const CURATION_STRIPE: Record<Curation, string> = {
  tidev: 'before:bg-success',
  community: 'before:bg-border-strong',
  unverified: 'before:bg-warning',
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
