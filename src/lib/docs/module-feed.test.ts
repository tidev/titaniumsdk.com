import { ModuleIndexSchema, type ModuleIndex } from '../registry/index.ts';
import { firstPublishedAt, moduleFeedEntries } from './module-feed.ts';
import type { CommunityListing } from './module-summary.ts';
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

const SITE = 'https://example.test';

const curated = (moduleId: string, dates: (string | undefined)[]): ModuleIndex =>
  ModuleIndexSchema.parse({
    schemaVersion: 1,
    moduleId,
    source: 'tidev',
    aliases: [],
    latest: { android: '1.0.0' },
    versions: dates.map((publishedAt, i) => ({
      version: `1.0.${i}`,
      platforms: ['android'],
      ...(publishedAt ? { publishedAt } : {}),
    })),
  });

const community = (id: string, listedAt: string): CommunityListing => ({
  kind: 'community',
  source: 'unverified',
  id,
  name: id.split('/')[1],
  owner: id.split('/')[0],
  url: `https://github.com/${id}`,
  platforms: ['android', 'ios'],
  stars: 1,
  archived: false,
  // Deliberately newer than every `listedAt` below: a push is not an arrival.
  pushedAt: '2026-12-31T00:00:00Z',
  listedAt,
});

describe('firstPublishedAt', () => {
  test('is the oldest release, whatever order the versions are in', () => {
    const index = curated('ti.map', ['2025-09-10T14:08:11Z', '2012-03-01T00:00:00Z', undefined]);
    assert.equal(firstPublishedAt(index), '2012-03-01T00:00:00Z');
  });

  test('is nothing when no release carries a date', () => {
    assert.equal(firstPublishedAt(curated('ti.map', [undefined])), undefined);
  });
});

describe('moduleFeedEntries', () => {
  test('orders both kinds together, newest arrival first', () => {
    const entries = moduleFeedEntries(
      [curated('ti.new', ['2026-10-01T00:00:00Z'])],
      [community('a/older', '2026-09-01T00:00:00Z'), community('b/newer', '2026-11-01T00:00:00Z')],
      SITE
    );
    assert.deepEqual(
      entries.map((e) => e.title),
      ['newer', 'ti.new', 'older']
    );
  });

  test('dates a community module by its listing, not its last push', () => {
    const [entry] = moduleFeedEntries([], [community('a/mod', '2026-09-01T00:00:00Z')], SITE);
    assert.equal(entry.date, '2026-09-01T00:00:00Z');
  });

  test('links a curated module to its page and a community one to its repository', () => {
    const entries = moduleFeedEntries(
      [curated('ti.map', ['2026-10-01T00:00:00Z'])],
      [community('a/mod', '2026-09-01T00:00:00Z')],
      SITE
    );
    assert.deepEqual(
      entries.map((e) => e.link),
      [`${SITE}/modules/ti.map`, 'https://github.com/a/mod']
    );
  });

  test('leaves out a curated module with no dated release', () => {
    assert.deepEqual(moduleFeedEntries([curated('ti.map', [undefined])], [], SITE), []);
  });

  test('breaks a tie on the name, so one scrape run has a stable order', () => {
    const at = '2026-11-01T00:00:00Z';
    const entries = moduleFeedEntries(
      [],
      [community('z/beta', at), community('a/alpha', at)],
      SITE
    );
    assert.deepEqual(
      entries.map((e) => e.title),
      ['alpha', 'beta']
    );
  });

  test('keeps only the newest when there are more than the limit', () => {
    const entries = moduleFeedEntries(
      [],
      [
        community('a/one', '2026-09-01T00:00:00Z'),
        community('a/two', '2026-09-02T00:00:00Z'),
        community('a/three', '2026-09-03T00:00:00Z'),
      ],
      SITE,
      2
    );
    assert.deepEqual(
      entries.map((e) => e.title),
      ['three', 'two']
    );
  });
});
