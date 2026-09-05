import { withHeadingAnchors } from './headings.ts';
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

describe('withHeadingAnchors', () => {
  test('anchors h2 and h3 and builds the contents list', () => {
    const { html, toc } = withHeadingAnchors(
      '<h2>Install the CLI</h2><p>x</p><h3>On macOS</h3><h2>Next steps</h2>'
    );
    assert.match(html, /<h2 id="install-the-cli">Install the CLI<\/h2>/);
    assert.match(html, /<h3 id="on-macos">On macOS<\/h3>/);
    assert.deepEqual(toc, [
      { id: 'install-the-cli', text: 'Install the CLI', level: 2 },
      { id: 'on-macos', text: 'On macOS', level: 3 },
      { id: 'next-steps', text: 'Next steps', level: 2 },
    ]);
  });

  test('h1 and h4 are left alone', () => {
    const source = '<h1>Title</h1><h4>Aside</h4>';
    const { html, toc } = withHeadingAnchors(source);
    assert.equal(html, source);
    assert.deepEqual(toc, []);
  });

  test('duplicate headings get distinct ids', () => {
    // Two "Android" subsections under different parents is completely normal,
    // and duplicate ids would send in-page links to whichever came first.
    const { html, toc } = withHeadingAnchors('<h3>Android</h3><h3>Android</h3><h3>Android</h3>');
    assert.match(html, /id="android"/);
    assert.match(html, /id="android-2"/);
    assert.match(html, /id="android-3"/);
    assert.deepEqual(
      toc.map((h) => h.id),
      ['android', 'android-2', 'android-3']
    );
  });

  test('inline markup is stripped from the anchor and the label', () => {
    const { html, toc } = withHeadingAnchors('<h2>Using <code>tiapp.xml</code></h2>');
    assert.match(html, /id="using-tiapp-xml"/);
    assert.equal(toc[0].text, 'Using tiapp.xml');
    // The markup itself survives in the rendered heading.
    assert.match(html, /<code>tiapp\.xml<\/code>/);
  });

  test('an explicit id is kept, and still counts for uniqueness', () => {
    const { html, toc } = withHeadingAnchors('<h2 id="legacy-anchor">Setup</h2><h2>Setup</h2>');
    assert.match(html, /<h2 id="legacy-anchor">Setup<\/h2>/);
    assert.equal(toc[0].id, 'legacy-anchor');
    assert.equal(toc[1].id, 'setup');
  });

  test('entities are decoded for the label', () => {
    const { toc } = withHeadingAnchors('<h2>Certificates &amp; provisioning</h2>');
    assert.equal(toc[0].text, 'Certificates & provisioning');
    assert.equal(toc[0].id, 'certificates-provisioning');
  });

  test('a heading with no word characters still gets an anchor', () => {
    const { html, toc } = withHeadingAnchors('<h2>!!!</h2>');
    assert.match(html, /id="section-2"/);
    assert.equal(toc.length, 1);
  });
});
