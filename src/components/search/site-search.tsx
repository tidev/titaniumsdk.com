'use client';

import { type Detail, resultDetail } from './result-detail.ts';
import { useCallback, useEffect, useId, useRef, useState } from 'react';

/**
 * Site search (TI-47), over the Pagefind index built by
 * `scripts/generate-search-index.ts`.
 *
 * A native `<dialog>` rather than a hand-built overlay: `showModal()` traps
 * focus, closes on Escape, makes the rest of the page inert and restores focus
 * to the trigger on close. All of that is the accessibility criterion, and all
 * of it is behaviour we would otherwise write and get subtly wrong.
 *
 * The runtime is loaded on first open, not on page load — 116 KB that most
 * visitors never need.
 */

type Kind = 'api' | 'module' | 'blog';

type Hit = {
  url: string;
  title: string;
  kind: Kind;
  detail: Detail;
};

/** Group order and labels. Guides join this when TI-32 lands. */
const GROUPS: { kind: Kind; label: string }[] = [
  { kind: 'api', label: 'API reference' },
  { kind: 'module', label: 'Modules' },
  { kind: 'blog', label: 'Blog' },
];

type PagefindResult = {
  data: () => Promise<{
    url: string;
    excerpt: string;
    meta?: { title?: string; kind?: string; summary?: string };
  }>;
};
type Pagefind = {
  init: () => Promise<void>;
  search: (term: string) => Promise<{ results: PagefindResult[] }>;
};

let runtime: Promise<Pagefind> | undefined;

/**
 * Loads `/_pagefind/pagefind.js` at runtime.
 *
 * The path is built at call time so the bundler cannot statically resolve it —
 * the file is a build artifact that does not exist when the app is compiled,
 * and a static import would fail the build.
 */
function loadPagefind(): Promise<Pagefind> {
  runtime ??= (async () => {
    const url = `${window.location.origin}/_pagefind/pagefind.js`;
    const mod = (await import(/* webpackIgnore: true */ /* @vite-ignore */ url)) as Pagefind;
    await mod.init();
    return mod;
  })();
  return runtime;
}

