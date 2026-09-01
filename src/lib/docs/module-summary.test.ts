import {
  listingPlatforms,
  listingName,
  listingUpdatedAt,
  orderListings,
  platformsAtVersion,
  type CommunityListing,
  type ModuleListing,
  type ModuleSummary,
} from './module-summary.ts';
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

/**
 * How the two kinds of module share one list.
 *
 * The ordering is the whole answer to "which of these should I use", so it is
 * pinned here rather than left to whatever order the two sources happen to be
 * concatenated in.
 */

const official = (id: string, platforms: ('android' | 'ios')[] = ['android']): ModuleSummary => ({
  kind: 'registry',
  id,
  source: 'tidev',
  latest: platforms.map((platform) => ({ platform, version: '1.0.0' })),
  releases: 1,
});

const community = (
  id: string,
  stars: number,
  archived = false,
  platforms: ('android' | 'ios')[] = ['android']
): CommunityListing => ({
  kind: 'community',
  id,
  name: id.split('/')[1],
  owner: id.split('/')[0],
  url: `https://github.com/${id}`,
  platforms,
  stars,
  archived,
  pushedAt: '2026-01-01T00:00:00Z',
});

describe('orderListings', () => {
  test('puts every official module above every community one', () => {
    // The community entry has far more stars, and still sorts below: a curated
    // module has a compiled reference and a verified release history behind it.
    const ordered = orderListings([community('m1ga/ti.animation', 105), official('ti.map')]);
    assert.deepEqual(
      ordered.map((m) => m.id),
      ['ti.map', 'm1ga/ti.animation']
    );
  });

  test('sorts official alphabetically and community by stars', () => {
    const ordered = orderListings([
      community('b/two', 10),
      official('ti.nfc'),
      community('a/one', 90),
      official('ti.map'),
    ]);
    assert.deepEqual(
      ordered.map((m) => m.id),
      ['ti.map', 'ti.nfc', 'a/one', 'b/two']
    );
  });

  test('sinks archived repositories below live ones whatever their stars', () => {
    const ordered = orderListings([
      community('old/popular', 500, true),
      community('new/quiet', 3, false),
    ]);
    assert.deepEqual(
      ordered.map((m) => m.id),
      ['new/quiet', 'old/popular']
    );
  });

  test('does not mutate the input', () => {
    const input: ModuleListing[] = [community('a/one', 1), official('ti.map')];
    orderListings(input);
    assert.equal(input[0].id, 'a/one');
  });
});

describe('listingPlatforms', () => {
  test('reads a registry module from its latest-per-platform', () => {
    assert.deepEqual(listingPlatforms(official('ti.map', ['android', 'ios'])), ['android', 'ios']);
  });

  test('reads a community module from its detected directories', () => {
    assert.deepEqual(listingPlatforms(community('a/one', 0, false, ['ios'])), ['ios']);
  });
});

describe('platformsAtVersion', () => {
  const index = (latest: Record<string, string>) =>
    ({ latest }) as unknown as Parameters<typeof platformsAtVersion>[0];

  test('names the one platform a version is current on', () => {
    assert.deepEqual(platformsAtVersion(index({ android: '5.7.0', ios: '7.3.1' }), '7.3.1'), [
      'ios',
    ]);
  });

  test('names both when one archive is current on both', () => {
    // No module in the registry ships this way today, but a publisher who
    // releases a single universal zip makes the same version current on both,
    // and the docs line has to read "Android and iOS 5.7.0" rather than
    // repeating the number.
    assert.deepEqual(platformsAtVersion(index({ android: '5.7.0', ios: '5.7.0' }), '5.7.0'), [
      'android',
      'ios',
    ]);
  });

  test('names nothing for a version that is no longer current', () => {
    assert.deepEqual(platformsAtVersion(index({ android: '5.7.0' }), '4.0.0'), []);
  });
});

describe('orderListings, explicit sorts', () => {
  const dated = (id: string, publishedAt: string): ModuleSummary => ({
    ...official(id),
    latest: [{ platform: 'android', version: '1.0.0', publishedAt }],
  });

  test('by the module name, not the owner it happens to be keyed under', () => {
    // A community module's key is `owner/name`, so sorting on the key sorts by
    // author: `av.imageview` lands under A for AndreaVitale. The two fixtures
    // here have owners in the opposite order to their names, so a regression
    // reverses the result rather than merely reordering ties.
    const ordered = orderListings(
      [community('zz/aaa', 500), official('mm.module'), community('aa/zzz', 1)],
      'name'
    );
    assert.deepEqual(
      ordered.map((m) => m.id),
      ['zz/aaa', 'mm.module', 'aa/zzz']
    );
  });

  test('by name, ignoring which kind an entry is', () => {
    // The default buries a community module under every curated one; sorting
    // by name is the escape hatch, so it must not re-apply that grouping.
    const ordered = orderListings([community('aa/zzz', 500), official('mm.module')], 'name');
    assert.deepEqual(
      ordered.map((m) => m.id),
      ['mm.module', 'aa/zzz']
    );
  });

  test('sorts names case-insensitively', () => {
    // Registry ids are lowercase by convention and repository names are not, so
    // a plain compare files every `Ti.Foo` ahead of every `appcelerator.bar`.
    const ordered = orderListings(
      [community('x/Zebra', 1), official('apple'), community('y/Mango', 1)],
      'name'
    );
    assert.deepEqual(
      ordered.map((m) => m.id),
      ['apple', 'y/Mango', 'x/Zebra']
    );
  });

  test('by most recently updated, across both kinds', () => {
    const ordered = orderListings(
      [
        dated('old.module', '2020-01-01T00:00:00Z'),
        community('fresh/repo', 0, false, ['android']),
        dated('new.module', '2026-01-01T00:00:00Z'),
      ],
      'updated'
    );
    // The community fixture pushes 2026-01-01 too; ties break on id.
    assert.equal(ordered.at(-1)?.id, 'old.module');
  });

  test('sorts an undated entry last rather than first', () => {
    const ordered = orderListings(
      [official('no.dates'), dated('has.date', '2020-01-01T00:00:00Z')],
      'updated'
    );
    assert.deepEqual(
      ordered.map((m) => m.id),
      ['has.date', 'no.dates']
    );
  });

  test('leaves the default ordering alone', () => {
    const input = [community('a/one', 5), official('ti.map')];
    assert.equal(orderListings(input, 'default')[0].id, 'ti.map');
    assert.equal(orderListings(input)[0].id, 'ti.map');
  });
});

describe('listingUpdatedAt', () => {
  test("takes a module's newest release date, not its first", () => {
    const m: ModuleSummary = {
      ...official('ti.map'),
      latest: [
        { platform: 'android', version: '5.7.0', publishedAt: '2025-09-10T14:08:11Z' },
        { platform: 'ios', version: '7.3.1', publishedAt: '2024-01-10T08:50:17Z' },
      ],
    };
    assert.equal(listingUpdatedAt(m), '2025-09-10T14:08:11Z');
  });

  test("takes a repository's last push", () => {
    assert.equal(listingUpdatedAt(community('a/one', 0)), '2026-01-01T00:00:00Z');
  });

  test('is undefined when a module has no dated release', () => {
    assert.equal(listingUpdatedAt(official('ti.map')), undefined);
  });
});

describe('listingName', () => {
  test('is the id for a registry module', () => {
    assert.equal(listingName(official('ti.map')), 'ti.map');
  });

  test('strips the owner from a community module', () => {
    assert.equal(listingName(community('AndreaVitale/av.imageview', 96)), 'av.imageview');
  });
});
