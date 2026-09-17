import type { ApiType, Toolchain } from '../registry/index.ts';
import {
  cell,
  groupsFor,
  narrowedPlatforms,
  renderMatrix,
  renderToolchain,
  requirementSections,
  table,
  targetSection,
  type CompatSection,
  type MatrixRow,
} from './compat.ts';
import { renderInline, renderMarkdown } from './markdown.ts';
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

const row = (over: Partial<MatrixRow> = {}): MatrixRow => ({
  name: 'Titanium.UI.Color',
  platforms: ['android', 'iphone', 'ipad', 'macos'],
  since: '9.1.0',
  deprecated: false,
  partial: [],
  ...over,
});

const type = (over: Partial<ApiType> = {}): ApiType =>
  ({
    schemaVersion: 1,
    name: 'Titanium.UI.View',
    kind: 'view',
    platforms: ['android', 'iphone', 'ipad', 'macos'],
    properties: [],
    methods: [],
    events: [],
    inherited: { properties: [], methods: [], events: [] },
    source: 'Titanium/UI/View.yml',
    ...over,
  }) as ApiType;

describe('table', () => {
  test('pads every column to its widest cell, as oxfmt would', () => {
    // Not cosmetic: `pnpm fmt` reformats markdown, so a ragged table here would
    // be rewritten on disk and the next `docs:compat:check` would call the
    // generator's own output stale.
    assert.deepEqual(table(['SDK', 'Node.js'], [['13.4.1', '>=20.18.1']]), [
      '| SDK    | Node.js   |',
      '| ------ | --------- |',
      '| 13.4.1 | >=20.18.1 |',
    ]);
  });

  test('a rule is never shorter than three dashes', () => {
    assert.deepEqual(table(['A'], [['b']]), ['| A   |', '| --- |', '| b   |']);
  });
});

describe('groupsFor', () => {
  test('groups on the second segment and folds small namespaces into the root', () => {
    const groups = groupsFor([
      'Titanium.UI.View',
      'Titanium.UI.Window',
      'Titanium.UI.Label',
      'Titanium.UI.Button',
      // One type under its namespace does not earn a heading of its own.
      'Titanium.Gesture',
      'Titanium.Locale',
    ]);
    assert.deepEqual([...groups.keys()], ['Titanium', 'Titanium.UI']);
    assert.deepEqual(groups.get('Titanium'), ['Titanium.Gesture', 'Titanium.Locale']);
  });

  test('groups on the second segment only, however deep the name is', () => {
    // Titanium.UI.iOS is a namespace of its own in the reference, and splitting
    // it out would put a heading of iOS-only views beside Titanium.UI for no
    // reason a reader scanning the page would predict.
    const groups = groupsFor([
      'Titanium.UI.View',
      'Titanium.UI.Window',
      'Titanium.UI.Label',
      'Titanium.UI.iOS.BlurView',
    ]);
    assert.deepEqual([...groups.keys()], ['Titanium.UI']);
  });

  test('names outside a known root land in one alphabetical group, listed last', () => {
    const groups = groupsFor(['Point', 'fs', 'Titanium.UI.View', 'buffer.Buffer']);
    assert.equal([...groups.keys()].at(-1), 'Other types');
    assert.deepEqual(groups.get('Other types'), ['buffer.Buffer', 'fs', 'Point']);
  });
});

describe('narrowedPlatforms', () => {
  test('reports a platform the type has that a member does not', () => {
    const narrowed = narrowedPlatforms(
      type({
        properties: [{ name: 'blurRadius', platforms: ['iphone', 'ipad', 'macos'] }],
      } as Partial<ApiType>)
    );
    assert.deepEqual(narrowed, ['android']);
  });

  test('inherited members narrow too, using the reference platforms', () => {
    // The reference carries platforms already narrowed to the inheriting type,
    // so an inherited member can be narrower here than on the type declaring it.
    const narrowed = narrowedPlatforms(
      type({
        inherited: {
          properties: [{ name: 'backgroundColor', from: 'Titanium.UI.View', platforms: ['macos'] }],
          methods: [],
          events: [],
        },
      } as Partial<ApiType>)
    );
    assert.deepEqual(narrowed, ['android', 'iphone', 'ipad']);
  });

  test('a type whose members all match it is not narrowed', () => {
    const narrowed = narrowedPlatforms(
      type({
        methods: [{ name: 'add', platforms: ['android', 'iphone', 'ipad', 'macos'] }],
      } as Partial<ApiType>)
    );
    assert.deepEqual(narrowed, []);
  });
});

