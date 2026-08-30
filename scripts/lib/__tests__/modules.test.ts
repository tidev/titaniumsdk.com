import {
  AssetNameError,
  manifestPaths,
  parseAsset,
  parseManifest,
  toModuleManifest,
} from '../modules.ts';
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

/**
 * The rules that decide what a module release contains.
 *
 * Every case here is one the 16 repos actually contain — 400 releases, 400
 * assets, eleven years of release managers — so a "tidier" parser fails against
 * the real history rather than against invented input. The filename is the only
 * reliable key: tags have been spelled 18 different ways and are never read.
 */

describe('parseAsset', () => {
  test('splits the plain case', () => {
    assert.deepEqual(parseAsset('ti.map-android-5.7.0.zip'), {
      moduleId: 'ti.map',
      target: 'android',
      version: '5.7.0',
      filename: 'ti.map-android-5.7.0.zip',
    });
  });

  test('iphone is the only iOS spelling on disk, and normalises', () => {
    assert.equal(parseAsset('ti.map-iphone-7.3.1.zip').target, 'ios');
  });

  test('keeps a dotted, camelCase module id whole', () => {
    // Splitting on `-` gives "com.appcelerator.urlSession" three ways; splitting
    // on `.` gives it four. Only anchoring the tail gets it right.
    const asset = parseAsset('com.appcelerator.urlSession-iphone-4.0.1.zip');
    assert.equal(asset.moduleId, 'com.appcelerator.urlSession');
    assert.equal(asset.version, '4.0.1');
  });

  test('the module id comes from the filename, not the repository', () => {
    // Five of the sixteen repos publish under a different name than their own.
    const published: Record<string, string> = {
      'ti.identity-android-2.1.1.zip': 'ti.identity', // tidev/titanium-identity
      'ti.webdialog-iphone-1.0.0.zip': 'ti.webdialog', // tidev/titanium-web-dialog
      'ti.applesignin-iphone-3.1.1.zip': 'ti.applesignin', // tidev/titanium-apple-sign-in
      'facebook-android-8.0.0.zip': 'facebook', // tidev/ti.facebook
    };
    for (const [filename, moduleId] of Object.entries(published)) {
      assert.equal(parseAsset(filename).moduleId, moduleId, filename);
    }
  });

  test('a two-digit minor is a version, not two fields', () => {
    assert.equal(parseAsset('ti.barcode-iphone-1.10.1.zip').version, '1.10.1');
  });

  test('`titanium` is a universal package, not a platform', () => {
    // All 24 of these were downloaded and listed: every one holds both
    // modules/android/ and modules/iphone/.
    assert.equal(parseAsset('appcelerator.https-titanium-2.0.0.zip').target, 'universal');
  });

  test('the tag a release carries never reaches the version', () => {
    // ti.map alone has used all four of these spellings. The parser is given
    // only the filename, so the version is the same however the tag was written.
    const releases: [tag: string, filename: string, version: string][] = [
      ['3_2_3_GA', 'ti.map-android-3.0.0.zip', '3.0.0'],
      ['iOS-2.3.2', 'ti.map-iphone-2.3.2.zip', '2.3.2'],
      ['android-4.4.0', 'ti.map-android-4.4.0.zip', '4.4.0'],
      ['v7.3.1-ios', 'ti.map-iphone-7.3.1.zip', '7.3.1'],
    ];
    for (const [tag, filename, version] of releases) {
      assert.equal(parseAsset(filename).version, version, tag);
    }
  });

  test('an unknown platform stops the run rather than being guessed at', () => {
    assert.throws(() => parseAsset('ti.map-windows-1.0.0.zip'), AssetNameError);
    // Filenames have never varied in case, so this is a convention change, not
    // a spelling to absorb.
    assert.throws(() => parseAsset('ti.map-iPhone-1.0.0.zip'), AssetNameError);
  });

  test('a name that is not the convention stops the run', () => {
    for (const bad of [
      'ti.map-android.zip', // no version
      'ti.map-android-5.7.zip', // not three parts
      'ti.map-android-5.7.0.tar.gz', // not a zip
      'mobilesdk-13.0.0.GA-osx.zip', // an SDK build, not a module
      '',
    ]) {
      assert.throws(() => parseAsset(bad), AssetNameError, bad);
    }
  });
});

