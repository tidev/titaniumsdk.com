import { renderCallouts } from './callouts.ts';
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

/** What markdown-it produces for `> [!KIND]\n> body`. */
const quoted = (kind: string, body: string) =>
  `<blockquote>\n<p>[!${kind}]\n${body}</p>\n</blockquote>`;

describe('renderCallouts', () => {
  test('rewrites each supported kind', () => {
    for (const [kind, label] of [
      ['NOTE', 'Note'],
      ['TIP', 'Tip'],
      ['IMPORTANT', 'Important'],
      ['WARNING', 'Warning'],
      ['CAUTION', 'Caution'],
      ['DEPRECATED', 'Deprecated'],
    ]) {
      const out = renderCallouts(quoted(kind, 'Body text.'));
      assert.match(out, new RegExp(`class="callout callout-${kind.toLowerCase()}"`));
      assert.match(out, new RegExp(`<p class="callout-label">${label}</p>`));
      assert.match(out, /Body text\./);
      assert.doesNotMatch(out, /\[!/, 'the marker should not survive into the output');
    }
  });

  test('leaves an ordinary blockquote alone', () => {
    const plain = '<blockquote>\n<p>Just a quotation.</p>\n</blockquote>';
    assert.equal(renderCallouts(plain), plain);
  });

  test('leaves an unknown kind alone rather than inventing a callout', () => {
    const odd = quoted('SHOUT', 'Body.');
    assert.equal(renderCallouts(odd), odd);
  });

  test('keeps inline markup in the body', () => {
    const out = renderCallouts(quoted('WARNING', 'Use <code>open()</code> first.'));
    assert.match(out, /<code>open\(\)<\/code>/);
  });

  test('rewrites several callouts in one document', () => {
    const out = renderCallouts(`${quoted('NOTE', 'One.')}\n${quoted('TIP', 'Two.')}`);
    assert.equal((out.match(/class="callout /g) ?? []).length, 2);
    assert.doesNotMatch(out, /blockquote/);
  });
});
