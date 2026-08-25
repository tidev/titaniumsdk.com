'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'system' | 'dark';

const OPTIONS: { value: Theme; label: string; icon: React.ReactNode }[] = [
  {
    value: 'light',
    label: 'Light',
    icon: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>
    ),
  },
  {
    value: 'system',
    label: 'System',
    icon: (
      <>
        <rect x="2" y="4" width="20" height="13" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </>
    ),
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: <path d="M20 14a8 8 0 1 1-9.9-9.9 7 7 0 0 0 9.9 9.9Z" />,
  },
];

/**
 * Three states, not a two-way switch.
 *
 * "system" is represented by the *absence* of a stored value, matching the
 * pre-paint script in layout.tsx and the CSS, which falls back to
 * prefers-color-scheme when no data-theme attribute is set. Storing the
 * literal string "system" would leave an attribute no rule matches.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');
  // The server cannot know the stored theme, so nothing is marked active
  // until after hydration. Avoids a mismatch and a flash of wrong selection.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('theme');
    setTheme(stored === 'light' || stored === 'dark' ? stored : 'system');
    setReady(true);
  }, []);

  function choose(next: Theme) {
    setTheme(next);
    const root = document.documentElement;
    if (next === 'system') {
      localStorage.removeItem('theme');
      delete root.dataset.theme;
    } else {
      localStorage.setItem('theme', next);
      root.dataset.theme = next;
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className="inline-flex items-center gap-0.5 rounded-full border border-border p-0.5"
    >
      {OPTIONS.map((o) => {
        const active = ready && theme === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.label}
            title={o.label}
            onClick={() => choose(o.value)}
            className={`grid size-7 place-items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus ${
              active ? 'bg-surface-raised text-text' : 'text-text-subtle hover:text-text'
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4"
              aria-hidden="true"
            >
              {o.icon}
            </svg>
          </button>
        );
      })}
    </div>
  );
}
