import { compile } from '../compile.ts';
import { resolveSource } from '../sources.ts';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
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

const hashTree = (d: string) => {
  const h = createHash('sha256');
  for (const f of readdirSync(join(d, 'types')).sort()) {
    h.update(f).update(readFileSync(join(d, 'types', f)));
  }
  h.update(readFileSync(join(d, 'index.json')));
  return h.digest('hex');
};

const read = (name: string) => JSON.parse(readFileSync(join(out, 'types', `${name}.json`), 'utf8'));

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
    compile({ apidoc, outDir: out });
    const first = hashTree(out);

    const second = compile({ apidoc, outDir: out });
    assert.equal(hashTree(out), first, 'output changed on an unchanged re-run');
    assert.equal(second.written.length, 0, 'rewrote files despite no source change');
  });

  test('an unchanged run leaves generatedAt alone', () => {
    const manifestPath = join(out, 'docgen-manifest.json');
    const before = JSON.parse(readFileSync(manifestPath, 'utf8')).generatedAt;
    compile({ apidoc, outDir: out });
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
    const result = compile({ apidoc, outDir: out });
    // Type names, plus index.json which is regenerated whenever anything is.
    assert.deepEqual(result.written, ['Fixture.Base', 'index.json']);
    assert.equal(result.unchanged.length, 2, 'Fixture.Leaf and Titanium.Proxy should be untouched');
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
