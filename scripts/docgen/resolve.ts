import type { RawType } from './load.ts';
import {
  parseTypeField,
  rewriteCrossRefs,
  typeRefTargets,
  type Resolver,
  type TypeRef,
} from './refs.ts';

/**
 * Turns the raw YAML graph into self-contained types.
 *
 * Inheritance, `excludes`, and cross-references are all resolved here so that a
 * compiled type file is a complete and accurate picture of that type's surface.
 * No consumer needs to know `excludes` exists or has to walk `extends` itself.
 */

export type Kind = 'view' | 'module' | 'proxy' | 'pseudo';

/** The four values in the corpus. Module packaging uses android/ios; API availability does not. */
export type Platform = 'android' | 'iphone' | 'ipad' | 'macos';

export type Deprecated = { since?: string; removed?: string; notes?: string };
export type Since = string | Record<string, string>;
export type Example = { title?: string; code: string };

export type Param = {
  name: string;
  summary?: string;
  description?: string;
  type?: TypeRef[];
  optional?: boolean;
  default?: string;
  repeatable?: boolean;
  /** Set when this parameter's type is a pseudo-type used nowhere else. */
  inlined?: InlinedType;
};

export type Member = {
  name: string;
  summary?: string;
  description?: string;
  type?: TypeRef[];
  platforms?: Platform[];
  since?: Since;
  deprecated?: Deprecated;
  permission?: string;
  availability?: string;
  default?: string;
  optional?: boolean;
  value?: unknown;
  constants?: string[];
  osver?: unknown;
  examples?: Example[];
  parameters?: Param[];
  returns?: { type?: TypeRef[]; summary?: string }[];
  /** Event payload fields. */
  properties?: Param[];
  /** Null when declared on this type, otherwise the ancestor it came from. */
  inheritedFrom?: string;
  /** Set on a synthesized `createXxx` factory: the type it returns. */
  factoryFor?: string;
  /** Set when this member's type is a pseudo-type used nowhere else. */
  inlined?: InlinedType;
};

export type InlinedType = {
  name: string;
  summary?: string;
  description?: string;
  properties: Member[];
};

export type ResolvedType = {
  name: string;
  kind: Kind;
  extends?: string;
  /** Ancestors nearest-first. Empty for pseudo-types. */
  inheritanceChain: string[];
  platforms?: Platform[];
  since?: Since;
  deprecated?: Deprecated;
  summary?: string;
  description?: string;
  examples?: Example[];
  properties: Member[];
  methods: Member[];
  events: Member[];
  /** Types this one links to in prose or member types. */
  references: string[];
  /** Refs into namespaces compiled from other repos, e.g. Modules.*. */
  externalReferences?: string[];
  source: string;
};

export type ResolveResult = {
  types: Map<string, ResolvedType>;
  /** Pseudo-types folded into their single referent; no file is emitted for these. */
  inlined: Set<string>;
  problems: { type: string; reason: string }[];
};

const MEMBER_GROUPS = ['properties', 'methods', 'events'] as const;
type Group = (typeof MEMBER_GROUPS)[number];

/** Walks `extends` upward. Tolerates cycles and dangling parents. */
function chainOf(name: string, types: Map<string, RawType>): string[] {
  const chain: string[] = [];
  const seen = new Set([name]);
  let cur = types.get(name)?.extends;
  while (cur && !seen.has(cur)) {
    chain.push(cur);
    seen.add(cur);
    cur = types.get(cur)?.extends;
  }
  return chain;
}

/**
 * Matches the old docgen's getSubtype(), which derived the kind by walking
 * `extends` and fell through to `pseudo` when nothing resolved. That fallback is
 * why the Node namespaces (assert, fs, buffer) land in `pseudo` — they inherit
 * from no Titanium base. A "name has no dots" heuristic gets the same answer for
 * the wrong reason and misclassifies elsewhere.
 *
 * Deviation: the old rule looked only at the immediate `extends`, so
 * Titanium.UI.View itself classified as `proxy`. Testing the whole chain
 * including self is what a reader expects.
 */
