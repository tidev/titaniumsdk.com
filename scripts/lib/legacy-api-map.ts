import { anchorFor } from '../../src/lib/docs/markdown.ts';
import type { ApiType } from '../../src/lib/registry/index.ts';

/**
 * Maps every legacy titanium-docs `/api/*` URL onto the new structure.
 *
 * The old site is VuePress serving a static export, so its live URLs are the
 * file tree with `.html` on the end — `docs/api/titanium/ui/view.md` is
 * `/api/titanium/ui/view.html`, and the extension-less form 404s. That is what
 * search engines indexed, so that is what the `source` patterns look like; the
 * one exception is described on `legacyUrls`.
 *
 * The old tree mixes two corpora that now live apart. `docs/api/titanium/`,
 * `global/` and most of `structs/` are the SDK, which compiles into
 * `registry/sdk/` and renders at `/docs/sdk/<version>/<Type>`. The rest is the
 * native modules, which compile per repo and render at `/modules/<moduleid>`.
 * Nothing in the old path distinguishes them — `structs/coremotionacceleration.md`
 * looks exactly like `structs/font.md` — so the split is decided by whether the
 * compiled SDK corpus contains the type.
 */

/**
 * Destinations are written against `latest` rather than a concrete version.
 *
 * The old URLs carry no version, so there is no version to preserve, and a
 * committed map naming today's release would be wrong the day the next one
 * ships. The caller substitutes a concrete version at build time — see
 * next.config.ts, which must not leave `latest` in a served destination or
 * every one of these becomes a two-hop redirect.
 */
export const LATEST = 'latest';

/**
 * Legacy module namespace to manifest `moduleid`.
 *
 * The old docs namespaced modules by a lowercased display name (`Modules.BLE`
 * lives at `/api/modules/ble.html`) while the registry keys on the `moduleid`
 * from the module's own manifest. The two agree for most modules and diverge
 * for the rest, so the table is read out of the manifests rather than derived:
 * `facebook` carries no vendor prefix at all and urlSession keeps a
 * reverse-DNS id with a capital S.
 *
 * Verified against `<repo>/{android,ios,iphone}/manifest` in each module repo.
 * A namespace missing from this table stops the run rather than guessing, and
 * `unusedNamespaces` catches entries the old tree no longer has.
 */
export const MODULE_IDS: Readonly<Record<string, string>> = {
  applesignin: 'ti.applesignin',
  barcode: 'ti.barcode',
  ble: 'appcelerator.ble',
  bluetooth: 'appcelerator.bluetooth',
  coremotion: 'ti.coremotion',
  crypto: 'ti.crypto',
  encrypteddatabase: 'appcelerator.encrypteddatabase',
  facebook: 'facebook',
  geofence: 'ti.geofence',
  https: 'appcelerator.https',
  identity: 'ti.identity',
  map: 'ti.map',
  nfc: 'ti.nfc',
  playservices: 'ti.playservices',
  urlsession: 'com.appcelerator.urlSession',
  webdialog: 'ti.webdialog',
};

/** One page of the old `docs/api/` tree. */
export type LegacyPage = {
  /** Path below `docs/api/`, e.g. `titanium/ui/view.md`. */
  rel: string;
  /** Canonical type name, taken from the page's `#` heading. */
  name: string;
  /** apidoc source below `apidoc/`, from the `editUrl` front matter. */
  yml: string;
  /** Whether a directory of the same name sits beside it — see `legacyUrls`. */
  section?: boolean;
};

export type Redirect = { source: string; destination: string };

export type RedirectMap = {
  sdk: Redirect[];
  modules: Redirect[];
  /** Sources that land on the reference index because nothing better is known. */
  unresolved: string[];
};

/** Where an inlined pseudo-type ended up: the member that absorbed it. */
export type InlineSite = { owner: string; member: string };

/**
 * The URLs one old page is reachable by.
 *
 * VuePress renders `README.md` as `index.html`, which the static host also
 * serves for the bare directory, so the section index owns two URLs.
 *
 * A page that heads a section gets an extension-less alias as well. The old
 * sidebar links those without `.html` — `/api/titanium/ui`, on every one of the
 * 581 pages — and the static host answers with a 301 to a directory that has no
 * index, so the link is dead today and only crawlers still follow it. Claiming
 * the path costs one rule and turns a 404 into the page the reader wanted.
 */
