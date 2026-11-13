import { PlatformBadges, DeprecatedBadge } from '@/components/docs/badges';
import { Breadcrumbs } from '@/components/docs/breadcrumbs';
import { LegacyAnchor } from '@/components/docs/legacy-anchor';
import { MemberSection } from '@/components/docs/member-section';
import { Prose } from '@/components/docs/prose';
import { OnThisPage, SectionJump, jumpLinks, type TocGroup } from '@/components/docs/toc';
import { OlderVersionNotice, VersionSwitcher } from '@/components/docs/version-switcher';
import { anchorAllocator, pathLinker } from '@/lib/docs/links';
import { sdkIndex, sdkType, sourceUrl, MAIN } from '@/lib/docs/registry';
import { crumbsFor, subtypesOf } from '@/lib/docs/tree';
import { buildTypeView } from '@/lib/docs/type-view';
import { newerVersion, versionOptions } from '@/lib/docs/versions';
import { notFound } from 'next/navigation';

/**
 * One compiled type, rendered for whichever URL is asking (TI-79).
 *
 * Two routes reach this. `/docs/sdk/13.4.1/Titanium.UI.Button` pins a version
 * and browses the API on its own; `/docs/sdk/Titanium.UI.Button` is the same
 * type at the latest version, inside the documentation. They differ in their
 * shell and in one prop.
 *
 * ## Why `linkBase` and `imageRoot` are separate
 *
 * They look like the same string and are not. Cross-references follow the URL
 * the reader is on, so an unversioned page links unversioned. Images cannot:
 * `assets.ts` rewrites a doc image through `public/docs/assets.json`, whose
 * keys are `/docs/sdk/<version>/images/...` - 1,080 of its 1,085 entries. Built
 * from an unversioned base every key would miss, and `assetUrl` returns the URL
 * unchanged on a miss, so the page would render with broken images and no error
 * anywhere. `imageRoot` therefore always names a version.
 */
export type TypeReferenceProps = {
  /** The compiled version to read from. Always concrete, never `latest`. */
  version: string;
  typeName: string;
  /** Prefix for cross-references and breadcrumbs: versioned or not. */
  linkBase: string;
  /** Prefix for image URLs. Versioned, always. See above. */
  imageRoot: string;
};