function classify(name: string, chain: string[]): Kind {
  const self = [name, ...chain];
  if (self.includes('Titanium.UI.View')) return 'view';
  if (self.includes('Titanium.Module')) return 'module';
  if (self.includes('Titanium.Proxy')) return 'proxy';
  if (name === 'Global' || name.startsWith('Global.')) return 'module';
  return 'pseudo';
}

const str = (v: unknown): string | undefined => (typeof v === 'string' && v ? v : undefined);

function platforms(v: unknown): Platform[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v.filter(
    (p): p is Platform => p === 'android' || p === 'iphone' || p === 'ipad' || p === 'macos'
  );
  return out.length ? out : undefined;
}

/** `since` is a bare version on 1,419 members and a per-platform map on 441. Both survive. */
function since(v: unknown): Since | undefined {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const out: Record<string, string> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      if (typeof val === 'string') out[k] = val;
    }
    return Object.keys(out).length ? out : undefined;
  }
  return undefined;
}

function deprecated(v: unknown): Deprecated | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const d = v as Record<string, unknown>;
  const out: Deprecated = {};
  if (str(d.since)) out.since = str(d.since);
  if (str(d.removed)) out.removed = str(d.removed);
  if (str(d.notes)) out.notes = str(d.notes);
  return Object.keys(out).length ? out : undefined;
}

function examples(v: unknown): Example[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v
    .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
    .map((e) => ({ title: str(e.title), code: str(e.example) ?? str(e.code) ?? '' }))
    .filter((e) => e.code);
  return out.length ? out : undefined;
}

/**
 * Builds the `createXxx` factory methods.
 *
 * These are the primary way an app creates anything — `Ti.UI.createWindow()` —
 * yet none of them are authored. The old docgen synthesized them onto the parent
 * namespace at compile time, so `<Titanium.UI.createAlertDialog>` appears 40
 * times in prose while being declared nowhere. Omitting them would drop roughly
 * 300 methods and break every one of those links.
 *
 * The old implementation guarded on `api.creatable` while the corpus spells the
 * key `createable`, so the read was always undefined and the 5 types that opt in
 * explicitly never got a factory. Honouring the spelling that is actually used
 * fixes them.
 */
function synthesizeFactories(
  types: Map<string, RawType>,
  kinds: Map<string, Kind>
): Map<string, Record<string, unknown>[]> {
  const extra = new Map<string, Record<string, unknown>[]>();

  for (const t of [...types.values()].sort((a, b) => a.name.localeCompare(b.name))) {
    const kind = kinds.get(t.name);
    if (kind !== 'view' && kind !== 'proxy') continue;
    if (t.doc.createable === false) continue;

    const dot = t.name.lastIndexOf('.');
    if (dot <= 0) continue;
    const owner = types.get(t.name.slice(0, dot));
    if (!owner) continue;

    const methodName = `create${t.name.slice(dot + 1)}`;
    const declared = (owner.doc.methods as unknown[]) ?? [];
    if (declared.some((m) => (m as Record<string, unknown>)?.name === methodName)) continue;
    const already = extra.get(owner.name) ?? [];
    if (already.some((m) => m.name === methodName)) continue;

    already.push({
      name: methodName,
      summary: `Creates and returns an instance of <${t.name}>.`,
      since: t.doc.since,
      platforms: t.doc.platforms,
      deprecated: t.doc.deprecated,
      returns: { type: t.name },
      parameters: [
        {
          name: 'parameters',
          summary:
            `Properties to set on a new object, including any defined by <${t.name}> ` +
            'except those marked not-creation or read-only.',
          type: `Dictionary<${t.name}>`,
          optional: true,
        },
      ],
      __factoryFor: t.name,
    });
    extra.set(owner.name, already);
  }

  return extra;
}

