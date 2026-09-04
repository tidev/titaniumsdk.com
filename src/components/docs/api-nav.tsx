'use client';

import { branchIds, buildNavTree, type NavNode, type NavType } from '@/lib/docs/tree';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * The API reference sidebar: every type in the version, grouped by namespace.
 *
 * A client component for exactly one reason — the current type. `params` stops
 * at the segment that owns the layout, so a layout at `[version]` never sees
 * `[type]`, and no CSS selector can open a `<details>`. `usePathname()` is the
 * only way to read it.
 *
 * It is not a client-rendered tree, though. Type pages render on the server for
 * one concrete URL — at build time before, on first request now — so either way
 * the pathname resolves during that render and the `open` attributes and
 * `aria-current` ship inside the HTML. The tree expands to the right branch and
 * marks the current page with scripting turned off, and hydration has nothing
 * to correct. Verified against an on-demand response, not assumed.
 *
 * The flat type list is the prop rather than the built tree because props are
 * serialised into every page's flight payload, and the nested form costs about
 * four times the bytes to say the same thing.
 */
export function ApiNav({
  types,
  base,
  count,
}: {
  types: NavType[];
  base: string;
  /** Types in this version, so the phone summary says what it is hiding. */
  count: number;
}) {
  const pathname = usePathname();
  // `/docs/sdk/main/Titanium.UI.Button` -> `Titanium.UI.Button`. Empty on the
  // version index, which sits under this layout but is not a type.
  const active = pathname.startsWith(`${base}/`)
    ? decodeURIComponent(pathname.slice(base.length + 1))
    : '';

  const roots = buildNavTree(types);
  const open = new Set(branchIds(active, roots));

  // The rail holds 284 rows and starts at the top, so the branch that was
  // expanded for you is often below the fold. Enhancement only — the rail is
  // correct without it, just scrolled to the wrong place. Measured against the
  // rail's own box rather than scrollIntoView(), which would drag the document
  // along with it.
  const rail = useRef<HTMLElement>(null);
  useEffect(() => {
    const box = rail.current;
    const current = box?.querySelector('[aria-current="page"]');
    if (!box || !current) return;
    const offset = current.getBoundingClientRect().top - box.getBoundingClientRect().top;
    box.scrollTop += offset - box.clientHeight / 2;
  }, []);

  return (
    <>
      {/*
        A checkbox drives the phone disclosure so the tree is in the document
        once. The obvious markup — a <details> for phones and an <aside> for
        desktop — renders all 283 rows twice, which measured at +58 kB per page;
        and a <details> cannot be talked into staying open at one breakpoint and
        shut at another, since `open` is an attribute and no CSS reaches it.
        The cost is that assistive tech announces a checkbox rather than a
        disclosure. It works with scripting off, which the alternatives do not.
      */}
      <input id="api-nav-toggle" type="checkbox" className="peer sr-only" />
      <label
        htmlFor="api-nav-toggle"
        className="mt-6 flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium peer-checked:[&_svg]:rotate-90 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus lg:hidden"
      >
        <Chevron className="transition-transform" />
        Browse the API
        <span className="ml-auto font-mono text-xs text-text-subtle">{count} types</span>
      </label>

      <aside className="hidden peer-checked:block lg:block">
        {/* Sticks below the 4rem site header and scrolls on its own, so a long
            branch never drags the page with it. */}
        <nav
          ref={rail}
          aria-label="API reference"
          // `api-nav` is the hook for the chevron rule in globals.css; see there.
          className="api-nav max-h-[70dvh] overflow-y-auto pb-6 text-sm lg:sticky lg:top-16 lg:max-h-[calc(100dvh-4rem)] lg:py-10 lg:pr-3"
        >
          <ul>
            {roots.map((node) => (
              <Node key={node.id} node={node} base={base} active={active} open={open} />
            ))}
          </ul>
        </nav>
      </aside>
    </>
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
      <details open={open.has(node.id)}>
        {/* The namespace's own page is a link inside the summary. Clicking it
            toggles the details as well, which nobody sees because every link
            here is a full page load — and it buys one row per namespace
            instead of two. */}
        <summary className="flex cursor-pointer list-none items-center gap-1.5 py-1 [&::-webkit-details-marker]:hidden">
          <Chevron className="transition-transform" />
          <Label node={node} base={base} current={current} />
          <span className="ml-auto pl-2 font-mono text-xs text-text-subtle">
            {node.children.length}
          </span>
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

/** A node's label — a link when it has a page of its own, plain text otherwise. */
function Label({ node, base, current }: { node: NavNode; base: string; current: boolean }) {
  if (!node.name) {
    return <span className="py-1 font-medium text-text-muted">{node.label}</span>;
  }

  return (
    <a
      href={`${base}/${node.name}`}
      aria-current={current ? 'page' : undefined}
      // min-w-0 so truncate still shrinks when this is the flex child of a summary.
      className={`block min-w-0 truncate py-1 font-mono ${
        current
          ? 'font-semibold text-text underline decoration-link decoration-2 underline-offset-4'
          : 'text-text-muted hover:text-link'
      } ${node.deprecated ? 'line-through decoration-danger' : ''}`}
    >
      {node.label}
    </a>
  );
}

function Chevron({ className = '' }: { className?: string }) {
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
