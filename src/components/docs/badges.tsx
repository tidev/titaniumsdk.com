import { PlatformIcon } from './platform-icons';
import { PLATFORM_LABELS, sinceFor, sortPlatforms } from '@/lib/docs/format';
import type { ApiPlatform, Member } from '@/lib/registry';

/**
 * Which platforms a member is available on, and since which version on each.
 *
 * One box per platform, always: the registry narrows inherited members per
 * type, so `backgroundColor` really is four-platform on a View and iOS-only on
 * an iOS-only view, and a reader cannot infer that from the type alone. An
 * earlier version hid the boxes when a member matched its type, which made a
 * fully-supported member look like it had no platform data at all.
 *
 * The version sits inside the box with the platform's icon rather than in a
 * separate "since" string, because 441 members have a different version per
 * platform and "since Android 6.2.0, iPhone 6.0.0, iPad 6.0.0" alongside the
 * platform boxes said the same thing twice in two layouts.
 */
export function PlatformBadges({
  platforms,
  since,
}: {
  platforms: readonly ApiPlatform[];
  since?: Member['since'];
}) {
  const shown = sortPlatforms(platforms);
  if (!shown.length) return null;

  return (
    <span className="flex flex-wrap gap-1">
      {shown.map((p) => {
        const version = sinceFor(since, p);
        const label = `${PLATFORM_LABELS[p]}, since ${version}`;
        return (
          <span
            key={p}
            title={label}
            className="inline-flex items-center gap-1 rounded border border-border px-1.5 py-0.5 font-mono text-xs text-text-subtle"
          >
            <PlatformIcon platform={p} />
            <span className="sr-only">{label}</span>
            <span aria-hidden="true">{version}</span>
          </span>
        );
      })}
    </span>
  );
}

export function DeprecatedBadge() {
  return (
    <span className="rounded border border-danger px-1.5 py-0.5 font-mono text-xs text-danger">
      deprecated
    </span>
  );
}
