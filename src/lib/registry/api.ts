import { z } from 'zod';

/**
 * Compiled API reference — one file per type, everything already resolved.
 *
 * This describes docgen's *output*, not the apidoc YAML it reads. The source is
 * 15 years of hand-written YAML and is inconsistent in ways a strict schema
 * would reject; by this point inheritance, excludes, platform narrowing, and
 * cross-references have all been settled, so the shape is machine-generated and
 * predictable. Objects are strict on purpose: an unrecognised key means docgen
 * emitted something the contract does not describe, and the Titanium CLI reads
 * these files through the registry API.
 */

export const API_SCHEMA_VERSION = 1;

/**
 * API availability. Deliberately a different vocabulary from the `android`/`ios`
 * of module packaging in packages.ts — a module ships for a platform, but an API
 * can be iPad-only or macOS-only. Do not reconcile the two.
 */
export const ApiPlatformSchema = z.enum(['android', 'iphone', 'ipad', 'macos']);

/**
 * `since` is a bare version on most members and a per-platform map on 441 of
 * them. Both forms are emitted as authored rather than normalised, so consumers
 * must handle the union — ignoring the map form silently mis-renders them.
 */
const Since = z.union([z.string(), z.record(z.string(), z.string())]);

const DeprecatedSchema = z.strictObject({
  since: z.string().optional(),
  removed: z.string().optional(),
  notes: z.string().optional(),
});

const ExampleSchema = z.strictObject({
  title: z.string().optional(),
  code: z.string(),
});

/**
 * A parsed type reference. `Dictionary<Titanium.UI.Animation>` becomes a
 * generic with one argument so a renderer can link the argument independently
 * of the wrapper, which a flat string would not allow.
 */
export type TypeRef =
  | { kind: 'primitive'; name: string }
  | { kind: 'type'; name: string }
  | { kind: 'unknown'; name: string }
  | { kind: 'generic'; name: string; args: TypeRef[] };

export const TypeRefSchema: z.ZodType<TypeRef> = z.lazy(() =>
  z.union([
    z.strictObject({ kind: z.enum(['primitive', 'type', 'unknown']), name: z.string() }),
    z.strictObject({
      kind: z.literal('generic'),
      name: z.string(),
      args: z.array(TypeRefSchema),
    }),
  ])
);

/** Method parameters and event payload fields. */
export const ParameterSchema = z.strictObject({
  name: z.string().min(1),
  summary: z.string().optional(),
  description: z.string().optional(),
  type: z.array(TypeRefSchema).optional(),
  optional: z.boolean().optional(),
  repeatable: z.boolean().optional(),
  default: z.string().optional(),
  /** A pseudo-type used by exactly one type is folded in here rather than linked. */
  get inlined() {
    return InlinedTypeSchema.optional();
  },
});

export const MemberSchema = z.strictObject({
  name: z.string().min(1),
  summary: z.string().optional(),
  description: z.string().optional(),
  type: z.array(TypeRefSchema).optional(),
  /** Resolved: the owning type's platforms narrowed by the member's own. */
  platforms: z.array(ApiPlatformSchema),
  since: Since.optional(),
  deprecated: DeprecatedSchema.optional(),
  permission: z.string().optional(),
  availability: z.string().optional(),
  default: z.string().optional(),
  optional: z.boolean().optional(),
  /** Constant values, passed through from the source unchanged. */
  value: z.unknown().optional(),
  constants: z.array(z.string()).optional(),
  osver: z.unknown().optional(),
  examples: z.array(ExampleSchema).optional(),
  parameters: z.array(ParameterSchema).optional(),
  /** Normalised to an array; 535 methods author an object and 7 an array. */
  returns: z
    .array(
      z.strictObject({ type: z.array(TypeRefSchema).optional(), summary: z.string().optional() })
    )
    .optional(),
  /** Event payload fields. */
  properties: z.array(ParameterSchema).optional(),
  /** Set on a synthesized `createXxx` factory: the type it returns. */
  factoryFor: z.string().optional(),
  get inlined() {
    return InlinedTypeSchema.optional();
  },
});

