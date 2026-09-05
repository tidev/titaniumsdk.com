import { DirectiveError, expandDirectives, referencedPartials } from './partials.ts';
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

const partials: Record<string, string> = {
  'install-cli': [
    'Install the CLI:',
    '',
    ':::only macos, linux',
    '```sh',
    'sudo npm i -g titanium',
    '```',
    ':::',
    ':::only windows',
    '```powershell',
    'npm i -g titanium',
    '```',
    ':::',
  ].join('\n'),
  outer: 'before\n:::include install-cli\nafter',
  'cycle-a': ':::include cycle-b',
  'cycle-b': ':::include cycle-a',
};
const readPartial = (name: string) => partials[name];

describe('expandDirectives', () => {
  test('keeps only the blocks matching the page platforms', () => {
    const mac = expandDirectives(':::include install-cli', {
      platforms: ['macos', 'ios'],
      readPartial,
    });
    assert.match(mac, /sudo npm i -g titanium/);
    assert.doesNotMatch(mac, /powershell/);

    const win = expandDirectives(':::include install-cli', {
      platforms: ['windows'],
      readPartial,
    });
    assert.match(win, /powershell/);
    assert.doesNotMatch(win, /sudo/);
  });

  test('no directive fences survive into the rendered source', () => {
    const out = expandDirectives(':::include install-cli', {
      platforms: ['macos'],
      readPartial,
    });
    assert.doesNotMatch(out, /:::/);
  });

  test('a page with no declared platforms keeps every block', () => {
    // Losing content silently because frontmatter was incomplete would be the
    // worst possible failure mode here.
    const out = expandDirectives(':::include install-cli', { readPartial });
    assert.match(out, /sudo npm i -g titanium/);
    assert.match(out, /powershell/);
  });

  test('partials may include other partials', () => {
    const out = expandDirectives(':::include outer', { platforms: ['windows'], readPartial });
    assert.match(out, /before/);
    assert.match(out, /powershell/);
    assert.match(out, /after/);
  });

  test('an include cycle names the chain instead of overflowing', () => {
    assert.throws(
      () => expandDirectives(':::include cycle-a', { readPartial }),
      (e: Error) => e instanceof DirectiveError && /cycle-a -> cycle-b -> cycle-a/.test(e.message)
    );
  });

  test('a missing partial fails rather than rendering nothing', () => {
    assert.throws(
      () => expandDirectives(':::include nope', { readPartial }),
      (e: Error) => e instanceof DirectiveError && /no such partial: nope/.test(e.message)
    );
  });

  test('an unclosed block fails with the line it was opened on', () => {
    assert.throws(
      () => expandDirectives('a\n:::only macos\nb', { platforms: ['macos'] }),
      (e: Error) =>
        e instanceof DirectiveError && /unclosed :::only opened at line 2/.test(e.message)
    );
  });

  test('nesting is rejected rather than mis-parsed', () => {
    assert.throws(
      () => expandDirectives(':::only macos\n:::only ios\nx\n:::\n:::', { platforms: ['macos'] }),
      (e: Error) => e instanceof DirectiveError && /nested :::only/.test(e.message)
    );
  });

  test('a slug is the only include form, so no path can escape the directory', () => {
    const attempts = [':::include ../../secrets', ':::include /etc/passwd', ':::include a/b'];
    for (const attempt of attempts) {
      // Not a valid directive, so it is left as literal text rather than read.
      assert.equal(expandDirectives(attempt, { readPartial }), attempt);
    }
  });

  test('ordinary content is untouched', () => {
    const source = '# Title\n\nSome prose with ::: in it? No.\n';
    assert.equal(expandDirectives(source, { platforms: ['macos'] }), source);
  });
});

describe('referencedPartials', () => {
  test('lists each partial once', () => {
    const source = ':::include a\ntext\n:::include b\n:::include a';
    assert.deepEqual(referencedPartials(source), ['a', 'b']);
  });
});
