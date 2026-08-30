import type { ModuleAssetSchema, Platform } from '../registry/index.ts';
import type { z } from 'zod';

/**
 * What it actually takes to install a module today.
 *
 * There is no `ti module install`. The CLI command is TI-56 and is not built,
 * so nothing here describes one: a module is installed by unpacking the release
 * archive at the project root and naming it in `tiapp.xml`, and that is what
 * these pages show.
 *
 * Two details are load-bearing and both were checked against real archives
 * rather than assumed. The archive's own root is `modules/<slot>/<moduleid>/
 * <version>/`, so it unpacks into place from the project root with no `-d` and
 * no moving files afterwards. And `<slot>` is the packager's platform name,
 * which is `iphone` for iOS — in the path inside the zip, in the asset
 * filename, and in the `platform` attribute in `tiapp.xml`. `ios` appears in
 * none of the three.
 */

export type ModuleAsset = z.infer<typeof ModuleAssetSchema>;

/**
 * The packager's name for each platform.
 *
 * Deliberately not the registry's `ios`. The registry normalises what a release
 * shipped for; this is what the build tooling reads off disk, and eleven years
 * of archives spell it `iphone`.
 */
const SLOT: Record<Platform, string> = { android: 'android', ios: 'iphone' };

export type InstallTarget = {
  platform: Platform;
  version: string;
  /** Where the archive unpacks, relative to the project root. */
  path: string;
  asset?: ModuleAsset;
};

/** One archive to download. A universal zip serves both platforms from one file. */
export type InstallArchive = {
  filename: string;
  url: string;
  size?: number;
  platforms: Platform[];
};

export type InstallPlan = {
  targets: InstallTarget[];
  archives: InstallArchive[];
  /** The `tiapp.xml` block, ready to paste. */
  tiapp: string;
};

export type InstallRelease = { platform: Platform; version: string; asset?: ModuleAsset };

export function installPlan(moduleId: string, releases: InstallRelease[]): InstallPlan {
  const targets: InstallTarget[] = releases.map(({ platform, version, asset }) => ({
    platform,
    version,
    path: `modules/${SLOT[platform]}/${moduleId}/${version}`,
    asset,
  }));

  // 20 releases attach a single `-titanium-` archive that carries both
  // platforms. Keying on the URL rather than the platform stops the page
  // telling you to download the same file twice.
  const archives = new Map<string, InstallArchive>();
  for (const target of targets) {
    if (!target.asset) continue;
    const seen = archives.get(target.asset.url);
    if (seen) seen.platforms.push(target.platform);
    else {
      archives.set(target.asset.url, {
        filename: target.asset.filename,
        url: target.asset.url,
        size: target.asset.size,
        platforms: [target.platform],
      });
    }
  }

  const entries = targets
    .map(
      (t) => `  <module platform="${SLOT[t.platform]}" version="${t.version}">${moduleId}</module>`
    )
    .join('\n');

  return {
    targets,
    archives: [...archives.values()],
    tiapp: `<modules>\n${entries}\n</modules>`,
  };
}

/** Bytes as the release page shows them: whole KB below a megabyte, one decimal above. */
export function formatSize(bytes: number | undefined): string | null {
  if (bytes === undefined) return null;
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  return kb < 1024 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}
