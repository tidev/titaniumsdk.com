import { latestSdkVersion, MAIN, sdkVersions } from './docs/registry.ts';
import { versionsWithNotes } from './docs/release-notes.ts';
import { indexedVersions, isIndexedVersion } from './docs/versions.ts';
import {
  blockedByRobots,
  blogPosting,
  breadcrumbList,
  retiredReferenceRules,
  robotsRules,
} from './seo.ts';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';

/**
 * The rules that are easy to get wrong quietly.
 *
 * A robots.txt that blocks one path too many, or structured data that names a
 * relative URL, both look fine in review and cost traffic for months. These pin
 * the cases the reasoning in `seo.ts` actually turns on.
 */

describe('blockedByRobots', () => {
  test('blocks the JSON API', () => {
    assert.equal(blockedByRobots('/registry/v1/modules'), true);
    assert.equal(blockedByRobots('/registry/modules.json'), true);
  });

  test('leaves the page documenting the API crawlable', () => {
    // The whole reason DISALLOW carries a trailing slash. Without it this is
    // blocked and the page disappears from search along with the JSON.
    assert.equal(blockedByRobots('/registry'), false);
  });

  test('leaves the agent-readable output alone', () => {
    // TI-57 owns these files. This owns the promise that nothing blocks them.
    for (const path of ['/llms.txt', '/llms-full.txt', '/docs/setup/macos.md']) {
      assert.equal(blockedByRobots(path), false, path);
    }
  });
});

describe('retiredReferenceRules', () => {
  // A fixture rather than the registry, so the shape of the rules is pinned
  // independently of which versions happen to be retired today.
  const rules = retiredReferenceRules(['13.4.1', '12.5.0', 'main'], new Set(['13.4.1', '12.5.0']));
  const robots = { allow: ['/', ...rules.allow], disallow: rules.disallow };
  const blocked = (path: string) => blockedByRobots(path, robots);

  test('blocks every page of a retired version and its Markdown copies', () => {
    for (const path of [
      '/docs/sdk/13.4.1',
      '/docs/sdk/13.4.1/',
      '/docs/sdk/13.4.1.md',
      '/docs/sdk/13.4.1/Titanium.UI.Window',
      '/docs/sdk/13.4.1/Titanium.UI.Window.md',
      '/docs/sdk/13.4.1/compatibility',
      '/docs/sdk/main/Titanium.UI.Button',
    ]) {
      assert.equal(blocked(path), true, path);
    }
  });

  test('leaves the release notes open under the block', () => {
    // Indexed for every version and listed in the sitemap, so the `Allow` has
    // to outrank the `Disallow` it sits under.
    assert.equal(blocked('/docs/sdk/13.4.1/release-notes'), false);
    assert.equal(blocked('/docs/sdk/12.5.0/release-notes'), false);
  });

  test('stops at the end of the version number', () => {
    // Why the index rule is anchored with `$` and the rest carry a slash: a
    // plain prefix for 13.4.1 would also take 13.4.10 out of search.
    for (const path of ['/docs/sdk/13.4.10', '/docs/sdk/13.4.10/Titanium.UI.Window']) {
      assert.equal(blocked(path), false, path);
    }
  });

  test('leaves the unversioned reference alone', () => {
    for (const path of ['/docs/sdk', '/docs/sdk.md', '/docs/sdk/Titanium.UI.Window']) {
      assert.equal(blocked(path), false, path);
    }
  });
});

