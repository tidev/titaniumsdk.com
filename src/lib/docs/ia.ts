/**
 * The docs information architecture.
 *
 * Data, not a component, because four things need the same answer and must not
 * drift: the sidebar, the routes, the frontmatter validation that stops a page
 * landing somewhere undefined, and the legacy redirect map (TI-39).
 *
 * ## Where this structure came from
 *
 * Designed with Chris on 2026-09-04 and recorded in the project document "Docs
 * information architecture (approved)". It replaces the section list this file
 * carried for TI-31, which was derived from the legacy corpus.
 *
 * That derivation was the mistake. The old site is three silos — Titanium SDK,
 * Alloy, Editor/IDE — each with its own getting-started path and its own FAQ,
 * and a structure inferred from it inherits the silos. The approved tree starts
 * from what a reader does instead: arrive, get a machine working, build
 * something, ship it. Pages earn a place in it or are dropped.
 *
 * ## The rules it encodes
 *
 * Sections are named for activities, not products. Alloy is the single
 * exception — choosing it is a real decision a project makes rather than a
 * stage it passes through.
 *
 * Using and writing are different sections. `build/modules` is how to consume
 * one; `extend/modules` is how to author one. That split is why Hyperloop sits
 * under `extend`: reaching native APIs without writing a module addresses the
 * reader extending the platform, not the one learning to lay out a view.
 *
 * There is no catch-all. No "how-to", no "guides", no "advanced". Every page
 * sits under a capability, so nothing has an obvious place to be dumped — which
 * is precisely how the legacy `Titanium_SDK_How-tos` tree grew to 38 pages.
 */

export type DocPage = {
  /** The URL segment within its parent. */
  slug: string;
  title: string;
  /** One line for the section index. Absent where the title says enough. */
  blurb?: string;
  /**
   * Platforms this page applies to, when it is not all of them.
   *
   * Load-bearing for setup: iOS development requires macOS, so the Windows and
   * Linux pages cover Android only. The pipeline renders that as a stated
   * limitation rather than leaving the reader to notice an absence.
   */
  platforms?: readonly ('macos' | 'windows' | 'linux' | 'ios' | 'android')[];
  /** The third and final level. Only `build/ui` and `build/data` use it. */
  pages?: DocPage[];
};

export type DocSection = {
  slug: string;
  title: string;
  /** One line, shown on the docs landing page. */
  blurb: string;
  /** Diátaxis-ish, and the reason the section exists rather than a label. */
  kind: 'tutorial' | 'how-to' | 'reference';
  pages: DocPage[];
  /**
   * Legacy path prefixes that redirect into this section, longest-prefix-first.
   *
   * These do **not** shape the structure — that is the whole point of the
   * redesign. They exist so TI-39 can send an indexed legacy URL somewhere
   * truthful instead of a 404. A legacy tree with no successor matches nothing
   * here and lands on the docs index, which is the honest answer.
   */
  legacy: string[];
};

/**
 * Top-level space that is not a guide section and never can be.
 *
 * `sdk` is the API reference and `latest` its alias; `v<major>` is the prose
 * version prefix (TI-59). A section named for any of these would shadow it, and
 * the failure would look like a missing type page rather than a naming clash.
 */
export const RESERVED_ROOTS = ['sdk', 'latest'] as const;

/** Prose versioning is by SDK major: `/docs/v13/<section>/<page>`. */
export const VERSION_SEGMENT = /^v\d+$/;

/**
 * Three segments after `/docs`, and no more.
 *
 * Raised from two once `build` earned a third level: `ui` and `data` are large
 * enough to group, and flattening them would put a dozen sibling pages under
 * `build` with no ordering signal. Nothing else uses it, and the ceiling is
 * enforced rather than advisory — depth creep is what produced
 * `/guide/Titanium_SDK/Titanium_SDK_Getting_Started/Installation_and_Configuration/Installing_Platform_SDKs/`.
 */
export const MAX_DEPTH = 3;

