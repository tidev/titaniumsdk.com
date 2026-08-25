/**
 * The Titanium mark, inlined so it can read the theme.
 *
 * Page CSS custom properties do not reach an SVG loaded through <img> or as a
 * favicon — that renders as a separate document. Inlining is what lets
 * --logo-outer / --logo-inner apply. The standalone public/ti-logo.svg carries
 * its own fallbacks and media query for those other contexts.
 *
 * Sized from CSS rather than width/height attributes, so it scales with its
 * container instead of collapsing inside a flex parent.
 */
export function TitaniumMark({
  className,
  title,
  style,
}: {
  className?: string;
  /** Omit when the mark sits beside text that already names it. */
  title?: string;
  /** Escape hatch for forcing token values, e.g. the /design preview. */
  style?: React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 75 80"
      className={className}
      style={style}
      fillRule="evenodd"
      clipRule="evenodd"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <path
        d="M68.2,15.3C72.3,15.3 73.7,18.8 73.2,22.2C72.4,28.4 69.3,33.6 66.1,38.8C65.9,39 64.4,41.9 64.3,42.2C60.5,37.6 57,33.4 53.6,29.3C55.1,26.6 58,21.1 59.5,18.3C59.9,17.6 60.3,17.1 61.1,16.8C63.3,16 65.5,15.4 67.9,15.3L68.2,15.3Z"
        style={{ fill: 'var(--logo-inner)' }}
      />
      <path
        d="M6.8,15.3C9.4,15.3 11.7,16 14,17C14.4,17.1 14.7,17.4 14.9,17.7C16.5,20.7 18.2,23.6 19.8,26.6C19.8,26.6 22.7,30 22.9,30C19.5,34.2 15.5,37.3 12.3,41.4C12.2,41.5 12.1,41.5 12,41.5C11.2,41.5 9.1,39.3 8.7,38.7C5.8,34.1 3,29.4 1.8,24C1.4,22.3 1.5,20.4 1.7,18.6C2,16.7 4,15.4 5.9,15.3L6.8,15.3Z"
        style={{ fill: 'var(--logo-inner)' }}
      />
      <path
        d="M47.2,36.9C51.1,41 54.5,45.4 57.7,50C56.1,51.7 52.3,55.7 50.6,57.6C53.3,59.2 56.1,60.7 59,62.4C59.4,62.7 59.9,63.1 60.1,63.6C61.3,66.2 62,69 61.9,71.9C61.8,74.4 59.9,76.4 57.4,76.5L56.5,76.5C52,76.5 48,74.6 44.1,72.4C41.9,71.1 39.7,69.7 37.5,68.3C32.8,71.5 28.1,74.6 22.5,76C21.5,76.3 20.6,76.4 19.6,76.4C19,76.4 18.3,76.3 17.6,76.2C15,75.5 13.3,73.5 13.2,70.4C13.2,67.4 14.1,65.1 14.8,63.7C15,63.1 16.1,62.3 16.7,62C19.4,60.4 21.8,59.1 24.5,57.6C22.8,55.7 19.4,52 17.6,49.9C20.9,45.8 24.3,41.5 27.8,37C30.5,39.7 34.9,44.3 37.3,46.7C39.8,44.2 44.6,39.5 47.2,36.9Z"
        style={{ fill: 'var(--logo-inner)' }}
      />
      <path
        d="M3.9,14.7C7.4,11.2 10.9,7.5 14.6,4C16.4,2.3 18.9,2.5 21,3.1C23.9,3.9 26.7,5 29.4,6.3C31.7,7.4 33.8,8.7 35.9,10.2C37.1,11 37.8,11.1 39,10.2C43,7.4 47.1,5 51.7,3.6C52.9,3.2 54.2,3 55.5,2.8C57.9,2.5 59.9,3.1 61.6,5C64.3,7.9 67.2,10.7 70,13.5C70.3,13.8 70.6,14.2 71.2,14.8C66.7,13.6 63,15 59.4,16.7C56.4,18.1 53.5,19.9 50.3,21.6C52,23.3 53.5,24.9 55,26.4C56.3,27.7 57.6,28.8 58.8,30.2C61.1,33 63.5,35.8 65.5,38.8C69,44.2 72.6,49.6 74,56.1C74.7,59.3 74.3,62.1 71.6,64.4C68.7,66.9 66.2,69.8 63.5,72.5C63.2,72.8 62.9,73.1 62.3,73.6C63.6,68.3 61.5,63.9 59.4,59.6C57.1,54.8 53.8,50.6 50.5,46.4C46.8,41.8 43.1,37.2 38.7,33.2C38.3,32.9 38,32.5 37.4,32.1C35,34.6 32.5,36.9 30.3,39.5C28.1,42 26.1,44.5 24,47.1C19.4,53 15,59 12.9,66.3C12.2,68.7 11.8,71.1 13,73.9C12.5,73.4 12.2,73.2 11.9,72.9C8.9,69.9 6,66.8 2.9,63.9C0.9,62 0.4,59.8 0.8,57.3C1.3,53.9 2.5,50.8 4.1,47.8C7.2,42 10.6,36.4 15.1,31.5C17.7,28.6 20.5,25.9 23.2,23.1C23.6,22.7 24,22.3 24.7,21.7C18,18 12,13.4 3.9,14.7Z"
        style={{ fill: 'var(--logo-outer)' }}
      />
    </svg>
  );
}

/** Mark plus wordmark, for the header and footer. */
export function TitaniumLogo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      <TitaniumMark className="h-7 w-auto shrink-0" />
      <span className="text-lg font-semibold tracking-tight text-text">Titanium SDK</span>
    </span>
  );
}
