import { contentFiles, guide, internalLinks, validateGuides } from './guides.ts';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { describe, test } from 'node:test';

/**
 * The pipeline end to end, over a fixture tree.
 *
 * These run the real loader, the real directive expansion and the real
 * renderer. The fixtures use real paths from `ia.ts` — `setup/macos` is a page
 * the approved IA defines — so the test also proves a file and its entry in the
 * structure agree.
 */

const FIXTURES = join(import.meta.dirname, '__fixtures__/docs');

/** Rendered text with the markup taken out, for assertions about content. */
const text = (html: string) => html.replace(/<[^>]*>/g, '');

describe('guide', () => {
  test('reads frontmatter and renders the body', () => {
    const page = guide(['setup', 'macos'], FIXTURES)!;
    assert.equal(page.title, 'macOS');
    assert.equal(page.path, '/docs/setup/macos');
    assert.deepEqual(page.platforms, ['macos', 'ios', 'android']);
    assert.match(page.html, /<h2 id="install-xcode">Install Xcode<\/h2>/);
  });

  test('splices a partial in and resolves it for the page platforms', () => {
    // Shiki splits a line into spans at its own token boundaries, and those
    // differ per grammar, so assert on the text rather than the markup.
    const mac = text(guide(['setup', 'macos'], FIXTURES)!.html);
    assert.match(mac, /sudo npm install -g titanium/);

    const win = text(guide(['setup', 'windows'], FIXTURES)!.html);
    assert.match(win, /npm install -g titanium/);
    assert.doesNotMatch(win, /sudo/);
  });

  test('a shared heading from the partial is anchored on both pages', () => {
    // The point of the partial: one source, and each page still gets a working
    // contents entry for it.
    for (const segments of [
      ['setup', 'macos'],
      ['setup', 'windows'],
    ]) {
      const page = guide(segments, FIXTURES)!;
      assert.ok(
        page.toc.some((h) => h.id === 'install-the-titanium-cli'),
        `${segments.join('/')} lost the partial's heading`
      );
    }
  });

  test('no directive syntax survives into the rendered HTML', () => {
    for (const segments of [
      ['setup', 'macos'],
      ['setup', 'windows'],
    ]) {
      assert.doesNotMatch(guide(segments, FIXTURES)!.html, /:::/);
    }
  });

  test('code from the partial is highlighted like any other block', () => {
    // Proof the partial is spliced before rendering rather than pasted after.
    assert.match(guide(['setup', 'macos'], FIXTURES)!.html, /<pre[^>]*class="[^"]*shiki/);
  });

  test('returns undefined for a page nobody has written', () => {
    assert.equal(guide(['setup', 'linux'], FIXTURES), undefined);
  });

  test('records the source path for the edit link', () => {
    const page = guide(['setup', 'macos'], FIXTURES)!;
    assert.match(page.sourcePath, /__fixtures__\/docs\/setup\/macos\.md$/);
    assert.ok(!page.sourcePath.startsWith('/'), 'should be repo-relative');
  });
});

describe('contentFiles', () => {
  test('lists pages and skips partials', () => {
    const found = contentFiles(FIXTURES).map((s) => s.join('/'));
    assert.deepEqual(found.sort(), ['setup/macos', 'setup/windows']);
  });
});

describe('validateGuides', () => {
  test('the fixture tree is clean', () => {
    assert.deepEqual(validateGuides(FIXTURES), []);
  });

  test('the real content tree is clean', () => {
    // Whatever is committed under content/docs must build. This is the check
    // that runs in CI.
    assert.deepEqual(validateGuides(), []);
  });
});

describe('internalLinks', () => {
  test('finds site-relative hrefs and ignores external ones', () => {
    const html =
      '<a href="/docs/setup/macos">a</a><a href="https://example.com">b</a><a href="#x">c</a>';
    assert.deepEqual(internalLinks(html), ['/docs/setup/macos']);
  });
});