export const SECTIONS: DocSection[] = [
  {
    slug: 'setup',
    title: 'Environment Setup',
    blurb: 'Get a machine ready to build, on your operating system.',
    kind: 'tutorial',
    pages: [
      {
        slug: 'prerequisites',
        title: 'Prerequisites',
        blurb: 'Node.js and the JDK, before anything Titanium-specific.',
      },
      {
        slug: 'macos',
        title: 'macOS',
        blurb: 'Titanium CLI and SDK, Xcode, the Android SDK, and signing identities.',
        platforms: ['macos', 'ios', 'android'],
      },
      {
        slug: 'windows',
        title: 'Windows',
        blurb: 'Titanium CLI and SDK, and the Android SDK.',
        platforms: ['windows', 'android'],
      },
      {
        slug: 'linux',
        title: 'Linux',
        blurb: 'Titanium CLI and SDK, and the Android SDK.',
        platforms: ['linux', 'android'],
      },
      {
        slug: 'editors',
        title: 'Editors & IDEs',
        blurb: 'The VS Code extension, and what else works.',
      },
    ],
    legacy: [
      'Titanium_SDK/Titanium_SDK_Getting_Started/Prerequisites',
      'Titanium_SDK/Titanium_SDK_Getting_Started/Installation_and_Configuration',
      'Editor_IDE',
    ],
  },
  {
    slug: 'build',
    title: 'Building Apps',
    blurb: 'Everything between a new project and a working app.',
    kind: 'how-to',
    pages: [
      { slug: 'first-app', title: 'Your first app' },
      {
        slug: 'project-structure',
        title: 'Project structure',
        blurb: 'The directory tour, and what each file is for.',
      },
      {
        slug: 'ui',
        title: 'User interface',
        pages: [
          { slug: 'layout', title: 'Layout & positioning' },
          { slug: 'lists', title: 'Lists & tables' },
          {
            slug: 'icons-and-launch-screens',
            title: 'Icons & launch screens',
            blurb: 'Sizes and formats, per platform.',
          },
          {
            slug: 'platform-conventions',
            title: 'Platform conventions',
            blurb: 'Where iOS and Android genuinely differ.',
          },
        ],
      },
      {
        slug: 'data',
        title: 'Working with data',
        blurb: 'Files, databases, and properties.',
        pages: [{ slug: 'networking', title: 'Networking & remote data' }],
      },
      { slug: 'media', title: 'Media', blurb: 'Camera, photos, audio, and video.' },
      { slug: 'location', title: 'Location & maps' },
      { slug: 'notifications', title: 'Notifications', blurb: 'Local and push.' },
      {
        slug: 'modules',
        title: 'Using modules',
        blurb: 'Finding and adding them. Writing them is under Extending Titanium.',
      },
      { slug: 'debugging', title: 'Debugging & profiling' },
    ],
    legacy: [
      'Titanium_SDK/Titanium_SDK_Getting_Started',
      'Titanium_SDK/Titanium_SDK_How-tos',
      'Titanium_SDK/Titanium_SDK_Guide/Example_Applications',
      'Titanium_SDK/Titanium_SDK_Guide/Best_Practices_and_Recommendations',
    ],
  },
  {
    slug: 'alloy',
    title: 'Alloy',
    blurb: 'The MVC framework: XML views, styles, models, and data binding.',
    kind: 'how-to',
    pages: [
      { slug: 'views', title: 'Views' },
      { slug: 'styles', title: 'Styles & themes' },
      { slug: 'controllers', title: 'Controllers' },
      { slug: 'models', title: 'Models & collections' },
      { slug: 'widgets', title: 'Widgets' },
      { slug: 'config', title: 'Configuration', blurb: 'config.json and build targets.' },
    ],
    legacy: ['Alloy_Framework'],
  },
  {
    slug: 'distribute',
    title: 'Distributing Apps',
    blurb: 'From a working build to a store listing.',
    kind: 'how-to',
    pages: [
      {
        slug: 'signing',
        title: 'Certificates & provisioning',
        blurb: 'Distribution identities. Development signing is under Environment Setup.',
      },
      { slug: 'ios', title: 'App Store', platforms: ['ios'] },
      { slug: 'android', title: 'Google Play', platforms: ['android'] },
      { slug: 'encryption', title: 'Source code encryption' },
    ],
    legacy: [
      'Titanium_SDK/Titanium_SDK_Guide/Preparing_for_Distribution',
      'Titanium_SDK/Titanium_SDK_How-tos/Adhere_to_the_iOS17_Privacy_Requirements',
    ],
  },
  {
    slug: 'reference',
    title: 'Reference',
    blurb: 'Look-up material: the CLI, tiapp.xml, and compatibility.',
    kind: 'reference',
    pages: [
      { slug: 'cli', title: 'CLI commands' },
      { slug: 'config', title: 'CLI configuration' },
      { slug: 'tiapp-xml', title: 'tiapp.xml' },
      {
        slug: 'compatibility',
        title: 'Compatibility',
        blurb: 'Toolchain versions, and platform support generated from the registry.',
      },
    ],
    legacy: [
      'Titanium_SDK/Titanium_SDK_Guide/Appendices',
      'Titanium_SDK/Titanium_SDK_Guide/Titanium_Command-Line_Interface_Reference',
    ],
  },
  {
    slug: 'extend',
    title: 'Extending Titanium',
    blurb: 'Writing the pieces rather than using them.',
    kind: 'how-to',
    pages: [
      { slug: 'modules', title: 'Native modules', blurb: 'For iOS and Android.' },
      {
        slug: 'hyperloop',
        title: 'Hyperloop',
        blurb: 'Native APIs without writing a module.',
      },
      { slug: 'cli-plugins', title: 'CLI plugins' },
      { slug: 'npm', title: 'npm packages' },
    ],
    legacy: [
      'Titanium_SDK/Titanium_SDK_How-tos/Extending_Titanium_Mobile',
      'Titanium_SDK/Titanium_SDK_Guide/Hyperloop',
    ],
  },
];

