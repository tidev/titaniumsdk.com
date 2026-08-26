import { TitaniumMark } from '@/components/titanium-logo';
import Link from 'next/link';

/**
 * Deliberately not the centred logo-tagline-two-buttons stack that React,
 * React Native, and Cordova all run. Asymmetric, with real code holding the
 * right side — the composition is what makes those sites interchangeable,
 * more than the palette is.
 *
 * Placeholder still; TI-45 is the real landing page.
 */

function Code() {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <span className="size-2 rounded-full bg-border-strong" />
        <span className="font-mono text-xs text-text-subtle">app.js</span>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-sm leading-relaxed">
        <code>
          <span className="text-text-subtle">{'// one codebase, two native apps\n'}</span>
          <span className="text-link">const</span>
          <span className="text-text">{' win = '}</span>
          <span className="text-link">Ti</span>
          <span className="text-text">{'.UI.createWindow({\n'}</span>
          <span className="text-text">{'  backgroundColor: '}</span>
          <span className="text-success">{"'#1A1F23'"}</span>
          <span className="text-text">{'\n});\n\n'}</span>
          <span className="text-text">{'win.'}</span>
          <span className="text-link">open</span>
          <span className="text-text">{'();'}</span>
        </code>
      </pre>
    </div>
  );
}

export default function Home() {
  return (
    <div className="w-full">
      <section className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-16 lg:py-28">
        <div>
          <h1 className="text-4xl font-semibold leading-tight tracking-tighter text-balance sm:text-5xl">
            Native iOS and Android apps,
            <span className="text-text-muted"> written in JavaScript</span>
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-normal text-text-muted">
            Titanium compiles JavaScript and TypeScript against real platform APIs. Not a web view,
            not a bridge to one.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/docs"
              className="rounded-md bg-link px-5 py-2.5 text-sm font-medium text-bg transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              Get started
            </Link>
            <Link
              href="/docs"
              className="rounded-md border border-border-strong px-5 py-2.5 text-sm font-medium transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              Documentation
            </Link>
          </div>
        </div>

        <div className="lg:pl-4">
          <Code />
        </div>
      </section>

      {/* Machined edge: light on top, shadow beneath. */}
      <section className="surface-metal">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-10 gap-y-3 px-4 py-5 sm:px-6">
          <TitaniumMark className="h-5 w-auto shrink-0" />
          <p className="font-mono text-xs text-text-muted">
            Maintained by TiDev · 17 years of shipped apps
          </p>
        </div>
      </section>
    </div>
  );
}