describe('robotsRules', () => {
  // Over the real registry: the point is that today's robots.txt agrees with
  // today's index cutoff, which no fixture can say.
  const rules = robotsRules();
  const blocked = (path: string) => blockedByRobots(path, rules);
  const latest = latestSdkVersion();

  test('is one group that still allows the site and blocks the JSON API', () => {
    assert.equal(rules.allow[0], '/');
    assert.equal(rules.disallow.includes('/registry/'), true);
  });

  test('blocks the type pages of every version past the cutoff', () => {
    const retired = sdkVersions().filter((version) => !isIndexedVersion(version));
    // There are always some while more than three lines are compiled. If this
    // fails because there are none, the rule has stopped doing anything.
    assert.notEqual(retired.length, 0);
    for (const version of retired) {
      for (const path of [
        `/docs/sdk/${version}`,
        `/docs/sdk/${version}.md`,
        `/docs/sdk/${version}/Titanium.UI.Window`,
        `/docs/sdk/${version}/Titanium.UI.Window.md`,
      ]) {
        assert.equal(blocked(path), true, path);
      }
    }
  });

  test('never blocks an indexed version', () => {
    // The sitemap lists these, and a blocked page never shows its canonical.
    for (const version of [latest!, ...indexedVersions()]) {
      for (const path of [
        `/docs/sdk/${version}`,
        `/docs/sdk/${version}.md`,
        `/docs/sdk/${version}/Titanium.UI.Window`,
        `/docs/sdk/${version}/Titanium.UI.Window.md`,
      ]) {
        assert.equal(blocked(path), false, path);
      }
    }
    assert.equal(blocked('/docs/sdk/Titanium.UI.Window'), false);
    assert.equal(blocked('/docs/sdk/latest/Titanium.UI.Window'), false);
  });

  test('never blocks a release note', () => {
    for (const version of versionsWithNotes()) {
      assert.equal(blocked(`/docs/sdk/${version}/release-notes`), false, version);
    }
  });
});

/**
 * The firewall route in `vercel.json` (TI-101).
 *
 * JSON has no comments, so the reasoning lives here. robots.txt asks every
 * crawler to keep off the retired reference versions; this denies the four AI
 * crawlers that were rebuilding them most, for the case where one does not ask
 * first. Narrower than robots.txt on purpose, in two ways:
 *
 * - Versions by a fixed range (`main`, everything before 13.3) rather than the
 *   live cutoff, because the file is static. The cutoff only moves forward, so
 *   a range that is past it today is past it for good; the newest retired
 *   patches (13.3.0, 13.4.0) are left to robots.txt rather than risk the rule
 *   reaching a version that is still indexed.
 * - By user agent, and never a search engine's. Googlebot obeys robots.txt,
 *   and denying it anything is a ranking decision this file should not make.
 */
describe('vercel.json firewall route', () => {
  type Route = {
    src: string;
    has?: { type: string; key: string; value: { re: string } }[];
    mitigate?: { action: string };
  };
  const config = JSON.parse(readFileSync(join(process.cwd(), 'vercel.json'), 'utf8')) as {
    routes?: Route[];
  };
  const route = config.routes?.find((r) => r.mitigate);
  assert.ok(route, 'vercel.json has no mitigate route');
  const path = new RegExp(route.src, 'i');
  const agents = new RegExp(route.has!.find((h) => h.key === 'user-agent')!.value.re);
  const denied = (p: string) => path.test(p);

  test('denies rather than challenges', () => {
    // A crawler cannot solve a challenge, so the two differ only in what the
    // logs call it.
    assert.equal(route.mitigate!.action, 'deny');
  });

  test('covers the old versions and their Markdown copies', () => {
    for (const p of [
      '/docs/sdk/12.5.0',
      '/docs/sdk/12.5.0/',
      '/docs/sdk/12.5.0.md',
      '/docs/sdk/12.8.0/Titanium.UI.Window',
      '/docs/sdk/13.2.0/Titanium.UI.Window.md',
      '/docs/sdk/main/Titanium.UI.Button',
    ]) {
      assert.equal(denied(p), true, p);
    }
  });

  test('never reaches an indexed version, a release note, or the latest copy', () => {
    for (const version of [latestSdkVersion()!, ...indexedVersions()]) {
      assert.equal(denied(`/docs/sdk/${version}/Titanium.UI.Window`), false, version);
      assert.equal(denied(`/docs/sdk/${version}`), false, version);
    }
    for (const version of versionsWithNotes()) {
      assert.equal(denied(`/docs/sdk/${version}/release-notes`), false, version);
    }
    for (const p of [
      '/docs/sdk',
      '/docs/sdk/Titanium.UI.Window',
      '/docs/sdk/latest/Titanium.UI.Window',
    ]) {
      assert.equal(denied(p), false, p);
    }
  });

  test('only reaches versions robots.txt already blocks', () => {
    // The firewall enforces robots.txt for crawlers that ignore it; it must
    // never deny a page that robots.txt invites them to fetch.
    const rules = robotsRules();
    for (const version of sdkVersions()) {
      const p = `/docs/sdk/${version}/Titanium.UI.Window`;
      if (denied(p)) assert.equal(blockedByRobots(p, rules), true, p);
    }
    assert.equal(sdkVersions().includes(MAIN), denied(`/docs/sdk/${MAIN}/Titanium.UI.Button`));
  });

  test('names the AI crawlers and no search engine', () => {
    for (const ua of [
      'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Amazonbot/0.1; +https://developer.amazon.com/support/amazonbot) Chrome/119.0.6045.214 Safari/537.36',
      'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)',
      'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot',
      'Mozilla/5.0 (compatible; ExaSearchBot/1.0; +https://crawler.exa.ai/)',
    ]) {
      assert.equal(agents.test(ua), true, ua);
    }
    for (const ua of [
      'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
    ]) {
      assert.equal(agents.test(ua), false, ua);
    }
  });
});