export function TypeReference({ version, typeName, linkBase, imageRoot }: TypeReferenceProps) {
  const view = buildTypeView((name) => sdkType(version, name), typeName);
  if (!view) notFound();

  const base = linkBase;

  // Already parsed and cached by generateStaticParams, so this is a map lookup.
  const types = sdkIndex(version)?.types ?? [];

  // Every type with a page in this tree lives under `base`, so a reference to
  // one is always a path - but not every name in a signature has a page, and
  // linking the ones that do not produced 1,023 dead links. See pathLinker.
  const link = pathLinker(base, new Set(types.map((t) => t.name)));
  const { type: api } = view;
  const subtypes = subtypesOf(types, api.name);
  const newer = newerVersion(version, api.name);

  // Window has a method `open()` and an event `open`; allocated together, they
  // no longer both claim `id="open"`.
  const anchor = anchorAllocator(
    [view.properties, view.methods, view.events],
    ['property', 'method', 'event']
  );
  const groups: TocGroup[] = [
    { id: 'properties', title: 'Properties', members: view.properties, anchor },
    { id: 'methods', title: 'Methods', members: view.methods, anchor },
    { id: 'events', title: 'Events', members: view.events, anchor },
  ];
  // Examples are a section of this page in their own right; the member groups
  // come from the same list the rail renders.
  const links = jumpLinks(
    groups,
    api.examples?.length ? [{ id: 'examples', title: 'Examples' }] : []
  );

  // apidoc images sit beside the YAML, so relative references resolve against
  // the source file's own directory.
  const sourceDir = api.source.split('/').slice(0, -1).join('/');
  const imageBase = `${imageRoot}/images${sourceDir ? `/${sourceDir}` : ''}`;
  const editUrl = sourceUrl(version, api.source);

  return (
    // Explicit placement rather than source order: the rail has to come second
    // on screen and first in the DOM would put it above the title on a phone.
    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_13rem] xl:gap-8">
      <article className="min-w-0 max-w-4xl py-10 xl:col-start-1 xl:row-start-1">
        {/* Legacy /api deep links slugged anchors to lowercase; see the component. */}
        <LegacyAnchor />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Breadcrumbs
            crumbs={[
              { label: 'SDK reference', href: base },
              ...crumbsFor(types, api.name).map((crumb) => ({
                label: crumb.label,
                href: crumb.name && `${base}/${crumb.name}`,
                mono: true,
              })),
            ]}
          />
          {version === MAIN && (
            <span className="rounded border border-warning px-1.5 py-0.5 text-xs text-warning">
              unreleased
            </span>
          )}
          {/* Below `xl` there is no rail, so this is the far end of the row
              and lines up with the switcher on the version index. At `xl` the
              rail appears and the article's right edge moves ~192px inward, so
              the copy in the rail column takes over - see below. */}
          <VersionSwitcher
            current={version}
            options={versionOptions(api.name)}
            className="ml-auto xl:hidden"
          />
        </div>
        {newer && <OlderVersionNotice current={version} newer={newer} type={api.name} />}

        <header className="mt-3">
          <h1 className="font-mono text-3xl font-semibold tracking-tight break-words">
            {api.name}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            <span className="rounded bg-surface px-2 py-0.5 font-mono text-xs text-text-muted">
              {api.kind}
            </span>
            {api.deprecated && <DeprecatedBadge />}
            <PlatformBadges platforms={api.platforms} since={api.since} />
          </div>

          {!!api.inheritanceChain?.length && (
            <p className="mt-3 text-sm text-text-subtle">
              Extends{' '}
              {api.inheritanceChain.map((parent, i) => {
                // Through the linker, not `${base}/${parent}`: a chain can end
                // at a host built-in - assert.AssertionError extends `Error` -
                // which is a real ancestor with no page in this tree.
                const href = link(parent);
                return (
                  <span key={parent}>
                    {i > 0 && <span aria-hidden> ← </span>}
                    {href ? (
                      <a href={href} className="font-mono text-link hover:underline">
                        {parent}
                      </a>
                    ) : (
                      <span className="font-mono">{parent}</span>
                    )}
                  </span>
                );
              })}
            </p>
          )}

          <Subtypes names={subtypes} base={base} />

          {api.deprecated && (
            <div className="mt-4 border-l-2 border-danger pl-3">
              <p className="text-sm font-medium text-danger">
                Deprecated{api.deprecated.since ? ` since ${api.deprecated.since}` : ''}
              </p>
              <Prose markdown={api.deprecated.notes} link={link} className="mt-1 text-sm" />
            </div>
          )}

          {/* Stands in for the rail below xl. Above the prose rather than after
              it: `Titanium.UI.View`'s description alone runs past ten screens,
              and a jump list you have to read the page to reach is not one. */}
          <SectionJump links={links} className="mt-4 border-y border-border py-3 xl:hidden" />

          <Prose
            markdown={api.summary}
            link={link}
            relative={{ images: imageBase }}
            className="mt-4 text-lg"
          />
          <Prose
            markdown={api.description}
            link={link}
            relative={{ images: imageBase }}
            className="mt-4"
          />
        </header>

        {!!api.examples?.length && (
          <section aria-labelledby="examples" className="mt-12">
            <h2 id="examples" className="scroll-mt-24 text-2xl font-semibold tracking-tight">
              Examples
            </h2>
            {api.examples?.map((ex, i) => (
              <div key={i} className="mt-4">
                {ex.title && <h3 className="text-sm font-medium">{ex.title}</h3>}
                <Prose markdown={ex.code} link={link} className="mt-2" />
              </div>
            ))}
          </section>
        )}

        {groups.map((group) => (
          <MemberSection
            key={group.id}
            id={group.id}
            title={group.title}
            members={group.members}
            link={link}
            anchor={group.anchor}
          />
        ))}

        <footer className="mt-16 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-4 text-xs text-text-subtle">
          <span>
            Compiled from <code className="font-mono">{api.source}</code>
          </span>
          {editUrl && (
            <a
              href={editUrl}
              // ml-auto rather than justify-between on the footer: when the two
              // wrap onto separate lines, justify-between leaves one item per
              // line and stops right-aligning anything.
              className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-text-muted transition-colors hover:border-border-strong hover:text-text"
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

      {/* The rail column. The switcher sits at its head so that at `xl` it
          lands at the same right edge as the one on the version index, which
          has no rail and puts it at the end of its own heading row. Only one of
          the two copies is ever displayed, so nothing is announced twice. */}
      <div className="hidden py-10 xl:col-start-2 xl:row-start-1 xl:block">
        <VersionSwitcher current={version} options={versionOptions(api.name)} />
        <OnThisPage
          links={api.examples?.length ? [{ id: 'examples', title: 'Examples' }] : []}
          groups={groups}
          className="mt-6"
        />
      </div>
    </div>
  );
}
/**
 * The types that extend this one - the edge the registry does not store.
 *
 * Collapsed past a dozen because the roots are enormous: 109 types extend
 * `Titanium.Proxy` and 45 extend `Titanium.UI.View`, and inline that would push
 * the type's own summary off the first screen.
 */
function Subtypes({ names, base }: { names: string[]; base: string }) {
  if (!names.length) return null;

  const links = (
    <span className="flex flex-wrap gap-x-3 gap-y-1">
      {names.map((name) => (
        <a key={name} href={`${base}/${name}`} className="font-mono text-link hover:underline">
          {name}
        </a>
      ))}
    </span>
  );

  if (names.length <= 12) {
    return (
      <p className="mt-2 flex flex-wrap items-baseline gap-x-2 text-sm text-text-subtle">
        Extended by {links}
      </p>
    );
  }

  return (
    <details className="mt-2 text-sm">
      <summary className="cursor-pointer text-text-subtle">
        Extended by {names.length} types
      </summary>
      <div className="mt-1">{links}</div>
    </details>
  );
}
