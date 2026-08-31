import { listModules, moduleDetail, releaseDetail, releaseParams } from './v1.ts';
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

/**
 * The public contract (TI-55).
 *
 * These read the committed registry rather than fixtures, because the thing
 * worth protecting is the promise made to a CLI that ships separately and stays
 * in the wild for years. A regen that quietly drops a field a client depends on
 * should fail here, not in someone's `ti module install`.
 */

describe('listModules', () => {
  const modules = listModules();

  test('carries both kinds, discriminated', () => {
    const kinds = new Set(modules.map((m) => m.source));
    assert.deepEqual([...kinds].sort(), ['community', 'registry']);
  });

  test('lists every registry module before any community one', () => {
    const firstCommunity = modules.findIndex((m) => m.source === 'community');
    const lastRegistry = modules.findLastIndex((m) => m.source === 'registry');
    assert.ok(lastRegistry < firstCommunity, 'registry modules must come first');
  });

  test('gives every registry module a per-platform latest, never a single value', () => {
    for (const m of modules) {
      if (m.source !== 'registry') continue;
      assert.ok(m.platforms.length, `${m.id} has no platforms`);
      for (const platform of m.platforms) {
        assert.ok(m.latest[platform], `${m.id} has no latest for ${platform}`);
      }
    }
  });

  test('stays small enough to be fetched whole', () => {
    // The endpoint has no query parameters precisely because of this: clients
    // filter locally. If the list ever outgrows a single fetch, that decision
    // needs revisiting rather than silently costing every caller.
    const bytes = JSON.stringify(modules).length;
    assert.ok(bytes < 512 * 1024, `list is ${(bytes / 1024).toFixed(0)}KB, too big to fetch whole`);
  });
});

describe('moduleDetail', () => {
  test('resolves each platform independently', () => {
    // The rule the whole API exists to make unambiguous: ti.map's iOS release
    // is the higher version and the older build, so a client that compares
    // across platforms picks the wrong archive.
    const map = moduleDetail('ti.map');
    assert.ok(map);
    assert.equal(map.latest.android, '5.7.0');
    assert.equal(map.latest.ios, '7.3.1');
  });

  test('lists every release with the platforms it shipped for', () => {
    const map = moduleDetail('ti.map');
    assert.ok(map);
    assert.ok(map.releases.length > 1);
    for (const r of map.releases) {
      assert.ok(r.platforms.length, `${r.version} has no platforms`);
      assert.equal(typeof r.prerelease, 'boolean');
    }
  });

  test('is null for an id the registry does not have', () => {
    assert.equal(moduleDetail('nope'), null);
  });
});

describe('releaseDetail', () => {
  test('gives a downloadable archive per platform of that release', () => {
    const release = releaseDetail('ti.map', '5.7.0');
    // Narrowed by a plain throw rather than `assert.ok`: an assertion signature
    // leaves anything derived from `release` inferring circularly below.
    if (!release) throw new Error('ti.map 5.7.0 is missing from the registry');

    for (const platform of release.platforms) {
      // Annotated: `ReleaseDetail` is built on Zod-inferred types, and inference
      // through them is deep enough here that tsc gives up and calls it circular.
      const urls: string[] = release.assets
        .filter((a) => a.platform === platform)
        .map((a) => a.url);
      assert.equal(urls.length, 1, `expected exactly one ${platform} asset`);
      assert.match(urls[0], /^https:\/\/github\.com\//);
    }
  });

  test('is null for a version that was never published', () => {
    assert.equal(releaseDetail('ti.map', '9.9.9'), null);
  });
});

describe('releaseParams', () => {
  test('names a release that resolves', () => {
    const params = releaseParams();
    assert.ok(params.length > 100);
    // Every generated path must answer, or the route prerenders a 404.
    for (const { moduleId, version } of params.slice(0, 25)) {
      assert.ok(releaseDetail(moduleId, version), `${moduleId}@${version} does not resolve`);
    }
  });
});