const MANIFEST = `#
# this is your module manifest and used by Titanium
# during compilation, packaging, distribution, etc.
#
version: 7.3.1
apiversion: 2
architectures: arm64 x86_64
description: External version of Map module
author: Jeff Haynie, Jon Alter, Pedro Enrique
license: Apache Public License v2
copyright: Copyright (c) 2013-present by Axway, Inc.

# these should not be edited
name: map
mac: true
moduleid: ti.map
guid: f0d8fd44-86d2-4730-b67d-bd454577aeee
platform: iphone
minsdk: 10.0.0.GA
`;

describe('parseManifest', () => {
  const fields = parseManifest(MANIFEST);

  test('ignores comments and blank lines', () => {
    assert.equal(fields.version, '7.3.1');
    // The three comment lines and the blank one contribute nothing.
    assert.equal(Object.keys(fields).length, 13);
  });

  test('keeps colons inside a value', () => {
    // A `key: value` split on the first colon only. The copyright line has two.
    assert.equal(fields.copyright, 'Copyright (c) 2013-present by Axway, Inc.');
  });

  test('leaves everything a string, so YAML cannot coerce a version', () => {
    assert.equal(fields.minsdk, '10.0.0.GA');
    assert.equal(fields.mac, 'true');
  });
});

describe('toModuleManifest', () => {
  test('shapes the fields the schema declares', () => {
    assert.deepEqual(toModuleManifest(parseManifest(MANIFEST), 'ios', '7.3.1'), {
      platform: 'ios',
      version: '7.3.1',
      name: 'map',
      minsdk: '10.0.0.GA',
      apiversion: 2,
      architectures: ['arm64', 'x86_64'],
      guid: 'f0d8fd44-86d2-4730-b67d-bd454577aeee',
      author: 'Jeff Haynie, Jon Alter, Pedro Enrique',
      license: 'Apache Public License v2',
      copyright: 'Copyright (c) 2013-present by Axway, Inc.',
      description: 'External version of Map module',
      mac: true,
    });
  });

  test('takes the platform from the caller, not the manifest', () => {
    // The manifest above says `platform: iphone`. Which asset it describes is
    // the caller's knowledge; a disagreement is reported, never silently used.
    assert.equal(toModuleManifest(parseManifest(MANIFEST), 'android', '1.0.0').platform, 'android');
  });

  test('android and iOS may disagree within one release', () => {
    const android = toModuleManifest(
      parseManifest('version: 3.0.0\nminsdk: 3.2.0\napiversion: 2\narchitectures: armeabi x86'),
      'android',
      '3.0.0'
    );
    const ios = toModuleManifest(
      parseManifest('version: 3.0.0\nminsdk: 3.2.0.GA\napiversion: 3\narchitectures: armv7 i386'),
      'ios',
      '3.0.0'
    );
    assert.notEqual(android.minsdk, ios.minsdk);
    assert.notEqual(android.apiversion, ios.apiversion);
    assert.deepEqual(android.architectures, ['armeabi', 'x86']);
  });

  test('falls back to the shipped version when the manifest carries none', () => {
    assert.equal(
      toModuleManifest(parseManifest('name: geofence'), 'android', '1.1.4').version,
      '1.1.4'
    );
  });

  test('an empty value is the same as no value', () => {
    assert.equal(toModuleManifest(parseManifest('minsdk:'), 'android', '1.0.0').minsdk, undefined);
  });

  test('a non-numeric apiversion survives as text', () => {
    assert.equal(
      toModuleManifest(parseManifest('apiversion: 2.1'), 'ios', '1.0.0').apiversion,
      '2.1'
    );
  });
});

describe('manifestPaths', () => {
  test('iOS moved from iphone/ to ios/, and old tags keep the old one', () => {
    assert.deepEqual(manifestPaths('ios'), ['ios/manifest', 'iphone/manifest']);
    assert.deepEqual(manifestPaths('android'), ['android/manifest']);
  });
});
