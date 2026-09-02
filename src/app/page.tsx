import { Terminal } from '@/components/ui/terminal';
import { publishedPosts } from '@/lib/blog/posts';
import { formatDate } from '@/lib/docs/format';
import { communityListings, moduleSummaries } from '@/lib/docs/modules';
import { latestRelease } from '@/lib/downloads/registry';
import { communityNav } from '@/lib/nav';
import Link from 'next/link';

/**
 * Deliberately not the centred logo-tagline-two-buttons stack that React,
 * React Native and Cordova all run. Asymmetric, with real code holding the
 * right side — three rounds of mockups established that the composition is
 * what made those sites interchangeable, far more than the palette was.
 *
 * No images anywhere on this page, which is also why it has no layout shift to
 * manage: the only things that could reflow are the two code samples, and both
 * are text at a fixed size.
 */

/**
 * Where this release is written up on this site.
 *
 * There are no release-note pages here: the legacy `/guide/...Release_Note`
 * URLs the SDK still links to are gone, which is TI-67. The announcement post
 * is the real article — highlights, upgrade notes, credits — so the version
 * links there, matched on the release name appearing in the post title rather
 * than by rebuilding the slug. Older releases predate the blog, hence the
 * fallback to the release list.
 */
function releaseNotesHref(name: string | undefined): string {
  if (!name) return '/downloads/releases';
  const post = publishedPosts().find((p) => p.title.includes(name));
  return post ? `/blog/${post.slug}` : '/downloads/releases';
}

/** Every number on this page comes from the registry on disk, never a literal. */
function facts() {
  const release = latestRelease();
  return {
    version: release?.version,
    released: release?.date,
    notes: releaseNotesHref(release?.name),
    registryModules: moduleSummaries().length,
    communityModules: communityListings().length,
  };
}

function Chrome({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <span className="size-2 rounded-full bg-border-strong" />
        <span className="font-mono text-xs text-text-subtle">{name}</span>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-sm leading-relaxed">
        <code>{children}</code>
      </pre>
    </div>
  );
}

const K = ({ children }: { children: React.ReactNode }) => (
  <span className="text-link">{children}</span>
);
const S = ({ children }: { children: React.ReactNode }) => (
  <span className="text-success">{children}</span>
);
const C = ({ children }: { children: React.ReactNode }) => (
  <span className="text-text-subtle">{children}</span>
);

/**
 * A window with a button that responds — the smallest thing that is still a
 * real app rather than a syntax demo. `Ti.UI.createWindow` returns an Android
 * Activity or a UIWindow, which is the whole point and is worth showing rather
 * than asserting.
 *
 * The object literals are broken across lines to keep the sample inside its
 * column. Written inline the widest line was 63 characters, which overflowed
 * the hero at 1024px and put a scrollbar under it; split, the widest is the
 * 40-character `addEventListener` line. It is also how anyone would actually
 * write it, so nothing is distorted to fit.
 */
function HeroSample() {
  return (
    <Chrome name="app.js">
      <C>{'// one codebase, two native apps\n'}</C>
      <K>const</K>
      {' win = '}
      <K>Ti</K>
      {'.UI.createWindow({\n  backgroundColor: '}
      <S>{"'#15191c'"}</S>
      {'\n});\n\n'}
      <K>const</K>
      {' button = '}
      <K>Ti</K>
      {'.UI.createButton({\n  title: '}
      <S>{"'Say hello'"}</S>
      {'\n});\n\n'}
      {'button.addEventListener('}
      <S>{"'click'"}</S>
      {', () => {\n  '}
      <K>alert</K>
      {'('}
      <S>{"'Hello from a native button'"}</S>
      {');\n});\n\n'}
      {'win.add(button);\n'}
      {'win.open();'}
    </Chrome>
  );
}

