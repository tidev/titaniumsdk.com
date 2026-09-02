/**
 * Verifies every text/background token pairing in globals.css clears WCAG AA,
 * in both themes. Parses the shipped CSS rather than a duplicate table, so it
 * cannot drift from what is actually deployed.
 *
 *   node scripts/check-contrast.ts
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CSS = fileURLToPath(new URL('../src/app/globals.css', import.meta.url));

type Tokens = Record<string, string>;

/** Pulls `--name: #hex;` declarations out of the first block matching `re`. */
function block(css: string, re: RegExp): Tokens {
  const m = css.match(re);
  if (!m) throw new Error(`no block matched ${re}`);
  const tokens: Tokens = {};
  for (const [, k, v] of m[0].matchAll(/--([\w-]+):\s*(#[0-9A-Fa-f]{6});/g)) {
    tokens[k] = v.toUpperCase();
  }
  return tokens;
}

function luminance(hex: string): number {
  const ch = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(1) + 0.7152 * ch(3) + 0.0722 * ch(5);
}

function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** [foreground, background, minimum ratio] */
const PAIRS: [string, string, number][] = [
  ['text', 'bg', 4.5],
  ['text', 'surface', 4.5],
  ['text', 'surface-raised', 4.5],
  // Form fields: the value someone typed, and the placeholder before they did.
  ['text', 'field', 4.5],
  ['text-subtle', 'field', 4.5],
  ['text-muted', 'bg', 4.5],
  ['text-muted', 'surface', 4.5],
  ['text-subtle', 'bg', 4.5],
  ['text-subtle', 'surface', 4.5],
  ['link', 'bg', 4.5],
  ['link', 'surface', 4.5],
  ['link-hover', 'bg', 4.5],
  ['success', 'bg', 4.5],
  ['warning', 'bg', 4.5],
  ['danger', 'bg', 4.5],
  ['info', 'bg', 4.5],
  // The terminal block, which is dark in both themes and so has its own roles.
  ['terminal-text', 'terminal-bg', 4.5],
  ['terminal-text', 'terminal-window', 4.5],
  /**
   * The `$` is `aria-hidden` ornament — it marks the block as a shell and
   * carries nothing a reader needs — so it is held to the 3:1 non-text
   * threshold (WCAG 1.4.11) rather than the 4.5:1 for text. Deliberately dim:
   * it should sit behind the commands, not compete with them.
   */
  ['terminal-prompt', 'terminal-window', 3],
  ['terminal-success', 'terminal-window', 4.5],
  ['terminal-text-muted', 'terminal-bg', 4.5],
  ['terminal-text-subtle', 'terminal-bg', 4.5],
  ['terminal-prompt', 'terminal-bg', 3],
  // Non-text UI needs 3:1 (WCAG 1.4.11).
  ['focus', 'bg', 3],
  ['border-strong', 'bg', 3],
  // Logos are exempt from contrast minimums (WCAG 1.4.3) but must stay visible.
  ['logo-outer', 'bg', 3],
  ['logo-inner', 'bg', 3],
];

const css = readFileSync(CSS, 'utf8');
const themes: [string, Tokens][] = [
  ['light', block(css, /^:root \{[^}]*\}/m)],
  ['dark', block(css, /^:root\[data-theme=['"]dark['"]\] \{[^}]*\}/m)],
];

let failed = 0;
for (const [theme, tokens] of themes) {
  console.log(`\n${theme}`);
  for (const [fg, bg, min] of PAIRS) {
    const [f, b] = [tokens[fg], tokens[bg]];
    if (!f || !b) {
      console.log(`  MISSING  ${fg} on ${bg}`);
      failed++;
      continue;
    }
    const ratio = contrast(f, b);
    const ok = ratio >= min;
    if (!ok) failed++;
    const label = `${fg} on ${bg}`.padEnd(30);
    console.log(`  ${ok ? 'pass' : 'FAIL'}  ${label} ${ratio.toFixed(2)}:1  (min ${min})`);
  }
}

console.log(
  failed === 0
    ? '\nAll pairings meet their contrast target.'
    : `\n${failed} pairing(s) below target.`
);
process.exit(failed === 0 ? 0 : 1);
