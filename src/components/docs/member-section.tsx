import { DeprecatedBadge, PlatformBadges } from './badges';
import { Prose } from './prose';
import { TypeRefText } from './type-ref';
import { formatOsver, splitConstant } from '@/lib/docs/format';
import type { ApiLinker } from '@/lib/docs/links';
import type { ResolvedMember } from '@/lib/docs/type-view';

/**
 * One group of members - properties, methods, or events.
 *
 * Definition list rather than a table: the old site generated markup inside
 * markdown to force API tables, and they are what breaks on a phone. A list of
 * blocks reflows; only the genuinely tabular parts (a method's parameters) stay
 * as a table, and that scrolls inside its own container.
 */

/**
 * How this group's members are addressed and how they address others.
 *
 * `anchor` is separate from `link` because a member's own id depends on what
 * else is on the page: the SDK gives a type a page to itself, so the member
 * name is unique there, while a module renders its whole namespace at once and
 * has to qualify. Passed in rather than inferred - a wrong default here is a
 * silently broken deep link.
 */
type Addressing = {
  link: ApiLinker;
  anchor: (member: ResolvedMember) => string;
};

/**
 * Where this group sits in the page's outline.
 *
 * An SDK page gives the whole document to one type, so its member groups are
 * the page's own sections. A module page nests them under a type, one level
 * down. The headings have to move with that or the outline lies.
 */
type Level = 2 | 3;

export function MemberSection({
  id,
  title,
  members,
  link,
  anchor,
  level = 2,
}: Addressing & {
  id: string;
  title: string;
  members: ResolvedMember[];
  level?: Level;
}) {
  if (!members.length) return null;

  const Heading = level === 2 ? 'h2' : 'h3';

  return (
    /**
     * Only the page's own sections are landmarks (TI-49).
     *
     * `aria-labelledby` on a `<section>` promotes it to a `region`, and a
     * module page renders every type at once - so eight types with properties
     * produced eight regions all called "Properties", which is what a screen
     * reader's landmark list then offers as a way to navigate. Nested groups
     * keep their heading, which is what carries the outline, and give up the
     * landmark; at level 2 the names are the page's own and stay unique.
     */
    <section
      aria-labelledby={level === 2 ? id : undefined}
      className={level === 2 ? 'mt-12' : 'mt-8'}
    >
      <Heading
        id={id}
        className={`scroll-mt-24 font-semibold tracking-tight ${
          level === 2 ? 'text-2xl' : 'text-lg'
        }`}
      >
        {title}{' '}
        <span className="font-mono text-base font-normal text-text-subtle">{members.length}</span>
      </Heading>

      <div className="mt-4 divide-y divide-border border-t border-border">
        {members.map((m) => (
          <Member key={m.name} member={m} link={link} anchor={anchor} level={level} />
        ))}
      </div>
    </section>
  );
}

