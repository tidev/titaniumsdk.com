/**
 * The path to the current page.
 *
 * One crumb per namespace segment rather than the whole name in a single crumb:
 * `Titanium.UI.iOS.PreviewContext` is four levels deep, and the intermediate
 * namespaces are pages worth reaching. An ordered list so the nesting is
 * announced, and it wraps rather than scrolls — the longest name in main is 38
 * characters, which does not fit one 320px line whatever the markup.
 *
 * The crumbs are handed in already resolved. The SDK builds them from a dotted
 * type name and a module from its id and version, and neither arrangement is
 * derivable from the other.
 */

export type Crumb = {
  label: string;
  /** Omitted when the segment has no page of its own. The last crumb never links. */
  href?: string;
  /** Identifiers are set in mono; section names are not. */
  mono?: boolean;
};

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-text-subtle">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
        {crumbs.map((crumb, i) => {
          const last = i === crumbs.length - 1;
          const font = crumb.mono ? 'font-mono' : '';
          return (
            <li key={`${crumb.label}-${i}`} className="flex items-center gap-x-1.5">
              {i > 0 && <span aria-hidden>/</span>}
              {crumb.href && !last ? (
                <a href={crumb.href} className={`${font} hover:text-link`}>
                  {crumb.label}
                </a>
              ) : (
                <span className={font} aria-current={last ? 'page' : undefined}>
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
