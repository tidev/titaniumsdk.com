import { PlatformBadges, DeprecatedBadge, SinceBadge } from '@/components/docs/badges';
import { MemberSection } from '@/components/docs/member-section';
import { Prose } from '@/components/docs/prose';
import { formatSince } from '@/lib/docs/format';
import { sdkIndex, sdkVersions, resolveVersion, MAIN } from '@/lib/docs/registry';
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

        <Prose markdown={api.summary} base={base} className="mt-4 text-lg" />
        <Prose markdown={api.description} base={base} className="mt-4" />
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

      <footer className="mt-16 border-t border-border pt-4 text-xs text-text-subtle">
        Compiled from <code className="font-mono">{api.source}</code>
      </footer>
    </article>
  );
}
