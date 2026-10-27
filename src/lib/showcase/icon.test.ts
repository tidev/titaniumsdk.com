import { ICON_MAX_BYTES, imagesByApp, MAX_SCREENSHOTS, publishedFiles, readIcons } from './icon.ts';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, test } from 'node:test';

/**
 * What may be published beside a showcase entry.
 *
 * The format and size rules are shared with the directory and covered by
 * `../directory/avatar.test.ts`; what is tested here is the part that differs.
 * An icon is required rather than optional, and an entry may carry numbered
 * screenshots, which have to be found in order, capped, and refused with a
 * reason when they are numbered wrong rather than as unexplained orphans.
 */

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

const dirs: string[] = [];

/** A throwaway directory holding the given files. */
function folder(files: Record<string, Buffer>): string {
  const dir = mkdtempSync(join(tmpdir(), 'showcase-icons-'));
  dirs.push(dir);
  for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, name), body);
  return dir;
}

after(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

const problemsIn = (dir: string, ids: string[]) => readIcons(dir, ids).problems.join('\n');

describe('an icon is required', () => {
  test('an entry with one is found', () => {
    const dir = folder({ 'harbour.png': PNG, 'harbour.json': Buffer.from('{}') });
    const { icons, problems } = readIcons(dir, ['harbour']);
    assert.deepEqual(problems, []);
    assert.deepEqual([...icons], [['harbour', 'harbour.png']]);
  });

  test('an entry without one fails, and the message says what to commit', () => {
    const problems = problemsIn(folder({ 'harbour.json': Buffer.from('{}') }), ['harbour']);
    assert.match(problems, /harbour\.json: every app needs an icon/);
    assert.match(problems, /"harbour\.png"/);
  });

  test('a rejected file is reported before the gap it causes', () => {
    // The pair is the useful reading: the .svg line explains the missing icon
    // on the line under it.
    const problems = readIcons(folder({ 'harbour.svg': Buffer.alloc(8) }), ['harbour']).problems;
    assert.equal(problems.length, 2);
    assert.match(problems[0], /\.svg is not published here/);
    assert.match(problems[1], /every app needs an icon/);
  });

  test('an empty showcase has nothing missing', () => {
    assert.deepEqual(readIcons(folder({}), []).problems, []);
  });
});

describe('screenshots', () => {
  test('numbered files beside an entry are its screenshots, in numbered order', () => {
    // Written out of order on purpose: the folder listing is alphabetical, and
    // the page has to show them in the order the submitter numbered them.
    const dir = folder({
      'harbour.png': PNG,
      'harbour-3.png': PNG,
      'harbour-1.webp': PNG.subarray(0, 0),
      'harbour-2.png': PNG,
    });
    // An empty .webp is refused, which also shows a bad screenshot does not
    // take the icon or the other screenshots down with it.
    const { icons, screenshots, problems } = readIcons(dir, ['harbour']);
    assert.deepEqual([...icons], [['harbour', 'harbour.png']]);
    assert.deepEqual([...screenshots], [['harbour', ['harbour-2.png', 'harbour-3.png']]]);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /harbour-1\.webp/);
  });

  test('an entry without any has no screenshots rather than an empty list', () => {
    const { screenshots } = readIcons(folder({ 'harbour.png': PNG }), ['harbour']);
    assert.equal(screenshots.size, 0);
  });

  test(`more than ${MAX_SCREENSHOTS} is refused, and the message says the numbering`, () => {
    const files = Object.fromEntries(
      Array.from({ length: MAX_SCREENSHOTS + 1 }, (_, i) => [`harbour-${i + 1}.png`, PNG])
    );
    const problems = problemsIn(folder({ 'harbour.png': PNG, ...files }), ['harbour']);
    assert.match(problems, /harbour-6\.png: an app carries at most 5 screenshots/);
    assert.match(problems, /"harbour-1" to "harbour-5"/);
    assert.match(problems, /docs\/app-showcase\.md/);
  });

  test('numbering from zero is refused with the same hint', () => {
    const problems = problemsIn(folder({ 'harbour.png': PNG, 'harbour-0.png': PNG }), ['harbour']);
    assert.match(problems, /harbour-0\.png: an app carries at most/);
  });

  test('a numbered file belonging to nothing is still a plain orphan', () => {
    // Nothing called `ghost` exists, so this is a misnamed file rather than
    // somebody adding screenshots, and guessing otherwise would misdirect them.
    const problems = problemsIn(folder({ 'ghost-1.png': PNG }), ['harbour']);
    assert.match(problems, /no app called "ghost-1"/);
  });

  test('an ordinary orphan is unaffected', () => {
    const problems = problemsIn(folder({ 'harbour.png': PNG, 'stray.png': PNG }), ['harbour']);
    assert.match(problems, /no app called "stray"/);
  });

  test('a screenshot over the cap is told a screenshot size, an icon an icon size', () => {
    const big = Buffer.concat([PNG, Buffer.alloc(ICON_MAX_BYTES)]);
    const problems = problemsIn(folder({ 'harbour.png': big, 'harbour-1.png': big }), ['harbour']);
    assert.match(problems, /harbour\.png: .*256x256/);
    assert.match(problems, /harbour-1\.png: .*540px wide/);
  });

  test('publishedFiles lists the icon and every screenshot for the sync step', () => {
    const dir = folder({ 'harbour.png': PNG, 'harbour-1.png': PNG, 'harbour-2.jpg': JPG });
    assert.deepEqual(publishedFiles(dir, ['harbour']), [
      'harbour.png',
      'harbour-1.png',
      'harbour-2.jpg',
    ]);
  });
});

describe('the shared rules still apply', () => {
  test('over the cap is refused', () => {
    const big = Buffer.concat([PNG, Buffer.alloc(ICON_MAX_BYTES)]);
    assert.match(problemsIn(folder({ 'harbour.png': big }), ['harbour']), /over the 100KB limit/);
  });

  test('the extension has to be a true claim', () => {
    assert.match(problemsIn(folder({ 'harbour.png': JPG }), ['harbour']), /contents are not \.png/);
  });
});

describe('the build stops at the first problem', () => {
  test('imagesByApp throws, and names the folder so the file can be found', () => {
    const dir = folder({ 'harbour.svg': Buffer.alloc(8) });
    assert.throws(() => imagesByApp(dir, ['harbour']), /registry\/showcase\/harbour\.svg/);
  });

  test('a missing icon throws too, rather than rendering a gap', () => {
    assert.throws(() => imagesByApp(folder({}), ['harbour']), /every app needs an icon/);
  });

  test('imagesByApp returns the maps when there is nothing wrong', () => {
    const dir = folder({ 'harbour.png': PNG, 'harbour-1.png': PNG });
    const { icons, screenshots } = imagesByApp(dir, ['harbour']);
    assert.deepEqual([...icons], [['harbour', 'harbour.png']]);
    assert.deepEqual([...screenshots], [['harbour', ['harbour-1.png']]]);
  });
});
