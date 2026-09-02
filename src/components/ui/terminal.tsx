import { CopyButton } from '@/components/downloads/copy-button';

/**
 * A run of shell commands, drawn as a terminal.
 *
 * Dark in both themes, on its own `--terminal-*` roles rather than the page's
 * surfaces. That is the point of it: a light-mode terminal reads as another
 * code sample, and these are not code — they are things you type. Looking like
 * a shell is also what lets the block go without a title bar, since nothing
 * needs to announce what it is.
 *
 * It sits on `--terminal-window`, a step darker than the `--terminal-bg` band
 * around it, so the window has an edge without needing a border drawn on it.
 *
 * Each row copies on its own. The commands are a sequence, not alternatives —
 * `ti build` is useless without the three before it — so copying all five at
 * once would produce a paste that half-fails.
 */
export function Terminal({ commands }: { commands: string[] }) {
  return (
    // A window inside the band, cut out of it by being darker rather than by a
    // border — the section is already `--terminal-bg`, so an outline on top of
    // that would be a second edge doing the same job. The row hover is a step
    // up from the window, not from the band behind it.
    <div className="overflow-hidden rounded-lg bg-terminal-window py-2">
      {commands.map((command) => (
        <div
          key={command}
          className="group flex items-center gap-2.5 px-4 py-1.5 transition-colors hover:bg-terminal-row"
        >
          <span aria-hidden className="select-none font-mono text-sm text-terminal-prompt">
            $
          </span>

          {/* Focusable because it scrolls: a keyboard-only reader has no other
              way to reach the end of a command wider than the row (WCAG 2.1.1). */}
          <code
            tabIndex={0}
            className="min-w-0 flex-1 overflow-x-auto whitespace-pre rounded-sm py-0.5 font-mono text-sm text-terminal-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            {command}
          </code>

          {/*
           * Revealed on hover, but only where hovering exists. On a touch
           * screen `pointer-fine` never matches and the button simply stays
           * visible rather than being unreachable. `group-focus-within` covers
           * the keyboard: opacity hides the button, it does not remove it, so
           * all of them stay in the tab order and tabbing to one brings it back
           * into view.
           */}
          <span className="shrink-0 transition-opacity pointer-fine:opacity-0 pointer-fine:group-focus-within:opacity-100 pointer-fine:group-hover:opacity-100">
            {/* Labelled with the command: several buttons all saying "Copy
                command" would be several identical, useless announcements. */}
            <CopyButton text={command} label={`Copy ${command}`} tone="terminal" />
          </span>
        </div>
      ))}
    </div>
  );
}
