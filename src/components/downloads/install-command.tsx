import { CopyButton } from './copy-button';

/**
 * A shell command, styled as a terminal line.
 *
 * The command scrolls inside its own box. `ti sdk install --branch 13_4_X
 * 13.4.1.v20260825113645` is 53 characters, which is wider than a 320px
 * viewport in any monospace face — without this the whole page scrolls
 * sideways because of one build.
 *
 * The height is set rather than derived, because the two boxes it has to sit
 * level with derive theirs from different things: a chip's height comes from
 * its text's line box, this one's from the copy button, and the two landed half
 * a pixel apart — enough to see. `h-8.5` is the chip's natural height, and the
 * copy button stays 24px so it clears the 24px minimum target size.
 */
export function InstallCommand({ command, label }: { command: string; label?: string }) {
  return (
    <div className="flex h-8.5 min-w-0 items-center gap-1.5 rounded-md border border-border bg-surface pl-2.5 pr-1">
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
