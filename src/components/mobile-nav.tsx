'use client';

import { ThemeToggle } from './theme-toggle';
import { HoverPrefetchLink } from '@/components/hover-prefetch-link';
import {
  COMMUNITY_LABEL,
  communityNav,
  DOCS_LABEL,
  docsNav,
  isExternal,
  sectionNav,
  type NavItem,
} from '@/lib/nav';
import { useEffect, useRef, useState } from 'react';

/**
 * Native <dialog> rather than a hand-rolled drawer: showModal() traps focus,
 * handles Esc, and makes the rest of the page inert without extra code.
 */
/**
 * One row. Every destination in the drawer is the same size and colour: a phone
 * menu reads as one list of places to go, and setting the grouped entries a
 * size down made them look like secondary links to pages that are anything but.
 */
const ROW =
  'block rounded-md py-2.5 text-base font-medium hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

/** Every row carries the same padding; a group's indent comes from its list. */
const ITEM = `${ROW} px-3`;

/**
 * A heading rather than a collapsed menu. On a phone the drawer already
 * scrolls, so hiding a few links behind a tap would only add an interaction to
 * save space nobody is short of - and the label is not a link on any layout,
 * which is easier to say plainly here than in a disclosure the reader has to
 * open to find out.
 *
 * The rule down the left is a pseudo-element rather than a `border-l`, because
 * a border runs the full height of its box: each row carries 10px of padding
 * above its text, so a bordered list drew a line overshooting the first and
 * last labels by that much at either end. `inset-y-2` pulls it back to the text
 * it is there to bracket.
 */
function Group({ label, items, close }: { label: string; items: NavItem[]; close: () => void }) {
  return (
    <>
      <h2 className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-text-subtle">
        {label}
      </h2>

      <ul className="relative ml-3 flex flex-col gap-1 pl-1 before:absolute before:inset-y-2 before:left-0 before:w-px before:bg-border before:content-['']">
        {items.map((item) => (
          <li key={item.href}>
            {/* Internal entries go through Link, as the sections do: an `a`
                would reload the whole application to reach a page the router
                already has. */}
            {isExternal(item.href) ? (
              <a href={item.href} onClick={close} target="_blank" rel="noreferrer" className={ITEM}>
                {item.label}
              </a>
            ) : (
              <HoverPrefetchLink href={item.href} onClick={close} className={ITEM}>
                {item.label}
              </HoverPrefetchLink>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

export function MobileNav() {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  function close() {
    ref.current?.close();
  }

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const onClose = () => setOpen(false);
    dialog.addEventListener('close', onClose);
    return () => dialog.removeEventListener('close', onClose);
  }, []);

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => {
          ref.current?.showModal();
          setOpen(true);
        }}
        className="grid size-9 place-items-center rounded-md text-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus md:hidden"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          className="size-5"
          aria-hidden="true"
        >
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>

      <dialog
        ref={ref}
        aria-label="Main Menu"
        // Clicking the backdrop resolves to the dialog element itself.
        onClick={(e) => {
          if (e.target === ref.current) close();
        }}
        className="m-0 ml-auto h-dvh max-h-dvh w-[min(20rem,85vw)] max-w-none bg-surface p-0 text-text backdrop:bg-black/50 open:flex open:flex-col"
      >
        <div className="flex items-center justify-end border-b border-border px-5 py-4">
          <button
            type="button"
            onClick={close}
            aria-label="Close menu"
            className="grid size-9 place-items-center rounded-md text-text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              className="size-5"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main">
          {/* Same order as the header: Docs, the sections, Community. */}
          <Group label={DOCS_LABEL} items={docsNav} close={close} />

          <ul className="mt-2 flex flex-col gap-1">
            {sectionNav.map((item) => (
              <li key={item.href}>
                <HoverPrefetchLink href={item.href} onClick={close} className={ITEM}>
                  {item.label}
                </HoverPrefetchLink>
              </li>
            ))}
          </ul>

          <div className="mt-4">
            <Group label={COMMUNITY_LABEL} items={communityNav} close={close} />
          </div>
        </nav>

        <div className="border-t border-border px-5 py-4">
          <ThemeToggle />
        </div>
      </dialog>
    </>
  );
}
