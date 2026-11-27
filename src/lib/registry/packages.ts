import { z } from 'zod';

/**
 * SDK versions and modules - the entries that carry documentation.
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

/**
 * What one SDK release declares it needs from the machine building with it.
 *
 * Transcribed from the release's own `package.json` files rather than
 * interpreted: `node` from the root, and the two `vendorDependencies` maps
 * verbatim from `android/package.json` and `iphone/package.json`. Those are the
 * same declarations the tooling checks against - `node-titanium-sdk`'s
 * `lib/android.js` reads `vendorDependencies` to decide whether an installed
 * component is supported, and `titanium-cli`'s `src/cli.js` reads
 * `vendorDependencies.node` to refuse an SDK on the wrong Node - so a page
 * rendered from this says what `ti info` says.
 *
 * Ranges are kept as authored (`>=23.x <=36.x`), not parsed into a min and a
 * max. Reformatting them would be this repository restating someone else's
 * constraint, and the raw string is what the CLI prints beside "Supported:".
 *
 * `vendor` is loose because the key set is the SDK's to change: 12.5.0 and
 * 13.4.1 already disagree on the ranges, and a release adding a component must
 * appear on the page rather than fail validation.
 */
export const ToolchainSchema = z.strictObject({
  schemaVersion: SchemaVersion,
  version: VersionString,
  /** The tree this was read from. Matches the sibling `metadata.json` source. */
  source: z.object({ repo: z.string(), ref: z.string(), commit: z.string() }).loose(),
  /** `vendorDependencies.node` from the release's root `package.json`. */
  node: z.string().optional(),
  /**
   * The version the tree calls itself, from `version` in the root
   * `package.json`.
   *
   * Redundant for a release, where the directory name is the version and this
   * agrees with it. It exists for `main`, whose directory name says only that
   * it is the development tree: the version it will become is knowable, and
   * without it the compatibility page can neither name `main` nor tell whether
   * it is ahead of the newest release. Optional because the releases captured
   * before it was recorded do not carry it, and re-cloning twenty tags to
   * backfill a field only `main` reads would be a poor trade.
   */
  declared: z.string().optional(),
  /**
   * The Titanium CLI range the release requires, as its bundled commands
   * declare it.
   *
   * Read from the `cliVersion` each of `cli/commands/{build,clean,create,
   * project}.js` exports, taking the highest where they disagree. That export
   * is what the CLI enforces before running a command. The `titanium` entry in
   * the SDK's own `package.json` is a development dependency of that
   * repository, not a statement about what the release needs, and is not read.
   */
  cli: z.string().optional(),
  android: z
    .object({
      minSdkVersion: z.string().optional(),
      compileSdkVersion: z.string().optional(),
      vendor: z.record(z.string(), z.string()),
    })
    .strict(),
  ios: z
    .object({
      minIosVersion: z.string().optional(),
      minWatchosVersion: z.string().optional(),
      vendor: z.record(z.string(), z.string()),
    })
    .strict(),
});

export type Toolchain = z.infer<typeof ToolchainSchema>;

/**
 * Every published Titanium CLI release: when it shipped, where its notes are,
 * and the Node it runs on.
 *
 * Captured rather than read at build time, so the site keeps building when the
 * upstreams are unreachable and two builds of one commit produce one page.
 * Refreshed with `pnpm registry:cli`.
 *
 * ## Two upstreams, and which one owns what
 *
 * **GitHub owns the releases.** `tidev/titanium-cli` publishes one release per
 * version with a written body, which is the opposite of the SDK - all 71 SDK
 * release bodies are empty or a link back to this site, which is why those
 * notes are captured into pages here (see `docs/release-notes.md`). The CLI's
 * are worth reading where they are, so `date` and `url` come from GitHub and
 * the site links out to them.
 *
 * **npm owns `engines.node`.** That is a fact about a published package rather
 * than about a release, it is the input to `minimumCli`, and npm carries it for
 * all 191 versions where GitHub has releases for only the most recent 46 -
 * including the 3.x and 5.x the compatibility table still reasons about.
 *
 * So an entry is keyed by version and carries what each upstream knows about
 * it. `date` and `url` are absent on the versions that predate the repository's
 * releases, which is what marks a version as published to npm and nowhere else.
 *
 * Nothing else is kept from either. The packument is megabytes of dist tarball
 * metadata and a GitHub release is mostly actor and asset records; storing
 * either whole would put a moving upstream document under version control.
 */