describe('cell', () => {
  test('an unavailable platform reads as absent rather than as blank', () => {
    assert.equal(cell(row({ platforms: ['iphone', 'ipad', 'macos'] }), 'android'), '-');
  });

  test('a per-platform since map is read per platform', () => {
    // 91 types arrived on different platforms in different releases, and
    // flattening that to one column would have to pick one of them to print.
    const intl = row({
      since: { iphone: '6.0.0', ipad: '6.0.0', android: '9.1.0', macos: '9.2.0' },
    });
    assert.equal(cell(intl, 'android'), '9.1.0');
    assert.equal(cell(intl, 'iphone'), '6.0.0');
  });

  test('an available type with no recorded release still says it is available', () => {
    assert.equal(cell(row({ since: undefined }), 'android'), 'yes');
  });

  test('a platform with narrower members is marked', () => {
    assert.equal(cell(row({ partial: ['macos'] }), 'macos'), '9.1.0 \\*');
    assert.equal(cell(row({ partial: ['macos'] }), 'android'), '9.1.0');
  });
});

describe('renderMatrix', () => {
  const matrix = {
    version: '13.4.1',
    members: 10395,
    rows: [row(), row({ name: 'Titanium.UI.Window', deprecated: true, partial: ['android'] })],
  };

  test('names the version it was generated from', () => {
    assert.match(renderMatrix(matrix, '<!-- x -->'), /Titanium SDK 13\.4\.1/);
  });

  test('links every type at its unversioned reference page', () => {
    assert.match(
      renderMatrix(matrix, '<!-- x -->'),
      /\[Titanium\.UI\.Color\]\(\/docs\/sdk\/Titanium\.UI\.Color\)/
    );
  });

  test('renders as a table rather than as escaped pipes', () => {
    const html = renderMarkdown(renderMatrix(matrix, '<!-- x -->'), {});
    assert.match(html, /<table>/);
    assert.match(html, /<th>macOS<\/th>/);
    // The narrowing mark has to survive markdown as a literal asterisk; an
    // unescaped one opens emphasis and eats the rest of the row.
    assert.match(html, /<td>9\.1\.0 \*<\/td>/);
  });
});