describe('breadcrumbList', () => {
  test('numbers from one and makes every href absolute', () => {
    const data = breadcrumbList([
      { label: 'Docs', href: '/docs' },
      { label: 'Getting Started', href: '/docs/setup' },
      { label: 'macOS' },
    ]) as { itemListElement: { position: number; name: string; item?: string }[] };

    assert.deepEqual(
      data.itemListElement.map((item) => [item.position, item.name, item.item]),
      [
        [1, 'Docs', 'https://titaniumsdk.com/docs'],
        [2, 'Getting Started', 'https://titaniumsdk.com/docs/setup'],
        // The current page. A last item with no `item` is what the schema
        // expects, and it is the shape the component already renders.
        [3, 'macOS', undefined],
      ]
    );
  });

  test('leaves out a category label rather than emitting an item-less step', () => {
    // "Getting Started" is the section's title rendered as plain text, because
    // the section's own page is the crumb below it. `item` is required on every
    // position but the last, and one missing invalidates the whole list, so the
    // label is not offered at all. The addresses that remain are the real ones.
    const data = breadcrumbList([
      { label: 'Docs', href: '/docs' },
      { label: 'Getting Started' },
      { label: 'Environment Setup', href: '/docs/setup' },
      { label: 'macOS' },
    ]) as { itemListElement: { position: number; name: string; item?: string }[] };

    assert.deepEqual(
      data.itemListElement.map((item) => [item.position, item.name, item.item]),
      [
        [1, 'Docs', 'https://titaniumsdk.com/docs'],
        [2, 'Environment Setup', 'https://titaniumsdk.com/docs/setup'],
        [3, 'macOS', undefined],
      ]
    );
  });

  test('drops an empty href rather than pointing at the site root', () => {
    // The SDK reference builds crumb hrefs as `name && ...`, which is '' for a
    // namespace with no page of its own.
    const data = breadcrumbList([{ label: 'Titanium', href: '' }]) as {
      itemListElement: { item?: string }[];
    };
    assert.equal('item' in data.itemListElement[0], false);
  });
});

describe('blogPosting', () => {
  const post = {
    slug: 'titanium-13-4-1',
    title: 'Titanium SDK 13.4.1',
    description: 'A patch release.',
    date: '2026-08-01',
    authors: ['Ada Lovelace', 'Grace Hopper'],
  };

  test('names every author and the post itself', () => {
    const data = blogPosting(post) as {
      author: { name: string }[];
      mainEntityOfPage: string;
      image?: string;
    };
    assert.deepEqual(
      data.author.map((a) => a.name),
      ['Ada Lovelace', 'Grace Hopper']
    );
    assert.equal(data.mainEntityOfPage, 'https://titaniumsdk.com/blog/titanium-13-4-1');
    // No cover, so no image. An empty one would be a broken URL in the markup.
    assert.equal('image' in data, false);
  });

  test('absolutises a cover image', () => {
    const data = blogPosting({ ...post, cover: '/blog/cover.png' }) as { image: string };
    assert.equal(data.image, 'https://titaniumsdk.com/blog/cover.png');
  });
});
