import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Without this, Next resolves og:image against localhost and ships that
  // URL to production. Social cards should always point at the canonical
  // site, not at whichever host rendered the page.
  metadataBase: new URL(SITE_URL),
  title: "Titanium SDK",
  description:
    "Build native iOS and Android apps with JavaScript and TypeScript.",
};

/**
 * Applies the stored theme before first paint, so an explicit choice never
 * flashes the wrong palette. Absent a choice, the CSS falls through to
 * prefers-color-scheme on its own and this sets nothing.
 */
const THEME_INIT = `try{var t=localStorage.getItem("theme");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
