import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Titanium SDK',
    // Home screens truncate aggressively; "Titanium" is what survives.
    short_name: 'Titanium',
    description: 'Native iOS and Android apps with JavaScript and TypeScript.',
    start_url: '/',
    display: 'standalone',
    // The brand's dark tone, matching the dark canvas and the app icons, so
    // the splash and status bar do not flash a different color.
    background_color: '#202137',
    theme_color: '#202137',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      // Same artwork: the mark occupies ~65% of the frame, inside the 80%
      // safe zone a maskable icon must respect.
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
