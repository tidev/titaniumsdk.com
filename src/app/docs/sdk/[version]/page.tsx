import { sdkIndex, sdkVersions, resolveVersion, MAIN } from '@/lib/docs/registry';
import { SITE_URL } from '@/lib/site';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

/** The type list for one compiled SDK version. */

export const dynamicParams = false;

export function generateStaticParams() {
  return sdkVersions().map((version) => ({ version }));
}

export async function generateMetadata({
  params,
}: PageProps<'/docs/sdk/[version]'>): Promise<Metadata> {
  const { version } = await params;
  const resolved = resolveVersion(version);
  if (!resolved) return {};
  return {
    title: `SDK API reference ${resolved} — Titanium SDK`,
    description: `Every Titanium SDK type, method, property, and event in ${resolved}.`,
    alternates: { canonical: `${SITE_URL}/docs/sdk/${resolved}` },
  };
}

const KIND_ORDER = ['module', 'proxy', 'view', 'pseudo'] as const;
const KIND_LABELS: Record<string, string> = {
  module: 'Modules',
  proxy: 'Proxies',
  view: 'Views',
  pseudo: 'Dictionaries and namespaces',
};

export default async function VersionIndex({ params }: PageProps<'/docs/sdk/[version]'>) {
  const { version } = await params;
  const resolved = resolveVersion(version);
  if (!resolved) notFound();

  const index = sdkIndex(resolved);
  if (!index) notFound();

  const base = `/docs/sdk/${resolved}`;
  const byKind = new Map<string, typeof index.types>();
  for (const t of index.types) {
    byKind.set(t.kind, [...(byKind.get(t.kind) ?? []), t]);
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">SDK API reference</h1>
        <p className="mt-2 text-text-muted">
          <span className="font-mono">{resolved}</span>
          {resolved === MAIN && ' — compiled from the development branch, not a release'}
          {' · '}
          {index.counts.types} types, {index.counts.members.toLocaleString()} declared members
        </p>
      </header>

      {KIND_ORDER.filter((k) => byKind.has(k)).map((kind) => (
        <section key={kind} aria-labelledby={kind} className="mt-10">
          <h2 id={kind} className="text-xl font-semibold tracking-tight">
            {KIND_LABELS[kind]}{' '}
            <span className="font-mono text-sm font-normal text-text-subtle">
              {byKind.get(kind)!.length}
            </span>
          </h2>
          <ul className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {byKind.get(kind)!.map((t) => (
              <li key={t.name} className="truncate">
                <a
                  href={`${base}/${t.name}`}
                  className="font-mono text-sm text-link hover:underline"
                >
                  {t.name}
                </a>
                {t.deprecated && <span className="ml-2 text-xs text-danger">deprecated</span>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