export function SiteSearch() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();

  const show = useCallback(() => {
    setOpen(true);
    dialogRef.current?.showModal();
    // Warm the runtime while the person is still typing the first character.
    void loadPagefind().catch(() => setFailed(true));
  }, []);

  const hide = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  // cmd+K / ctrl+K, and `/` the way most docs sites bind it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const inField =
        e.target instanceof HTMLElement &&
        (e.target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName));
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !inField)) {
        e.preventDefault();
        show();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [show]);

  // Debounced query. Pagefind answers in single-digit milliseconds, so this is
  // about not firing a request per keystroke rather than about latency.
  useEffect(() => {
    const q = term.trim();
    if (!q) {
      setHits([]);
      setBusy(false);
      return;
    }
    setBusy(true);
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const pf = await loadPagefind();
        const res = await pf.search(q);
        const top = await Promise.all(res.results.slice(0, 30).map((r) => r.data()));
        if (cancelled) return;
        setHits(
          top.map((d) => ({
            url: d.url,
            title: d.meta?.title ?? d.url,
            kind: (d.meta?.kind as Kind) ?? 'api',
            detail: resultDetail(d.meta?.title ?? '', d.excerpt),
          }))
        );
        setActive(0);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setBusy(false);
      }
    }, 120);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [term]);

  // Flattened in group order, so arrow keys walk what the eye sees.
  const ordered = GROUPS.flatMap((g) => hits.filter((h) => h.kind === g.kind));

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!ordered.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % ordered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + ordered.length) % ordered.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const hit = ordered[active];
      if (hit) window.location.assign(hit.url);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={show}
        title="Search (⌘K)"
        className="hidden items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm text-text-subtle transition-colors hover:border-border-strong hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:flex"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          className="size-4"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        Search
        <kbd className="ml-2 rounded border border-border px-1 font-mono text-2xs">⌘K</kbd>
      </button>

      {/* The mobile trigger: same dialog, icon only. */}
      <button
        type="button"
        onClick={show}
        aria-label="Search"
        className="grid size-9 place-items-center rounded-md text-text-muted transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus sm:hidden"
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
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
      </button>

      <dialog
        ref={dialogRef}
        aria-label="Search the site"
        onClose={() => {
          setOpen(false);
          setTerm('');
          setHits([]);
        }}
        // Clicking the backdrop closes. The dialog element itself fills the
        // viewport, so the target is the dialog only when the click missed the panel.
        onClick={(e) => {
          if (e.target === dialogRef.current) hide();
        }}
        className="m-0 h-full max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-black/50 open:flex open:items-start open:justify-center"
      >
        <div className="mt-[10vh] flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-lg border border-border bg-bg shadow-2xl sm:mt-[12vh]">
          {/* The divider only exists to separate the field from results. With
                nothing below it, it is a line under a lone input. */}
          <div
            className={`flex items-center gap-3 px-4 ${
              ordered.length || (term.trim() && open) ? 'border-b border-border' : ''
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              className="size-5 shrink-0 text-text-subtle"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              autoFocus
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onKeyDown={onKeyDown}
              // `type="text"`, not `search`: browsers make Escape clear a
              // search field instead of reaching the dialog, so Escape stopped
              // closing the dialog — verified, not theorised.
              type="text"
              placeholder="Search"
              aria-label="Search query"
              role="combobox"
              aria-expanded={ordered.length > 0}
              aria-controls={listId}
              aria-activedescendant={ordered.length ? `${listId}-${active}` : undefined}
              autoComplete="off"
              spellCheck={false}
              className="w-full bg-transparent py-4 text-lg text-text outline-none placeholder:text-text-subtle"
            />
            <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-2xs text-text-subtle sm:block">
              esc
            </kbd>
          </div>

          <div id={listId} role="listbox" aria-label="Search results" className="overflow-y-auto">
            {ordered.length > 0 &&
              GROUPS.map((group) => {
                const inGroup = hits.filter((h) => h.kind === group.kind);
                if (!inGroup.length) return null;
                return (
                  <div key={group.kind} role="group" aria-label={group.label}>
                    <p className="sticky top-0 bg-surface px-4 py-1.5 text-2xs font-medium tracking-wide text-text-subtle uppercase">
                      {group.label}
                    </p>
                    {inGroup.map((hit) => {
                      const i = ordered.indexOf(hit);
                      return (
                        <a
                          key={hit.url}
                          id={`${listId}-${i}`}
                          role="option"
                          aria-selected={i === active}
                          href={hit.url}
                          onMouseEnter={() => setActive(i)}
                          className={`block border-l-2 px-4 py-2.5 ${
                            i === active
                              ? 'border-link bg-surface'
                              : 'border-transparent hover:bg-surface/60'
                          }`}
                        >
                          <span className="block truncate font-mono text-sm text-text">
                            {hit.title}
                          </span>
                          {hit.detail &&
                            ('text' in hit.detail ? (
                              <span className="mt-0.5 block truncate text-xs text-text-muted">
                                {hit.detail.text}
                              </span>
                            ) : (
                              <span
                                className="mt-0.5 block truncate text-xs text-text-muted [&_mark]:bg-transparent [&_mark]:font-medium [&_mark]:text-text"
                                // Pagefind's excerpt is its own HTML, and
                                // contains only <mark> around matched terms.
                                dangerouslySetInnerHTML={{ __html: hit.detail.html }}
                              />
                            ))}
                        </a>
                      );
                    })}
                  </div>
                );
              })}

            {/* Nothing at all until something is typed, so an unused search is
                just a field — the panel has no advice to give before there is
                a query, and inventing some only makes it taller. Everything
                below needs a term to be worth saying. */}
            {open && !ordered.length && term.trim() && (
              <p className="px-4 py-8 text-center text-sm text-text-muted">
                {failed ? (
                  'Search is unavailable right now.'
                ) : busy ? (
                  'Searching…'
                ) : (
                  <>
                    Nothing matches <span className="font-mono text-text">{term.trim()}</span>.
                    <span className="mt-1 block text-xs text-text-subtle">
                      Search matches whole words, so check the spelling.
                    </span>
                  </>
                )}
              </p>
            )}
          </div>

          {/* Announced, not shown: the visible list is the sighted feedback. */}
          <p aria-live="polite" className="sr-only">
            {term.trim() && !busy
              ? `${ordered.length} result${ordered.length === 1 ? '' : 's'} for ${term.trim()}`
              : ''}
          </p>
        </div>
      </dialog>
    </>
  );
}
