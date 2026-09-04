import { createHighlighterCoreSync, type HighlighterCore } from 'shiki/core';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';
import html from 'shiki/langs/html.mjs';
import java from 'shiki/langs/java.mjs';
import javascript from 'shiki/langs/javascript.mjs';
import json from 'shiki/langs/json.mjs';
import objectivec from 'shiki/langs/objective-c.mjs';
import shellscript from 'shiki/langs/shellscript.mjs';
import swift from 'shiki/langs/swift.mjs';
import typescript from 'shiki/langs/typescript.mjs';
import xml from 'shiki/langs/xml.mjs';
import githubDark from 'shiki/themes/github-dark.mjs';
import githubLight from 'shiki/themes/github-light.mjs';

/**
 * Syntax highlighting for the code blocks in registry prose (TI-10).
 *
 * ## Highlighting happens after sanitizing, deliberately
 *
 * Shiki colours each token with an inline `style`, and `renderMarkdown` also
 * renders third-party README markdown. Allowing `span[style]` through the
 * sanitizer to let Shiki's output survive would equally let a module author
 * write their own — arbitrary CSS on a page we serve. So the sanitizer never
 * sees this: markdown is rendered and sanitized first, and the escaped code
 * inside the surviving `<pre><code>` blocks is highlighted afterwards, from
 * text that has already been through the allowlist.
 *
 * ## Synchronous, and no WASM
 *
 * `createHighlighterCoreSync` with static grammar imports, on the JavaScript
 * RegExp engine rather than the oniguruma WASM one. Both matter more since
 * TI-25: these pages render on request now, so the highlighter is constructed
 * inside the serverless function rather than at build time. Measured at 6ms to
 * construct, against a WASM engine that has to compile a binary first.
 *
 * Synchronous also keeps `renderMarkdown` synchronous, so `Prose` stays an
 * ordinary component.
 *
 * ## Which languages
 *
 * Counted across the registry and `content/`: 1,372 `js`/`javascript`, 609
 * `xml` (Alloy views and TSS), 16 `html`/`json`/`sh`, and 44 untagged. The
 * other four are here because TI-10 asks for them and the guides in TI-33..38
 * will need them; they cost 500KB in the bundle and nothing at runtime, since
 * a grammar is only compiled when a block actually uses it.
 */

const LANGS = {
  javascript: 'javascript',
  js: 'javascript',
  jsx: 'javascript',
  xml: 'xml',
  tss: 'xml',
  html: 'html',
  json: 'json',
  sh: 'shellscript',
  bash: 'shellscript',
  shell: 'shellscript',
  shellscript: 'shellscript',
  console: 'shellscript',
  typescript: 'typescript',
  ts: 'typescript',
  java: 'java',
  swift: 'swift',
  objc: 'objective-c',
  'objective-c': 'objective-c',
} as const;

/**
 * `--color-surface` in each theme, which is what `.prose-docs pre` paints
 * behind the code. Asserted against globals.css by `check-contrast.ts` rather
 * than imported, because this module is loaded inside the serverless function
 * and the stylesheet is not.
 */
export const CODE_SURFACE = { light: '#F9FAFB', dark: '#2A3035' } as const;

/** WCAG AA for body text. Code is text. */
const TARGET = 4.5;

const channel = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

function luminance(hex: string): number {
  const at = (i: number) => channel(parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * at(1) + 0.7152 * at(3) + 0.0722 * at(5);
}

function ratio(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/**
 * Moves a colour toward black or white until it clears `TARGET` on `bg`.
 *
 * Whichever direction the background is not: on a light surface colours darken,
 * on a dark one they lighten. Blending in sRGB holds the hue steady enough that
 * GitHub's palette still reads as itself — this nudges the two light colours by
 * a few percent and lifts the dark comment grey, rather than restyling anything.
 */
function correct(hex: string, bg: string): string {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return hex;
  if (ratio(hex, bg) >= TARGET) return hex;

  const toward = luminance(bg) > 0.18 ? 0 : 255;
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  for (let step = 1; step <= 100; step++) {
    const t = step / 100;
    const mixed = rgb.map((c) => Math.round(c + (toward - c) * t));
    const candidate = `#${mixed.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
    if (ratio(candidate, bg) >= TARGET) return candidate.toUpperCase();
  }
  // Unreachable: pure black or white clears 4.5:1 against any surface that
  // itself passes the token gate. Returning the original is the safe fallback.
  return hex;
}

type ThemeLike = {
  fg?: string;
  colors?: Record<string, string>;
  tokenColors?: { settings?: { foreground?: string } }[];
};

/** A copy of the theme with every foreground corrected for `bg`. */
function corrected<T extends ThemeLike>(theme: T, bg: string): T {
  const clone = structuredClone(theme);
  if (clone.fg) clone.fg = correct(clone.fg, bg);
  if (clone.colors?.['editor.foreground']) {
    clone.colors['editor.foreground'] = correct(clone.colors['editor.foreground'], bg);
  }
  for (const token of clone.tokenColors ?? []) {
    if (token.settings?.foreground) {
      token.settings.foreground = correct(token.settings.foreground, bg);
    }
  }
  return clone;
}

let highlighter: HighlighterCore | undefined;

function core(): HighlighterCore {
  highlighter ??= createHighlighterCoreSync({
    themes: [
      corrected(githubLight as ThemeLike, CODE_SURFACE.light),
      corrected(githubDark as ThemeLike, CODE_SURFACE.dark),
    ] as Parameters<typeof createHighlighterCoreSync>[0]['themes'],
    langs: [javascript, xml, html, json, shellscript, typescript, java, swift, objectivec],
    engine: createJavaScriptRegexEngine(),
  });
  return highlighter;
}

/** The five markdown-it escapes, reversed. Nothing else is ever produced. */
const UNESCAPE: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
};

const decode = (s: string) => s.replace(/&(?:amp|lt|gt|quot|#39);/g, (m) => UNESCAPE[m] ?? m);

/**
 * Replaces every `<pre><code>` block in already-sanitized HTML with a
 * highlighted one.
 *
 * A block whose language is unknown — or absent, which 44 blocks in the corpus
 * are — is left alone rather than guessed at. The untagged ones are a mix of
 * JavaScript, Alloy XML and prose fragments, so picking a default would
 * mis-colour some of them with more confidence than the source supports. They
 * still get the surrounding treatment, just no token colours.
 */
export function highlightCodeBlocks(html: string): string {
  return html.replace(
    /<pre><code(?: class="language-([A-Za-z0-9_+-]+)")?>([\s\S]*?)<\/code><\/pre>/g,
    (whole, lang: string | undefined, body: string) => {
      const resolved = lang && LANGS[lang.toLowerCase() as keyof typeof LANGS];
      if (!resolved) return whole;
      try {
        return core().codeToHtml(decode(body).replace(/\n$/, ''), {
          lang: resolved,
          themes: { light: 'github-light', dark: 'github-dark' },
          // Emits `--shiki-light` / `--shiki-dark` custom properties instead of
          // a resolved colour, so one payload serves both themes and the
          // toggle needs no re-render. globals.css picks which one applies.
          defaultColor: false,
        });
      } catch {
        // A grammar can refuse input. An uncoloured block is a far better
        // outcome than a page that will not render.
        return whole;
      }
    }
  );
}
