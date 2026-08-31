import { PlatformChips } from './badges';
import { formatDate } from '@/lib/docs/format';
import type { ModuleIndex } from '@/lib/registry';

/**
 * Every release of a module, newest first.
 *
 * A version is the row rather than a platform-version pair: 52 version strings
 * shipped on both platforms, sometimes from two GitHub releases weeks apart, and
 * splitting them would list the same download twice.
 *
 * Prereleases are shown rather than filtered out. They are the reason `latest`
 * sometimes names a lower number than the newest row — ti.coremotion's 4.0.1 is
 * a prerelease, so 4.0.0 is still the current iOS build — and hiding them would
 * leave that looking like a bug.
 */
export function Releases({ index, className = '' }: { index: ModuleIndex; className?: string }) {
  if (!index.versions.length) return null;

  return (
    <section aria-labelledby="releases" className={className}>
      {/* The tab above already reads "80 Releases", so the count is not
          repeated here. The heading stays for structure. */}
      <h2 id="releases" className="sr-only">
        Releases
      </h2>

      <ul className="mt-4 divide-y divide-border">
        {index.versions.map((release) => {
          const date = formatDate(release.publishedAt);
          // `versions` entries are open-ended in the schema, so anything beyond
          // the three declared fields arrives untyped. `prerelease` is written
          // by scripts/generate-modules.ts straight from the GitHub release.
          const prerelease = (release as { prerelease?: boolean }).prerelease === true;

          return (
            <li
              key={release.version}
              className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-2.5"
            >
              <a
                href={`/modules/${index.moduleId}/v/${release.version}`}
                className="font-mono text-sm text-link hover:underline"
              >
                {release.version}
              </a>
              <PlatformChips platforms={release.platforms} />
              {prerelease && (
                <span className="rounded border border-warning px-1.5 py-0.5 font-mono text-xs text-warning">
                  prerelease
                </span>
              )}
              {date && <span className="ml-auto text-xs text-text-subtle">{date}</span>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
