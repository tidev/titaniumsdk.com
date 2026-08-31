import { formatSize, installPlan } from './install.ts';
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

/**
 * The install instructions, pinned against what real archives contain.
 *
 * These are the facts a reader pastes into a terminal, so getting one wrong is
 * worse than saying nothing. `iphone` in particular is checked from three
 * directions — the path, the tiapp entry, and the archive name — because it is
 * the detail most likely to be "corrected" to `ios` by someone reading the
 * registry's own platform vocabulary.
 */

const asset = (filename: string, platform: 'android' | 'ios', size?: number) => ({
  platform,
  filename,
  url: `https://github.com/tidev/ti.map/releases/download/v1/${filename}`,
  ...(size === undefined ? {} : { size }),
});

describe('installPlan', () => {
  test('unpacks iOS into modules/iphone, not modules/ios', () => {
    const plan = installPlan('ti.map', [
      { platform: 'ios', version: '7.3.1', asset: asset('ti.map-iphone-7.3.1.zip', 'ios') },
    ]);
    assert.equal(plan.targets[0].path, 'modules/iphone/ti.map/7.3.1');
    assert.match(plan.tiapp, /platform="iphone"/);
    assert.doesNotMatch(plan.tiapp, /platform="ios"/);
  });

  test('names the module by its id, and pins the version per platform', () => {
    const plan = installPlan('ti.map', [
      {
        platform: 'android',
        version: '5.7.0',
        asset: asset('ti.map-android-5.7.0.zip', 'android'),
      },
      { platform: 'ios', version: '7.3.1', asset: asset('ti.map-iphone-7.3.1.zip', 'ios') },
    ]);
    assert.equal(
      plan.tiapp,
      '<modules>\n' +
        '  <module platform="android" version="5.7.0">ti.map</module>\n' +
        '  <module platform="iphone" version="7.3.1">ti.map</module>\n' +
        '</modules>'
    );
    assert.deepEqual(
      plan.targets.map((t) => t.path),
      ['modules/android/ti.map/5.7.0', 'modules/iphone/ti.map/7.3.1']
    );
  });

  test('lists a universal archive once, for both platforms', () => {
    // 20 releases attach one `-titanium-` zip carrying both platforms.
    const universal = asset('appcelerator.https-titanium-1.1.4.zip', 'android');
    const plan = installPlan('appcelerator.https', [
      { platform: 'android', version: '1.1.4', asset: universal },
      { platform: 'ios', version: '1.1.4', asset: { ...universal, platform: 'ios' } },
    ]);
    assert.equal(plan.archives.length, 1);
    assert.deepEqual(plan.archives[0].platforms, ['android', 'ios']);
    // Both still get their own install path and tiapp entry.
    assert.equal(plan.targets.length, 2);
  });

  test('still explains tiapp and require when a release attached no archive', () => {
    const plan = installPlan('ti.map', [{ platform: 'android', version: '5.7.0' }]);
    assert.deepEqual(plan.archives, []);
    assert.match(plan.tiapp, /ti\.map/);
  });
});

describe('formatSize', () => {
  test('reads as a download size', () => {
    assert.equal(formatSize(285073), '278 KB');
    assert.equal(formatSize(774936), '757 KB');
    assert.equal(formatSize(4_500_000), '4.3 MB');
    assert.equal(formatSize(512), '512 B');
    assert.equal(formatSize(undefined), null);
  });
});
