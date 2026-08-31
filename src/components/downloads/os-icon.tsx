/**
 * Platform marks for the download chips.
 *
 * Inline rather than an icon package: three glyphs is not worth a dependency,
 * and `fill-current` lets them inherit the chip's hover colour for free.
 *
 * The penguin is drawn here instead of copied from a logo set — Tux is the one
 * of the three with no simple official path, and a hand-built silhouette that
 * survives 16px is better than a detailed one that turns to mud. Its holes are
 * cut with `evenodd` so the icon stays a single filled path and needs no
 * background colour of its own.
 */

const PATHS: Record<string, { d: string; viewBox: string; evenodd?: boolean }> = {
  osx: {
    viewBox: '0 0 24 24',
    d: 'M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701',
  },
  // Padded viewBox: the four panes run edge to edge, and at the apple's size
  // they read as a much heavier mark without the breathing room.
  win32: {
    viewBox: '-2.5 -2.5 29 29',
    d: 'M0 0h11.377v11.377H0zm12.623 0H24v11.377H12.623zM0 12.623h11.377V24H0zm12.623 0H24V24H12.623z',
  },
  linux: {
    viewBox: '0 0 24 24',
    evenodd: true,
    d: 'M12 1.6c-2.5 0-4.1 1.9-4.1 4.3v1.8c0 1-.4 1.9-1.1 2.6-1.6 1.7-2.5 3.7-2.5 5.8 0 .8.2 1.6.6 2.2-.7.5-1.2 1.2-1.5 2-.2.6.2 1.3.9 1.3h15.4c.7 0 1.1-.7.9-1.3-.3-.8-.8-1.5-1.5-2 .4-.6.6-1.4.6-2.2 0-2.1-.9-4.1-2.5-5.8-.7-.7-1.1-1.6-1.1-2.6V5.9c0-2.4-1.6-4.3-4.1-4.3Zm-1.9 4a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2Zm3.8 0a1.1 1.1 0 1 1 0 2.2 1.1 1.1 0 0 1 0-2.2ZM12 8.4l1.5 1.5-1.5 1.5-1.5-1.5L12 8.4Zm0 4.3c2.6 0 4.7 1.8 4.7 4s-2.1 4-4.7 4-4.7-1.8-4.7-4 2.1-4 4.7-4Z',
  },
};

/** Renders nothing for an OS the registry has not published before. */
export function OsIcon({ os, className }: { os: string; className?: string }) {
  const icon = PATHS[os];
  if (!icon) return null;

  return (
    <svg viewBox={icon.viewBox} aria-hidden className={`shrink-0 fill-current ${className ?? ''}`}>
      <path d={icon.d} fillRule={icon.evenodd ? 'evenodd' : undefined} />
    </svg>
  );
}
