import { CopyButton } from './copy-button';

/**
 * A shell command, styled as a terminal line.
 *
 * The command scrolls inside its own box. `ti sdk install --branch
 * backport-14489-13_3_X 13.3.1.v20260812143210` is 71 characters, which is
 * wider than a 320px viewport in any monospace face — without this the whole
 * page scrolls sideways because of one build.
 */
export function InstallCommand({ command, label }: { command: string; label?: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-border bg-surface py-1.5 pl-3 pr-1.5">
      <span aria-hidden className="select-none font-mono text-sm text-text-subtle">
        $
      </span>
      {/* Focusable because it scrolls: a keyboard-only reader has no other way
          to reach the end of a command wider than the box (WCAG 2.1.1). */}
      <code
        tabIndex={0}
        className="min-w-0 flex-1 overflow-x-auto whitespace-pre rounded-sm py-0.5 font-mono text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        {command}
      </code>
      <CopyButton text={command} label={label} />
    </div>
  );
}
