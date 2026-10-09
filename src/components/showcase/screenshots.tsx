'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * An app's screenshots: a row of thumbnails, and a lightbox for looking at one.
 *
 * A client component for the lightbox only. The thumbnails are plain links to
 * the full-size files, so with scripting off a click opens the picture the way
 * any image link does, and nothing about the row depends on state. Script only
 * upgrades the click into opening the dialog on the same page.
 *
 * A native `<dialog>` rather than a hand-built overlay, for the reasons
 * `MobileNav` gives: `showModal()` traps focus, handles Esc, and makes the rest
 * of the page inert without extra code. What is added here is arrow keys to
 * step between pictures, and a count so a reader knows how many there are.
 *
 * Plain `img` rather than `next/image`, as the icon is: the files are capped
 * at 100KB and served from this origin, so there is little left to optimise.
 * Widths and heights are not known at build time - nothing reads the pixel
 * size of a committed picture - so the thumbnails keep their own aspect and
 * the row is aligned to the top.
 */

const BUTTON =
  'grid size-10 place-items-center rounded-md text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

export function Screenshots({ name, screenshots }: { name: string; screenshots: string[] }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [current, setCurrent] = useState<number | null>(null);

  const total = screenshots.length;
  const alt = (i: number) => `Screenshot ${i + 1} of ${total} of ${name}`;

  function open(i: number) {
    setCurrent(i);
    ref.current?.showModal();
  }

  function close() {
    ref.current?.close();
  }

  const step = (by: number) =>
    setCurrent((i) => (i === null ? i : (i + by + total) % total));

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const onClose = () => setCurrent(null);
    dialog.addEventListener('close', onClose);
    return () => dialog.removeEventListener('close', onClose);
  }, []);

  if (!total) return null;

  return (
    <section aria-labelledby="screenshots" className="mt-8">
      <h2 id="screenshots" className="text-sm font-semibold tracking-tight">
        Screenshots
      </h2>

      {/* Five across at every width. On a phone that is narrow, but these are
          overwhelmingly portrait, and the lightbox is where they are read. */}
      <ul className="mt-2 grid grid-cols-5 items-start gap-2 sm:gap-3">
        {screenshots.map((src, i) => (
          <li key={src}>
            <a
              href={src}
              onClick={(e) => {
                // Let a modified click - new tab, download - behave as a link.
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                e.preventDefault();
                open(i);
              }}
              className="block overflow-hidden rounded-lg border border-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              <img src={src} alt={alt(i)} loading="lazy" decoding="async" className="w-full" />
            </a>
          </li>
        ))}
      </ul>

      <dialog
        ref={ref}
        aria-label={`${name} screenshots`}
        // Clicking the backdrop resolves to the dialog element itself.
        onClick={(e) => {
          if (e.target === ref.current) close();
        }}
        onKeyDown={(e) => {
          if (total < 2) return;
          if (e.key === 'ArrowRight') step(1);
          if (e.key === 'ArrowLeft') step(-1);
        }}
        className="m-auto h-dvh max-h-dvh w-screen max-w-none bg-transparent p-0 text-white backdrop:bg-black/85 open:flex open:flex-col"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm text-white/80" aria-live="polite">
            {current !== null && `${current + 1} of ${total}`}
          </p>
          <button type="button" onClick={close} aria-label="Close" className={BUTTON}>
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

        <div className="flex min-h-0 flex-1 items-center justify-center gap-2 px-2 pb-4">
          {total > 1 && (
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous screenshot"
              className={`${BUTTON} shrink-0`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-5"
                aria-hidden="true"
              >
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </button>
          )}

          {/* Only the current picture is in the DOM, so opening the lightbox
              fetches one file, not five. The thumbnails are the same files,
              so it is usually already cached. */}
          {current !== null && (
            <img
              src={screenshots[current]}
              alt={alt(current)}
              className="max-h-full min-h-0 max-w-full rounded-lg object-contain"
            />
          )}

          {total > 1 && (
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next screenshot"
              className={`${BUTTON} shrink-0`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-5"
                aria-hidden="true"
              >
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          )}
        </div>
      </dialog>
    </section>
  );
}
