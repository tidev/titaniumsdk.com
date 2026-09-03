import { POOL_DIR } from '../../lib/pool.ts';
import { compile, CompileError, type CompileOptions, type CompileResult } from '../compile.ts';
import { resolveSource } from '../sources.ts';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, test } from 'node:test';

/**
 * The guarantees the regen pipeline depends on.
 *
 * The commit step decides by diffing what docgen wrote, so "identical input
 * produces identical bytes" is not a nicety — it is what stops this repo
 * growing with CI runs the way titanium-docs grew to 1.7 GB.
 */

const APIDOC = `
name: Fixture.Base
summary: A base type.
extends: Titanium.Proxy
properties:
  - name: shared
    summary: Present on both platforms.
    type: String
  - name: androidOnly
    summary: Android only.
    type: Number
    platforms: [android]
methods:
  - name: doThing
    summary: Does the thing. See <Fixture.Base.shared>.
    returns:
      type: Boolean
---
name: Fixture.Leaf
summary: An iOS-only descendant.
extends: Fixture.Base
platforms: [iphone, ipad]
---
name: Titanium.Proxy
summary: Root.
`;

let dir: string;
let apidoc: string;
let out: string;

/**
 * `compile()` with a pool of its own beside the output.
 *
 * Documents are content-addressed now, so a run's manifest is the only way back
 * to what it wrote; this keeps the latest one per output directory so the
 * assertions below can still ask for a type by name.
 */
const manifests = new Map<string, NonNullable<CompileResult['contents']>>();
function run(options: Omit<CompileOptions, 'pool'>): CompileResult {
  const result = compile({ ...options, pool: join(options.outDir, POOL_DIR) });
  if (result.contents) manifests.set(options.outDir, result.contents);
  return result;
}

const manifestFor = (d: string) => {
  const contents = manifests.get(d);
  if (!contents) throw new Error(`nothing compiled into ${d}`);
  return contents;
};

const pooled = (d: string, entry: string) =>
  JSON.parse(readFileSync(join(d, POOL_DIR, entry), 'utf8'));

const doc = (d: string, name: string) => pooled(d, manifestFor(d).types[name] ?? '');
const indexIn = (d: string) => pooled(d, manifestFor(d).index);

/**
 * Every document this version names, in manifest order.
 *
 * Hashing the pool directory would be wrong: it is shared, so a blob another
 * version put there would change the answer without this version changing at
 * all.
 */
const hashTree = (d: string) => {
  const h = createHash('sha256');
  const contents = manifestFor(d);
  for (const [name, entry] of Object.entries(contents.types)) {
    h.update(name).update(readFileSync(join(d, POOL_DIR, entry)));
  }
  h.update(readFileSync(join(d, POOL_DIR, contents.index)));
  return h.digest('hex');
};

const read = (name: string) => doc(out, name);

before(() => {
  dir = mkdtempSync(join(tmpdir(), 'docgen-test-'));
  apidoc = join(dir, 'apidoc');
  out = join(dir, 'out');
  writeFileSync(join(dir, 'fixture.yml'), APIDOC);
  // apidoc/ must be a directory of yml files
  mkdirSync(apidoc, { recursive: true });
  renameSync(join(dir, 'fixture.yml'), join(apidoc, 'fixture.yml'));
});

after(() => rmSync(dir, { recursive: true, force: true }));

