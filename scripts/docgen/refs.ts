/**
 * Type references and cross-references.
 *
 * The apidoc corpus links between types two ways: `<Titanium.UI.View>` and
 * markdown `[text](Titanium.UI.View)`. Both are resolved here rather than left
 * for the renderer, so the site, the CLI, and the markdown export in TI-57 all
 * get working links without reimplementing the same regex three times.
 *
 * Resolved links use an `api:` URI. Emitting a real path would bake the docs
 * version into committed JSON, and the same compiled type is served at
 * /docs/sdk/latest and /docs/sdk/13.1.0.
 */

/** Types that resolve to nothing in the corpus because they are JS built-ins. */
const PRIMITIVES = new Set([
  'Any',
  'any',
  'Array',
  'ArrayBuffer',
  'Boolean',
  'Callback',
  'Date',
  'Dictionary',
  'Error',
  'Function',
  'Number',
  'Object',
  'Promise',
  'RegExp',
  'String',
  'Uint8Array',
  'null',
  'undefined',
  'void',
]);

/** The only generic wrappers in the corpus: Array, Callback, Dictionary, Function, Promise. */
const GENERIC = /^([A-Za-z_][\w.]*)<(.+)>$/;

export type TypeRef =
  | { kind: 'primitive'; name: string }
  | { kind: 'type'; name: string }
  | { kind: 'generic'; name: string; args: TypeRef[] }
  | { kind: 'unknown'; name: string };

/**
 * Parses one type string. `Dictionary<Titanium.UI.Animation>` becomes a generic
 * with one argument; the renderer can link the argument independently of the
 * wrapper, which a flat string would not allow.
 */
export function parseTypeRef(raw: string, known: ReadonlySet<string>): TypeRef {
  const name = raw.trim();

  const generic = GENERIC.exec(name);
  if (generic) {
    // Split on top-level commas only — Dictionary<Array<String>, Number> nests.
    const args: string[] = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < generic[2].length; i++) {
      const c = generic[2][i];
      if (c === '<') depth++;
      else if (c === '>') depth--;
      else if (c === ',' && depth === 0) {
        args.push(generic[2].slice(start, i));
        start = i + 1;
      }
    }
    args.push(generic[2].slice(start));
    return {
      kind: 'generic',
      name: generic[1],
      args: args.map((a) => parseTypeRef(a, known)),
    };
  }

  if (known.has(name)) return { kind: 'type', name };
  if (PRIMITIVES.has(name)) return { kind: 'primitive', name };
  return { kind: 'unknown', name };
}

/** Normalises the `type` field, which is a bare string on 3,699 members and a union array on 261. */
export function parseTypeField(raw: unknown, known: ReadonlySet<string>): TypeRef[] {
  if (typeof raw === 'string') return [parseTypeRef(raw, known)];
  if (Array.isArray(raw))
    return raw.filter((t) => typeof t === 'string').map((t) => parseTypeRef(t, known));
  return [];
}

/** Every named type mentioned anywhere in a parsed ref, including generic arguments. */
export function typeRefTargets(refs: TypeRef[], out = new Set<string>()): Set<string> {
  for (const r of refs) {
    if (r.kind === 'type') out.add(r.name);
    else if (r.kind === 'generic') typeRefTargets(r.args, out);
  }
  return out;
}

export type Resolver = {
  /** Is this a type in the corpus? */
  hasType: (name: string) => boolean;
  /** Does this type declare this member? */
  hasMember: (type: string, member: string) => boolean;
  /** Case-insensitive lookup, to survive `Ti.Network.HttpClient` for `HTTPClient`. */
  canonical: (name: string) => string | undefined;
  /** First segment of every type name, e.g. Titanium, Global, Modules, fs. */
  isRoot: (segment: string) => boolean;
};

/**
 * The forms an author actually writes. `Ti.` is the long-standing alias for
 * `Titanium.`, and the Intl types are documented as `Intl.X` but declared as
 * `Global.Intl.X`.
 */
