'use client';

import { NAV_ITEM_CLASS } from './site-nav-item';
import { HoverPrefetchLink } from '@/components/hover-prefetch-link';
import { isExternal, type NavItem } from '@/lib/nav';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

/**
 * A dropdown in the header: Docs and Community are both one of these.
 *
 * ## A disclosure, not a `menu`
 *
 * The WAI-ARIA menu pattern - `role="menu"`, `role="menuitem"`, arrow keys
 * capturing focus - is for menus of *commands*, the way a desktop application's
 * File menu is. This holds links. Marked up as a menu, a screen reader would
 * announce four "menu items" that are really destinations, and `menuitem`
 * suppresses the link semantics the reader needs to know they are about to
 * navigate away. So this is a disclosure button revealing an ordinary list of
 * ordinary links, which is what APG recommends for navigation and what Tab
 * already moves through correctly.
 *
 * ## Opening it
 *
 * Hovering opens it, and that has to be the *least* of the ways in, because
 * hover is the one input not everybody has. Three others reach the same state:
 *
 *   - **Focus.** Tabbing to the trigger opens it, so a keyboard user never has
 *     to guess that the button does something a mouse would have revealed.
 *   - **Tap.** A touch tap fires `pointerenter` before `click`, so the menu is
 *     already open by the time the click lands. The click handler therefore
 *     *opens* rather than toggling - toggling would close, on the same tap, the
 *     menu the tap just opened.
 *   - **Escape**, which closes and hands focus back. The half people forget: a
 *     keyboard user who dismissed the menu with focus still inside it would
 *     otherwise be tabbing through a hidden list.
 *
 * Below `md` this is not rendered at all - the drawer in `mobile-nav.tsx` lists
 * each group as a heading with its links under it - so the tap path is for the
 * touch-capable laptops and tablets that land on the desktop layout.
 */

/**
 * How long the menu survives the pointer leaving it.
 *
 * The trigger and the panel do not touch: there is a few pixels of gap, and
 * crossing it means leaving both. Without this the menu would close on the way
 * to its own contents. It also forgives the diagonal, which is how people
 * actually travel from a word to the third item under it.
 */
const CLOSE_DELAY_MS = 150;

export function NavMenu({ label, items }: { label: string; items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closing = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();

  const cancelClose = useCallback(() => {
    if (closing.current) clearTimeout(closing.current);
    closing.current = null;
  }, []);

  const show = useCallback(() => {
    cancelClose();
    setOpen(true);
  }, [cancelClose]);

  const hide = useCallback(() => {
    cancelClose();
    setOpen(false);
  }, [cancelClose]);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closing.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }, [cancelClose]);

  // A pending close outliving the component would fire against an unmounted
  // tree. Navigation unmounts this on every route change, so it is a real case.
  useEffect(() => cancelClose, [cancelClose]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      hide();
      trigger.current?.focus();
    }

    /**
     * `pointerdown` rather than `click`, so a press that starts outside closes
     * the menu before the thing underneath receives it, and one press does one
     * thing. This is what closes the menu for a touch user, who has no way to
     * move a pointer off it.
     */
    function onPointerDown(event: PointerEvent) {
      if (!wrapper.current?.contains(event.target as Node)) hide();
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open, hide]);

  return (
    <div
      ref={wrapper}
      className="relative"
      onPointerEnter={show}
      onPointerLeave={scheduleClose}
      // Focus moving in opens it and cancels any close the pointer started, so
      // tabbing into a menu the mouse is drifting out of does not race.
      onFocus={show}
      // Tabbing past the last link closes the menu behind you. `relatedTarget`
      // is where focus is going, and it is null when focus leaves the document
      // entirely - switching windows should not close anything.
      onBlur={(event) => {
        const next = event.relatedTarget as Node | null;
        if (next && !event.currentTarget.contains(next)) hide();
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        // Opens rather than toggles. See the note on tapping above.
        onClick={show}
        // The same box as the four links beside it, plus the gap the chevron
        // needs. See `./site-nav-item.ts` for why they share one string.
        className={`${NAV_ITEM_CLASS} gap-1`}
      >
        {label}
        {/* Static. It marks the item as having something under it; it is not a
            state indicator, and `aria-expanded` is already the one that is. */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="size-3.5"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* `hidden` rather than unmounted: the links stay in the DOM, so the
          markup a crawler reads is the same one a reader gets, and there is
          nothing to re-render on every open. */}
      <ul
        id={id}
        hidden={!open}
        className="absolute left-0 top-full z-50 mt-1 min-w-52 rounded-md border border-border bg-surface p-1 shadow-lg"
      >
        {items.map((item) => {
          const className =
            'block rounded px-3 py-2 text-sm text-text-muted transition-colors hover:bg-surface-raised hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
          return (
            <li key={item.href}>
              {isExternal(item.href) ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  onClick={hide}
                  className={className}
                >
                  {item.label}
                </a>
              ) : (
                <HoverPrefetchLink href={item.href} onClick={hide} className={className}>
                  {item.label}
                </HoverPrefetchLink>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
