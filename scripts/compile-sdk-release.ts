import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Compiles one published SDK release into `registry/sdk/<version>/`.
 *
 * The reference defaulted to `main` — the mutable tree compiled from the SDK's
 * development branch — because no release had ever been compiled, and
 * `latestSdkVersion()` falls back to `main` when it finds nothing else. Running
 * this for a release is what makes `/docs/sdk/latest` point at shipped code.
 *
 * Deliberately not part of the build or of CI. A published version is written
 * once and then frozen, so compiling one is a decision someone makes, not
 * something that happens on a schedule.
 *
 *   node scripts/compile-sdk-release.ts 13.4.1
 *
 * ## Why this applies a patch
 *
 * Every GA tag from 13.2.0 to 13.4.1 carries a YAML syntax error in
 * `Geolocation.yml`: a flow sequence continued on the next line at the same
 * indent as its own key, which YAML rejects. The document fails to parse,
 * `Titanium.Geolocation` never compiles, and thirteen references to it dangle —
 * so docgen refuses to publish the tree, which is the right call.
 *
 * Upstream fixed it in `d362f355` on 2026-08-26, the day after 13.4.1 shipped,
 * and did not backport it. Tags are immutable, so that source will always be
 * broken; `main` and `next` already carry the fix, so 14.0.0 will not need this.
 *
 * The patches below are that upstream commit and nothing else. Each is
 * whitespace, changes no content, and is verified to match before it is applied
 * — a patch that no longer applies is an error rather than a silent no-op, so
 * this cannot quietly diverge from the tag it claims to compile.
 */

type Patch = {
  file: string;
  /** The upstream commit this reproduces, so the change is auditable. */
  upstream: string;
  why: string;
  find: string;
  replace: string;
};

/** Applied to any tag that still needs them; skipped where upstream already fixed it. */
const PATCHES: Patch[] = [
  {
    file: 'apidoc/Titanium/Geolocation/Geolocation.yml',
    upstream: 'tidev/titanium-sdk@d362f355',
    why: 'flow sequence continued at the same indent as its key, so the document does not parse',
    find: '\n    Titanium.Geolocation.ACCURACY_HUNDRED_METERS,',
    replace: '\n        Titanium.Geolocation.ACCURACY_HUNDRED_METERS,',
  },
];

const versions = process.argv.slice(2);
if (!versions.length) {
  console.error('usage: node scripts/compile-sdk-release.ts <version>...   e.g. 13.4.1 13.4.0');
  process.exit(1);
}

const root = join(import.meta.dirname, '..');

/** The tag is whatever the release registry says it is, never reconstructed. */
const releases = JSON.parse(readFileSync(join(root, 'registry/sdk/ga.json'), 'utf8')) as {
  version: string;
  name: string;
  url: string;
}[];

const run = (cmd: string, args: string[], cwd?: string) =>
  execFileSync(cmd, args, { cwd, stdio: 'inherit' });

function compile(version: string): 'compiled' | 'skipped' {
  if (existsSync(join(root, 'registry/sdk', version))) {
    console.log(`${version}: already compiled, skipped — published versions are frozen`);
    return 'skipped';
  }

  const release = releases.find((r) => r.version === version);
  if (!release) throw new Error(`${version} is not in registry/sdk/ga.json`);
  const tag = release.url.split('/').pop();
  if (!tag) throw new Error(`cannot read a tag out of ${release.url}`);

  const checkout = mkdtempSync(join(tmpdir(), 'sdk-release-'));
  try {
    console.log(`${release.name} -> tag ${tag}`);

    // Same shape as the CI checkout: blobless, shallow, and only the paths the
    // compile reads. The SDK is far too large to clone whole for 238 YAML files.
    run('git', [
      '-c',
      'advice.detachedHead=false',
      'clone',
      '--quiet',
      '--depth',
      '1',
      '--branch',
      tag,
      '--filter=blob:none',
      '--sparse',
      'https://github.com/tidev/titanium-sdk.git',
      checkout,
    ]);
    run(
      'git',
      [
        'sparse-checkout',
        'set',
        '--no-cone',
        'apidoc',
        'android/manifest',
        'ios/manifest',
        'manifest',
      ],
      checkout
    );

    for (const patch of PATCHES) {
      const path = join(checkout, patch.file);
      if (!existsSync(path)) {
        console.error(`patch target missing: ${patch.file}`);
        process.exit(1);
      }
      const before = readFileSync(path, 'utf8');
      if (before.includes(patch.replace)) {
        console.log(`  ${patch.file}: already fixed upstream at this tag, skipped`);
        continue;
      }
      if (!before.includes(patch.find)) {
        console.error(
          `  ${patch.file}: neither the broken nor the fixed form is present.\n` +
            '  The source changed shape; re-check the patch rather than compiling something unverified.'
        );
        process.exit(1);
      }
      writeFileSync(path, before.replace(patch.find, patch.replace));
      console.log(`  patched ${patch.file} (${patch.upstream}) — ${patch.why}`);
    }

    run('node', [
      join(root, 'scripts/docgen/regen.ts'),
      '--repo',
      'tidev/titanium-sdk',
      '--checkout',
      checkout,
      '--version',
      version,
    ]);
    return 'compiled';
  } finally {
    rmSync(checkout, { recursive: true, force: true });
  }
}

const failed: { version: string; why: string }[] = [];
let compiled = 0;
let skipped = 0;

for (const version of versions) {
  try {
    if (compile(version) === 'compiled') compiled++;
    else skipped++;
  } catch (err) {
    // One bad release must not abandon the rest — the summary says which.
    const why = (err as Error).message.split('\n')[0];
    console.error(`\n${version}: FAILED — ${why}\n`);
    failed.push({ version, why });
  }
}

console.log(`\n${compiled} compiled, ${skipped} already present, ${failed.length} failed`);
for (const f of failed) console.log(`  ${f.version}: ${f.why}`);
if (failed.length) process.exit(1);