export function resolveAll(types: Map<string, RawType>): ResolveResult {
  const problems: ResolveResult['problems'] = [];
  const known = new Set(types.keys());

  const chains = new Map<string, string[]>();
  for (const name of known) chains.set(name, chainOf(name, types));

  const kinds = new Map<string, Kind>();
  for (const name of known) kinds.set(name, classify(name, chains.get(name)!));

  // Factory methods have to exist before the member table is built, or every
  // <Titanium.UI.createAlertDialog> reference resolves to nothing.
  const synthetic = synthesizeFactories(types, kinds);
  const methodsOf = (t: RawType): Record<string, unknown>[] => [
    ...((t.doc.methods as unknown[]) ?? []).filter(
      (m): m is Record<string, unknown> => !!m && typeof m === 'object'
    ),
    ...(synthetic.get(t.name) ?? []),
  ];

  // Effective member names, resolved through inheritance and excludes before any
  // prose is rewritten. <Titanium.UI.Button.backgroundColor> names a member
  // Button inherits rather than declares, so an own-members-only table would
  // fail to anchor it — and a loose "parent exists, assume the member does too"
  // fallback would happily mint an anchor for <Ti.Color>, which is a typo.
  const ownNames = new Map<string, Set<string>>();
  for (const t of types.values()) {
    const set = new Set<string>();
    for (const g of MEMBER_GROUPS) {
      const list = g === 'methods' ? methodsOf(t) : ((t.doc[g] as unknown[]) ?? []);
      for (const m of list) {
        const n = (m as Record<string, unknown>)?.name;
        if (typeof n === 'string') set.add(n);
      }
    }
    ownNames.set(t.name, set);
  }

  const members = new Map<string, Set<string>>();
  for (const t of types.values()) {
    const set = new Set(ownNames.get(t.name));
    for (const ancestor of chains.get(t.name)!) {
      for (const n of ownNames.get(ancestor) ?? []) set.add(n);
    }
    const ex = t.doc.excludes as Record<string, unknown> | undefined;
    if (ex && typeof ex === 'object') {
      for (const g of MEMBER_GROUPS) {
        if (!Array.isArray(ex[g])) continue;
        for (const n of ex[g] as unknown[]) {
          // An excluded name that the type also declares itself stays reachable.
          if (typeof n === 'string' && !ownNames.get(t.name)?.has(n)) set.delete(n);
        }
      }
    }
    members.set(t.name, set);
  }

  // Case-insensitive index, so `Ti.Network.HttpClient` finds `HTTPClient`.
  const byLower = new Map([...known].map((n) => [n.toLowerCase(), n]));
  const roots = new Set([...known].map((n) => n.split('.')[0]));

  const resolver: Resolver = {
    hasType: (n) => known.has(n),
    hasMember: (t, m) => members.get(t)?.has(m) ?? false,
    canonical: (n) => (known.has(n) ? n : byLower.get(n.toLowerCase())),
    isRoot: (segment) => roots.has(segment),
  };

  // Prose and type fields, per type. Cross-refs resolved once here.
  const refsFor = new Map<string, Set<string>>();
  const externalFor = new Map<string, Set<string>>();
  const prose = (name: string, v: unknown): string | undefined => {
    const s = str(v);
    if (!s) return undefined;
    const { markdown, references, external, broken } = rewriteCrossRefs(s, resolver);

    const bucket = refsFor.get(name) ?? new Set();
    for (const r of references) bucket.add(r);
    refsFor.set(name, bucket);

    if (external.length) {
      const ext = externalFor.get(name) ?? new Set();
      for (const e of external) ext.add(e);
      externalFor.set(name, ext);
    }

    for (const b of broken) problems.push({ type: name, reason: `unresolved reference <${b}>` });
    return markdown;
  };

  function toParam(owner: string, raw: Record<string, unknown>): Param {
    const out: Param = { name: str(raw.name) ?? '' };
    if (str(raw.summary)) out.summary = prose(owner, raw.summary);
    if (str(raw.description)) out.description = prose(owner, raw.description);
    const t = parseTypeField(raw.type, known);
    if (t.length) out.type = t;
    if (raw.optional === true) out.optional = true;
    if (raw.repeatable === true) out.repeatable = true;
    if (raw.default !== undefined) out.default = String(raw.default);
    return out;
  }

  function toMember(owner: string, raw: Record<string, unknown>): Member {
    const out: Member = { name: str(raw.name) ?? '' };
    if (str(raw.summary)) out.summary = prose(owner, raw.summary);
    if (str(raw.description)) out.description = prose(owner, raw.description);

    const t = parseTypeField(raw.type, known);
    if (t.length) out.type = t;

    const p = platforms(raw.platforms);
    if (p) out.platforms = p;
    const s = since(raw.since);
    if (s) out.since = s;
    const d = deprecated(raw.deprecated);
    if (d) out.deprecated = d;

    if (str(raw.permission)) out.permission = str(raw.permission);
    if (str(raw.availability)) out.availability = str(raw.availability);
    if (raw.default !== undefined) out.default = String(raw.default);
    if (raw.optional === true) out.optional = true;
    if (raw.value !== undefined) out.value = raw.value;
    if (raw.osver !== undefined) out.osver = raw.osver;
    if (Array.isArray(raw.constants))
      out.constants = raw.constants.filter((c) => typeof c === 'string');
    else if (typeof raw.constants === 'string') out.constants = [raw.constants];

    const ex = examples(raw.examples);
    if (ex) out.examples = ex;
    if (str(raw.__factoryFor)) out.factoryFor = str(raw.__factoryFor);

    if (Array.isArray(raw.parameters)) {
      out.parameters = raw.parameters
        .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
        .map((x) => toParam(owner, x));
    }

    // 535 methods use an object, 7 use an array. Normalised to an array.
    if (raw.returns) {
      const list = Array.isArray(raw.returns) ? raw.returns : [raw.returns];
      out.returns = list
        .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
        .map((x) => {
          const r: { type?: TypeRef[]; summary?: string } = {};
          const rt = parseTypeField(x.type, known);
          if (rt.length) r.type = rt;
          if (str(x.summary)) r.summary = prose(owner, x.summary);
          return r;
        });
    }

    // Event payload fields.
    if (Array.isArray(raw.properties) && !raw.type) {
      out.properties = raw.properties
        .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
        .map((x) => toParam(owner, x));
    }

    return out;
  }

  // Pass 1: shape every type's own members.
  const own = new Map<string, Record<Group, Member[]>>();
  for (const t of types.values()) {
    const groups = { properties: [], methods: [], events: [] } as Record<Group, Member[]>;
    for (const g of MEMBER_GROUPS) {
      const list = g === 'methods' ? methodsOf(t) : t.doc[g];
      if (!Array.isArray(list)) continue;
      // Events carry a `properties` array of payload fields, not member types.
      for (const raw of list) {
        if (!raw || typeof raw !== 'object') continue;
        const m = toMember(t.name, raw as Record<string, unknown>);
        if (m.name) groups[g].push(m);
      }
    }
    own.set(t.name, groups);
  }

  // Pass 2: merge inherited members, then apply excludes.
  const resolved = new Map<string, ResolvedType>();
  for (const t of types.values()) {
    const chain = chains.get(t.name)!;
    const groups = { properties: [], methods: [], events: [] } as Record<Group, Member[]>;

    for (const g of MEMBER_GROUPS) {
      const seen = new Set<string>();
      for (const m of own.get(t.name)![g]) {
        seen.add(m.name);
        groups[g].push(m);
      }
      // Nearest ancestor wins; an override on the subtype already claimed the name.
      for (const ancestor of chain) {
        for (const m of own.get(ancestor)?.[g] ?? []) {
          if (seen.has(m.name)) continue;
          seen.add(m.name);
          groups[g].push({ ...m, inheritedFrom: ancestor });
        }
      }
    }

    const excludes = t.doc.excludes as Record<string, unknown> | undefined;
    if (excludes && typeof excludes === 'object') {
      for (const g of MEMBER_GROUPS) {
        const list = excludes[g];
        if (!Array.isArray(list)) continue;
        const drop = new Set(list.filter((x) => typeof x === 'string'));
        groups[g] = groups[g].filter((m) => !drop.has(m.name));
      }
    }

    for (const g of MEMBER_GROUPS) groups[g].sort((a, b) => a.name.localeCompare(b.name));

    const out: ResolvedType = {
      name: t.name,
      kind: kinds.get(t.name)!,
      extends: t.extends,
      inheritanceChain: chain,
      properties: groups.properties,
      methods: groups.methods,
      events: groups.events,
      references: [],
      source: t.source,
    };

    const p = platforms(t.doc.platforms);
    if (p) out.platforms = p;
    const s = since(t.doc.since);
    if (s) out.since = s;
    const d = deprecated(t.doc.deprecated);
    if (d) out.deprecated = d;
    if (str(t.doc.summary)) out.summary = prose(t.name, t.doc.summary);
    if (str(t.doc.description)) out.description = prose(t.name, t.doc.description);
    const ex = examples(t.doc.examples);
    if (ex) out.examples = ex;

    resolved.set(t.name, out);
  }

  // Pass 3: reference graph. Prose refs were collected during rewriting; add the
  // types named in member type fields, including generic arguments.
  for (const rt of resolved.values()) {
    const refs = refsFor.get(rt.name) ?? new Set<string>();
    const addTypes = (m: Member | Param) => {
      if (m.type) for (const n of typeRefTargets(m.type)) refs.add(n);
    };
    for (const g of MEMBER_GROUPS) {
      for (const m of rt[g]) {
        addTypes(m);
        for (const p of m.parameters ?? []) addTypes(p);
        for (const p of m.properties ?? []) addTypes(p);
        for (const r of m.returns ?? []) {
          if (r.type) for (const n of typeRefTargets(r.type)) refs.add(n);
        }
      }
    }
    if (rt.extends) refs.add(rt.extends);
    refs.delete(rt.name);
    rt.references = [...refs].filter((n) => resolved.has(n)).sort();
    const ext = externalFor.get(rt.name);
    if (ext?.size) rt.externalReferences = [...ext].sort();
  }

  return { types: resolved, inlined: inlinePseudoTypes(resolved), problems };
}

