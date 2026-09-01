import {
  allPosts,
  CATEGORIES,
  PAGE_SIZE,
  pageCount,
  postBySlug,
  postsOnPage,
  publishedPosts,
  RESERVED_SLUGS,
} from './posts.ts';
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

/**
 * The blog's invariants, checked against the real committed posts.
 *
 * These 50 were migrated from tidev.io rather than written here, so the parse
 * is the only thing standing between a malformed frontmatter block and a build
 * that ships a post with no date.
 */

describe('posts', () => {
  const posts = allPosts();

  test('every committed post parses', () => {
    assert.ok(posts.length >= 50, `expected the migrated archive, got ${posts.length}`);
  });

  test('are ordered newest first, with a total order', () => {
    for (let i = 1; i < posts.length; i++) {
      const prev = posts[i - 1];
      const cur = posts[i];
      const ordered = prev.date > cur.date || (prev.date === cur.date && prev.slug < cur.slug);
      assert.ok(ordered, `${prev.slug} (${prev.date}) should precede ${cur.slug} (${cur.date})`);
    }
  });

  test('carry a category from the fixed taxonomy', () => {
    for (const post of posts) {
      assert.ok(CATEGORIES.includes(post.category), `${post.slug}: ${post.category}`);
    }
  });

  test('name at least one author', () => {
    for (const post of posts) assert.ok(post.authors.length, `${post.slug} has no author`);
  });

  test('never take a slug the routes already claim', () => {
    // `/blog/page/2` and `/blog/[slug]` share a namespace, and a static segment
    // wins — a post called `page` would silently never render.
    for (const post of posts) {
      assert.ok(!RESERVED_SLUGS.includes(post.slug as never), `${post.slug} is a reserved route`);
    }
  });
});

describe('drafts', () => {
  test('are excluded from what the index and feed read', () => {
    const drafts = allPosts().filter((p) => p.draft);
    const published = publishedPosts();
    for (const draft of drafts) {
      assert.ok(!published.includes(draft), `${draft.slug} leaked into publishedPosts`);
    }
    assert.equal(published.length, allPosts().length - drafts.length);
  });

  test('are still reachable by slug, so they can be reviewed', () => {
    const [first] = allPosts();
    assert.equal(postBySlug(first.slug)?.slug, first.slug);
  });
});

describe('pagination', () => {
  test('covers every published post exactly once', () => {
    const seen = new Set<string>();
    for (let page = 1; page <= pageCount(); page++) {
      for (const post of postsOnPage(page)) {
        assert.ok(!seen.has(post.slug), `${post.slug} appears on two pages`);
        seen.add(post.slug);
      }
    }
    assert.equal(seen.size, publishedPosts().length);
  });

  test('fills every page but the last', () => {
    for (let page = 1; page < pageCount(); page++) {
      assert.equal(postsOnPage(page).length, PAGE_SIZE, `page ${page} is short`);
    }
  });

  test('has no page beyond the count', () => {
    assert.equal(postsOnPage(pageCount() + 1).length, 0);
  });
});
