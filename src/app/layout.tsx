import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { SITE_URL } from '@/lib/site';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
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
