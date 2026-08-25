import { z } from 'zod';

/**
 * SDK versions and modules — the entries that carry documentation.
 *
 * Downloadable build data lives in `./builds.ts` and a separate `registry/builds/`
 * tree: CI builds number in the thousands, expire after 90 days, and have no
 * docs, so mixing them would churn the docs tree for unrelated reasons.
 */

/** Bumped when the on-disk shape changes incompatibly. The CLI reads this to refuse a shape it does not understand. */
export const SCHEMA_VERSION = 1;

const SchemaVersion = z.number().int().positive();

/** Normalized to exactly these two. `iphone` is accepted as input and mapped. */
export const PlatformSchema = z.enum(['android', 'ios']);
export type Platform = z.infer<typeof PlatformSchema>;

/**
 * Free-form on purpose. Real values include `13.4.0`, `12.7.0.GA`,
 * `11.1.1.v20220925204111`, and the literal `main`.
 */
const VersionString = z.string().min(1);

/** Written for the mutable `main` entry so consumers know what they are looking at. */
const SourceRef = z
  .object({ commit: z.string().optional(), builtAt: z.string().optional() })
  .loose();

// ---------------------------------------------------------------- SDK

export const SdkVersionSchema = z
  .object({
    schemaVersion: SchemaVersion,
    version: VersionString,
    /** True for `main`; released versions are immutable once written. */
    mutable: z.boolean().default(false),
    releaseDate: z.string().optional(),
    source: SourceRef.optional(),
  })
  .loose();

// ------------------------------------------------------------- modules

/** Per-platform manifest. The two can disagree on minsdk, architectures, even apiversion. */
export const ModuleManifestSchema = z
  .object({
    platform: PlatformSchema,
    version: VersionString,
    minsdk: z.string().optional(),
    apiversion: z.union([z.string(), z.number()]).optional(),
    architectures: z.array(z.string()).optional(),
    guid: z.string().optional(),
    author: z.string().optional(),
    license: z.string().optional(),
    copyright: z.string().optional(),
    description: z.string().optional(),
    /** Android only. */
    respackage: z.string().optional(),
    /** iOS only. */
    mac: z.boolean().optional(),
  })
  .loose();

/** The packaged `.zip` attached to the GitHub release. */
export const ModuleAssetSchema = z
  .object({
    platform: PlatformSchema,
    filename: z.string(),
    url: z.url(),
    size: z.number().int().nonnegative().optional(),
    /** For CLI verification (TI-56). */
    checksum: z.string().optional(),
  })
  .loose();

/**
 * One release. Carries one *or both* platforms — 52 version strings ship on both,
 * across 10 of the 16 modules, so a version is the unit, not a platform-version pair.
 */
export const ModuleVersionSchema = z
  .object({
    schemaVersion: SchemaVersion,
    moduleId: z.string().min(1),
    version: VersionString,
    mutable: z.boolean().default(false),
    platforms: z.array(PlatformSchema).min(1),
    publishedAt: z.string().optional(),
    /** Opaque reference. Four tag formats exist across ti.map alone — never pattern-match it. */
    tag: z.string().optional(),
    manifests: z.array(ModuleManifestSchema),
    assets: z.array(ModuleAssetSchema),
    readme: z.string().optional(),
    /** A release may legitimately ship no apidoc; the page renders metadata only. */
    hasApiDocs: z.boolean().default(false),
  })
  .loose();

export const CurationSchema = z.enum(['tidev', 'community', 'unverified']);

export const ModuleIndexSchema = z
  .object({
    schemaVersion: SchemaVersion,
    /** Canonical key: the manifest moduleid, which differs from the repo name for 5 of 16. */
    moduleId: z.string().min(1),
    name: z.string().optional(),
    description: z.string().optional(),
    repo: z.url().optional(),
    /** Repo name and other spellings that should redirect here. */
    aliases: z.array(z.string()).default([]),
    curation: CurationSchema.default('community'),
    /**
     * Latest per platform. Never a single value: ti.map's newest by date is
     * android 5.7.0 while its highest semver is iOS 7.3.1, and neither is
     * "the" latest.
     */
    latest: z.partialRecord(PlatformSchema, VersionString),
    /** Newest first. */
    versions: z.array(
      z
        .object({
          version: VersionString,
          platforms: z.array(PlatformSchema),
          publishedAt: z.string().optional(),
        })
        .loose()
    ),
  })
  .loose();

export type SdkVersion = z.infer<typeof SdkVersionSchema>;
export type ModuleManifest = z.infer<typeof ModuleManifestSchema>;
export type ModuleVersion = z.infer<typeof ModuleVersionSchema>;
export type ModuleIndex = z.infer<typeof ModuleIndexSchema>;
export type Curation = z.infer<typeof CurationSchema>;
