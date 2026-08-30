import type { Crumb } from '@/lib/docs/tree';

/**
 * The namespace path to the current type.
 *
 * One crumb per dotted segment rather than the whole name in a single crumb:
 * `Titanium.UI.iOS.PreviewContext` is four levels deep, and the intermediate
 * namespaces are pages worth reaching. An ordered list so the nesting is
 * announced, and it wraps rather than scrolls — the longest name in main is 38
 * characters, which does not fit one 320px line whatever the markup.
 */
export function Breadcrumbs({ crumbs, base }: { crumbs: Crumb[]; base: string }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-text-subtle">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
        <li>
          <a href={base} className="hover:text-link">
            SDK reference
          </a>
        </li>
        {crumbs.map((crumb, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={crumb.label} className="flex items-center gap-x-1.5">
              <span aria-hidden>/</span>
              {crumb.name && !last ? (
                <a href={`${base}/${crumb.name}`} className="font-mono hover:text-link">
                  {crumb.label}
                </a>
              ) : (
                <span className="font-mono" aria-current={last ? 'page' : undefined}>
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
