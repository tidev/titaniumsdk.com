import { CopyButton } from '@/components/downloads/copy-button';

/**
 * A run of shell commands as one terminal window.
 *
 * Five separate bordered boxes read as five unrelated things; a sequence you
 * type in order should look like one. The chrome matches the code samples so
 * the page has one idea of what a block of code looks like.
 *
 * Each row still copies on its own, because the commands are not
 * interchangeable — `ti build` is useless without having run the three before
 * it, and copying all five as a block would produce a paste that half-fails.
 */
export function Terminal({ title = 'Terminal', commands }: { title?: string; commands: string[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <span aria-hidden className="size-2 rounded-full bg-border-strong" />
        <span className="font-mono text-xs text-text-subtle">{title}</span>
      </div>

      <div className="py-1.5">
        {commands.map((command) => (
          <div
            key={command}
            className="group flex items-center gap-2 px-3 py-1 transition-colors hover:bg-surface-raised"
          >
            <span aria-hidden className="select-none font-mono text-sm text-text-subtle">
              $
            </span>

            {/* Focusable because it scrolls: a keyboard-only reader has no other
                way to reach the end of a command wider than the row (WCAG 2.1.1). */}
            <code
              tabIndex={0}
              className="min-w-0 flex-1 overflow-x-auto whitespace-pre rounded-sm py-0.5 font-mono text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              {command}
            </code>

            {/*
             * Revealed on hover, but only where hovering is possible. On a
             * touch screen `pointer-fine` never matches, so the button stays
             * visible rather than being unreachable. `group-focus-within`
             * covers the keyboard: the button is always focusable — opacity
             * hides it, it does not remove it — so tabbing to it brings it back
             * into view.
             */}
            <span className="shrink-0 transition-opacity pointer-fine:opacity-0 pointer-fine:group-focus-within:opacity-100 pointer-fine:group-hover:opacity-100">
              {/* The command itself is the label: five buttons all saying
                  "Copy command" would be five identical, useless announcements. */}
              <CopyButton text={command} label={`Copy ${command}`} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
