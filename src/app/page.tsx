import Link from "next/link";

/** Placeholder. The real landing page is TI-45. */
export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-4 py-20 sm:px-6">
      <p className="text-sm font-medium text-link">Titanium SDK</p>
      <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
        Native iOS and Android apps with JavaScript
      </h1>
      <p className="mt-5 max-w-xl text-lg text-text-muted">
        Open source, community owned, and built on native platform APIs.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/docs"
          className="rounded-md bg-link px-5 py-2.5 text-sm font-medium text-bg transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          Get started
        </Link>
        <Link
          href="/design"
          className="rounded-md border border-border-strong px-5 py-2.5 text-sm font-medium transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        >
          Design tokens
        </Link>
      </div>
    </div>
  );
}
