/**
 * Where registry files live. One definition so the generator, the sweep, and
 * the validator cannot drift apart on layout.
 */

/** Permanent, documented SDK releases. */
export const RELEASES_DIR = 'registry/sdk';

/** Ephemeral CI builds, per branch. These expire after 90 days. */
export const BUILDS_DIR = 'registry/builds';

/**
 * Published modules, one directory per manifest `moduleid`.
 *
 * Keyed on the module id rather than the repository name because the two differ
 * for 5 of the 16 repos — tidev/titanium-identity publishes `ti.identity` — and
 * the id is what an app's tiapp.xml names.
 */
export const MODULES_DIR = 'registry/modules';

export const moduleDir = (moduleId: string) => `${MODULES_DIR}/${moduleId}`;
export const moduleVersionDir = (moduleId: string, version: string) =>
  `${MODULES_DIR}/${moduleId}/${version}`;

/**
 * Runs whose artifacts no longer exist.
 *
 * Not build data — a negative-result cache, so a regen skips re-fetching
 * artifact metadata for runs it already knows are dead. Both the directory
 * and the `.pruned.json` suffix say so, because an editor tab shows only the
 * filename.
 */
export const PRUNED_DIR = `${BUILDS_DIR}/pruned`;

export const branchFile = (branch: string) => `${BUILDS_DIR}/${branch}.json`;
export const prunedFile = (branch: string) => `${PRUNED_DIR}/${branch}.pruned.json`;

export type Asset = { os: string; size: number; url: string };

export type Build = {
  name: string;
  version: string;
  date: string;
  /** Present on CI builds, absent on releases. */
  expires?: string | null;
  url: string;
  assets: Asset[];
};

/** A tombstone: enough to recognise the run again, nothing more. */
export type PrunedRun = { id: number; html_url: string };

/**
 * Compiled API reference, one directory per SDK version.
 *
 * Sits beside the release channel files rather than in a tree of its own, so an
 * SDK version directory has the same shape as a module version directory:
 * metadata.json plus a contents.json naming what it carries.
 */
export const API_DOCS_DIR = 'registry/sdk';
export const apiDocsDir = (version: string) => `${API_DOCS_DIR}/${version}`;
