import { indexableGuidePaths } from './docs/guides.ts';
import { latestSdkVersion, MAIN } from './docs/registry.ts';
import { indexedVersions } from './docs/versions.ts';
import { blockedByRobots, robotsRules } from './seo.ts';
import { SITE_URL } from './site.ts';
import { sitemapEntries } from './sitemap.ts';
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

/**
 * The invariants, over the real registry rather than a fixture.
 *
 * A sitemap is wrong in ways that never throw: a duplicate, a relative URL, a
 * page that also carries `noindex`. None of those break a build and all of them
 * cost traffic, so they are asserted here rather than reviewed by eye across
 * several hundred entries.
 */

const entries = sitemapEntries();
const paths = entries.map((entry) => entry.url.replace(SITE_URL, ''));

describe('sitemap', () => {
  // TI-59 archives a major by copying the guides to `/docs/v13/...` and leaving
  // current unversioned. Those copies canonicalise to current and must not also
  // be requested here, or the crawler is asked to rank three spellings of one
  // page. Nothing filters for it: `indexableGuidePaths()` reads the current
  // content root and archived majors simply never enter. That is quiet enough
  // to be undone by accident, so it is asserted rather than trusted.
  test('lists no archived major', () => {
    for (const path of paths) {
      assert.equal(
        /^\/docs\/v\d+(\/|$)/.test(path),
        false,
        `${path} is an archived major and should not be in the sitemap`
      );
    }
  });

  test('is absolute and free of duplicates', () => {
    for (const entry of entries) {
      assert.equal(entry.url.startsWith(`${SITE_URL}/`), true, entry.url);
    }
    const seen = new Set(entries.map((entry) => entry.url));
    assert.equal(seen.size, entries.length);
  });

  test('lists nothing robots.txt blocks', () => {
    // The two would be contradictory instructions, and a crawler handed both
    // trusts neither. `/registry` the page is listed; `/registry/` the API is
    // what the rule keeps out.
    const rules = robotsRules();
    const blocked = paths.filter((path) => blockedByRobots(path, rules));
    assert.deepEqual(blocked, []);
    assert.equal(paths.includes('/registry'), true);
  });

  test('covers each section the migration has to keep', () => {
    for (const path of [
      '/',
      '/docs',
      '/docs/sdk',
      '/docs/setup/macos',
      '/modules',
      '/modules/ti.map',
      '/modules/ti.map/api',
      '/downloads',
      '/downloads/releases',
      '/blog',
    ]) {
      assert.equal(paths.includes(path), true, path);
    }
  });

  test('lists the reference at its canonical addresses only', () => {
    const latest = latestSdkVersion();
    assert.notEqual(latest, null);

    // The unversioned tree is canonical for the latest release, so the pinned
    // copy of it must not appear beside it.
    assert.equal(paths.includes(`/docs/sdk/${latest}`), false);
    assert.equal(paths.includes('/docs/sdk/Titanium.UI.Button'), true);

    // Pinned indexes appear only while they are indexed, and `main` never is.
    const pinned = paths.filter((path) => /^\/docs\/sdk\/\d+\.\d+\.\d+$/.test(path));
    assert.deepEqual(
      pinned.toSorted(),
      indexedVersions()
        .filter((version) => version !== latest)
        .map((version) => `/docs/sdk/${version}`)
        .toSorted()
    );
    assert.equal(
      paths.some((path) => path.startsWith(`/docs/sdk/${MAIN}`)),
      false
    );
  });

  test('lists no guide path that is not indexable', () => {
    const guides = paths.filter((path) => path === '/docs' || path.startsWith('/docs/'));
    const reference = new Set(indexableGuidePaths());
    for (const path of guides) {
      // Everything under /docs/sdk is the reference, which has its own rule.
      if (path === '/docs/sdk' || path.startsWith('/docs/sdk/')) continue;
      assert.equal(reference.has(path), true, path);
    }
  });

  test('leaves the agent-readable output to TI-57', () => {
    // Those files duplicate pages that are listed here, and they are fetched by
    // address rather than found by search.
    const leaked = paths.filter((path) => path.endsWith('.md') || path.includes('llms'));
    assert.deepEqual(leaked, []);
  });
});
