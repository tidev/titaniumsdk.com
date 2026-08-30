import { DeprecatedBadge, PlatformBadges, SinceBadge } from './badges';
import { Prose } from './prose';
import { TypeRefText } from './type-ref';
import { formatSince } from '@/lib/docs/format';
import { anchorFor } from '@/lib/docs/markdown';
import type { ResolvedMember } from '@/lib/docs/type-view';
import type { ApiPlatform } from '@/lib/registry';

/**
 * One group of members — properties, methods, or events.
 *
 * Definition list rather than a table: the old site generated markup inside
 * markdown to force API tables, and they are what breaks on a phone. A list of
 * blocks reflows; only the genuinely tabular parts (a method's parameters) stay
 * as a table, and that scrolls inside its own container.
 */
export function MemberSection({
  id,
  title,
  members,
  base,
  typePlatforms,
}: {
  id: string;
  title: string;
  members: ResolvedMember[];
  base: string;
  typePlatforms: readonly ApiPlatform[];
}) {
  if (!members.length) return null;

  return (
    <section aria-labelledby={id} className="mt-12">
      <h2 id={id} className="scroll-mt-24 text-2xl font-semibold tracking-tight">
        {title}{' '}
        <span className="font-mono text-base font-normal text-text-subtle">{members.length}</span>
      </h2>

      <div className="mt-4 divide-y divide-border border-t border-border">
        {members.map((m) => (
          <Member key={m.name} member={m} base={base} typePlatforms={typePlatforms} />
        ))}
      </div>
    </section>
  );
}

function Member({
  member,
  base,
  typePlatforms,
}: {
  member: ResolvedMember;
  base: string;
  typePlatforms: readonly ApiPlatform[];
}) {
  const anchor = anchorFor(member.name);
  const since = formatSince(member.since);

  return (
    <article id={anchor} className="scroll-mt-24 py-6">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
        <h3 className="font-mono text-base font-semibold">
          <a href={`#${anchor}`} className="hover:text-link">
            {member.name}
          </a>
        </h3>

        {member.type && (
          <span className="font-mono text-sm text-text-muted">
            <TypeRefText refs={member.type} base={base} />
          </span>
        )}

        {member.deprecated && <DeprecatedBadge />}
        <PlatformBadges platforms={member.platforms} all={typePlatforms} />
        <SinceBadge since={since} />

        {member.permission && (
          <span className="font-mono text-xs text-text-subtle">{member.permission}</span>
        )}
      </div>

      {member.inheritedFrom && (
        <p className="mt-1 text-xs text-text-subtle">
          Inherited from{' '}
          <a
            href={`${base}/${member.inheritedFrom}#${anchor}`}
            className="text-link hover:underline"
          >
            {member.inheritedFrom}
          </a>
        </p>
      )}

      {member.deprecated && (
        <div className="mt-3 border-l-2 border-danger pl-3">
          <p className="text-sm font-medium text-danger">
            Deprecated{member.deprecated.since ? ` since ${member.deprecated.since}` : ''}
            {member.deprecated.removed ? `, removed in ${member.deprecated.removed}` : ''}
          </p>
          <Prose markdown={member.deprecated.notes} base={base} className="mt-1 text-sm" />
        </div>
      )}

      <Prose markdown={member.summary} base={base} className="mt-2" />

      {/*
        An inherited member shows its summary but not its full description: that
        text belongs to the type that declares it, and repeating it on every
        descendant was 64% of all rendered prose -- 1.8 MB against 1.0 MB of
        genuinely own content. The link above goes straight to the member on its
        declaring type.
      */}
      {!member.inheritedFrom && (
        <Prose markdown={member.description} base={base} className="mt-2 text-sm" />
      )}

      {member.default !== undefined && (
        <p className="mt-2 text-sm text-text-subtle">
          Default: <code className="font-mono">{member.default}</code>
        </p>
      )}

      {!!member.parameters?.length && (
        <Parameters rows={member.parameters} base={base} caption="Parameters" />
      )}
      {!!member.properties?.length && (
        <Parameters rows={member.properties} base={base} caption="Event properties" />
      )}

      {!!member.returns?.length && (
        <div className="mt-3 text-sm">
          <span className="text-text-subtle">Returns </span>
          <span className="font-mono">
            <TypeRefText refs={member.returns[0].type} base={base} />
          </span>
          <Prose markdown={member.returns[0].summary} base={base} className="mt-1" />
        </div>
      )}
    </article>
  );
}

type Row = NonNullable<ResolvedMember['parameters']>[number];

/** The one genuinely tabular thing on the page, so it scrolls rather than the page. */
function Parameters({ rows, base, caption }: { rows: Row[]; base: string; caption: string }) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-md border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-text-subtle">
            <th scope="col" className="py-1 pr-4 font-medium">
              {caption}
            </th>
            <th scope="col" className="py-1 pr-4 font-medium">
              Type
            </th>
            <th scope="col" className="py-1 font-medium">
              Description
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((p) => (
            <tr key={p.name} className="align-top">
              <td className="py-2 pr-4 font-mono whitespace-nowrap">
                {p.name}
                {p.optional && <span className="text-text-subtle">?</span>}
              </td>
              <td className="py-2 pr-4 font-mono text-text-muted">
                <TypeRefText refs={p.type} base={base} />
              </td>
              <td className="py-2">
                <Prose markdown={p.summary} base={base} className="text-sm" />
                {p.inlined && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-text-subtle">
                      {p.inlined.properties.length} field
                      {p.inlined.properties.length === 1 ? '' : 's'}
                    </summary>
                    <dl className="mt-2 space-y-2 border-l border-border pl-3">
                      {p.inlined.properties.map((f) => (
                        <div key={f.name}>
                          <dt className="font-mono text-xs">
                            {f.name}
                            {f.optional && <span className="text-text-subtle">?</span>}{' '}
                            <span className="text-text-muted">
                              <TypeRefText refs={f.type} base={base} />
                            </span>
                          </dt>
                          <dd>
                            <Prose markdown={f.summary} base={base} className="text-xs" />
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