export const CliReleasesSchema = z.strictObject({
  schemaVersion: SchemaVersion,
  /** When the upstreams were read. Shown on the page, since this one can rot. */
  fetchedAt: z.string(),
  source: z.strictObject({ registry: z.string(), package: z.string(), repo: z.string() }),
  releases: z.array(
    z.strictObject({
      version: z.string(),
      /** `engines.node`, from npm. Absent on early releases that declared none. */
      node: z.string().optional(),
      /**
       * When GitHub published the release. Absent on a version with no GitHub
       * release, which is every version before 3.2.3.
       */
      date: z.string().optional(),
      /**
       * The GitHub release page, which is where the CLI's notes are written.
       * Stored rather than built from the version: the tags are inconsistent -
       * `v9.1.0` on recent releases, a bare `3.4.0` on older ones - so a
       * synthesised URL would 404 on the ones nobody checks.
       */
      url: z.url().optional(),
    })
  ),
});

export type CliReleases = z.infer<typeof CliReleasesSchema>;

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
 * One release. Carries one *or both* platforms - 52 version strings ship on both,
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
    /** Opaque reference. Four tag formats exist across ti.map alone - never pattern-match it. */
    tag: z.string().optional(),
    manifests: z.array(ModuleManifestSchema),
    assets: z.array(ModuleAssetSchema),
    readme: z.string().optional(),
    /** A release may legitimately ship no apidoc; the page renders metadata only. */
    hasApiDocs: z.boolean().default(false),
  })
  .loose();

export const ModuleSourceSchema = z.enum(['tidev', 'community', 'unverified']);

