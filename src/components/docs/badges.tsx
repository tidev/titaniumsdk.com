import { PLATFORM_LABELS, sortPlatforms } from '@/lib/docs/format';
import type { ApiPlatform } from '@/lib/registry';

/**
 * Which platforms a member is actually available on.
 *
 * Shown on every member rather than only the unusual ones: the registry
 * narrows inherited members per type, so `backgroundColor` really is
 * four-platform on a View and iOS-only on an iOS-only view, and a reader
 * cannot infer that from the type alone.
 */
export function PlatformBadges({
  platforms,
  all,
}: {
  platforms: readonly ApiPlatform[];
  /** The owning type's platforms. When they match, the badges say nothing new. */
  all?: readonly ApiPlatform[];
}) {
  const shown = sortPlatforms(platforms);
  if (!shown.length) return null;
  if (all && shown.length === sortPlatforms(all).length) return null;

  return (
    <span className="flex flex-wrap gap-1">
      {shown.map((p) => (
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

export function SinceBadge({ since }: { since: string | null }) {
  if (!since) return null;
  return (
    <span className="font-mono text-xs text-text-subtle" title="Available since">
      since {since}
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