describe('compile', () => {
  test('two runs over identical input produce identical bytes', () => {
    run({ apidoc, outDir: out });
    const first = hashTree(out);

    const second = run({ apidoc, outDir: out });
    assert.equal(hashTree(out), first, 'output changed on an unchanged re-run');
    assert.equal(second.written.length, 0, 'rewrote files despite no source change');
  });

  test('an unchanged run leaves generatedAt alone', () => {
    const manifestPath = join(out, 'docgen-manifest.json');
    const before = JSON.parse(readFileSync(manifestPath, 'utf8')).generatedAt;
    run({ apidoc, outDir: out });
    const after = JSON.parse(readFileSync(manifestPath, 'utf8')).generatedAt;
    assert.equal(after, before, 'a no-op run moved the timestamp, which would commit a diff');
  });

  test('a member unreachable on the inheriting type is dropped', () => {
    const leaf = read('Fixture.Leaf');
    const names = leaf.inherited.properties.map((p: { name: string }) => p.name);
    assert.ok(names.includes('shared'), 'lost a reachable inherited member');
    assert.ok(
      !names.includes('androidOnly'),
      'an Android-only property surfaced on an iOS-only type'
    );
  });

  test('inherited members are references carrying narrowed platforms', () => {
    const leaf = read('Fixture.Leaf');
    const base = read('Fixture.Base');
    const ref = leaf.inherited.properties.find((p: { name: string }) => p.name === 'shared');

    assert.equal(ref.from, 'Fixture.Base');
    assert.deepEqual(ref.platforms, ['iphone', 'ipad'], 'reference kept the ancestor platforms');
    assert.deepEqual(
      base.properties.find((p: { name: string }) => p.name === 'shared').platforms,
      ['android', 'iphone', 'ipad', 'macos'],
      'the declaring type should keep its own wider platforms'
    );
    assert.equal(leaf.properties.length, 0, 'inherited members leaked into own members');
  });

  test('cross-references resolve to api: links', () => {
    const base = read('Fixture.Base');
    const method = base.methods.find((m: { name: string }) => m.name === 'doThing');
    assert.match(method.summary, /\[Fixture\.Base\.shared\]\(api:Fixture\.Base#shared\)/);
  });

  test('a source change rewrites only what it affects', () => {
    writeFileSync(
      join(apidoc, 'fixture.yml'),
      APIDOC.replace('A base type.', 'An edited base type.')
    );
    const result = run({ apidoc, outDir: out });
    // Type names, plus index.json which is regenerated whenever anything is.
    assert.deepEqual(result.written, ['Fixture.Base', 'index.json']);
    assert.equal(result.unchanged.length, 2, 'Fixture.Leaf and Titanium.Proxy should be untouched');
  });
});

/**
 * Cross-repo resolution, compiled the way CI does it: one repo, then another
 * against the first one's emitted index. Going through the index rather than a
 * hand-built corpus is the point — it is the only thing a module's compile has,
 * and if it stopped carrying member names this would be the test that noticed.
 */
const SDK_APIDOC = `
name: Titanium.UI
summary: The UI namespace.
properties:
  - name: ANIMATION_CURVE_LINEAR
    summary: A constant.
    type: Number
---
name: Titanium.UI.View
summary: A view.
extends: Titanium.Proxy
properties:
  - name: backgroundColor
    summary: The background.
    type: String
---
name: Titanium.Proxy
summary: Root.
properties:
  - name: apiName
    summary: The name.
    type: String
`;

const MODULE_APIDOC = `
name: Modules.Fixture.View
summary: A view, see <Titanium.UI.View>.
description: Curves are [linear](Titanium.UI.ANIMATION_CURVE_LINEAR) by default.
extends: Titanium.UI.View
properties:
  - name: tint
    summary: Like <Titanium.UI.View.backgroundColor>, but for this.
    type: Titanium.UI.View
`;

describe('cross-repo references', () => {
  let root: string;
  let sdkOut: string;
  let moduleApidoc: string;

  /** What a module compile is handed: the SDK's compiled index, at a stated version. */
  const external = () => ({ repo: 'tidev/titanium-sdk', version: 'main', index: sdkIndex() });
  const sdkIndex = () => join(sdkOut, POOL_DIR, manifestFor(sdkOut).index);

  const write = (dir: string, body: string) => {
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'fixture.yml'), body);
  };

  before(() => {
    root = mkdtempSync(join(tmpdir(), 'docgen-xrepo-'));
    sdkOut = join(root, 'sdk');
    moduleApidoc = join(root, 'module-apidoc');
    write(join(root, 'sdk-apidoc'), SDK_APIDOC);
    write(moduleApidoc, MODULE_APIDOC);
    run({ apidoc: join(root, 'sdk-apidoc'), outDir: sdkOut });
  });

  after(() => rmSync(root, { recursive: true, force: true }));

  test('the index carries every member name, including inherited ones', () => {
    const index = indexIn(sdkOut);
    const view = index.types.find((t: { name: string }) => t.name === 'Titanium.UI.View');
    assert.deepEqual(view.members, ['apiName', 'backgroundColor']);
  });

  test('a reference into the SDK resolves to an api: link', () => {
    const out = join(root, 'module');
    run({ apidoc: moduleApidoc, outDir: out, external: external() });
    const type = doc(out, 'Modules.Fixture.View');

    assert.match(type.summary, /\[Titanium\.UI\.View\]\(api:Titanium\.UI\.View\)/);
    // A member anchor, which is only checkable because the index lists names.
    assert.match(type.description, /\(api:Titanium\.UI#ANIMATION_CURVE_LINEAR\)/);
    assert.match(type.properties[0].summary, /\(api:Titanium\.UI\.View#backgroundColor\)/);
    // Signatures too: an unresolved type would have been left `kind: unknown`.
    assert.deepEqual(type.properties[0].type, [{ kind: 'type', name: 'Titanium.UI.View' }]);
    // Recorded apart from `references`, since nothing here emits a file for them.
    assert.deepEqual(type.externalReferences, ['Titanium.UI', 'Titanium.UI.View']);
    assert.equal(type.references, undefined);
  });

  test('a reference to an SDK type or member that does not exist fails the compile', () => {
    // A missing type and a missing member on a type that does exist: the second
    // is the one an index of counts could not have caught.
    for (const [n, bad] of ['<Titanium.UI.Nope>', '<Titanium.UI.nope>'].entries()) {
      const apidoc = join(root, `bad-${n}-apidoc`);
      write(apidoc, MODULE_APIDOC.replace('<Titanium.UI.View>', bad));
      assert.throws(
        () => run({ apidoc, outDir: join(root, `bad-${n}`), external: external() }),
        (err: Error) =>
          err instanceof CompileError && err.message.includes(`unresolved reference ${bad}`),
        `${bad} should have failed the compile`
      );
    }
  });

  test('without an SDK to resolve against, the same references pass silently', () => {
    // Why these went unnoticed for so long: `Titanium` is not a root of a
    // module-only corpus, so nothing there tells a dead reference from prose.
    const apidoc = join(root, 'alone-apidoc');
    write(apidoc, MODULE_APIDOC.replace('<Titanium.UI.View>', '<Titanium.UI.Nope>'));
    const out = join(root, 'alone');
    run({ apidoc, outDir: out });
    const type = doc(out, 'Modules.Fixture.View');
    assert.match(type.summary, /<Titanium\.UI\.Nope>/, 'left as literal text, as before TI-61');
  });

  test('a changed SDK invalidates everything compiled against it', () => {
    const apidoc = join(root, 'moving-sdk-apidoc');
    const sdk = join(root, 'moving-sdk');
    write(apidoc, SDK_APIDOC);
    run({ apidoc, outDir: sdk });
    const at = () => ({
      repo: 'tidev/titanium-sdk',
      version: 'main',
      index: join(sdk, POOL_DIR, manifestFor(sdk).index),
    });

    const out = join(root, 'invalidation');
    run({ apidoc: moduleApidoc, outDir: out, external: at() });
    assert.equal(
      run({ apidoc: moduleApidoc, outDir: out, external: at() }).plan.reason,
      'incremental',
      'an unchanged corpus should not force a rebuild'
    );

    // This module links to none of it, but the corpus its links were checked
    // against is a different one now, and only a rebuild re-runs that check.
    write(apidoc, `${SDK_APIDOC}---\nname: Titanium.UI.Label\nsummary: Added later.\n`);
    run({ apidoc, outDir: sdk });
    assert.equal(
      run({ apidoc: moduleApidoc, outDir: out, external: at() }).plan.reason,
      'external-changed'
    );
  });
});

describe('sources', () => {
  test('rejects a repo that is not on the allowlist', () => {
    assert.throws(() => resolveSource('attacker/repo'), /not an allowed source/);
  });

  test('resolves the SDK', () => {
    assert.equal(resolveSource('tidev/titanium-sdk').kind, 'sdk');
  });
});
