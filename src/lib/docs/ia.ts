/**
 * The docs information architecture (TI-31).
 *
 * Data, not a component, because three things need the same answer and must not
 * drift: the sidebar, the legacy redirect map (TI-39), and the frontmatter
 * validation that stops a new page landing somewhere undefined.
 *
 * The structure it replaces was a wiki export rather than a design —
 * `/guide/Titanium_SDK/Titanium_SDK_Getting_Started/Installation_and_Configuration/Installing_Platform_SDKs/`
 * is four levels of nesting before any content. The audit found 336 such pages.
 *
 * ## The split
 *
 * Sections are grouped by what a reader is doing, not by which product team
 * owned the page:
 *
 *   - `start` is the only tutorial. One path in, no choices.
 *   - `build`, `alloy`, `native`, `distribute` are how-to: you have a project
 *     and a problem.
 *   - `reference` and `sdk` are lookup. You know the name and want the details.
 *   - `tooling` and `contribute` are neither — they are about working on
 *     Titanium rather than with it, and burying them inside a how-to section
 *     is what made them unfindable before.
 */

export type DocSection = {
  /** The URL segment, and the sidebar's key. */
  slug: string;
  title: string;
  /** One line, shown on the docs landing page. */
  blurb: string;
  /** Diátaxis-ish, and the reason the section exists rather than a label. */
  kind: 'tutorial' | 'how-to' | 'reference' | 'meta';
  /**
   * Legacy paths that land here, matched longest-prefix-first.
   *
   * Kept beside the section rather than in a separate mapping file so that
   * adding a section and deciding what it absorbs is one edit, and so an
   * unclaimed legacy path is a visible hole rather than a silent 404.
   */
  legacy: string[];
};

/**
 * `sdk` is the API reference and `v<major>` is the prose version prefix
 * (TI-59). Neither can be a section slug or a page slug directly under
 * `/docs`, or a guide would shadow the reference.
 */
export const RESERVED_SEGMENTS = ['sdk', 'latest'] as const;

/** Prose versioning is by SDK major: `/docs/v13/<section>/<page>`. */
export const VERSION_SEGMENT = /^v\d+$/;

/**
 * Two segments after `/docs`, and no more.
 *
 * The depth limit is the point of the exercise. Anything that wants a third
 * level is a sign the section is really two sections, or that the page should
 * be one page with headings.
 */
export const MAX_DEPTH = 2;

export const SECTIONS: DocSection[] = [
  {
    slug: 'start',
    title: 'Get started',
    blurb: 'Install the tooling and build your first app.',
    kind: 'tutorial',
    legacy: [
      'Titanium_SDK/Titanium_SDK_Getting_Started',
      'Titanium_SDK/Titanium_SDK_Guide/Welcome_To_Titanium',
    ],
  },
  {
    slug: 'build',
    title: 'Building apps',
    blurb: 'Interfaces, data, media, location, and everything an app does.',
    kind: 'how-to',
    legacy: [
      'Titanium_SDK/Titanium_SDK_How-tos/User_Interface_Fundamentals',
      'Titanium_SDK/Titanium_SDK_How-tos/User_Interface_Deep_Dives',
      'Titanium_SDK/Titanium_SDK_How-tos/Working_with_Local_Data_Sources',
      'Titanium_SDK/Titanium_SDK_How-tos/Working_with_Remote_Data_Sources',
      'Titanium_SDK/Titanium_SDK_How-tos/Working_with_Media_APIs',
      'Titanium_SDK/Titanium_SDK_How-tos/Location_Services',
      'Titanium_SDK/Titanium_SDK_How-tos/Notification_Services',
      'Titanium_SDK/Titanium_SDK_How-tos/Integrating_Web_Content',
      'Titanium_SDK/Titanium_SDK_How-tos/Platform_API_Deep_Dives',
      'Titanium_SDK/Titanium_SDK_How-tos/Cross-Platform_Mobile_Development_In_Titanium',
      'Titanium_SDK/Titanium_SDK_How-tos/WKWebView',
      'Titanium_SDK/Titanium_SDK_Guide/Example_Applications',
      'Titanium_SDK/Titanium_SDK_How-tos/Debugging_and_Profiling',
      'Titanium_SDK/Titanium_SDK_How-tos/Titanium_SDK_Tutorials',
      'Titanium_SDK/Titanium_SDK_How-tos/Titanium_Boilerplates',
      'Titanium_SDK/Titanium_SDK_Guide/Best_Practices_and_Recommendations',
      'Titanium_SDK/Titanium_SDK_Guide/Titanium_and_Angular',
    ],
  },
  {
    slug: 'alloy',
    title: 'Alloy',
    blurb: 'The MVC framework: XML views, styles, models, and data binding.',
    kind: 'how-to',
    legacy: ['Alloy_Framework'],
  },
  {
    slug: 'native',
    title: 'Native code',
    blurb: 'Reach platform APIs Titanium does not wrap — modules and Hyperloop.',
    kind: 'how-to',
    legacy: [
      'Titanium_SDK/Titanium_SDK_How-tos/Extending_Titanium_Mobile',
      'Titanium_SDK/Titanium_SDK_How-tos/Using_Modules',
      'Titanium_SDK/Titanium_SDK_Guide/Hyperloop',
    ],
  },
  {
    slug: 'distribute',
    title: 'Distribution',
    blurb: 'Signing, packaging, and shipping to the App Store and Play.',
    kind: 'how-to',
    legacy: [
      'Titanium_SDK/Titanium_SDK_Guide/Preparing_for_Distribution',
      // A store submission requirement, not a coding topic: it belongs with
      // signing and packaging rather than in the how-to pile it came from.
      'Titanium_SDK/Titanium_SDK_How-tos/Adhere_to_the_iOS17_Privacy_Requirements',
    ],
  },
  {
    slug: 'tooling',
    title: 'Tooling',
    blurb: 'The Titanium CLI and the VS Code extension.',
    kind: 'how-to',
    legacy: [
      'Editor_IDE',
      'Titanium_SDK/Titanium_SDK_How-tos/Transfer_your_app_from_appc_CLI_to_ti_CLI',
      // Webpack is part of the build pipeline you configure, not something you
      // write app code against.
      'Titanium_SDK/Titanium_SDK_How-tos/Webpack_Guide',
    ],
  },
  {
    slug: 'reference',
    title: 'Reference',
    blurb: 'tiapp.xml, CLI commands, and the compatibility matrix.',
    kind: 'reference',
    legacy: [
      'Titanium_SDK/Titanium_SDK_Guide/Appendices',
      'Titanium_SDK/Titanium_SDK_Guide/Titanium_Command-Line_Interface_Reference',
      'Titanium_SDK/Titanium_SDK_FAQ',
    ],
  },
  {
    slug: 'contribute',
    title: 'Contributing',
    blurb: 'Working on Titanium itself: bugs, pull requests, and standards.',
    kind: 'meta',
    legacy: ['Titanium_SDK/Titanium_SDK_Guide/Contributing_to_Titanium'],
  },
];

/**
 * Legacy container pages that were navigation and nothing else.
 *
 * Each was a shell listing its children — the wiki's substitute for a landing
 * page. The new `/docs` index replaces all three, so they resolve there rather
 * than being given a page that would have nothing on it.
 */
export const CONTAINER_INDEXES = [
  'Titanium_SDK',
  'Titanium_SDK/Titanium_SDK_Guide',
  'Titanium_SDK/Titanium_SDK_How-tos',
];

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
