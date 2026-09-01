import { SourceBadge } from './badges';
import { Breadcrumbs, type Crumb } from '@/components/docs/breadcrumbs';
import type { ModuleIndex } from '@/lib/registry';

/**
 * The identity block both module pages open with.
 *
 * Titled by `moduleId` and nothing else. There is deliberately no display name
 * in the registry: a module's manifest `name` is a build label nothing reads,
 * while the id is the directory it installs into, the string `tiapp.xml`
 * references, and what `require()` takes. A prettier second name could only
 * drift from the one that has to be typed correctly.
 */
export function ModuleHeader({
  index,
  crumbs,
  children,
}: {
  index: ModuleIndex;
  crumbs: Crumb[];
  /** Version badges and the like, shown beside the source badge. */
  children?: React.ReactNode;
}) {
  return (
    <header>
      <Breadcrumbs crumbs={crumbs} />

      <h1 className="mt-3 font-mono text-3xl font-semibold tracking-tight break-words">
        {index.moduleId}
      </h1>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <SourceBadge source={index.source} />
        {children}
        {index.repo && (
          <a
            href={index.repo}
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-link"
          >
            <svg viewBox="0 0 16 16" aria-hidden className="size-3.5 fill-current">
              <path d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38l-.01-1.49c-2.01.37-2.53-.5-2.7-.96-.09-.24-.48-.96-.82-1.16-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48l-.01 2.19c0 .21.15.46.55.38A8 8 0 0 0 8 0Z" />
            </svg>
            {/* The repo name, not the id: they differ for 5 of the 16, and the
                link is the one place where saying so is useful. */}
            {index.repo.replace(/^https:\/\/github\.com\//, '')}
          </a>
        )}
      </div>

      {index.description && <p className="mt-4 text-lg text-text-muted">{index.description}</p>}
    </header>
  );
}
