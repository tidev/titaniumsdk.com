import {
  apiBranchBuilds,
  apiBranches,
  apiReleases,
  legacyBranch,
  legacyBranches,
  legacyChannel,
  legacyFiles,
} from './sdk.ts';
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

/**
 * The SDK half of the API, and the promise the shipped CLI depends on.
 *
 * `tidev/titanium-cli` hard-codes five paths on downloads.titaniumsdk.com and
 * cannot be fixed retroactively — old copies stay in the wild for years. These
 * pin the legacy shapes so a refactor here cannot quietly break `ti sdk
 * install` for people who never upgrade.
 */

describe('legacy compatibility surface', () => {
  test('channels answer with a bare array, not an envelope', () => {
    // The CLI does `await res.body.json()` and reduces over the result. An
    // `{apiVersion, releases}` wrapper would break it on the first iteration.
    const ga = legacyChannel('ga');
    assert.ok(Array.isArray(ga), 'ga.json must be an array');
    assert.ok(ga.length > 50);
    assert.deepEqual(Object.keys(ga[0]).sort(), ['assets', 'date', 'name', 'url', 'version']);
    assert.deepEqual(Object.keys(ga[0].assets[0]).sort(), ['os', 'size', 'url']);
  });

  test('branches answer with a bare name-to-count object', () => {
    const branches = legacyBranches();
    assert.ok(!Array.isArray(branches));
    assert.ok(Object.keys(branches).length > 10);
    for (const count of Object.values(branches)) assert.equal(typeof count, 'number');
  });

  test('every branch the CLI would keep actually has that many builds', () => {
    // The CLI filters the map to non-zero counts, then fetches each one. A
    // count that disagrees with the file sends someone to an empty branch.
    for (const [name, count] of Object.entries(legacyBranches())) {
      if (!count) continue;
      assert.equal(legacyBranch(name).length, count, `${name} count disagrees with its builds`);
    }
  });

  test('never lists a build whose artifacts have expired', () => {
    // nightly.link proxies die 90 days after the run. The old file listed them
    // anyway and left the CLI to filter; handing out a URL known to 404 is the
    // one thing this surface must not do.
    const now = Date.now();
    for (const name of Object.keys(legacyBranches())) {
      for (const build of legacyBranch(name)) {
        if (!build.expires) continue;
        assert.ok(Date.parse(build.expires) > now, `${name} lists expired ${build.name}`);
      }
    }
  });

  test('covers every path the CLI asks for', () => {
    const files = legacyFiles();
    for (const required of ['branches.json', 'ga.json', 'rc.json', 'beta.json', 'main.json']) {
      assert.ok(files.includes(required), `missing ${required}`);
    }
  });

  test('answers an emptied branch rather than 404ing it', () => {
    // The old file listed long-expired builds; `[]` is the same answer once the
    // CLI's own filter has run, without the dead URLs in between.
    assert.deepEqual(legacyBranch('12_0_X'), []);
  });
});

describe('v1 endpoints', () => {
  test('tag every release with the channel it came from', () => {
    const releases = apiReleases();
    assert.ok(releases.length > 50);
    for (const r of releases) assert.ok(['ga', 'rc', 'beta'].includes(r.channel));
  });

  test('offer only branches with something to download', () => {
    const branches = apiBranches();
    assert.ok(branches.length);
    for (const b of branches) {
      // main is kept even when empty: it is the CI landing page.
      if (b.name !== 'main') assert.ok(b.builds > 0, `${b.name} is listed with nothing in it`);
    }
  });

  test('return null for a branch that is not published', () => {
    assert.equal(apiBranchBuilds('backport-14489-13_3_X'), null);
    assert.equal(apiBranchBuilds('nope'), null);
  });
});
