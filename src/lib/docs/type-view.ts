import type { ApiType, InheritedRef, Member } from '../registry/index.ts';
import { sdkType } from './registry.ts';

/**
 * Assembles everything a type page needs to render.
 *
 * The registry stores inherited members by reference — `{ name, from, platforms }`
 * — so the body lives on the type that declares it. This resolves those against
 * their declaring types, which is the only place that indirection has to be
 * understood.
 */

export type ResolvedMember = Member & {
  /** Absent when declared on the type being viewed. */
  inheritedFrom?: string;
};

export type TypeView = {
  type: ApiType;
  properties: ResolvedMember[];
  methods: ResolvedMember[];
  events: ResolvedMember[];
  /** Refs whose declaring type could not be read. Empty in a healthy registry. */
  unresolved: InheritedRef[];
};

const GROUPS = ['properties', 'methods', 'events'] as const;

export function buildTypeView(version: string, name: string): TypeView | null {
  const type = sdkType(version, name);
  if (!type) return null;

  // Every inherited member's body comes from its declaring type, and a type
  // only ever declares a handful of ancestors, so this is a small fixed read.
  const ancestors = new Map<string, ApiType>();
  for (const g of GROUPS) {
    for (const ref of type.inherited[g]) {
      if (ancestors.has(ref.from)) continue;
      const t = sdkType(version, ref.from);
      if (t) ancestors.set(ref.from, t);
    }
  }

  const unresolved: InheritedRef[] = [];
  const view = { properties: [], methods: [], events: [] } as Record<
    (typeof GROUPS)[number],
    ResolvedMember[]
  >;

  for (const g of GROUPS) {
    const own: ResolvedMember[] = type[g].map((m) => ({ ...m }));

    const inherited: ResolvedMember[] = [];
    for (const ref of type.inherited[g]) {
      const body = ancestors.get(ref.from)?.[g].find((m) => m.name === ref.name);
      if (!body) {
        unresolved.push(ref);
        continue;
      }
      // The reference's platforms win: they are narrowed to this type, while
      // the declaring type's copy carries its own wider set.
      inherited.push({ ...body, platforms: ref.platforms, inheritedFrom: ref.from });
    }

    view[g] = [...own, ...inherited].sort((a, b) => a.name.localeCompare(b.name));
  }

  return { type, ...view, unresolved };
}