export function legacyUrls(page: Pick<LegacyPage, 'rel' | 'section'>): string[] {
  const path = page.rel.replace(/\.md$/, '');
  if (path === 'README') return ['/api', '/api/index.html'];
  const urls = [`/api/${path}.html`];
  if (page.section) urls.push(`/api/${path}`);
  return urls;
}

/**
 * Which module each shared apidoc file belongs to.
 *
 * Module-owned pseudo-types were flattened into the SDK's `structs/` directory,
 * losing every trace of their owner except the `editUrl` — and that points at
 * the SDK repo for all of them, so the file name is the only signal. It is
 * enough because the pages that *did* keep their namespace in the path
 * (`modules/<ns>/…` and `structs/modules/<ns>/…`) name the same files, so the
 * association is recovered from the tree instead of being hand-written.
 *
 * A file claimed by two namespaces is dropped: both Apple Sign-In and Facebook
 * ship a `LoginButton.yml`, and a coin flip between them is worse than
 * refusing to guess. Nothing in `structs/` depends on an ambiguous file, so
 * this costs no redirects — `assertAttributed` fails the run if that changes.
 */
export function ymlNamespaces(pages: LegacyPage[]): Map<string, string> {
  const claims = new Map<string, Set<string>>();
  for (const page of pages) {
    const ns = namespaceFromPath(page.rel);
    if (!ns || !page.yml) continue;
    let owners = claims.get(page.yml);
    if (!owners) claims.set(page.yml, (owners = new Set()));
    owners.add(ns);
  }

  const resolved = new Map<string, string>();
  for (const [yml, owners] of claims) {
    if (owners.size === 1) resolved.set(yml, [...owners][0]!);
  }
  return resolved;
}

/** The module namespace a path states outright, if it states one. */
function namespaceFromPath(rel: string): string | null {
  for (const prefix of ['modules/', 'structs/modules/']) {
    if (!rel.startsWith(prefix)) continue;
    return rel.slice(prefix.length).split('/')[0]!.replace(/\.md$/, '');
  }
  return null;
}

/**
 * Where each inlined pseudo-type can be read now.
 *
 * docgen folds a pseudo-type into its referent when exactly one type names it,
 * so it has no page of its own but its fields are still on screen — inside the
 * member whose parameter or return type mentioned it. Redirecting to that
 * member rather than to the top of a page with hundreds of properties is the
 * difference between answering the deep link and merely not 404ing.
 *
 * The single-referent rule is what makes this unambiguous; a type referenced
 * twice would never have been inlined in the first place.
 */
export function inlineSites(types: ApiType[], inlined: Set<string>): Map<string, InlineSite> {
  const sites = new Map<string, InlineSite>();
  for (const type of types) {
    for (const group of ['properties', 'methods', 'events'] as const) {
      for (const member of type[group] ?? []) {
        for (const name of typeRefs(member)) {
          if (inlined.has(name) && !sites.has(name)) {
            sites.set(name, { owner: type.name, member: member.name });
          }
        }
      }
    }
  }
  return sites;
}

/** Every type name mentioned anywhere below a member, at any nesting. */
function typeRefs(node: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(node)) {
    for (const item of node) typeRefs(item, out);
  } else if (node && typeof node === 'object') {
    const record = node as Record<string, unknown>;
    if (record.kind === 'type' && typeof record.name === 'string') out.add(record.name);
    for (const value of Object.values(record)) typeRefs(value, out);
  }
  return out;
}

export type Corpus = {
  /** Types the new site gives a page of their own. */
  types: Set<string>;
  /** Pseudo-types folded into a member, and which member absorbed each. */
  inlined: Map<string, InlineSite>;
};

/**
 * The redirect map, split by destination tree.
 *
 * Kept apart because the two carry different promises: an SDK destination is a
 * page that exists today, a module destination is a path the registry has
 * reserved but has no pages behind it until the module reference ships.
 */
