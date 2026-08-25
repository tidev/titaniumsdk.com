import { z } from "zod";

/**
 * Compiled API reference — one file per type, inheritance already resolved.
 *
 * Field names are taken from the real `apidoc/` corpus rather than assumed.
 * Everything is `.loose()` and most fields are optional: the source is 15 years
 * of hand-written YAML and it is inconsistent in ways a strict schema would
 * simply reject.
 */

/** `android`, `iphone`, `ipad`, `macos`, `mobileweb`, ... — left open. */
const PlatformName = z.string();

/**
 * `since` is a bare version on most members but a per-platform map on others
 * (`{ android: "3.0.0", iphone: "2.0.0" }`). Both forms are real.
 */
const Since = z.union([z.string(), z.record(PlatformName, z.string())]);

/** Same dual shape as `since`. */
const OsVer = z.union([z.string(), z.record(PlatformName, z.unknown())]);

/** A type reference: `String`, or a union like `[String, Number]`. */
const TypeRef = z.union([z.string(), z.array(z.string())]);

const DeprecatedSchema = z
  .object({
    since: Since.optional(),
    removed: z.string().optional(),
    notes: z.string().optional(),
  })
  .loose();

const ExampleSchema = z
  .object({ title: z.string().optional(), example: z.string().optional() })
  .loose();

/** Common to properties, methods, and events. */
const MemberBase = {
  name: z.string().min(1),
  summary: z.string().optional(),
  description: z.string().optional(),
  platforms: z.array(PlatformName).optional(),
  since: Since.optional(),
  osver: OsVer.optional(),
  deprecated: DeprecatedSchema.optional(),
  availability: z.string().optional(),
  examples: z.array(ExampleSchema).optional(),
  /**
   * Set when the member came from an ancestor rather than being declared here.
   * Inheritance is resolved at compile time (TI-11), so consumers never walk
   * `extends` themselves — the CLI and the markdown output in TI-57 both depend
   * on a type file being self-contained.
   */
  inheritedFrom: z.string().optional(),
};

export const PropertySchema = z
  .object({
    ...MemberBase,
    type: TypeRef.optional(),
    default: z.unknown().optional(),
    permission: z.string().optional(),
    optional: z.boolean().optional(),
    value: z.unknown().optional(),
    constants: z.union([z.string(), z.array(z.string())]).optional(),
    accessors: z.boolean().optional(),
  })
  .loose();

export const ParameterSchema = z
  .object({
    ...MemberBase,
    type: TypeRef.optional(),
    default: z.unknown().optional(),
    optional: z.boolean().optional(),
    repeatable: z.boolean().optional(),
  })
  .loose();

export const MethodSchema = z
  .object({
    ...MemberBase,
    parameters: z.array(ParameterSchema).optional(),
    returns: z.unknown().optional(),
  })
  .loose();

export const EventSchema = z
  .object({
    ...MemberBase,
    properties: z.array(PropertySchema).optional(),
  })
  .loose();

export const ApiTypeSchema = z
  .object({
    /** Fully qualified: `Titanium.UI.View`. */
    name: z.string().min(1),
    summary: z.string().optional(),
    description: z.string().optional(),
    /** Immediate ancestor. The chain is also flattened into the members. */
    extends: z.string().optional(),
    /** Full ancestry, nearest first — for breadcrumbs and "inherited from". */
    inheritanceChain: z.array(z.string()).optional(),
    platforms: z.array(PlatformName).optional(),
    since: Since.optional(),
    osver: OsVer.optional(),
    deprecated: DeprecatedSchema.optional(),
    createable: z.boolean().optional(),
    examples: z.array(ExampleSchema).optional(),
    /** Inherited members this type removes, by kind. */
    excludes: z
      .object({
        properties: z.array(z.string()).optional(),
        methods: z.array(z.string()).optional(),
        events: z.array(z.string()).optional(),
      })
      .loose()
      .optional(),
    properties: z.array(PropertySchema).optional(),
    methods: z.array(MethodSchema).optional(),
    events: z.array(EventSchema).optional(),
  })
  .loose();

/** `index.json` beside `types/` — enough to build nav and search without reading every type. */
export const ApiIndexSchema = z
  .object({
    types: z.array(
      z
        .object({
          name: z.string(),
          summary: z.string().optional(),
          platforms: z.array(PlatformName).optional(),
          deprecated: z.boolean().optional(),
        })
        .loose(),
    ),
  })
  .loose();

export type ApiType = z.infer<typeof ApiTypeSchema>;
export type Property = z.infer<typeof PropertySchema>;
export type Method = z.infer<typeof MethodSchema>;
export type ApiEvent = z.infer<typeof EventSchema>;
export type ApiIndex = z.infer<typeof ApiIndexSchema>;
