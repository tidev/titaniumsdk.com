import { contentsOf } from './pool.ts';
import { REGISTRY, sdkIndex, sdkTypeNames, sdkVersions } from './registry.ts';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { describe, test } from 'node:test';

/**
 * `sdkTypeNames` answers from the version manifest, not from the index.
 *
 * The manifest is what `apiTypeAt` already reads to find a type's document, so
 * a name it lists is exactly a name a page can be rendered for. The index is
 * twenty times the size and is validated against a schema on every parse; the
 * version switcher on a type page asks every version whether it has the type,
 * and on a cold serverless function that was twenty index parses before the
 * page could render.
 *
 * The saving is only correct while the two agree. Docgen writes both from one
 * pass, so they do - this is what notices if that stops being true, against
 * the versions actually on disk rather than a fixture.
 */
describe('sdkTypeNames', () => {
  test('names exactly the types the index has a page for, in every version', () => {
    const versions = sdkVersions();
    assert.ok(versions.length > 0, 'no compiled versions on disk');

    for (const version of versions) {
      const fromIndex = new Set((sdkIndex(version)?.types ?? []).map((t) => t.name));
      const names = sdkTypeNames(version);
      assert.deepEqual([...names].sort(), [...fromIndex].sort(), version);
    }
  });

  test('is the manifest, so a version without one has no types', () => {
    // Unknown to `sdkVersions`, so nothing else would ever ask; the point is
    // that the answer is an empty set rather than a throw.
    assert.equal(contentsOf(join(REGISTRY, 'sdk', 'no-such-version')), null);
    assert.equal(sdkTypeNames('no-such-version').size, 0);
  });
});
