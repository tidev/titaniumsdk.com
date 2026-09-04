import { CodeCopy } from '@/components/docs/code-copy';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { SITE_URL } from '@/lib/site';
import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

/**
 * IBM Plex rather than a neutral geometric sans. Every framework in this
 * category — React, React Native, Cordova — uses the same characterless
 * default, so the typeface is the cheapest way to not look like them. Plex was
 * drawn for a hardware company and its mono sibling shares the same skeleton,
 * so prose and code read as one system rather than two.
 */
/*
 * Served from `src/fonts` rather than `next/font/google`. The Google loader
 * downloads the woff2 files during the build, so a build could not run without
 * reaching fonts.googleapis.com — behind a dead proxy it fails outright with
 * zero fonts emitted. TI-25 requires the build to read nothing but the local
 * filesystem. `scripts/fetch-fonts.ts` vendors them; `--check` re-verifies
 * them against upstream.
 */
const plexSans = localFont({
  src: '../fonts/ibm-plex-sans-latin.woff2',
  variable: '--font-plex-sans',
  display: 'swap',
  // One variable file covers the range the Google loader was asked for.
  weight: '100 700',
});

// Plex Mono is not a variable font, so weights are separate files.
const plexMono = localFont({
  src: [
    { path: '../fonts/ibm-plex-mono-latin-400.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/ibm-plex-mono-latin-500.woff2', weight: '500', style: 'normal' },
    { path: '../fonts/ibm-plex-mono-latin-600.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-plex-mono',
  display: 'swap',
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
        {/* Rendered here rather than through page metadata: a page that sets
            its own `alternates` replaces the parent's wholesale, so a metadata
            declaration would quietly vanish from most of the site. React
            hoists this into <head> from wherever it is rendered. */}
        <link
          rel="alternate"
          type="application/rss+xml"
          title="Titanium SDK blog"
          href={`${SITE_URL}/blog/feed.xml`}
        />
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
        {/* Adds copy buttons to code blocks in rendered prose. Mounted once
            here because prose appears under /docs, /modules and /blog alike,
            and it re-runs itself on navigation. */}
        <CodeCopy />
      </body>
    </html>
  );
}
