import { DeprecatedBadge, PlatformBadges, SinceBadge } from '@/components/docs/badges';
import { MemberSection } from '@/components/docs/member-section';
import { Prose } from '@/components/docs/prose';
import type { TocGroup } from '@/components/docs/toc';
import { formatSince } from '@/lib/docs/format';
import { memberAnchor, type ApiLinker } from '@/lib/docs/links';
import type { ModuleReference } from '@/lib/docs/module-view';
import type { TypeView } from '@/lib/docs/type-view';

/**
 * A module's whole namespace on one page.
 *
 * One page rather than one per type, because that is the address the module is
 * known by: `moduleid` is what a developer writes in `tiapp.xml`, and every one
 * of the 174 legacy `/api/modules/**` URLs — `ble/peripheral.html`,
 * `nfc/ndefrecord.html` — points at the module, not at a type inside it. A
 * module is also small enough for it: the largest is 284 members, roughly one
 * mid-sized SDK type.
 *
 * That is also why members are addressed by `memberAnchor`: `Modules.Map`'s
 * `NORMAL_TYPE` and `Modules.Map.View`'s `mapType` share a document here.
 */

/** The rail's groups: one per type, since a type is what a reader jumps to. */
export function referenceToc(reference: ModuleReference): TocGroup[] {
  return reference.types.map((view) => ({
    id: view.type.name,
    title: view.type.name,
    members: [...view.properties, ...view.methods, ...view.events],
    anchor: (member: string) => memberAnchor(view.type.name, member),
  }));
}

export function TypeSection({
  view,
  link,
  imageBase,
}: {
  view: TypeView;
  link: ApiLinker;
  /** Where a type description's relative images resolve, when it has any. */
  imageBase?: string;
}) {
  const api = view.type;
  const since = formatSince(api.since);
  const anchor = (member: string) => memberAnchor(api.name, member);
  const relative = imageBase ? { images: imageBase } : undefined;

  return (
    <section aria-labelledby={api.name} className="mt-8 border-t border-border pt-8">
      <h2
        id={api.name}
        className="scroll-mt-24 font-mono text-2xl font-semibold tracking-tight break-words"
      >
        {api.name}
      </h2>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <span className="rounded bg-surface px-2 py-0.5 font-mono text-xs text-text-muted">
          {api.kind}
        </span>
        {api.deprecated && <DeprecatedBadge />}
        <PlatformBadges platforms={api.platforms} />
        <SinceBadge since={since} />
      </div>

      {!!api.inheritanceChain?.length && (
        <p className="mt-3 text-sm break-words text-text-subtle">
          Extends{' '}
          {api.inheritanceChain.map((parent, i) => {
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

      {api.deprecated && (
        <div className="mt-4 border-l-2 border-danger pl-3">
          <p className="text-sm font-medium text-danger">
            Deprecated{api.deprecated.since ? ` since ${api.deprecated.since}` : ''}
          </p>
          <Prose markdown={api.deprecated.notes} link={link} className="mt-1 text-sm" />
        </div>
      )}

      <Prose markdown={api.summary} link={link} relative={relative} className="mt-4 text-lg" />
      <Prose markdown={api.description} link={link} relative={relative} className="mt-4" />

      {!!api.examples?.length && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold tracking-tight">Examples</h3>
          {api.examples.map((ex, i) => (
            <div key={i} className="mt-4">
              {ex.title && <h4 className="text-sm font-medium">{ex.title}</h4>}
              <Prose markdown={ex.code} link={link} className="mt-2" />
            </div>
          ))}
        </div>
      )}

      {(['properties', 'methods', 'events'] as const).map((group) => (
        <MemberSection
          key={group}
          id={`${api.name}--${group}`}
          title={group[0].toUpperCase() + group.slice(1)}
          members={view[group]}
          link={link}
          anchor={anchor}
          typePlatforms={api.platforms}
          level={3}
        />
      ))}
    </section>
  );
}