export const ModuleIndexSchema = z
  .object({
    schemaVersion: SchemaVersion,
    /**
     * Canonical key, and the module's only identity.
     *
     * Differs from the repo name for 5 of 16. There is deliberately no separate
     * display name: a module's manifest `name` is a build label nothing reads -
     * the install directory is the moduleid (`modules/android/ti.map/5.7.0`),
     * node-appc keys every lookup on it, and `tiapp.xml` references it. A second
     * identifier could only drift from the one developers actually type.
     */
    moduleId: z.string().min(1),
    description: z.string().optional(),
    repo: z.url().optional(),
    /** Repo name and other spellings that should redirect here. */
    aliases: z.array(z.string()).default([]),
    source: ModuleSourceSchema.default('community'),
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

/**
 * A community module, which is a GitHub repository and nothing more.
 *
 * Strict, unlike the hand-written shapes above: this file is machine-generated
 * from the search API, so an unexpected key is a generator bug rather than
 * something a person added on purpose.
 *
 * Deliberately not `ModuleIndexSchema`. There is no module id, no version list
 * and no manifest here, because none of that can be known without cloning the
 * repo - see `scripts/generate-community-modules.ts`. Giving these the same
 * shape would only make the two look interchangeable at the call site.
 */
export const CommunityModuleSchema = z.strictObject({
  /** `owner/name`. The repository slug is the only stable key these have. */
  id: z.string().min(1),
  name: z.string().min(1),
  owner: z.string().min(1),
  ownerUrl: z.url(),
  url: z.url(),
  description: z.string().optional(),
  platforms: z.array(PlatformSchema).min(1),
  stars: z.number().int().nonnegative(),
  /**
   * Always false, and kept anyway.
   *
   * The generator drops archived repos before they reach this file (TI-23), so
   * nothing here can carry `true`. It stays because the registry API serves
   * this shape and promises not to remove a field, and because it is still the
   * honest answer to "is this repository archived" rather than a placeholder.
   */
  archived: z.boolean(),
  pushedAt: z.string(),
  /**
   * When the generator first saw this repository, as an ISO timestamp.
   *
   * Not something GitHub reports. The generator carries it forward from the
   * previous file and stamps a new slug with the time of the run, which is what
   * lets `/modules/feed.xml` say which listings are new.
   */
  listedAt: z.string(),
});

export const CommunityIndexSchema = z.strictObject({
  $comment: z.string(),
  /** The GitHub searches whose union produced `modules`, one per topic. */
  source: z.strictObject({ queries: z.array(z.string()).min(1), repos: z.number().int().nonnegative() }),
  /** Most starred first. */
  modules: z.array(CommunityModuleSchema),
});

/**
 * The two hand-maintained curation lists (TI-23).
 *
 * Keyed on the `owner/name` slug rather than a module id, because a community
 * module has none: nothing about it is knowable without cloning it, which is
 * the same reason `CommunityModuleSchema` keys that way.
 *
 * Loose where the generated shapes are strict, and for the mirror-image reason.
 * A key nobody parses is a note somebody left on purpose; the generated files
 * are strict because an unexpected key there is a generator bug.
 *
 * These are the curation half of `docs/module-curation.md`. The scrape stays
 * purely what GitHub said, and the two are joined at read time in
 * `communityListings()` - so a regen can never overwrite a judgement, and a
 * judgement never has to be re-applied after one.
 */
const RepoSlug = z.string().regex(/^[\w.-]+\/[\w.-]+$/, 'expected an owner/name slug');

export const VerifiedListSchema = z.object({
  $comment: z.string(),
  /**
   * GitHub usernames whose modules are all vouched for.
   *
   * Vouching per author rather than per repo, for the authors who publish a
   * dozen modules to the same standard: hansemannn alone is 40 of the 106
   * listings, and enumerating those by hand would be a list that goes stale
   * every time he publishes.
   *
   * Applied at read time, so a module that appears in tomorrow's scrape is
   * verified the moment it is listed. That is the difference between this and
   * expanding the authors into `modules` entries during generation, which would
   * snapshot the answer and leave anything newer unverified until someone
   * noticed.
   *
   * Bare usernames, with none of the provenance a `modules` entry carries. The
   * list is short enough to read at a glance and `git log` answers who added a
   * name and when, which is what those fields were for.
   *
   * It is a bet on the author rather than the module, which is a weaker claim
   * than a per-repo entry. Withdrawing it is one deletion, and a single module
   * that should not carry it goes in `blocked.json`.
   */
  owners: z.array(z.string().min(1)).default([]),
  modules: z.array(
    z.object({
      repo: RepoSlug,
      /** Who vouched. A verification with no name behind it cannot be revisited. */
      by: z.string().min(1),
      /** ISO date. How staleness is judged when the policy is re-applied. */
      at: z.string().min(1),
      note: z.string().optional(),
    })
  ),
});

export const BlockedListSchema = z.object({
  $comment: z.string(),
  modules: z.array(
    z.object({
      repo: RepoSlug,
      /** Required: a blocklist whose entries cannot be explained cannot be reviewed. */
      reason: z.string().min(1),
      at: z.string().min(1),
    })
  ),
});

/**
 * Official modules TiDev has stopped supporting (TI-24).
 *
 * A third hand-maintained list, and the only one that removes something. The
 * other two sort the community scrape into tiers; this one takes a module the
 * registry still holds every byte of and keeps it off the site.
 *
 * Keyed on `moduleId` rather than the `owner/name` slug the other two use, for
 * the reason they use a slug: a curated module has a published id that
 * `tiapp.xml` references and the install directory is named after, and a
 * community repository has nothing of the kind. Keying this on a repo name
 * would mean the five modules whose repo and id differ get delisted by a name
 * no developer has ever typed.
 *
 * The removal is the site's, not the registry's. `/registry/v1` keeps serving
 * these because the Titanium CLI resolves against it and an app that already
 * depends on one of these must keep building - see `listedModuleIds()`.
 */
export const UnsupportedListSchema = z.object({
  $comment: z.string(),
  modules: z.array(
    z.object({
      moduleId: z.string().min(1),
      /** Required, as on the blocklist: an entry nobody can explain cannot be revisited. */
      reason: z.string().min(1),
      at: z.string().min(1),
    })
  ),
});

export type SdkVersion = z.infer<typeof SdkVersionSchema>;
export type ModuleManifest = z.infer<typeof ModuleManifestSchema>;
export type ModuleVersion = z.infer<typeof ModuleVersionSchema>;
export type ModuleIndex = z.infer<typeof ModuleIndexSchema>;
export type ModuleSource = z.infer<typeof ModuleSourceSchema>;
export type CommunityModule = z.infer<typeof CommunityModuleSchema>;
export type CommunityIndex = z.infer<typeof CommunityIndexSchema>;
export type VerifiedList = z.infer<typeof VerifiedListSchema>;
export type BlockedList = z.infer<typeof BlockedListSchema>;
export type UnsupportedList = z.infer<typeof UnsupportedListSchema>;
