import { OsIcon } from './os-icon';
import { formatSize, OS_LABELS, sortAssets } from '@/lib/downloads/format';
import type { Asset } from '@/lib/registry';

/**
 * The per-OS archives for one build.
 *
 * Chips rather than a row of "Linux | macOS | Windows" links: at 320px three
 * platform names and their sizes have to wrap, and each is its own target.
 */
export function AssetLinks({ assets }: { assets: Asset[] }) {
  return (
    <ul className="flex flex-wrap gap-2">
      {sortAssets(assets).map((asset) => (
        <li key={asset.url}>
          <a
            href={asset.url}
            // items-center, not items-baseline: an svg has no baseline of its
            // own, so baseline alignment would drop the mark to sit on the
            // text's descender line.
            className="inline-flex h-8.5 items-center gap-1.5 rounded-md border border-border px-2.5 text-sm transition-colors hover:border-border-strong hover:text-link focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {/* An OS the registry has not published before still gets a link,
                just without a mark in front of it. */}
            <OsIcon os={asset.os} className="size-4" />
            <span className="font-medium">{OS_LABELS[asset.os] ?? asset.os}</span>
            <span className="font-mono text-xs text-text-subtle">{formatSize(asset.size)}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
