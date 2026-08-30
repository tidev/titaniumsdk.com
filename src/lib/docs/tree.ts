import type { ApiIndex } from '../registry/index.ts';

/**
 * Navigation shapes derived from `index.json` alone.
 *
 * Nothing here touches the filesystem — it takes the index's `types` array and
 * returns plain data — so the tree can be built in a server component and handed
 * to a client one without dragging `node:fs` into the browser bundle.
 *
 * Results are memoised against the array identity rather than the version
 * string. `sdkIndex()` caches its parse, so every caller passes the same array
 * and the 294 prerendered pages each get a cache hit instead of rebuilding a
 * 283-node tree.
 */

type IndexType = ApiIndex['types'][number];

/**
 * The two fields the sidebar actually reads.
 *
 * Every prop a client component takes is serialised into each page's flight
 * payload, and an index entry carries a summary, a platform list, and three
 * counts that the tree never looks at. Narrowing here is worth roughly 35 kB of
 * markup per page across 294 of them.
 */
export type NavType = { name: string; deprecated?: boolean };

const projections = new WeakMap<object, NavType[]>();

export function navTypes(types: readonly IndexType[]): NavType[] {
  const cached = projections.get(types);
  if (cached) return cached;
  const projected = types.map((t) =>
    t.deprecated ? { name: t.name, deprecated: true } : { name: t.name }
  );
  projections.set(types, projected);
  return projected;
}

/**
 * The synthetic node holding names that have no namespace at all.
 *
 * Not a type name: those match `/^[A-Za-z_][\w.]*$/`, so a leading `#` can never
 * collide with one.
 */
export const TOP_LEVEL = '#top-level';

export type NavNode = {
  /** The dotted prefix this node covers — `Titanium.UI`. Stable id for expansion. */
  id: string;
  /** The last segment: `UI` for `Titanium.UI`. */
  label: string;
  /** The type this node links to. Absent on a namespace with no type of its own. */
  name?: string;
  deprecated?: boolean;
  children: NavNode[];
};

const trees = new WeakMap<object, NavNode[]>();
const subtypes = new WeakMap<object, Map<string, string[]>>();
const names = new WeakMap<object, Set<string>>();

/**
 * The namespace tree, grouped by the dotted name: `Titanium.UI.Button` nests
 * under `Titanium` › `UI`.
 *
 * 58 of main's 283 names carry no dot. Six of them (`Titanium`, `Global`, `fs`,
 * `util`, `assert`, `buffer`) have types nested under them and become branches
 * on their own; the other 52 — `Point`, `Font`, `ItemTemplate`, the Node shims
 * `os`/`path`/`process` — are leaves with no namespace to sit in. Scattering 52
 * loose entries across the root would bury the six branches that matter, so they
 * collect under one synthetic group instead. The rule is derived from the
 * registry rather than a hand-kept list, so a name that later grows children
 * moves to the root without anyone editing this file.
 */
export function buildNavTree(types: readonly NavType[]): NavNode[] {
  const cached = trees.get(types);
  if (cached) return cached;

  const nodes = new Map<string, NavNode>();
  const roots: NavNode[] = [];

  /** Creates a node and every namespace above it, once. */
  const node = (id: string): NavNode => {
    const found = nodes.get(id);
    if (found) return found;

    const dot = id.lastIndexOf('.');
    const created: NavNode = { id, label: id.slice(dot + 1), children: [] };
    // Registered before recursing, so a malformed name cannot loop forever.
    nodes.set(id, created);
    if (dot < 0) roots.push(created);
    else node(id.slice(0, dot)).children.push(created);
    return created;
  };

  for (const t of types) {
    const n = node(t.name);
    n.name = t.name;
    if (t.deprecated) n.deprecated = true;
  }

  const branches = roots.filter((n) => n.children.length);
  const loose = roots.filter((n) => !n.children.length);

  const byLabel = (a: NavNode, b: NavNode) => a.label.localeCompare(b.label);
  const sort = (n: NavNode) => {
    n.children.sort(byLabel);
    n.children.forEach(sort);
  };
  branches.forEach(sort);
  loose.sort(byLabel);

  // `Titanium` is 212 of the 283 types; alphabetical order would file the SDK
  // itself between `buffer` and `util`. The catch-all sorts last for the same
  // reason — it is where you look once the namespaces have not helped.
  branches.sort(byLabel);
  const tree = [
    ...branches.filter((n) => n.id === 'Titanium'),
    ...branches.filter((n) => n.id !== 'Titanium'),
  ];
  if (loose.length) {
    tree.push({ id: TOP_LEVEL, label: 'Top-level types', children: loose });
  }

  trees.set(types, tree);
  return tree;
}

/**
 * The branch ids to expand for a type — its own, plus every namespace above it.
 *
 * `Titanium.UI.Button` opens `Titanium` and `Titanium.UI`; a name with no dots
 * opens the synthetic group unless it is a root namespace in its own right.
 */
export function branchIds(name: string, roots: readonly NavNode[]): string[] {
  if (!name) return [];
  const ids: string[] = [];
  for (let at = name.indexOf('.'); at > 0; at = name.indexOf('.', at + 1)) {
    ids.push(name.slice(0, at));
  }
  ids.push(name);
  if (ids.length === 1 && !roots.some((r) => r.id === name)) ids.push(TOP_LEVEL);
  return ids;
}

/**
 * The types that directly extend `name`.
 *
 * The registry records inheritance upwards only — `extends` on the child — so
 * the downward edge has to be derived. `index.json` carries `extends` for all
 * 230 types that have one, which makes this a single pass over data the page
 * has already read rather than 283 file opens.
 */
export function subtypesOf(types: readonly IndexType[], name: string): string[] {
  let byParent = subtypes.get(types);
  if (!byParent) {
    byParent = new Map<string, string[]>();
    for (const t of types) {
      if (!t.extends) continue;
      const list = byParent.get(t.extends);
      if (list) list.push(t.name);
      else byParent.set(t.extends, [t.name]);
    }
    for (const list of byParent.values()) list.sort((a, b) => a.localeCompare(b));
    subtypes.set(types, byParent);
  }
  return byParent.get(name) ?? [];
}

export type Crumb = {
  /** One segment of the dotted name. */
  label: string;
  /** The type that segment resolves to, when the prefix is itself a type. */
  name?: string;
};

/**
 * The namespace path to a type, one crumb per segment.
 *
 * Every prefix in main is also a type — `Titanium.UI` has its own page — but
 * that is a property of the current registry, not a guarantee, so a prefix with
 * no type of its own comes back unlinked rather than as a dead link.
 */
export function crumbsFor(types: readonly IndexType[], name: string): Crumb[] {
  let known = names.get(types);
  if (!known) {
    known = new Set(types.map((t) => t.name));
    names.set(types, known);
  }

  const parts = name.split('.');
  return parts.map((label, i) => {
    const prefix = parts.slice(0, i + 1).join('.');
    return known.has(prefix) ? { label, name: prefix } : { label };
  });
}
