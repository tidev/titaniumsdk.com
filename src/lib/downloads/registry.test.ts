import type { Build } from '../registry/index.ts';
import {
  byDateDesc,
  isPublishedBranch,
  liveBuilds,
  orderBranches,
  orderReleases,
  type BranchSummary,
  type Release,
} from './registry.ts';
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

/**
 * The rules that decide what a visitor is offered as a download.
 *
 * Expiry is the one that has already gone wrong in production — an audit found
 * 292 builds advertised with dead nightly.link URLs — so the boundary
 * conditions are pinned here rather than left to a screenshot.
 */

const NOW = Date.parse('2026-08-30T00:00:00Z');

const build = (name: string, date: string, expires?: string | null): Build => ({
  name,
  version: name.split('.').slice(0, 3).join('.'),
  date,
  ...(expires === undefined ? {} : { expires }),
  url: `https://github.com/tidev/titanium-sdk/actions/runs/${name}`,
  assets: [],
});

describe('liveBuilds', () => {
  test('keeps releases, which carry no expiry at all', () => {
    const ga = [build('13.4.1.GA', '2026-08-25T12:19:54Z')];
    assert.deepEqual(liveBuilds(ga, NOW), ga);
  });

  test('drops a build whose artifacts have already lapsed', () => {
    const builds = [
      build('14.0.0.v1', '2026-08-29T18:03:29Z', '2026-11-27T17:49:38.000Z'),
      build('14.0.0.v2', '2026-05-01T00:00:00Z', '2026-07-30T00:00:00.000Z'),
    ];
    assert.deepEqual(
      liveBuilds(builds, NOW).map((b) => b.name),
      ['14.0.0.v1']
    );
  });

  test('treats the expiry instant itself as gone', () => {
    // nightly.link starts 404ing the moment GitHub drops the artifact, so the
    // boundary belongs on the expired side.
    const builds = [build('14.0.0.v1', '2026-05-01T00:00:00Z', '2026-08-30T00:00:00Z')];
    assert.deepEqual(liveBuilds(builds, NOW), []);
  });

  test('keeps a build whose expiry is null or unparseable', () => {
    // The generator writes null when a run reports no artifact expiry, and a
    // garbled date is a generator bug — neither is evidence the file is gone.
    const builds = [
      build('14.0.0.v1', '2026-08-01T00:00:00Z', null),
      build('14.0.0.v2', '2026-08-01T00:00:00Z', 'not a date'),
    ];
    assert.equal(liveBuilds(builds, NOW).length, 2);
  });
});

describe('byDateDesc', () => {
  test('sorts newest first without mutating the input', () => {
    const builds = [
      build('13.3.0.GA', '2024-07-01T00:00:00Z'),
      build('13.4.1.GA', '2026-08-25T12:19:54Z'),
      build('13.4.0.GA', '2026-07-28T06:58:41Z'),
    ];
    const sorted = byDateDesc(builds);
    assert.deepEqual(
      sorted.map((b) => b.name),
      ['13.4.1.GA', '13.4.0.GA', '13.3.0.GA']
    );
    assert.equal(builds[0].name, '13.3.0.GA');
  });

  test('puts an unparseable date last rather than throwing', () => {
    const builds = [build('bad', 'whenever'), build('good', '2026-01-01T00:00:00Z')];
    assert.deepEqual(
      byDateDesc(builds).map((b) => b.name),
      ['good', 'bad']
    );
  });
});

describe('orderBranches', () => {
  const summary = (name: string, count: number, latest: string | null): BranchSummary => ({
    name,
    count,
    latest,
  });

  test('leads with main, then the most recently built branch', () => {
    const ordered = orderBranches([
      summary('13_3_X', 5, '2026-08-12T00:00:00Z'),
      summary('13_4_X', 2, '2026-08-25T11:44:02Z'),
      summary('main', 46, '2026-08-29T18:03:29Z'),
      summary('backport-14489-13_3_X', 1, '2026-06-01T00:00:00Z'),
    ]);
    assert.deepEqual(
      ordered.map((b) => b.name),
      ['main', '13_4_X', '13_3_X', 'backport-14489-13_3_X']
    );
  });

  test('keeps main first even with nothing left to download', () => {
    const ordered = orderBranches([
      summary('13_4_X', 2, '2026-08-25T11:44:02Z'),
      summary('main', 0, null),
    ]);
    assert.deepEqual(
      ordered.map((b) => b.name),
      ['main', '13_4_X']
    );
  });
});

describe('orderReleases', () => {
  const release = (name: string, channel: Release['channel']): Release => ({
    ...build(name, '2020-01-01T00:00:00Z'),
    channel,
    prerelease: channel !== 'ga',
  });

  test('sorts by version, then the release above what it superseded', () => {
    const ordered = orderReleases([
      release('12.8.0.GA', 'ga'),
      release('13.0.0.RC', 'rc'),
      release('13.0.0.GA', 'ga'),
      release('13.0.0.Beta', 'beta'),
    ]);
    assert.deepEqual(
      ordered.map((r) => r.name),
      ['13.0.0.GA', '13.0.0.RC', '13.0.0.Beta', '12.8.0.GA']
    );
  });

  test('orders candidates within a channel, highest first', () => {
    const ordered = orderReleases([
      release('12.3.0.RC', 'rc'),
      release('12.3.0.RC2', 'rc'),
      release('12.3.0.GA', 'ga'),
    ]);
    assert.deepEqual(
      ordered.map((r) => r.name),
      ['12.3.0.GA', '12.3.0.RC2', '12.3.0.RC']
    );
  });

  test('compares version parts as numbers, not text', () => {
    // The registry's own `version` field is a string, where 13.10.0 sorts
    // under 13.9.0. This is the reason the name is re-parsed.
    const ordered = orderReleases([release('13.9.0.GA', 'ga'), release('13.10.0.GA', 'ga')]);
    assert.deepEqual(
      ordered.map((r) => r.name),
      ['13.10.0.GA', '13.9.0.GA']
    );
  });

  test('puts an unparseable name last rather than throwing', () => {
    const ordered = orderReleases([release('nonsense', 'ga'), release('12.0.0.GA', 'ga')]);
    assert.deepEqual(
      ordered.map((r) => r.name),
      ['12.0.0.GA', 'nonsense']
    );
  });
});

describe('isPublishedBranch', () => {
  test('accepts main and the release lines', () => {
    for (const name of ['main', '13_4_X', '12_6_x', '13_3_1']) {
      assert.equal(isPublishedBranch(name), true, name);
    }
  });

  test('rejects the working branches branches.json has accumulated', () => {
    // Both are real keys inherited from the downloads-www registry. They are
    // somebody's in-progress fix, not something to offer as a download.
    for (const name of ['backport-14489-13_3_X', 'android34_12_6_X', 'master', '']) {
      assert.equal(isPublishedBranch(name), false, name);
    }
  });
});
