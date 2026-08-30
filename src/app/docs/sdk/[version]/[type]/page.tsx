import { PlatformBadges, DeprecatedBadge, SinceBadge } from '@/components/docs/badges';
import { MemberSection } from '@/components/docs/member-section';
import { Prose } from '@/components/docs/prose';
import { formatSince } from '@/lib/docs/format';
import { sdkIndex, sdkVersions, resolveVersion, sourceUrl, MAIN } from '@/lib/docs/registry';
import { buildTypeView } from '@/lib/docs/type-view';
import { SITE_URL } from '@/lib/site';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

/**
 * One page per compiled type.
 *
 * Everything is read from `registry/` on disk — no network at build time, which
 * is what keeps rebuilds fast and preview deploys reproducible.
 */

export const dynamicParams = false;

export function generateStaticParams() {
  return sdkVersions().flatMap((version) =>
    (sdkIndex(version)?.types ?? []).map((t) => ({ version, type: t.name }))
  );
}

export async function generateMetadata({
  params,
}: PageProps<'/docs/sdk/[version]/[type]'>): Promise<Metadata> {
  const { version, type } = await params;
  const resolved = resolveVersion(version);
  const view = resolved && buildTypeView(resolved, type);
  if (!view) return {};

  return {
    title: `${view.type.name} — Titanium SDK`,
    description: view.type.summary?.replace(/<[^>]+>/g, '').slice(0, 160),
    // The versioned path is canonical; /latest redirects here rather than
    // duplicating pages, so the two never compete in search results.
    alternates: { canonical: `${SITE_URL}/docs/sdk/${resolved}/${type}` },
  };
}

export default async function TypePage({ params }: PageProps<'/docs/sdk/[version]/[type]'>) {
  const { version, type } = await params;
  const resolved = resolveVersion(version);
  if (!resolved) notFound();

  const view = buildTypeView(resolved, type);
  if (!view) notFound();

  const base = `/docs/sdk/${resolved}`;
  const { type: api } = view;
  const since = formatSince(api.since);

  // apidoc images sit beside the YAML, so relative references resolve against
  // the source file's own directory.
  const sourceDir = api.source.split('/').slice(0, -1).join('/');
  const imageBase = `${base}/images${sourceDir ? `/${sourceDir}` : ''}`;
  const editUrl = sourceUrl(resolved, api.source);

  return (
    <article className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-sm text-text-subtle">
        <a href={base} className="hover:text-link">
          SDK reference
        </a>
        <span aria-hidden> / </span>
        <span className="font-mono">{api.name}</span>
        {resolved === MAIN && (
          <span className="ml-2 rounded border border-warning px-1.5 py-0.5 text-xs text-warning">
            unreleased
          </span>
        )}
      </nav>

      <header className="mt-3">
        <h1 className="font-mono text-3xl font-semibold tracking-tight break-words">{api.name}</h1>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
          <span className="rounded bg-surface px-2 py-0.5 font-mono text-xs text-text-muted">
            {api.kind}
          </span>
          {api.deprecated && <DeprecatedBadge />}
          <PlatformBadges platforms={api.platforms} />
          <SinceBadge since={since} />
        </div>

        {!!api.inheritanceChain?.length && (
          <p className="mt-3 text-sm text-text-subtle">
            Extends{' '}
            {api.inheritanceChain.map((parent, i) => (
              <span key={parent}>
                {i > 0 && <span aria-hidden> ← </span>}
                <a href={`${base}/${parent}`} className="font-mono text-link hover:underline">
                  {parent}
                </a>
              </span>
            ))}
          </p>
        )}

        {api.deprecated && (
          <div className="mt-4 border-l-2 border-danger pl-3">
            <p className="text-sm font-medium text-danger">
              Deprecated{api.deprecated.since ? ` since ${api.deprecated.since}` : ''}
            </p>
            <Prose markdown={api.deprecated.notes} base={base} className="mt-1 text-sm" />
          </div>
        )}

        <Prose markdown={api.summary} base={base} imageBase={imageBase} className="mt-4 text-lg" />
        <Prose markdown={api.description} base={base} imageBase={imageBase} className="mt-4" />
      </header>

      {!!api.examples?.length && (
        <section aria-labelledby="examples" className="mt-12">
          <h2 id="examples" className="scroll-mt-24 text-2xl font-semibold tracking-tight">
            Examples
          </h2>
          {api.examples.map((ex, i) => (
            <div key={i} className="mt-4">
              {ex.title && <h3 className="text-sm font-medium">{ex.title}</h3>}
              <Prose markdown={ex.code} base={base} className="mt-2" />
            </div>
          ))}
        </section>
      )}

      <MemberSection
        id="properties"
        title="Properties"
        members={view.properties}
        base={base}
        typePlatforms={api.platforms}
      />
      <MemberSection
        id="methods"
        title="Methods"
        members={view.methods}
        base={base}
        typePlatforms={api.platforms}
      />
      <MemberSection
        id="events"
        title="Events"
        members={view.events}
        base={base}
        typePlatforms={api.platforms}
      />

      <footer className="mt-16 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-4 text-xs text-text-subtle">
        <span>
          Compiled from <code className="font-mono">{api.source}</code>
        </span>
        {editUrl && (
          <a
            href={editUrl}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-text-muted transition-colors hover:border-border-strong hover:text-text"
            rel="noopener noreferrer"
          >
            <svg viewBox="0 0 16 16" aria-hidden className="size-3.5 fill-current">
              <path d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38l-.01-1.49c-2.01.37-2.53-.5-2.7-.96-.09-.24-.48-.96-.82-1.16-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.4 7.4 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48l-.01 2.19c0 .21.15.46.55.38A8 8 0 0 0 8 0Z" />
            </svg>
            Edit on GitHub
          </a>
        )}
      </footer>
    </article>
  );
}
