/**
 * How a compiled reference addresses the types it links to.
 *
 * The SDK puts one type per page under a single base path, so `Titanium.UI.View`
 * is always `<base>/Titanium.UI.View`. A module puts its whole namespace on one
 * page, so `Modules.Map.View` is an anchor on the page you are already reading
 * while `Titanium.UI.View` is a page in a different tree entirely. Both are
 * expressed as a function here rather than as a base string, because a base
 * string can only describe the first arrangement.
 */

/** Member anchors, kept stable and URL-safe so they can be deep-linked. */
export function anchorFor(member: string): string {
  return member.replace(/[^\w.-]/g, '-');
}

/**
 * Anchors for every member on one page, disambiguated across groups.
 *
 * A member name is unique within its group but not across them. On
 * `Titanium.UI.Window` the method `open()` and the event `open` are different
 * members with the same name, and both emitted `id="open"` — two elements
 * sharing an id, which is invalid, and `#open` reaching whichever came first,
 * so the event was not deep-linkable at all. 41 types in the registry declare a
 * property and an event under one name; `toc.tsx` already keyed its list by
 * position for the same reason without the anchors following.
 *
 * Keyed on the member itself rather than its name, because the name is exactly
 * what is ambiguous. The first group to claim a name keeps the bare anchor and
 * later ones take a suffix: a cross-reference arriving from another page has
 * only the name to go on — `module-view.ts` builds `Titanium.UI.Window#open`
 * with no idea which kind it means — so the bare anchor has to keep existing
 * and keep pointing somewhere sensible. Groups are rendered properties,
 * methods, events, which also ranks them by how likely a bare reference means
 * that one.
 *
 * @param groups  the members of each group, in render order
 * @param labels  the suffix for each group, used only on collision
 * @param prefix  qualifies every anchor, for a page carrying several types
 */
export function anchorAllocator<T extends { name: string }>(
  groups: readonly (readonly T[])[],
  labels: readonly string[],
  prefix = ''
): (member: T) => string {
  const taken = new Set<string>();
  const assigned = new Map<T, string>();

  groups.forEach((members, gi) => {
    for (const member of members) {
      if (assigned.has(member)) continue;
      const base = anchorFor(member.name);
      let id = base;
      if (taken.has(id)) id = `${base}-${labels[gi] ?? gi}`;
      for (let n = 2; taken.has(id); n++) id = `${base}-${labels[gi] ?? gi}-${n}`;
      taken.add(id);
      assigned.set(member, `${prefix}${id}`);
    }
  });

  return (member) => assigned.get(member) ?? `${prefix}${anchorFor(member.name)}`;
}

/**
 * A member's id on a page that carries more than one type.
 *
 * `Modules.Map#NORMAL_TYPE` and `Modules.Map.View#mapType` share a page, so a
 * bare member name is not unique there. Qualifying with the owning type is,
 * and it is checked: no `<Type>.<member>` in the module registry collides with
 * a type name in the same version.
 */
export function memberAnchor(type: string, member: string): string {
  return `${type}.${anchorFor(member)}`;
}

/**
 * Resolves a type — optionally a member on it — to an href.
 *
 * Returns null when the target has no page. That is not a failure: a docgen
 * pseudo-type folded into its referent is a real reference to something the
 * site never renders on its own, and a link to it would 404. Callers drop the
 * link and keep the text.
 */
export type ApiLinker = (type: string, member?: string) => string | null;

/**
 * One type per page under `base` — the SDK reference's own arrangement.
 *
 * `known` is the set of types that actually have a page. Pass it and anything
 * outside it resolves to null, which is what the callers need: docgen folds
 * 136 single-use pseudo-types into their referents, so `Titanium.Event` and
 * `MinMaxOptions` are named all over the reference and rendered nowhere. Linked
 * blindly they were 1,023 links to pages that do not exist, `Titanium.Event`
 * alone accounting for 606 of them.
 *
 * Optional rather than required so prose that has no index to hand — the
 * markdown renderer given a bare base string — still resolves the common case.
 */
export function pathLinker(base: string, known?: ReadonlySet<string>): ApiLinker {
  return (type, member) =>
    known && !known.has(type) ? null : `${base}/${type}${member ? `#${anchorFor(member)}` : ''}`;
}

/** `api:Titanium.UI.View` and `api:Titanium.UI.View#backgroundColor`. */
const API_URI = /^api:([A-Za-z_][\w.]*)(?:#(.+))?$/;

/** Splits an `api:` URI into the type and member it names, or null if it is not one. */
export function apiTarget(href: string): { type: string; member?: string } | null {
  const m = API_URI.exec(href);
  if (!m) return null;
  return m[2] ? { type: m[1], member: m[2] } : { type: m[1] };
}
