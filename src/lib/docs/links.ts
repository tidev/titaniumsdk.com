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