/** Alloy, shown as what it actually is: markup, style and controller split up. */
function AlloySample() {
  return (
    <Chrome name="index.xml">
      <C>{'<!-- views/index.xml -->\n'}</C>
      {'<'}
      <K>Alloy</K>
      {'>\n  <'}
      <K>Window</K>
      {'>\n    <'}
      <K>Button</K>
      {' onClick='}
      <S>{'"greet"'}</S>
      {'>Say hello</'}
      <K>Button</K>
      {'>\n  </'}
      <K>Window</K>
      {'>\n</'}
      <K>Alloy</K>
      {'>\n\n'}
      <C>{'// controllers/index.js\n'}</C>
      <K>function</K>
      {' greet() {\n  '}
      <K>alert</K>
      {'('}
      <S>{"'Hello from a native button'"}</S>
      {');\n}\n\n'}
      {'$.index.open();'}
    </Chrome>
  );
}

function Pillar({
  title,
  children,
  href,
  cta,
}: {
  title: string;
  children: React.ReactNode;
  href: string;
  cta: string;
}) {
  return (
    <div className="relative flex flex-col rounded-lg border border-border p-5 transition-colors hover:border-border-strong">
      <h3 className="text-base font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-text-muted">{children}</p>
      <Link
        href={href}
        className="mt-auto pt-4 text-sm text-link after:absolute after:inset-0 hover:text-link-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        {cta} <span aria-hidden>→</span>
      </Link>
    </div>
  );
}