/**
 * Folds single-use pseudo-types into whatever references them.
 *
 * A pseudo-type referenced by exactly one type is an option bag for that type's
 * one method; a reader should not have to click through to learn what three
 * fields it accepts. A pseudo-type referenced by many is a shared value type —
 * Point is referenced by 20 types, Font by 14 — and inlining those would mean 20
 * copies of Point and no canonical page to link to. So fan-out decides.
 */
function inlinePseudoTypes(resolved: Map<string, ResolvedType>): Set<string> {
  const fanOut = new Map<string, Set<string>>();
  for (const rt of resolved.values()) {
    for (const ref of rt.references) {
      const target = resolved.get(ref);
      if (!target || target.kind !== 'pseudo') continue;
      // A type that extends a pseudo-type needs it to stay standalone.
      if (rt.inheritanceChain.includes(ref)) continue;
      const set = fanOut.get(ref) ?? new Set();
      set.add(rt.name);
      fanOut.set(ref, set);
    }
  }

  const inlined = new Set<string>();
  for (const [name, referrers] of fanOut) {
    if (referrers.size !== 1) continue;
    const pseudo = resolved.get(name)!;
    // Nothing gained by inlining something with no fields of its own.
    if (!pseudo.properties.length) continue;
    // Keep anything another type inherits from, and anything with its own methods
    // or events — that is an object, not an option bag.
    if (pseudo.methods.length || pseudo.events.length) continue;
    inlined.add(name);
  }

  const payload = (name: string): InlinedType => {
    const p = resolved.get(name)!;
    return { name, summary: p.summary, description: p.description, properties: p.properties };
  };

  // Attach the payload wherever the inlined type is named.
  for (const rt of resolved.values()) {
    const attach = (m: Member | Param) => {
      if (!m.type) return;
      for (const n of typeRefTargets(m.type)) {
        if (inlined.has(n)) m.inlined = payload(n);
      }
    };
    for (const g of MEMBER_GROUPS) {
      for (const m of rt[g]) {
        attach(m);
        for (const p of m.parameters ?? []) attach(p);
        for (const p of m.properties ?? []) attach(p);
      }
    }
  }

  return inlined;
}
