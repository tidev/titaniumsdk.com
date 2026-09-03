import { resultDetail } from './result-detail.ts';
import assert from 'node:assert/strict';
import test from 'node:test';

test('drops a leading title that the excerpt repeats', () => {
  // Symbol records index the name twice — qualified then bare — so Pagefind's
  // excerpt opens by restating the line above it.
  const detail = resultDetail(
    'Titanium.UI.createWindow',
    'Titanium.UI.createWindow createWindow Creates and returns an instance.'
  );
  assert.deepEqual(detail, { text: 'Creates and returns an instance.' });
});

test('drops the qualified name even when the bare name is absent', () => {
  const detail = resultDetail('Titanium.UI.View', 'Titanium.UI.View A drawing surface.');
  assert.deepEqual(detail, { text: 'A drawing surface.' });
});

test('keeps the highlighted html when the excerpt does not start with the title', () => {
  const excerpt = 'a <mark>window</mark> is a container';
  assert.deepEqual(resultDetail('Titanium.UI.Window', excerpt), { html: excerpt });
});

test('matching is case insensitive', () => {
  assert.deepEqual(resultDetail('Titanium.UI.View', 'titanium.ui.view Something.'), {
    text: 'Something.',
  });
});

test('returns null rather than an empty line when nothing survives the trim', () => {
  assert.equal(resultDetail('Titanium.UI.View', 'Titanium.UI.View'), null);
});

test('returns null for a record with no excerpt', () => {
  assert.equal(resultDetail('Anything', ''), null);
});

test('a title with regex characters is matched literally', () => {
  // Names carry dots, and `.` in an unescaped pattern would match anything.
  assert.deepEqual(resultDetail('a.b', 'axb Something.'), { html: 'axb Something.' });
});