export default function Home() {
  const { version, released, notes, registryModules, communityModules } = facts();

  return (
    <div className="w-full">
      <section className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:px-8 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-16 lg:py-24">
        {/* `min-w-0`: a grid item defaults to `min-width: auto`, so the code
            block's long lines widen the track instead of scrolling inside it,
            and the whole page picks up a horizontal scrollbar at 320px. */}
        <div className="min-w-0">
          <h1 className="text-4xl font-semibold leading-tight tracking-tighter text-balance sm:text-5xl">
            Native iOS and Android apps,
            <span className="text-text-muted"> written in JavaScript</span>
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-normal text-text-muted">
            Titanium runs your JavaScript and TypeScript against real platform APIs, so a
            <code className="mx-1 font-mono text-base text-text">Button</code>
            is a real button. Not a web view, not a bridge to one.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {/* The CTA is install rather than a guide because there is no
                getting-started guide yet — the prose rewrites are TI-32 and
                after. Pointing "Get started" at the API reference would send a
                newcomer somewhere that answers a different question. */}
            <Link
              href="/downloads"
              className="rounded-md bg-link px-5 py-2.5 text-sm font-medium text-bg transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              Install Titanium
            </Link>
            <Link
              href="/docs/sdk/latest"
              className="rounded-md border border-border-strong px-5 py-2.5 text-sm font-medium transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              API reference
            </Link>
          </div>

          {/* Under the buttons rather than above the headline: it is a footnote
              to "install this", not the first thing to read. */}
          {version && (
            <div className="mt-8">
              <p className="text-sm text-text-muted">
                Latest Release:{' '}
                <Link
                  href={notes}
                  className="font-medium text-link hover:text-link-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  {version}
                </Link>
              </p>
              {released && (
                <p className="mt-1 text-2xs text-text-subtle">
                  <time dateTime={released.slice(0, 10)}>{formatDate(released.slice(0, 10))}</time>
                </p>
              )}
            </div>
          )}
        </div>

        <div className="min-w-0 lg:pl-4">
          <HeroSample />
        </div>
      </section>

      {/* `border-b` as well as `border-t`: this band is tinted and the section
          after it is not, so without a closing rule the shading just stops.
          The community band needs none — the footer's own border closes it. */}
      <section
        aria-labelledby="what"
        className="border-y border-border bg-surface/40 py-14 sm:py-16"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 id="what" className="sr-only">
            What Titanium is
          </h2>
          <dl className="grid gap-8 sm:grid-cols-3">
            <div>
              <dt className="text-base font-semibold tracking-tight">Real native UI</dt>
              <dd className="mt-2 text-sm leading-relaxed text-text-muted">
                Every component maps to the platform&rsquo;s own widget. A window is an Activity on
                Android and a UIWindow on iOS, with the scrolling, accessibility and text input that
                come with them.
              </dd>
            </div>
            <div>
              <dt className="text-base font-semibold tracking-tight">JavaScript and TypeScript</dt>
              <dd className="mt-2 text-sm leading-relaxed text-text-muted">
                Write the language you already know, against{' '}
                <Link href="/docs/sdk/latest" className="text-link hover:text-link-hover">
                  a documented API
                </Link>{' '}
                for both platforms. Type definitions ship with the SDK.
              </dd>
            </div>
            <div>
              <dt className="text-base font-semibold tracking-tight">
                Open source, community owned
              </dt>
              <dd className="mt-2 text-sm leading-relaxed text-text-muted">
                Apache-2.0, governed by TiDev, a non-profit. Fifteen years old and still shipping —
                the SDK is developed in the open by the people who use it.
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section
        aria-labelledby="alloy"
        className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:px-8 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-16 lg:py-20"
      >
        <div className="min-w-0 lg:order-2">
          <h2 id="alloy" className="text-2xl font-semibold tracking-tight text-balance">
            Alloy, when an app outgrows one file
          </h2>
          <p className="mt-4 text-base leading-relaxed text-text-muted">
            Alloy is Titanium&rsquo;s MVC framework. Views are XML, styles are a stylesheet, and
            controllers are plain JavaScript — the same split you would reach for anyway, with data
            binding and a build step that compiles it all down to the SDK calls above.
          </p>
          <Link
            href="/docs/sdk/latest"
            className="mt-6 inline-block text-sm text-link hover:text-link-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            Alloy documentation <span aria-hidden>→</span>
          </Link>
        </div>
        <div className="min-w-0 lg:order-1">
          <AlloySample />
        </div>
      </section>

      {/* The band has its own roles rather than borrowing `surface`: in light
          mode it lands near it, but in dark it is deliberately darker than a
          normal surface so the window inside it still reads as cut into the
          page. They follow the theme; only the window group stays dark. */}
      <section
        aria-labelledby="install"
        className="border-t border-border bg-terminal-bg py-16 text-terminal-text sm:py-20"
      >
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:px-8 lg:grid-cols-[1fr_1.05fr] lg:items-start lg:gap-16">
          <div className="min-w-0">
            <h2 id="install" className="text-2xl font-semibold tracking-tight text-balance">
              Try it
            </h2>
            <p className="mt-4 text-base leading-relaxed text-terminal-text-muted">
              Install the CLI and Alloy from npm, add the SDK, then scaffold a project and build it.
              What comes out runs on both platforms without anything else added to it.
            </p>
            <p className="mt-4 text-sm text-terminal-text-subtle">
              Requires Node.js 22.19.0 or newer.
            </p>
          </div>

          <div className="min-w-0">
            <Terminal
              commands={[
                'npm install --global titanium alloy',
                'ti sdk install',
                'ti create',
                'cd <project-dir>',
                'ti build',
              ]}
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="explore" className="border-t border-border py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 id="explore" className="text-2xl font-semibold tracking-tight">
            Where to go next
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:auto-rows-fr lg:grid-cols-4">
            <Pillar title="API reference" href="/docs/sdk/latest" cta="Browse the API">
              Every namespace, method, property and event in the SDK, generated from the source it
              documents.
            </Pillar>
            <Pillar title="Downloads" href="/downloads" cta="All releases">
              Every GA, RC and beta, plus continuous builds from each active branch.
            </Pillar>
            <Pillar title="Modules" href="/modules" cta="Browse modules">
              {registryModules} maintained modules with full reference docs, alongside{' '}
              {communityModules} more from the community.
            </Pillar>
            <Pillar title="Blog" href="/blog" cta="Read the blog">
              Release announcements and project news, with an RSS feed.
            </Pillar>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="community"
        className="border-t border-border bg-surface/40 py-14 sm:py-16"
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 sm:px-6 lg:px-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 id="community" className="text-2xl font-semibold tracking-tight">
              Built by the people who use it
            </h2>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-text-muted">
              Titanium is maintained by TiDev, a non-profit, with contributions from the community.
              Everything happens in the open.
            </p>
          </div>
          <ul className="flex flex-wrap gap-3">
            {communityNav.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="inline-block rounded-md border border-border px-4 py-2 text-sm transition-colors hover:border-border-strong hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <a
                href="https://tidev.io"
                className="inline-block rounded-md border border-border px-4 py-2 text-sm transition-colors hover:border-border-strong hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                TiDev
              </a>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
