import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { SITE_URL } from '@/lib/site';
import type { Metadata } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import './globals.css';

/**
 * IBM Plex rather than a neutral geometric sans. Every framework in this
 * category — React, React Native, Cordova — uses the same characterless
 * default, so the typeface is the cheapest way to not look like them. Plex was
 * drawn for a hardware company and its mono sibling shares the same skeleton,
 * so prose and code read as one system rather than two.
 */
const plexSans = IBM_Plex_Sans({
  variable: '--font-plex-sans',
  subsets: ['latin'],
});

// Plex Mono is not a variable font, so weights are explicit.
const plexMono = IBM_Plex_Mono({
  variable: '--font-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  // Without this, Next resolves og:image against localhost and ships that
  // URL to production. Social cards should always point at the canonical
  // site, not at whichever host rendered the page.
  metadataBase: new URL(SITE_URL),
  title: 'Titanium SDK',
  description: 'Build native iOS and Android apps with JavaScript and TypeScript.',
};

/**
 * Applies the stored theme before first paint, so an explicit choice never
 * flashes the wrong palette. Absent a choice, the CSS falls through to
 * prefers-color-scheme on its own and this sets nothing.
 */
const THEME_INIT = `try{var t=localStorage.getItem("theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${plexSans.variable} ${plexMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <a
          href="#main"
          className="sr-only rounded-md bg-surface-raised px-4 py-2 text-sm font-medium text-text outline-2 outline-offset-2 outline-focus focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex flex-1 flex-col">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
