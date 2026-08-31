import { CopyButton } from './copy-button';

/**
 * A shell command, styled as a terminal line.
 *
 * The command scrolls inside its own box. `ti sdk install --branch 13_4_X
 * 13.4.1.v20260825113645` is 53 characters, which is wider than a 320px
 * viewport in any monospace face — without this the whole page scrolls
 * sideways because of one build.
 *
 * Sized to sit level with the platform chips beside it: they are 34px tall, so
 * this is padded to the same, which is why the copy button is 24px rather than
 * the 32px a standalone icon button would get.
 */
export function InstallCommand({ command, label }: { command: string; label?: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-border bg-surface py-1 pl-2.5 pr-1">
      <span aria-hidden className="select-none font-mono text-sm text-text-subtle">
        $
      </span>
      {/* Focusable because it scrolls: a keyboard-only reader has no other way
          to reach the end of a command wider than the box (WCAG 2.1.1). */}
      <code
        tabIndex={0}
        className="min-w-0 flex-1 overflow-x-auto whitespace-pre rounded-sm font-mono text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        {command}
      </code>
      <CopyButton text={command} label={label} />
    </div>
  );
}