export function buildRedirects(pages: LegacyPage[], corpus: Corpus): RedirectMap {
  const namespaces = ymlNamespaces(pages);
  const sdk: Redirect[] = [];
  const modules: Redirect[] = [];
  const unresolved: string[] = [];

  for (const page of pages) {
    const target = resolve(page, corpus, namespaces);
    for (const source of legacyUrls(page)) {
      if (target.tree === 'modules') modules.push({ source, destination: target.destination });
      else {
        sdk.push({ source, destination: target.destination });
        if (target.weak) unresolved.push(source);
      }
    }
  }

  const bySource = (a: Redirect, b: Redirect) => a.source.localeCompare(b.source);
  return {
    sdk: sdk.sort(bySource),
    modules: modules.sort(bySource),
    unresolved: unresolved.sort(),
  };
}

type Target = { tree: 'sdk' | 'modules'; destination: string; weak?: boolean };

function resolve(page: LegacyPage, corpus: Corpus, namespaces: Map<string, string>): Target {
  const explicit = namespaceFromPath(page.rel);
  if (explicit) return moduleTarget(explicit, page);

  // The section index has no type behind it; the reference index replaces it.
  if (page.rel === 'README.md') return { tree: 'sdk', destination: `/docs/sdk/${LATEST}` };

  if (corpus.types.has(page.name)) {
    return { tree: 'sdk', destination: `/docs/sdk/${LATEST}/${page.name}` };
  }

  const site = corpus.inlined.get(page.name);
  if (site) {
    const anchor = anchorFor(site.member);
    return { tree: 'sdk', destination: `/docs/sdk/${LATEST}/${site.owner}#${anchor}` };
  }

  // Not in the SDK corpus at all: a module type the old build flattened into
  // structs/. Its apidoc file names the owner even though its path does not.
  const inherited = namespaces.get(page.yml);
  if (inherited) return moduleTarget(inherited, page);

  // An inlined type whose referent is itself inlined, so the compiled output
  // never names it and there is no member to point at. The reference index is
  // the honest answer; `unresolved` keeps the list visible.
  return { tree: 'sdk', destination: `/docs/sdk/${LATEST}`, weak: true };
}

function moduleTarget(namespace: string, page: LegacyPage): Target {
  const moduleId = MODULE_IDS[namespace];
  if (!moduleId) {
    throw new Error(`${page.rel}: no moduleid known for legacy namespace "${namespace}"`);
  }
  // Always the bare package path, never a version: the old URLs are
  // version-less and `/modules/<moduleid>` already resolves to latest.
  return { tree: 'modules', destination: `/modules/${moduleId}` };
}

/**
 * Fails the run when a page reaches neither corpus.
 *
 * Silence here would drop a URL from the map without dropping it from the
 * internet, which is the one failure mode this whole file exists to prevent.
 */
export function assertAttributed(pages: LegacyPage[], corpus: Corpus, map: RedirectMap): void {
  const covered = new Set([...map.sdk, ...map.modules].map((r) => r.source));
  const missing = pages.flatMap((p) => legacyUrls(p)).filter((u) => !covered.has(u));
  if (missing.length) {
    throw new Error(`${missing.length} legacy URL(s) produced no redirect: ${missing.join(', ')}`);
  }

  const dangling = map.sdk
    .map((r) => r.destination.replace(`/docs/sdk/${LATEST}`, '').replace(/^\/|#.*$/g, ''))
    .filter((name) => name && !corpus.types.has(name));
  if (dangling.length) {
    throw new Error(
      `destinations name types that do not exist: ${[...new Set(dangling)].join(', ')}`
    );
  }
}

/**
 * Namespaces in `MODULE_IDS` that the old tree never used.
 *
 * The table is only trustworthy while it describes the corpus it is applied to.
 * A missing entry already stops the run in `moduleTarget`; this catches the
 * other direction, where an entry outlives the pages that needed it.
 *
 * The registry is not the reference for this: it will grow modules that never
 * had legacy docs, and those are absences by design rather than drift.
 */
export function unusedNamespaces(pages: LegacyPage[]): string[] {
  const used = new Set(pages.map((p) => namespaceFromPath(p.rel)).filter(Boolean));
  return Object.keys(MODULE_IDS).filter((ns) => !used.has(ns));
}
