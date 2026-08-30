'use client';

import { useEffect, useState } from 'react';

/**
 * Copy-to-clipboard for one command.
 *
 * The button is the only client component on a releases page — the commands
 * themselves are server-rendered text, so a reader without JavaScript can still
 * select and copy them, and the page costs one small component per row rather
 * than a client-rendered list.
 */
export function CopyButton({ text, label = 'Copy command' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      // No clipboard on an insecure origin, and permission can be denied
      // outright. The command is on screen either way, so failing quietly is
      // better than an error state the reader cannot act on.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      title={copied ? 'Copied' : label}
      className="grid size-8 shrink-0 place-items-center rounded-md text-text-subtle transition-colors hover:bg-surface-raised hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`size-4 ${copied ? 'text-success' : ''}`}
        aria-hidden="true"
      >
        {copied ? (
          <path d="M4 12.5l5 5L20 6.5" />
        ) : (
          <>
            <rect x="9" y="9" width="12" height="12" rx="2" />
            <path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
          </>
        )}
      </svg>
      {/* Announced rather than shown: the icon swap is the visual feedback. */}
      <span aria-live="polite" className="sr-only">
        {copied ? 'Copied' : ''}
      </span>
    </button>
  );
}
