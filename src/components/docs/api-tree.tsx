import { HoverPrefetchLink } from './hover-prefetch-link';
import { branchIds, buildNavTree, type NavNode, type NavType } from '@/lib/docs/tree';

/**
 * The namespace tree itself, without the rail around it.
 *
 * Split out of `ApiNav` so the guides sidebar can draw the same tree under its
 * "Titanium API" row (TI-79). The two callers differ only in how they learn the
 * current type: `ApiNav` is a client component reading `usePathname()`, because
 * a layout at `[version]` cannot see `[type]`; the guides shell renders on a
 * route whose page knows its own type and passes it straight in.
 *
 * No `'use client'` here on purpose. Imported from a client component it is
 * bundled into that graph; imported from a server component it renders on the
 * server and ships no JavaScript. It uses no hooks, so both are correct.
 *
 * The flat type list is the prop rather than the built tree because props are
 * serialised into a client page's flight payload, and the nested form costs
 * about four times the bytes to say the same thing.
 */
export function ApiTree({
  types,
  base,
  active,
}: {
  types: NavType[];
  base: string;
  active: string;
}) {
  const roots = buildNavTree(types);
  const open = new Set(branchIds(active, roots));

  return (
    <ul>
      {roots.map((node) => (
        <Node key={node.id} node={node} base={base} active={active} open={open} />
      ))}
    </ul>
  );
}

function Node({
  node,
  base,
  active,
  open,
}: {
  node: NavNode;
  base: string;
  active: string;
  open: Set<string>;
}) {
  const current = node.name !== undefined && node.name === active;

  if (!node.children.length) {
    return (
      // The same row shape as a branch's <summary>, so a leaf and a branch at
      // the same depth start at the same x. Without the spacer the chevron
      // pushed only the branches right, and a tier read as two tiers.
      <li className="flex items-center gap-1.5">
        <span aria-hidden className="size-3 shrink-0" />
        <Label node={node} base={base} current={current} />
      </li>
    );
  }

  return (
    <li>
      {/* Keyed on the active type so it remounts on every navigation.
          `open` is a React-uncontrolled DOM attribute: clicking the link inside
          a <summary> toggles the browser's own disclosure, and once the DOM and
          the vdom disagree React will not put it back, because the prop it
          renders has not changed. Remounting settles it from the route, which is
          the only thing that should decide it. Full page loads used to make this
          invisible; client navigation does not. */}
      <details key={`${node.id}:${active}`} open={open.has(node.id)}>
        {/* The namespace's own page is a link inside the summary. Clicking it
            toggles the details as well, which nobody sees because every link
            here is a full page load - and it buys one row per namespace
            instead of two. */}
        <summary className="flex cursor-pointer list-none items-center gap-1.5 py-1 [&::-webkit-details-marker]:hidden">
          <Chevron className="transition-transform" />
          <Label node={node} base={base} current={current} />
        </summary>
        {/* Tighter than it looks like it should be, deliberately. Reserving the
            chevron slot on every row moved all 284 labels 18px right and pushed
            twelve of them into truncation; the border already marks the level, so
            the indent can give most of that back without losing the hierarchy. */}
        <ul className="ml-1 border-l border-border pl-1.5">
          {node.children.map((child) => (
            <Node key={child.id} node={child} base={base} active={active} open={open} />
          ))}
        </ul>
      </details>
    </li>
  );
}

/** A node's label - a link when it has a page of its own, plain text otherwise. */
function Label({ node, base, current }: { node: NavNode; base: string; current: boolean }) {
  if (!node.name) {
    return <span className="py-1 font-medium text-text-muted">{node.label}</span>;
  }

  return (
    <HoverPrefetchLink
      href={`${base}/${node.name}`}
      // 284 links in a scrolling rail, and a type page renders on demand: left
      // to prefetch on sight, opening the tree would ask the server to build
      // most of a version. So it prefetches on hover instead, which is when
      // the click is about to happen anyway. The navigation is still
      // client-side; see the component for the numbers.
      aria-current={current ? 'page' : undefined}
      // Sans, like every other row in either sidebar. A type name is code in
      // prose and gets a mono face there, but a nav row is a label: set in mono
      // it read as a different kind of thing from the guide rows above it, and
      // mono is wider, which cost characters on the names that truncate.
      //
      // min-w-0 so truncate still shrinks when this is the flex child of a summary.
      className={`block min-w-0 truncate py-1 ${
        current
          ? 'font-semibold text-link underline decoration-link decoration-2 underline-offset-4'
          : 'text-text hover:text-link'
      } ${node.deprecated ? 'line-through decoration-danger' : ''}`}
    >
      {node.label}
    </HoverPrefetchLink>
  );
}

export function Chevron({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`size-3 shrink-0 text-text-subtle ${className}`}
    >
      <path d="M6 3l5 5-5 5" />
    </svg>
  );
}
