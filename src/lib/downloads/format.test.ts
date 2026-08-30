import { formatDate, formatSize, installCommand, sortAssets } from './format.ts';
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

describe('formatSize', () => {
  test('keeps the digit that tells two SDK zips apart', () => {
    // Real sizes from 13.4.1.GA. Three significant figures renders both as
    // "110 MB", which is what the old site does.
    assert.equal(formatSize(109542325), '109.5 MB');
    assert.equal(formatSize(109542329), '109.5 MB');
    assert.equal(formatSize(186606641), '186.6 MB');
  });

  test('falls back to whole bytes below a kilobyte', () => {
    assert.equal(formatSize(0), '0 bytes');
    assert.equal(formatSize(1), '1 byte');
    assert.equal(formatSize(999), '999 bytes');
    assert.equal(formatSize(1000), '1.0 kB');
  });

  test('promotes before rounding can invent a fourth digit', () => {
    // The naive `>= 1000` threshold renders these as "1000.0 kB" and "1000.0 MB".
    assert.equal(formatSize(999999), '1.0 MB');
    assert.equal(formatSize(999949), '999.9 kB');
    assert.equal(formatSize(999999999), '1.0 GB');
  });

  test('returns nothing for a size the registry could not supply', () => {
    assert.equal(formatSize(Number.NaN), '');
    assert.equal(formatSize(-1), '');
  });
});

describe('formatDate', () => {
  test('formats in UTC, so the same data renders the same everywhere', () => {
    // Would be "Aug 24, 2026" anywhere west of London if the timezone floated.
    assert.equal(formatDate('2026-08-25T02:19:54Z'), 'Aug 25, 2026');
  });

  test('passes an unparseable date through untouched', () => {
    assert.equal(formatDate('soon'), 'soon');
  });
});

describe('sortAssets', () => {
  const asset = (os: string) => ({ os, size: 1, url: `https://example.com/${os}.zip` });

  test('imposes one order on the two the registry supplies', () => {
    const releaseOrder = sortAssets([asset('linux'), asset('osx'), asset('win32')]);
    const buildOrder = sortAssets([asset('linux'), asset('win32'), asset('osx')]);
    const names = (list: { os: string }[]) => list.map((a) => a.os);
    assert.deepEqual(names(releaseOrder), ['osx', 'win32', 'linux']);
    assert.deepEqual(names(buildOrder), ['osx', 'win32', 'linux']);
  });

  test('appends an unrecognised target rather than dropping or leading with it', () => {
    const sorted = sortAssets([asset('freebsd'), asset('osx')]);
    assert.deepEqual(
      sorted.map((a) => a.os),
      ['osx', 'freebsd']
    );
  });
});

describe('installCommand', () => {
  test('names the branch only for CI builds', () => {
    assert.equal(installCommand('13.4.1.GA'), 'ti sdk install 13.4.1.GA');
    assert.equal(
      installCommand('14.0.0.v20260829175849', 'main'),
      'ti sdk install --branch main 14.0.0.v20260829175849'
    );
  });
});
