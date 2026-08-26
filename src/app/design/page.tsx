import { TitaniumMark } from '@/components/titanium-logo';
import type { Metadata } from 'next';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const metadata: Metadata = {
  title: 'Design tokens',
  description: 'Every color token in the Titanium SDK design system.',
};

/**
 * Parsed from globals.css at build time rather than restated here, so this
 * page cannot drift from what actually ships.
 */
const css = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');

function declarations(source: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [, k, v] of source.matchAll(/--([\w-]+):\s*(#[0-9A-Fa-f]{6});/g)) {
    out[k] = v.toUpperCase();
  }
  return out;
}

function blockAfter(re: RegExp): Record<string, string> {
  const m = css.match(re);
  return m ? declarations(m[0]) : {};
}

const theme = blockAfter(/@theme \{[\s\S]*?\n\}/);
const light = blockAfter(/^:root \{[^}]*\}/m);
const dark = blockAfter(/^:root\[data-theme=['"]dark['"]\] \{[^}]*\}/m);

const RAMPS = ['neutral', 'accent', 'success', 'warning', 'danger'];
const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

function luminance(hex: string) {
  const ch = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(1) + 0.7152 * ch(3) + 0.0722 * ch(5);
}

function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

function Swatch({ hex, on }: { hex: string; on?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="size-9 shrink-0 rounded-md border border-border"
        style={{ background: hex }}
      />
      <span className="font-mono text-xs text-text-muted">
        {hex}
        {on && <span className="ml-2 text-text-subtle">{contrast(hex, on).toFixed(2)}:1</span>}
      </span>
    </div>
  );
}

export default function DesignPage() {
  const roles = Object.keys(light);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Design tokens</h1>
      <p className="mt-3 max-w-2xl text-text-muted">
        Generated in OKLCH at a fixed hue with chroma tapering toward both ends. Contrast ratios are
        measured against each theme&rsquo;s own background. Verified in CI by{' '}
        <code className="font-mono text-sm">pnpm check:contrast</code>.
      </p>

      <section className="mt-12">
        <h2 className="text-xl font-semibold tracking-tight">Ramps</h2>
        <div className="mt-6 flex flex-col gap-8">
          {RAMPS.map((ramp) => (
            <div key={ramp}>
              <h3 className="font-mono text-sm text-text-muted">{ramp}</h3>
              <div className="mt-2 flex flex-wrap gap-1">
                {STEPS.map((step) => {
                  const hex = theme[`color-${ramp}-${step}`];
                  if (!hex) return null;
                  return (
                    <div key={step} className="w-[4.5rem]">
                      <div
                        className="h-14 rounded-md border border-border"
                        style={{ background: hex }}
                      />
                      <div className="mt-1 font-mono text-[11px] text-text-subtle">{step}</div>
                      <div className="font-mono text-[10px] text-text-subtle">{hex}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-xl font-semibold tracking-tight">Semantic roles</h2>
        <p className="mt-2 text-sm text-text-muted">
          Components reference these, never a ramp step directly.
        </p>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[38rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 pr-6 text-sm font-semibold">Role</th>
                <th className="py-2 pr-6 text-sm font-semibold">Light</th>
                <th className="py-2 text-sm font-semibold">Dark</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role} className="border-b border-border">
                  <td className="py-3 pr-6 font-mono text-sm">{role}</td>
                  <td className="py-3 pr-6">
                    <Swatch hex={light[role]} on={light.bg} />
                  </td>
                  <td className="py-3">{dark[role] && <Swatch hex={dark[role]} on={dark.bg} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-xl font-semibold tracking-tight">Logo on surfaces</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {(
            [
              ['Light', light],
              ['Dark', dark],
            ] as const
          ).map(([label, tokens]) => (
            <div
              key={label}
              className="rounded-lg border border-border p-6"
              style={{ background: tokens.bg }}
            >
              <div
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: tokens['text-subtle'] }}
              >
                {label}
              </div>
              <div className="mt-4 flex items-end gap-6">
                {['4rem', '2.5rem', '1.5rem'].map((size) => (
                  <TitaniumMark
                    key={size}
                    style={
                      {
                        height: size,
                        width: 'auto',
                        '--logo-outer': tokens['logo-outer'],
                        '--logo-inner': tokens['logo-inner'],
                      } as React.CSSProperties
                    }
                  />
                ))}
              </div>
              <div className="mt-5 flex items-center gap-3">
                {/* Forced to this theme's values regardless of the page theme. */}
                <TitaniumMark
                  className="h-10 w-auto"
                  style={
                    {
                      '--logo-outer': tokens['logo-outer'],
                      '--logo-inner': tokens['logo-inner'],
                    } as React.CSSProperties
                  }
                />
                <span className="text-lg font-semibold" style={{ color: tokens.text }}>
                  Titanium SDK
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