function Member({
  member,
  link,
  anchor,
  level,
}: Addressing & {
  member: ResolvedMember;
  level: Level;
}) {
  const id = anchor(member);
  const osver = formatOsver(member.osver);
  const declaredAt = member.inheritedFrom && link(member.inheritedFrom, member.name);
  const Heading = level === 2 ? 'h3' : 'h4';
  const ExampleHeading = level === 2 ? 'h4' : 'h5';

  return (
    <article id={id} className="scroll-mt-24 py-6">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
        {/* `min-w-0` is what lets `break-words` do anything: a flex item
            defaults to `min-width: auto`, so the longest member names -
            activitySharedElementReenterTransition and friends - held the row
            open at 324px inside a 288px column and scrolled the page. */}
        <Heading className="min-w-0 font-mono text-base font-semibold break-words">
          <a href={`#${id}`} className="hover:text-link">
            {member.name}
          </a>
        </Heading>

        {/* A signature is one unbroken token as far as the browser is
            concerned, and the longest -
            `Promise<Titanium.Android.RequestPermissionAccessResult>` - measures
            429px, which scrolled the whole page at 320px. `break-all` rather
            than the `overflow-wrap: anywhere` the `.prose-docs` rules use,
            matching the other mono strings here (the "See also" list below,
            module ids, filenames): these are single tokens, so the two behave
            alike on them, and `break-all` is what the rest of the file reaches
            for. `min-w-0` is what lets either do anything, since a flex item
            defaults to `min-width: auto`. */}
        {member.type && (
          <span className="min-w-0 font-mono text-sm break-all text-text-muted">
            <TypeRefText refs={member.type} link={link} />
          </span>
        )}

        {member.deprecated && <DeprecatedBadge />}
        <PlatformBadges platforms={member.platforms} since={member.since} />

        {member.permission && (
          <span className="font-mono text-xs text-text-subtle">{member.permission}</span>
        )}

        {osver && (
          <span className="font-mono text-xs text-text-subtle" title="Minimum OS version">
            {osver}
          </span>
        )}
      </div>

      {member.inheritedFrom && (
        <p className="mt-1 text-xs break-words text-text-subtle">
          Inherited from{' '}
          {declaredAt ? (
            <a href={declaredAt} className="text-link hover:underline">
              {member.inheritedFrom}
            </a>
          ) : (
            <span className="font-mono">{member.inheritedFrom}</span>
          )}
        </p>
      )}

      {member.deprecated && (
        <div className="mt-3 border-l-2 border-danger pl-3">
          <p className="text-sm font-medium text-danger">
            Deprecated{member.deprecated.since ? ` since ${member.deprecated.since}` : ''}
            {member.deprecated.removed ? `, removed in ${member.deprecated.removed}` : ''}
          </p>
          <Prose markdown={member.deprecated.notes} link={link} className="mt-1 text-sm" />
        </div>
      )}

      <Prose markdown={member.summary} link={link} className="mt-2" />

      {/*
        An inherited member shows its summary but not its full description: that
        text belongs to the type that declares it, and repeating it on every
        descendant was 64% of all rendered prose -- 1.8 MB against 1.0 MB of
        genuinely own content. The link above goes straight to the member on its
        declaring type.
      */}
      {!member.inheritedFrom && (
        <Prose markdown={member.description} link={link} className="mt-2 text-sm" />
      )}

      {/* A constant's own value, which is the whole point of the member. */}
      {member.value !== undefined && (
        <p className="mt-2 text-sm">
          <span className="text-text-subtle">Value </span>
          <code className="font-mono">{JSON.stringify(member.value)}</code>
        </p>
      )}

      {!!member.constants?.length && <Constants refs={member.constants} link={link} />}

      {!!member.examples?.length && (
        <div className="mt-3">
          {member.examples.map((ex, i) => (
            <div key={i} className="mt-2">
              {ex.title && (
                <ExampleHeading className="text-sm font-medium">{ex.title}</ExampleHeading>
              )}
              <Prose markdown={ex.code} link={link} className="mt-1 text-sm" />
            </div>
          ))}
        </div>
      )}

      {member.default !== undefined && (
        <p className="mt-2 text-sm break-words text-text-subtle">
          Default: <code className="font-mono">{member.default}</code>
        </p>
      )}

      {!!member.parameters?.length && (
        <Parameters rows={member.parameters} link={link} caption="Parameters" />
      )}
      {!!member.properties?.length && (
        <Parameters rows={member.properties} link={link} caption="Event properties" />
      )}

      {!!member.returns?.length && (
        <div className="mt-3 text-sm">
          <span className="text-text-subtle">Returns </span>
          {/* Breaks for the same reason as the member's own type above it. */}
          <span className="font-mono break-all">
            <TypeRefText refs={member.returns[0].type} link={link} />
          </span>
          <Prose markdown={member.returns[0].summary} link={link} className="mt-1" />
        </div>
      )}
    </article>
  );
}

/**
 * The constants a property accepts as values.
 *
 * Collapsed past a handful: the corpus expands to 1,245 constant references and
 * one member lists 33, which would otherwise dominate the entry it belongs to.
 */
function Constants({ refs, link }: { refs: string[]; link: ApiLinker }) {
  const links = (
    <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
      {refs.map((ref) => {
        const parts = splitConstant(ref);
        const href = parts && link(parts.owner, parts.name);
        return (
          <li key={ref} className="font-mono text-xs break-all">
            {href ? (
              <a href={href} className="text-link hover:underline">
                {parts.name}
              </a>
            ) : (
              (parts?.name ?? ref)
            )}
          </li>
        );
      })}
    </ul>
  );

  if (refs.length <= 8) {
    return (
      <div className="mt-3 text-sm">
        <span className="text-text-subtle">Accepts</span>
        {links}
      </div>
    );
  }

  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer text-text-subtle">Accepts {refs.length} constants</summary>
      {links}
    </details>
  );
}

type Row = NonNullable<ResolvedMember['parameters']>[number];

/** The one genuinely tabular thing on the page, so it scrolls rather than the page. */
function Parameters({ rows, link, caption }: { rows: Row[]; link: ApiLinker; caption: string }) {
  return (
    /* Focusable because it scrolls: the box takes the sideways scroll so the
       table cannot widen the page at 320px, and a scrolling box nothing can
       focus has no keyboard route to its right-hand columns (WCAG 2.1.1).

       `group` rather than `region`, which was the first attempt: `region` is a
       landmark, and a type page renders one of these per method, so sixty
       members produced sixty landmarks all called "Parameters" in the very list
       a screen reader offers for skipping around. `group` takes the same name
       without joining that list. */
    <div
      role="group"
      aria-label={caption}
      tabIndex={0}
      className="mt-3 overflow-x-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
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
                <TypeRefText refs={p.type} link={link} />
              </td>
              <td className="py-2">
                <Prose markdown={p.summary} link={link} className="text-sm" />
                {p.inlined && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-text-subtle">
                      {p.inlined.properties.length} field
                      {p.inlined.properties.length === 1 ? '' : 's'}
                    </summary>
                    <dl className="mt-2 space-y-2 border-l border-border pl-3">
                      {p.inlined.properties.map((f) => (
                        <div key={f.name}>
                          <dt className="font-mono text-xs break-words">
                            {f.name}
                            {f.optional && <span className="text-text-subtle">?</span>}{' '}
                            <span className="text-text-muted">
                              <TypeRefText refs={f.type} link={link} />
                            </span>
                          </dt>
                          <dd>
                            <Prose markdown={f.summary} link={link} className="text-xs" />
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
