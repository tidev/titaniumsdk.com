import {
  CONTAINER_INDEXES,
  isValidSlug,
  MAX_DEPTH,
  RESERVED_ROOTS,
  reservedSegments,
  SECTIONS,
  sectionForLegacy,
  slugify,
  trimRedundantPrefix,
  VERSION_SEGMENT,
} from './ia.ts';
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

/**
 * The rules the docs tree is built on.
 *
 * The structure this replaces went four levels deep before reaching content,
 * one section at a time, because nothing stopped it. These are the checks that
 * stop it happening again.
 *
 * Updated for the approved IA (2026-09-04), which replaced the section list
 * derived from the legacy corpus.
 */

describe('sections', () => {
  test('have unique, URL-safe slugs', () => {
    const slugs = SECTIONS.map((s) => s.slug);
    assert.equal(new Set(slugs).size, slugs.length, 'duplicate section slug');
    for (const slug of slugs) assert.ok(isValidSlug(slug), `${slug} is not a valid slug`);
  });

  test('do not collide with a reserved root', () => {
    // `/docs/sdk/...` is the API reference. A section called `sdk` would
    // shadow it, and the failure would look like a missing type page.
    for (const slug of SECTIONS.map((s) => s.slug)) {
      assert.ok(!RESERVED_ROOTS.includes(slug as never), `${slug} is reserved`);
      assert.ok(!VERSION_SEGMENT.test(slug), `${slug} looks like a version prefix`);
    }
  });

  test('are themselves reserved, so no page can shadow one', () => {
    // Derived rather than listed: adding a section must reserve its name in the
    // same edit, or a page could later claim it and win silently.
    for (const slug of SECTIONS.map((s) => s.slug)) {
      assert.ok(reservedSegments().includes(slug), `${slug} is not reserved`);
    }
    for (const root of RESERVED_ROOTS) assert.ok(reservedSegments().includes(root));
  });

  test('have unique page slugs within each section', () => {
    for (const section of SECTIONS) {
      const slugs = section.pages.map((p) => p.slug);
      assert.equal(new Set(slugs).size, slugs.length, `duplicate page slug in ${section.slug}`);
      for (const page of section.pages) {
        const kids = (page.pages ?? []).map((c) => c.slug);
        assert.equal(new Set(kids).size, kids.length, `duplicate child slug in ${page.slug}`);
      }
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
      ['setup']
    );
  });

  test("are in the reader's order, not alphabetical", () => {
    // Setting up precedes building precedes shipping. Sorting these would put
    // Alloy first and Environment Setup fourth, which is nobody's journey.
    assert.deepEqual(
      SECTIONS.map((s) => s.slug),
      ['setup', 'build', 'alloy', 'distribute', 'reference', 'extend']
    );
  });
});

describe('sectionForLegacy', () => {
  test('matches a page and its directory from one prefix', () => {
    // Prefixes are written without `.md`, so `Editor_IDE/README.md` and
    // `Editor_IDE/VSCode_Extension/...` both resolve from `Editor_IDE`.
    assert.equal(sectionForLegacy('Editor_IDE/README.md')?.slug, 'setup');
    assert.equal(sectionForLegacy('Editor_IDE/VSCode_Extension/README.md')?.slug, 'setup');
  });

  test('prefers the longest prefix when sections nest', () => {
    // `Extending_Titanium_Mobile` sits inside territory `build` would otherwise
    // claim from `Titanium_SDK_How-tos`; `extend` wins by being more specific.
    assert.equal(
      sectionForLegacy('Titanium_SDK/Titanium_SDK_How-tos/Extending_Titanium_Mobile/README.md')
        ?.slug,
      'extend'
    );
    // And the general case still falls to `build`: using a module is a
    // building-apps topic, unlike writing one.
    assert.equal(
      sectionForLegacy('Titanium_SDK/Titanium_SDK_How-tos/Using_Modules/README.md')?.slug,
      'build'
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
  test('is three segments below /docs', () => {
    // `/docs/<section>/<page>/<page>`. `build/ui` and `build/data` are the only
    // groups large enough to earn the third level; a fourth would mean the
    // section is really two sections.
    assert.equal(MAX_DEPTH, 3);
  });

  test('no page in the tree exceeds it', () => {
    for (const section of SECTIONS) {
      for (const page of section.pages) {
        for (const child of page.pages ?? []) {
          assert.equal((child.pages ?? []).length, 0, `${child.slug} is a fourth level`);
        }
      }
    }
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
