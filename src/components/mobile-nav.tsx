"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { communityNav, isExternal, primaryNav } from "@/lib/nav";
import { ThemeToggle } from "./theme-toggle";

/**
 * Native <dialog> rather than a hand-rolled drawer: showModal() traps focus,
 * handles Esc, and makes the rest of the page inert without extra code.
 */
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
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
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
        // Clicking the backdrop resolves to the dialog element itself.
        onClick={(e) => {
          if (e.target === ref.current) close();
        }}
        className="m-0 ml-auto h-dvh max-h-dvh w-[min(20rem,85vw)] max-w-none bg-surface p-0 text-text backdrop:bg-black/50 open:flex open:flex-col"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <span className="text-sm font-medium text-text-muted">Menu</span>
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
          <ul className="flex flex-col gap-1">
            {primaryNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={close}
                  className="block rounded-md px-3 py-2.5 text-base font-medium hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <hr className="my-4 border-border" />

          <ul className="flex flex-col gap-1">
            {communityNav.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={close}
                  {...(isExternal(item.href)
                    ? { target: "_blank", rel: "noreferrer" }
                    : {})}
                  className="block rounded-md px-3 py-2 text-sm text-text-muted hover:bg-surface-raised hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-border px-5 py-4">
          <ThemeToggle />
        </div>
      </dialog>
    </>
  );
}
