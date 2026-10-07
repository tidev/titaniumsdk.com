import type { ApiPlatform } from '@/lib/registry';

/**
 * A small glyph for each of the four platforms the reference uses.
 *
 * Decorative: the badge that wraps one carries the platform's name for
 * assistive tech and as a hover title, so the icon itself is hidden.
 */
export function PlatformIcon({
  platform,
  className = 'size-3.5',
}: {
  platform: ApiPlatform;
  className?: string;
}) {
  const props = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
  };

  switch (platform) {
    case 'android':
      // Robot head: rounded cap with two antennae and two eyes.
      return (
        <svg {...props}>
          <path d="M4 16v-2a8 8 0 0 1 16 0v2Z" />
          <path d="M7 6.5 5.5 4M17 6.5 18.5 4" />
          <path d="M9 12h.01M15 12h.01" strokeWidth={2.5} />
        </svg>
      );
    case 'iphone':
      return (
        <svg {...props}>
          <rect x="7" y="2.5" width="10" height="19" rx="2" />
          <path d="M11 18.5h2" />
        </svg>
      );
    case 'ipad':
      return (
        <svg {...props}>
          <rect x="4" y="2.5" width="16" height="19" rx="2" />
          <path d="M12 18.5h.01" strokeWidth={2.5} />
        </svg>
      );
    case 'macos':
      // Laptop: screen on a base.
      return (
        <svg {...props}>
          <rect x="4" y="4.5" width="16" height="11" rx="1.5" />
          <path d="M2 19h20" />
        </svg>
      );
  }
}
