import {
  CONTAINER_INDEXES,
  isValidSlug,
  MAX_DEPTH,
  RESERVED_SEGMENTS,
  SECTIONS,
  sectionForLegacy,
  slugify,
  trimRedundantPrefix,
  VERSION_SEGMENT,
} from './ia.ts';
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

/**
 * The rules the docs tree is built on (TI-31).
 *
 * The structure this replaces went four levels deep before reaching content,
 * one section at a time, because nothing stopped it. These are the checks that
 * stop it happening again.
 */

describe('sections', () => {
  test('have unique, URL-safe slugs', () => {
    const slugs = SECTIONS.map((s) => s.slug);
    assert.equal(new Set(slugs).size, slugs.length, 'duplicate section slug');
    for (const slug of slugs) assert.ok(isValidSlug(slug), `${slug} is not a valid slug`);
  });

  test('do not collide with a reserved segment', () => {
    // `/docs/sdk/...` is the API reference. A section called `sdk` would
    // shadow it, and the failure would look like a missing type page.
    for (const slug of SECTIONS.map((s) => s.slug)) {
      assert.ok(!RESERVED_SEGMENTS.includes(slug as never), `${slug} is reserved`);
      assert.ok(!VERSION_SEGMENT.test(slug), `${slug} looks like a version prefix`);
    }
  });

  test('never claim the same legacy path from two sections', () => {
    // Two sections claiming one prefix would make the mapping depend on
    // declaration order, which is not a decision anyone made.
    const seen = new Map<string, string>();
    for (const section of SECTIONS) {
      for (const prefix of section.legacy) {
        const owner = seen.get(prefix);
        assert.equal(owner, undefined, `${prefix} claimed by ${owner} and ${section.slug}`);
        seen.set(prefix, section.slug);
      }
    }
  });

  test('offer exactly one tutorial', () => {
    // The entry point for someone who has never used Titanium. More than one
    // is a choice they are not equipped to make.
    assert.deepEqual(
      SECTIONS.filter((s) => s.kind === 'tutorial').map((s) => s.slug),
      ['start']
    );
  });
});

describe('sectionForLegacy', () => {
  test('matches a page and its directory from one prefix', () => {
    // Prefixes are written without `.md`, so `Editor_IDE/README.md` and
    // `Editor_IDE/VSCode_Extension/...` both resolve from `Editor_IDE`.
    assert.equal(sectionForLegacy('Editor_IDE/README.md')?.slug, 'tooling');
    assert.equal(sectionForLegacy('Editor_IDE/VSCode_Extension/README.md')?.slug, 'tooling');
  });

  test('prefers the longest prefix when sections nest', () => {
    // `Titanium_SDK/Titanium_SDK_How-tos/Using_Modules` sits inside territory
    // `build` would otherwise claim; `native` wins because it is more specific.
    assert.equal(
      sectionForLegacy('Titanium_SDK/Titanium_SDK_How-tos/Using_Modules/README.md')?.slug,
      'native'
    );
  });

  test('returns nothing for a path no section claims', () => {
    assert.equal(sectionForLegacy('Some/Unknown/Page.md'), undefined);
  });

  test('does not claim the navigational shells', () => {
    // These resolve to the docs landing instead; see CONTAINER_INDEXES.
    for (const container of CONTAINER_INDEXES) {
      assert.equal(sectionForLegacy(`${container}/README.md`), undefined, container);
    }
  });
});

describe('slugify', () => {
  test('turns a wiki page title into a URL segment', () => {
    assert.equal(slugify('Installing_the_Android_SDK.md'), 'installing-the-android-sdk');
    assert.equal(
      slugify('tiapp.xml_and_timodule.xml_Reference.md'),
      'tiapp-xml-and-timodule-xml-reference'
    );
  });

  test('keeps a proper noun whole rather than splitting on caps', () => {
    // `wkwebview` is what someone types looking for WKWebView. The wiki names
    // delimit with underscores already, so case carries no extra information.
    assert.equal(slugify('WKWebView.md'), 'wkwebview');
    assert.equal(slugify('Alloy_XML_Markup.md'), 'alloy-xml-markup');
  });

  test('produces something isValidSlug accepts', () => {
    for (const name of ['A_B.md', 'Objective-C_and_Objective-C++_Coding_Standards.md', 'GDPR.md']) {
      assert.ok(isValidSlug(slugify(name)), `${name} -> ${slugify(name)}`);
    }
  });
});

describe('depth', () => {
  test('is two segments below /docs', () => {
    // `/docs/<section>/<page>`. A third level means the section is really two
    // sections, or the page should be one page with headings.
    assert.equal(MAX_DEPTH, 2);
  });
});

describe('trimRedundantPrefix', () => {
  test('drops a prefix the section already says', () => {
    // `/docs/alloy/alloy-models` repeats itself; the path carries the section.
    assert.equal(trimRedundantPrefix('alloy-models', 'alloy'), 'models');
    assert.equal(trimRedundantPrefix('alloy-xml-markup', 'alloy'), 'xml-markup');
  });

  test('drops the product name', () => {
    assert.equal(trimRedundantPrefix('titanium-sdk-faq', 'reference'), 'faq');
  });

  test('leaves a name that only starts with the same word', () => {
    // `Titanium_and_Angular` must not become `and-angular`, which is why the
    // guard exists and why the rule is `titanium-sdk-` rather than `titanium-`.
    assert.equal(trimRedundantPrefix('titanium-and-angular', 'build'), 'titanium-and-angular');
    assert.equal(trimRedundantPrefix('alloy-and-backbone', 'alloy'), 'alloy-and-backbone');
  });

  test('never returns an empty slug', () => {
    assert.equal(trimRedundantPrefix('alloy', 'alloy'), 'alloy');
    assert.equal(trimRedundantPrefix('alloy-', 'alloy'), 'alloy-');
  });
});