describe('renderToolchain', () => {
  const CLI = [
    { version: '8.0.0', node: '>=20.18.1' },
    { version: '9.0.0', node: '>=22.19.0' },
  ];

  const at = (version: string, node: string, java: string): Toolchain => ({
    schemaVersion: 1,
    version,
    source: { repo: 'tidev/titanium-sdk', ref: version, commit: 'a'.repeat(40) },
    node,
    android: { minSdkVersion: '24', compileSdkVersion: '36', vendor: { java } },
    ios: { minIosVersion: '15.0', vendor: { xcode: '>=15.0 <=26.x' } },
  });

  test('a range with pipes survives as one table cell', () => {
    // `16.x || 18.x || 20.x` is a real value. Unescaped, its pipes end the cell
    // and every row after it is off by two columns.
    const html = renderMarkdown(
      renderToolchain([at('12.8.0', '16.x || 18.x || 20.x', '>=11.x')], CLI, '<!-- x -->'),
      {}
    );
    assert.match(html, /<code>16\.x \|\| 18\.x \|\| 20\.x<\/code>/);
    assert.doesNotMatch(html, /<td>`16\.x<\/td>/);
  });

  test('a newline in a captured value cannot end the row', () => {
    // `vendorDependencies` is the SDK's to shape and this repository transcribes
    // it verbatim, so a wrapped value is the SDK's to introduce. A pipe can be
    // escaped; a newline cannot, so it has to be folded before it is written.
    const wrapped = at('13.4.1', '>=20.18.1', '>=17.x\n  || >=21.x');
    const out = renderToolchain([wrapped], CLI, '');
    assert.doesNotMatch(out.split('### What each release needs')[1], /\n\s*\|\| >=21/);
    assert.match(renderMarkdown(out, {}), /<code>&gt;=17\.x \|\| &gt;=21\.x<\/code>/);
  });

  test('a pipe in a vendor key cannot end the row either', () => {
    const odd: Toolchain = {
      schemaVersion: 1,
      version: '13.4.1',
      source: { repo: 'tidev/titanium-sdk', ref: '13.4.1', commit: 'c'.repeat(40) },
      android: { vendor: { 'build|tools': '35.x' } },
      ios: { vendor: {} },
    };
    assert.match(renderToolchain([odd], CLI, ''), /\| Build\\\|tools /);
  });

  test('the current release is the newest that is not main', () => {
    const out = renderToolchain(
      [at('main', '>=22.19.0', '>=17.x'), at('13.4.1', '>=20.18.1', '>=17.x')],
      CLI,
      ''
    );
    assert.match(out, /### Titanium SDK 13\.4\.1/);
    assert.match(out, /\[`main`\]\(\/docs\/sdk\/main\) \(unreleased\)/);
  });

  const withDeclared = (t: Toolchain, declared: string): Toolchain => ({ ...t, declared });

  test('main leads the tables, named with the version it will become', () => {
    const out = renderToolchain(
      [
        withDeclared(at('main', '>=22.19.0', '>=17.x'), '14.0.0'),
        at('13.4.1', '>=20.18.1', '>=17.x'),
      ],
      CLI,
      ''
    );
    assert.match(out, /\[`main`\]\(\/docs\/sdk\/main\) \(14\.0\.0, unreleased\)/);
    // The headline still describes the newest release, not the tree.
    assert.match(out, /### Titanium SDK 13\.4\.1/);

    const rows = out.split('\n').filter((line) => /^\| (\[`main`\]|\*\*\[)/.test(line));
    assert.equal(rows.length, 4, 'two tables of two rows');
    for (const [i, line] of rows.entries()) {
      assert.equal(line.includes('`main`'), i % 2 === 0, `row ${i} should lead its table`);
    }
  });

  // The window between a release shipping and `main` being bumped past it. The
  // row would repeat the release above it while calling itself unreleased.
  test('main is dropped when it is not ahead of the newest release', () => {
    const out = renderToolchain(
      [
        withDeclared(at('main', '>=20.18.1', '>=17.x'), '13.4.1'),
        at('13.4.1', '>=20.18.1', '>=17.x'),
      ],
      CLI,
      ''
    );
    assert.equal(out.includes('`main`'), false);
    assert.match(out, /\*\*\[13\.4\.1\]\(\/docs\/sdk\/13\.4\.1\)\*\*/);
  });

  // Captured before `declared` was recorded. Hiding the development tree for
  // want of a comparison is worse than showing it without one.
  test('main with no declared version is kept, and says only that it is unreleased', () => {
    const out = renderToolchain(
      [at('main', '>=22.19.0', '>=17.x'), at('13.4.1', '>=20.18.1', '>=17.x')],
      CLI,
      ''
    );
    assert.match(out, /\[`main`\]\(\/docs\/sdk\/main\) \(unreleased\)/);
  });

  test('the newest release is marked latest, and main never is', () => {
    const out = renderToolchain(
      [
        withDeclared(at('main', '>=22.19.0', '>=17.x'), '14.0.0'),
        at('13.4.1', '>=20.18.1', '>=17.x'),
        at('13.4.0', '>=20.18.1', '>=17.x'),
      ],
      CLI,
      ''
    );
    assert.match(out, /\*\*\[13\.4\.1\]\(\/docs\/sdk\/13\.4\.1\)\*\* \(latest\)/);
    assert.equal(/\*\*\[13\.4\.0\]\([^)]*\)\*\* \(latest\)/.test(out), false);
    assert.equal(/unreleased\) \(latest\)|`main`[^|]*latest/.test(out), false);
  });

  // `main` alone stands in as `current` for the summary. Marking it latest
  // would contradict the word "unreleased" beside it in the same cell.
  test('main alone is not marked latest', () => {
    const out = renderToolchain(
      [withDeclared(at('main', '>=22.19.0', '>=17.x'), '14.0.0')],
      CLI,
      ''
    );
    assert.equal(out.includes('(latest)'), false);
  });

  test('a missing value reads as absent rather than as an empty cell', () => {
    const bare: Toolchain = {
      schemaVersion: 1,
      version: '9.0.0',
      source: { repo: 'tidev/titanium-sdk', ref: '9.0.0', commit: 'b'.repeat(40) },
      android: { vendor: {} },
      ios: { vendor: {} },
    };
    const out = renderToolchain([bare], CLI, '');
    assert.match(out, /\| Node\.js +\| - +\|/);
  });
});

describe('the per-version page (TI-94)', () => {
  const CLI = [
    { version: '8.0.0', node: '>=20.18.1' },
    { version: '9.0.0', node: '>=22.19.0' },
  ];

  const full: Toolchain = {
    schemaVersion: 1,
    version: '13.4.1',
    source: { repo: 'tidev/titanium-sdk', ref: '13.4.1', commit: 'a'.repeat(40) },
    node: '>=20.18.1',
    cli: '>=3.2.1',
    android: {
      minSdkVersion: '24',
      compileSdkVersion: '36',
      // Authored in the SDK's own order, which puts java last.
      vendor: {
        'android sdk': '>=23.x <=36.x',
        'android build tools': '>=30.0.2 <=35.x',
        'android ndk': '>=r21 <=r22b',
        java: '>=17.x',
      },
    },
    ios: {
      minIosVersion: '15.0',
      minWatchosVersion: '8.0',
      vendor: { 'ios sdk': '>=17.0 <=26.x', xcode: '>=15.0 <=26.x' },
    },
  };

  const rowsOf = (sections: CompatSection[], title: string) =>
    sections.find((s) => s.title === title)?.rows ?? [];

  test('reads Java first, whatever order the SDK authored it in', () => {
    // The fixture lists java last, as 13.4.1 really does. It is the component a
    // reader checks first, so a package.json's authoring order must not decide
    // the reading order.
    const android = rowsOf(requirementSections(full, CLI), 'Android');
    assert.equal(android[0]?.label, 'Java (JDK)');
    assert.deepEqual(
      android.map((r) => r.label),
      ['Java (JDK)', 'Android SDK', 'Android build tools', 'Android NDK']
    );
  });

  test('a vendor key this file has never heard of still gets a row', () => {
    // `ToolchainSchema` keeps `vendor` loose because the key set is the SDK's
    // to change. A release adding a component must appear rather than vanish
    // until someone edits VENDOR_ORDER.
    const withNew: Toolchain = {
      ...full,
      android: { ...full.android, vendor: { ...full.android.vendor, 'android cmake': '>=3.22' } },
    };
    const labels = rowsOf(requirementSections(withNew, CLI), 'Android').map((r) => r.label);
    assert.ok(labels.includes('Android cmake'), labels.join(', '));
    // Appended, not interleaved: the known order is the one that was reasoned
    // about, so an unknown key goes after it rather than into the middle of it.
    assert.equal(labels.at(-1), 'Android cmake');
  });

  test('ranges are passed through exactly as the release declares them', () => {
    // Not paraphrased, and not escaped. `cellSafe` exists for markdown table
    // cells; JSX has no such hazard, and escaping here would put literal
    // backslashes on the page.
    const piped: Toolchain = { ...full, node: '16.x || 18.x || 20.x' };
    const machine = rowsOf(requirementSections(piped, CLI), 'Your machine');
    assert.equal(machine.find((r) => r.label === 'Node.js')?.value, '16.x || 18.x || 20.x');

    const android = rowsOf(requirementSections(full, CLI), 'Android');
    assert.equal(android.find((r) => r.label === 'Android SDK')?.value, '>=23.x <=36.x');
  });

  test('the CLI floor is the one minimumCli decides, not the range the SDK states', () => {
    // 13.4.1's commands ask only for >=3.2.1, but a CLI whose own Node floor is
    // below the SDK's would start on a Node the SDK cannot build under. See
    // cli-support.ts.
    const machine = rowsOf(requirementSections(full, CLI), 'Your machine');
    assert.equal(machine.find((r) => r.label === 'Titanium CLI')?.value, '>=8.0.0');
  });

  test('a platform the release says nothing about gets no heading', () => {
    // An "iOS" heading over an empty list reads as "no iOS requirements",
    // which is the opposite of "this capture has none".
    const noIos: Toolchain = { ...full, ios: { vendor: {} } };
    const titles = requirementSections(noIos, CLI).map((s) => s.title);
    assert.deepEqual(titles, ['Your machine', 'Android']);
  });

  test('build-for floors are separate from build-with tools', () => {
    // The distinction the legacy matrix blurred: a device below the minimum
    // API cannot run the output however current the build machine is.
    const rows = targetSection(full).rows;
    assert.deepEqual(
      rows.map((r) => [r.label, r.value]),
      [
        ['Minimum Android API', '24'],
        ['Compiles against Android API', '36'],
        ['Minimum iOS', '15.0'],
        ['Minimum watchOS', '8.0'],
      ]
    );
  });

  test('an unstated floor is dropped rather than rendered empty', () => {
    const bare: Toolchain = {
      schemaVersion: 1,
      version: '9.0.0',
      source: { repo: 'tidev/titanium-sdk', ref: '9.0.0', commit: 'b'.repeat(40) },
      android: { vendor: {} },
      ios: { vendor: {} },
    };
    assert.deepEqual(targetSection(bare).rows, []);
    // And with nothing on either platform, only the machine section survives -
    // where the CLI row is still worth stating if a Node floor is known.
    assert.deepEqual(
      requirementSections(bare, CLI).map((s) => s.title),
      []
    );
  });

  test('every note is renderable inline, since the page renders them as markdown', () => {
    const notes = [
      ...requirementSections(full, CLI).flatMap((s) => s.rows),
      ...targetSection(full).rows,
    ]
      .map((r) => r.note)
      .filter((n): n is string => Boolean(n));

    assert.ok(notes.length > 0);
    for (const note of notes) {
      const html = renderInline(note, {});
      // renderInline strips the wrapping paragraph; a note that came back as a
      // block would land in the page as nested block elements inside a <p>.
      assert.equal(html.includes('<p>'), false, note);
      assert.ok(html.length > 0, note);
    }
  });
});
