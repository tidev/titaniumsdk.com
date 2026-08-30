import type { ApiIndex } from '../registry/index.ts';
import { TOP_LEVEL, branchIds, buildNavTree, crumbsFor, subtypesOf } from './tree.ts';
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

/**
 * The grouping rules the sidebar depends on.
 *
 * These are the decisions a registry regen could quietly invalidate — where a
 * name with no namespace lands, and which branch a page expands — so they are
 * pinned here rather than left to be noticed in a screenshot.
 */

type IndexType = ApiIndex['types'][number];

const type = (name: string, extend?: string): IndexType => ({
  name,
  kind: 'proxy',
  deprecated: false,
  ...(extend ? { extends: extend } : {}),
  counts: { properties: 0, methods: 0, events: 0 },
  // Required on an index entry so a module compile can verify a cross-repo
  // member anchor against it. Irrelevant to grouping, which is why it is empty.
  members: [],
});

const TYPES: IndexType[] = [
  type('Titanium'),
  type('Titanium.UI', 'Titanium.Module'),
  type('Titanium.UI.Button', 'Titanium.UI.View'),
  type('Titanium.UI.View', 'Titanium.Proxy'),
  type('Titanium.UI.iOS'),
  type('Titanium.UI.iOS.Toolbar', 'Titanium.UI.View'),
  type('fs'),
  type('fs.File'),
  type('Point'),
  type('Font'),
];

describe('buildNavTree', () => {
  const tree = buildNavTree(TYPES);

  test('nests types under their dotted namespace', () => {
    const titanium = tree.find((n) => n.id === 'Titanium')!;
    const ui = titanium.children.find((n) => n.id === 'Titanium.UI')!;
    assert.equal(ui.label, 'UI');
    assert.equal(ui.name, 'Titanium.UI');
    // localeCompare, so `iOS` files with the letter i rather than after Z.
    assert.deepEqual(
      ui.children.map((n) => n.label),
      ['Button', 'iOS', 'View']
    );
  });

  test('puts Titanium first and the catch-all last', () => {
    assert.deepEqual(
      tree.map((n) => n.id),
      ['Titanium', 'fs', TOP_LEVEL]
    );
  });

  test('collects namespace-less leaves, but not namespace-less branches', () => {
    const loose = tree.at(-1)!;
    assert.deepEqual(
      loose.children.map((n) => n.name),
      ['Font', 'Point']
    );
    // `fs` has no dot either, but things nest under it, so it stays a branch.
    assert.equal(tree.find((n) => n.id === 'fs')!.children.length, 1);
  });

  test('is memoised on the array it was built from', () => {
    assert.equal(buildNavTree(TYPES), tree);
  });
});

describe('branchIds', () => {
  const tree = buildNavTree(TYPES);

  test('opens every namespace above a type', () => {
    assert.deepEqual(branchIds('Titanium.UI.iOS.Toolbar', tree), [
      'Titanium',
      'Titanium.UI',
      'Titanium.UI.iOS',
      'Titanium.UI.iOS.Toolbar',
    ]);
  });

  test('opens the catch-all for a leaf with no namespace', () => {
    assert.deepEqual(branchIds('Point', tree), ['Point', TOP_LEVEL]);
  });

  test('leaves the catch-all shut for a root namespace', () => {
    assert.deepEqual(branchIds('fs', tree), ['fs']);
  });

  test('opens nothing off a page that is not a type', () => {
    assert.deepEqual(branchIds('', tree), []);
  });
});

describe('subtypesOf', () => {
  test('inverts extends, sorted', () => {
    assert.deepEqual(subtypesOf(TYPES, 'Titanium.UI.View'), [
      'Titanium.UI.Button',
      'Titanium.UI.iOS.Toolbar',
    ]);
  });

  test('is empty for a type nothing extends', () => {
    assert.deepEqual(subtypesOf(TYPES, 'Point'), []);
  });
});

describe('crumbsFor', () => {
  test('links the prefixes that are types themselves', () => {
    assert.deepEqual(crumbsFor(TYPES, 'Titanium.UI.Button'), [
      { label: 'Titanium', name: 'Titanium' },
      { label: 'UI', name: 'Titanium.UI' },
      { label: 'Button', name: 'Titanium.UI.Button' },
    ]);
  });

  test('leaves a prefix with no page of its own unlinked', () => {
    assert.deepEqual(crumbsFor([type('A.B.C')], 'A.B.C'), [
      { label: 'A' },
      { label: 'B' },
      { label: 'C', name: 'A.B.C' },
    ]);
  });
});