function aliases(ref: string): string[] {
  const out = [ref];
  if (ref === 'Ti' || ref.startsWith('Ti.')) out.push(`Titanium${ref.slice(2)}`);
  if (!ref.startsWith('Global.')) out.push(`Global.${ref}`);
  return out;
}

function anchor(ref: string, r: Resolver): string | null {
  const canonical = r.canonical(ref);
  if (canonical) return `api:${canonical}`;

  const dot = ref.lastIndexOf('.');
  if (dot > 0) {
    const parent = r.canonical(ref.slice(0, dot));
    // The member table already accounts for inheritance and excludes, so an
    // unknown member on a known type is a genuine typo rather than something
    // to paper over with a speculative anchor.
    if (parent && r.hasMember(parent, ref.slice(dot + 1)))
      return `api:${parent}#${ref.slice(dot + 1)}`;
  }
  return null;
}

/**
 * Resolves `Titanium.UI.View` to a type and `Titanium.UI.View.backgroundColor`
 * to a member anchor on its owning type, trying each alias form in turn.
 */
function resolveTarget(ref: string, r: Resolver): string | null {
  for (const candidate of aliases(ref)) {
    const hit = anchor(candidate, r);
    if (hit) return hit;
  }
  return null;
}

export type RewriteResult = {
  markdown: string;
  /** Types this prose links to. Feeds the reference graph. */
  references: string[];
  /**
   * Refs into a namespace this corpus does not contain. `Modules.*` types are
   * compiled from their own repos, so a reference to one is deferred, not broken.
   */
  external: string[];
  /** Refs that look like API links but resolve to nothing. */
  broken: string[];
};

/** Namespaces compiled from other repos. Unresolved refs into these are expected. */
const EXTERNAL_ROOTS = new Set(['Modules']);

// `<Titanium.UI.View>`. Also matches HTML tags such as <b>, which is why an
// unresolvable match is left in place rather than rewritten.
const ANGLE = /<([A-Za-z_][\w.]*)>/g;
// `[text](Titanium.UI.View)` — a dotted href with no scheme and no slash is
// unambiguously an API reference, never a URL or a relative image path.
const MD_LINK = /\[([^\]]*)\]\(([A-Za-z_][\w.]*)\)/g;

export function rewriteCrossRefs(markdown: string, r: Resolver): RewriteResult {
  const references = new Set<string>();
  const external = new Set<string>();
  const broken = new Set<string>();

  /**
   * Whether an unresolved ref is worth reporting. `<b>` and `<Button>` are
   * markup, and `<YourService.js>` is a filename an author wrapped in brackets —
   * none are broken links. Requiring a known root segment separates them from a
   * genuine typo such as `<Ti.Color>`.
   */
  const looksLikeApiRef = (ref: string) => {
    const root = ref.split('.')[0];
    return root === 'Ti' || r.isRoot(root);
  };

  const record = (ref: string, target: string | null): boolean => {
    if (target) {
      references.add(target.slice(4).split('#')[0]);
      return true;
    }
    if (EXTERNAL_ROOTS.has(ref.split('.')[0])) external.add(ref);
    else if (looksLikeApiRef(ref)) broken.add(ref);
    return false;
  };

  let out = markdown.replace(ANGLE, (whole, ref: string) => {
    const target = resolveTarget(ref, r);
    return record(ref, target) ? `[${ref}](${target})` : whole;
  });

  out = out.replace(MD_LINK, (whole, text: string, href: string) => {
    // Bare single words are ordinary relative links unless they name a type.
    if (!href.includes('.') && !r.hasType(href)) return whole;
    const target = resolveTarget(href, r);
    return record(href, target) ? `[${text}](${target})` : whole;
  });

  return {
    markdown: out,
    references: [...references].sort(),
    external: [...external].sort(),
    broken: [...broken].sort(),
  };
}
