import { liveApps, matches, storeLinks, type App } from './app.ts';
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

/**
 * The two things the showcase decides for itself: which entries are shown, and
 * which the browser hides when somebody types.
 *
 * Ordering is shared with the directory and tested in `../fair-order.test.ts`.
 */

const app = (id: string, over: Partial<App> = {}): App => ({
  schemaVersion: 1,
  id,
  name: id,
  platforms: ['iphone'],
  sdkVersion: '12.7.0.GA',
  description: `${id} does something useful`,
  icon: `/showcase/${id}.png`,
  screenshots: [],
  placeholder: false,
  ...over,
});

describe('liveApps', () => {
  test('worked examples are shown while nothing real exists', () => {
    const examples = [app('one', { placeholder: true }), app('two', { placeholder: true })];
    assert.deepEqual(
      liveApps(examples).map((a) => a.id),
      ['one', 'two']
    );
  });

  test('one real entry hides every example, with no follow-up pull request', () => {
    const mixed = [app('example', { placeholder: true }), app('real')];
    assert.deepEqual(
      liveApps(mixed).map((a) => a.id),
      ['real']
    );
  });

  test('an empty showcase stays empty rather than throwing', () => {
    assert.deepEqual(liveApps([]), []);
  });

  test('the input is not mutated, so a cached read cannot be filtered twice', () => {
    const apps = [app('example', { placeholder: true })];
    liveApps(apps);
    assert.equal(apps.length, 1);
  });
});

describe('storeLinks', () => {
  test('only the links an entry actually has, in the page order', () => {
    const both = app('both', {
      appStore: 'https://apps.apple.com/app/id1',
      playStore: 'https://play.google.com/store/apps/details?id=a',
      website: 'https://example.com',
    });
    assert.deepEqual(
      storeLinks(both).map((l) => l.label),
      ['App Store', 'Google Play', 'Developer Website']
    );
  });

  test('an entry with only a website still offers somewhere to go', () => {
    const site = app('site', { website: 'https://example.com' });
    assert.deepEqual(
      storeLinks(site).map((l) => l.label),
      ['Developer Website']
    );
  });
});

describe('matches', () => {
  const all = { platform: 'all', query: '' } as const;
  const tablet = app('harbour', {
    name: 'Harbour Transit',
    subtitle: 'Live departures',
    description: 'Timetables that work offline.',
    platforms: ['iphone', 'android-tablet'],
    sdkVersion: '13.3.1.GA',
  });

  test('no filters shows everything', () => {
    assert.equal(matches(tablet, all), true);
  });

  test('the platform filter is over what the entry claims', () => {
    assert.equal(matches(tablet, { ...all, platform: 'android-tablet' }), true);
    assert.equal(matches(tablet, { ...all, platform: 'ipad' }), false);
  });

  test('free text reaches the name, subtitle, description and SDK version', () => {
    for (const query of ['harbour', 'departures', 'offline', '13.3.1']) {
      assert.equal(matches(tablet, { ...all, query }), true, query);
    }
    assert.equal(matches(tablet, { ...all, query: 'ferry' }), false);
  });

  test('free text finds a platform by the label a reader sees, not only its value', () => {
    assert.equal(matches(tablet, { ...all, query: 'Android tablet' }), true);
  });

  test('case and surrounding space do not matter', () => {
    assert.equal(matches(tablet, { ...all, query: '  HARBOUR ' }), true);
  });

  test('an entry with no subtitle does not match the empty string oddly', () => {
    const bare = app('bare', { name: 'Bare', description: 'Nothing else.' });
    assert.equal(matches(bare, { ...all, query: 'bare' }), true);
    assert.equal(matches(bare, { ...all, query: 'undefined' }), false);
  });
});
