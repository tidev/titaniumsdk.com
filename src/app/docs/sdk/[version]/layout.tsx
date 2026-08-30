import { ApiNav } from '@/components/docs/api-nav';
import { resolveVersion, sdkIndex } from '@/lib/docs/registry';
import { navTypes } from '@/lib/docs/tree';

/**
 * The shell shared by the version index and every type page.
 *
 * A grid rather than a flex row so the nav's own parts can place themselves:
 * below `lg` it is one column with the disclosure toggle above the content, and
 * at `lg` the toggle goes `display: none` — which drops it out of the grid
 * altogether — leaving the rail in column one.
 */
export default async function SdkLayout({ children, params }: LayoutProps<'/docs/sdk/[version]'>) {
  const { version } = await params;
  const resolved = resolveVersion(version);
  const index = resolved ? sdkIndex(resolved) : null;

  // An unknown version still renders its child, which calls notFound() itself.
  // Rendering a nav for a version that does not exist would be worse than none.
  if (!resolved || !index) return children;

  return (
    <div className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-x-8 px-4 sm:px-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <ApiNav
        types={navTypes(index.types)}
        base={`/docs/sdk/${resolved}`}
        count={index.counts.types}
      />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
