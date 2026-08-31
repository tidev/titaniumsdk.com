import {
  listingPlatforms,
  orderListings,
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
  source: 'registry',
  id,
  curation: 'tidev',
  latest: platforms.map((platform) => ({ platform, version: '1.0.0' })),
  releases: 1,
});

const community = (
  id: string,
  stars: number,
  archived = false,
  platforms: ('android' | 'ios')[] = ['android']
): CommunityListing => ({
  source: 'community',
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