/**
 * A pseudo-type folded into whatever references it. Only single-reference
 * option bags are inlined; shared value types like `Point` keep their own file.
 */
export const InlinedTypeSchema = z.strictObject({
  name: z.string(),
  summary: z.string().optional(),
  description: z.string().optional(),
  properties: z.array(MemberSchema),
});

/**
 * `view`, `module`, and `proxy` are derived from the inheritance chain;
 * `pseudo` is the fallback when a type inherits from no Titanium base, which is
 * why the Node namespaces (`fs`, `util`, `path`) land there.
 */
export const KindSchema = z.enum(['view', 'module', 'proxy', 'pseudo']);

/**
 * An inherited member, recorded by reference rather than copied into every
 * descendant. Read the body from `from`'s file.
 *
 * `platforms` is carried because narrowing is per inheriting type:
 * `Titanium.UI.View` offers `backgroundColor` on all four platforms, but
 * `Titanium.UI.iOS.BlurView` inherits it as iOS-only. Use this value, not the
 * one on the declaring type's copy.
 */
export const InheritedRefSchema = z.strictObject({
  name: z.string().min(1),
  from: z.string().min(1),
  platforms: z.array(ApiPlatformSchema),
});

export const ApiTypeSchema = z.strictObject({
  schemaVersion: z.literal(API_SCHEMA_VERSION),
  name: z.string().min(1),
  kind: KindSchema,
  extends: z.string().optional(),
  /** Ancestors nearest-first. Absent on types that inherit from nothing. */
  inheritanceChain: z.array(z.string()).optional(),
  platforms: z.array(ApiPlatformSchema),
  since: Since.optional(),
  deprecated: DeprecatedSchema.optional(),
  summary: z.string().optional(),
  description: z.string().optional(),
  examples: z.array(ExampleSchema).optional(),
  /** Declared on this type. An override of an inherited member counts as own. */
  properties: z.array(MemberSchema),
  methods: z.array(MemberSchema),
  events: z.array(MemberSchema),
  /**
   * Inherited members by reference. Already resolved — excludes applied down
   * the chain, unreachable platforms dropped — so a consumer never reimplements
   * those rules, it only looks up the bodies on the declaring types.
   */
  inherited: z.strictObject({
    properties: z.array(InheritedRefSchema),
    methods: z.array(InheritedRefSchema),
    events: z.array(InheritedRefSchema),
  }),
  /** Types this one links to, in prose or in member types. */
  references: z.array(z.string()).optional(),
  /** Refs into namespaces compiled from other repos, e.g. `Modules.*`. */
  externalReferences: z.array(z.string()).optional(),
  /** Path of the source YAML, relative to the apidoc root. */
  source: z.string(),
});

/** `index.json` beside `types/` — enough for nav and search without reading every type. */
export const ApiIndexSchema = z.strictObject({
  schemaVersion: z.literal(API_SCHEMA_VERSION),
  counts: z.strictObject({
    types: z.number().int().nonnegative(),
    inlined: z.number().int().nonnegative(),
    members: z.number().int().nonnegative(),
  }),
  types: z.array(
    z.strictObject({
      name: z.string(),
      kind: KindSchema,
      summary: z.string().optional(),
      platforms: z.array(ApiPlatformSchema).optional(),
      since: Since.optional(),
      deprecated: z.boolean(),
      extends: z.string().optional(),
      counts: z.strictObject({
        properties: z.number().int().nonnegative(),
        methods: z.number().int().nonnegative(),
        events: z.number().int().nonnegative(),
      }),
    })
  ),
  /** Pseudo-types folded into a referent; no file is emitted for these. */
  inlined: z.array(z.string()),
});

export type ApiPlatform = z.infer<typeof ApiPlatformSchema>;
export type Kind = z.infer<typeof KindSchema>;
export type ApiType = z.infer<typeof ApiTypeSchema>;
export type Member = z.infer<typeof MemberSchema>;
export type Parameter = z.infer<typeof ParameterSchema>;
export type InlinedType = z.infer<typeof InlinedTypeSchema>;
export type InheritedRef = z.infer<typeof InheritedRefSchema>;
export type ApiIndex = z.infer<typeof ApiIndexSchema>;
