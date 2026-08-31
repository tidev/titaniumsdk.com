import { DownloadsNav } from '@/components/downloads/downloads-nav';
import { OsIconDefs } from '@/components/downloads/os-icon';

/**
 * The shell shared by the overview, the release channels, and the CI branches.
 *
 * It owns the `h1`, so every page below it starts at `h2` and the three views
 * read as one section rather than three pages that happen to share a prefix.
 * It also carries the platform-mark sprite, since all three views list
 * downloads.
 */
export default function DownloadsLayout({ children }: LayoutProps<'/downloads'>) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Downloads</h1>
      <p className="mt-2 max-w-2xl text-text-muted">
        Every Titanium SDK release, plus the CI builds cut from each active branch.
      </p>
      <DownloadsNav />
      <OsIconDefs />
      {children}
    </div>
  );
}
