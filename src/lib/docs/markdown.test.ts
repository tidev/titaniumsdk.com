import { anchorFor, apiTarget, memberAnchor, pathLinker } from './links.ts';
import { renderMarkdown } from './markdown.ts';
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

/**
 * Cross-repo reference resolution, which is the half of the story the registry
 * cannot settle.
 *
 * docgen compiles one repository at a time, so a module's prose carries
 * `api:Modules.Map.View` and `api:Titanium.UI.View` side by side with nothing
 * to tell them apart. Which tree each belongs to is decided by the linker, and
 * these pin the three outcomes: an anchor on the page, a path into the SDK, and
 * no link at all.
 */

/** Stands in for a module page: its own types are anchors, the SDK's are paths. */
const moduleLike = (local: string[], sdk: string[]) => {
  const own = new Set(local);
  const other = new Set(sdk);
  return (type: string, member?: string) => {
    if (own.has(type)) return `#${member ? memberAnchor(type, member) : type}`;
    if (other.has(type)) return `/docs/sdk/main/${type}${member ? `#${anchorFor(member)}` : ''}`;
    return null;
  };
};

const link = moduleLike(['Modules.Map', 'Modules.Map.View'], ['Titanium.UI.View', 'Global.String']);

describe('apiTarget', () => {
  test('splits a type from a member', () => {
    assert.deepEqual(apiTarget('api:Modules.Map.View'), { type: 'Modules.Map.View' });
    assert.deepEqual(apiTarget('api:Modules.Map#NORMAL_TYPE'), {
      type: 'Modules.Map',
      member: 'NORMAL_TYPE',
    });
  });

  test('is not fooled by anything else in an href', () => {
    assert.equal(apiTarget('https://example.com/api:X'), null);
    assert.equal(apiTarget('#local'), null);
    assert.equal(apiTarget('./relative.md'), null);
  });
});

describe('renderMarkdown, module references', () => {
  test('resolves the module’s own types to anchors on the page', () => {
    const html = renderMarkdown('See [the view](api:Modules.Map.View#mapType).', { link });
    assert.match(html, /href="#Modules\.Map\.View\.mapType"/);
  });

  test('resolves SDK types into the SDK tree', () => {
    const html = renderMarkdown('Extends [a view](api:Titanium.UI.View).', { link });
    assert.match(html, /href="\/docs\/sdk\/main\/Titanium\.UI\.View"/);
  });

  test('drops the link, not the text, for a type nothing renders', () => {
    // Pseudo-types docgen folds into their referent emit no file, so a link
    // would be a 404. Eight references in the module corpus land here.
    const html = renderMarkdown('A [MapLocationTypeV2](api:MapLocationTypeV2) value.', { link });
    assert.doesNotMatch(html, /<a/);
    assert.match(html, /MapLocationTypeV2/);
  });

  test('rescues the ExtJS-era links the source still carries', () => {
    // 46 survive in the registry. Only the type reference has anywhere to go.
    assert.match(renderMarkdown('[x](#!/api/Titanium.UI.View)', { link }), /\/docs\/sdk\/main\//);
    assert.match(renderMarkdown('[x](#!/api/Anything-examples)', { link }), /href="#examples"/);
    assert.doesNotMatch(renderMarkdown('[installed](#!/guide/Using_a_Module)', { link }), /<a/);
    assert.match(renderMarkdown('[installed](#!/guide/Using_a_Module)', { link }), /installed/);
    // A member address for a type that no longer exists resolves to nothing.
    assert.doesNotMatch(renderMarkdown('[x](#!/api/GeoFences-method-create)', { link }), /<a/);
  });

  test('a bare path base still behaves like the SDK reference', () => {
    const html = renderMarkdown('[x](api:Titanium.UI.View#backgroundColor)', {
      link: pathLinker('/docs/sdk/main'),
    });
    assert.match(html, /href="\/docs\/sdk\/main\/Titanium\.UI\.View#backgroundColor"/);
  });
});

describe('renderMarkdown, third-party README', () => {
  const relative = {
    images: 'https://raw.githubusercontent.com/tidev/titanium-web-dialog/HEAD',
    links: 'https://github.com/tidev/titanium-web-dialog/blob/HEAD',
  };

  test('rewrites a relative image at the repository, not at this domain', () => {
    const html = renderMarkdown('<img src="./fixtures/example-screens.jpg">', { link, relative });
    assert.match(html, /src="https:\/\/raw\.githubusercontent\.com\/[^"]+\/fixtures\//);
  });

  test('rewrites a relative link and marks it as leaving the site', () => {
    const html = renderMarkdown('[the license](LICENSE)', { link, relative });
    assert.match(
      html,
      /href="https:\/\/github\.com\/tidev\/titanium-web-dialog\/blob\/HEAD\/LICENSE"/
    );
    assert.match(html, /rel="noopener noreferrer"/);
  });

  test('leaves absolute references and in-page anchors alone', () => {
    const html = renderMarkdown('[a](https://example.com) [b](#usage)', { link, relative });
    assert.match(html, /href="https:\/\/example\.com"/);
    assert.match(html, /href="#usage"/);
  });

  test('strips script from markdown nobody on this team wrote', () => {
    const html = renderMarkdown('Hi <script>alert(1)</script> there', { link });
    assert.doesNotMatch(html, /script|alert/);
  });
});