/**
 * Legacy container pages that were navigation and nothing else.
 *
 * Each was a shell listing its children — the wiki's substitute for a landing
 * page. The `/docs` index replaces them, so they resolve there rather than
 * being given a page that would have nothing on it.
 *
 * `Titanium_SDK_How-tos` used to be on this list and no longer is: `build`
 * claims that prefix, and `/docs/build` is a truthful destination for it in a
 * way that the generic landing page is not.
 */
export const CONTAINER_INDEXES = ['Titanium_SDK', 'Titanium_SDK/Titanium_SDK_Guide'];

/**
 * Everything a page slug directly under `/docs` may not be: the reserved roots,
 * plus every section slug.
 *
 * Derived rather than listed, so adding a section reserves its name in the same
 * edit. A hand-maintained copy would drift, and the drift would surface as a
 * page silently shadowing a section.
 */
export const reservedSegments = (): string[] => [...RESERVED_ROOTS, ...SECTIONS.map((s) => s.slug)];

/** Every section, page and sub-page as a `/docs`-rooted path. */
export function allPaths(): string[] {
  const out: string[] = ['/docs'];
  for (const section of SECTIONS) {
    out.push(`/docs/${section.slug}`);
    for (const page of section.pages) {
      out.push(`/docs/${section.slug}/${page.slug}`);
      for (const child of page.pages ?? []) {
        out.push(`/docs/${section.slug}/${page.slug}/${child.slug}`);
      }
    }
  }
  return out;
}

/** Looks up a page by its `/docs`-relative segments. */
export function findPage(segments: string[]): { section: DocSection; page?: DocPage } | undefined {
  const [sectionSlug, pageSlug, childSlug] = segments;
  const section = SECTIONS.find((s) => s.slug === sectionSlug);
  if (!section) return undefined;
  if (!pageSlug) return { section };

  const page = section.pages.find((p) => p.slug === pageSlug);
  if (!page) return undefined;
  if (!childSlug) return { section, page };

  const child = page.pages?.find((c) => c.slug === childSlug);
  return child ? { section, page: child } : undefined;
}

/** The section a legacy path belongs to, by longest matching prefix. */
export function sectionForLegacy(path: string): DocSection | undefined {
  // Prefixes are written without the extension, so a page and the directory of
  // the same name match the same rule.
  const bare = path.replace(/\.md$/i, '');
  let best: DocSection | undefined;
  let bestLength = -1;
  for (const section of SECTIONS) {
    for (const prefix of section.legacy) {
      if ((bare === prefix || bare.startsWith(`${prefix}/`)) && prefix.length > bestLength) {
        best = section;
        bestLength = prefix.length;
      }
    }
  }
  return best;
}

/**
 * `Installing_the_Android_SDK.md` becomes `installing-the-android-sdk`.
 *
 * The old names were wiki page titles, so they carry underscores, mixed case
 * and the occasional stray punctuation. Everything outside `[a-z0-9]` collapses
 * to a single hyphen.
 *
 * Case boundaries are deliberately *not* word boundaries. These names already
 * delimit with underscores, so splitting on caps only mangles the proper nouns:
 * `WKWebView` is one word Apple chose, and `wkwebview` is what someone would
 * type looking for it, not `wk-web-view`.
 */
export function slugify(name: string): string {
  return name
    .replace(/\.md$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const isValidSlug = (slug: string): boolean => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);

/** A remainder starting with one of these is a fragment, not a page name. */
const STOPWORDS = new Set(['and', 'or', 'the', 'a', 'an', 'for', 'with', 'to', 'in', 'of']);

/**
 * Drops a prefix the URL already says.
 *
 * `/docs/alloy/alloy-models` repeats itself; the section is right there in the
 * path. Same for the product name, which every one of these pages was free to
 * put in its title because the wiki had no hierarchy to say it instead.
 *
 * Conservative on purpose. `Titanium_and_Angular` must not become `and-angular`,
 * so a prefix is only dropped when what remains still reads as a name — hence
 * the stopword guard, and hence `titanium-sdk-` rather than a bare `titanium-`.
 */
export function trimRedundantPrefix(slug: string, section: string): string {
  for (const prefix of [`${section}-`, 'titanium-sdk-']) {
    if (!slug.startsWith(prefix)) continue;
    const rest = slug.slice(prefix.length);
    if (!rest || STOPWORDS.has(rest.split('-')[0])) continue;
    return rest;
  }
  return slug;
}
