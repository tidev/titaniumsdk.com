import { PINS, TAG, repin } from '../doc-pins.ts';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const nvm = PINS.find((p) => p.name === 'nvm')!;

describe('repin', () => {
  test('replaces every occurrence', () => {
    const src = [
      'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.7/install.sh | bash',
      'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.7/install.sh | bash',
    ].join('\n');

    const { text, found } = repin(src, nvm, 'v0.41.0');

    assert.deepEqual(found, ['v0.40.7', 'v0.40.7']);
    assert.equal(text.includes('v0.40.7'), false);
    assert.equal(text.match(/v0\.41\.0/g)?.length, 2);
  });

  test('leaves a version in any other URL alone', () => {
    // The hazard the anchor exists for: a page quoting an error message, whose
    // versions belong to the error and not to us.
    const src =
      'https://github.com/tidev/node-ios-device/releases/download/v1.13.0/' +
      'node_ios_device-v1.13.0-node-v147-darwin-arm64.tar.gz';

    const { text, found } = repin(src, nvm, 'v0.41.0');

    assert.deepEqual(found, []);
    assert.equal(text, src);
  });

  test('reports nothing replaced when already current', () => {
    const src = 'https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.7/install.sh';
    const { text } = repin(src, nvm, 'v0.40.7');
    assert.equal(text, src);
  });
});

describe('PINS', () => {
  // A pin that stops matching its file freezes the version silently. The
  // script fails on it at runtime; this fails on it in CI, without a network.
  test('each one matches the content it names', () => {
    for (const pin of PINS) {
      for (const file of pin.files) {
        const source = readFileSync(join(ROOT, file), 'utf8');
        const { found } = repin(source, pin, 'v9.9.9');
        assert.ok(found.length, `${pin.name} matches nothing in ${file}`);
        for (const version of found) {
          assert.match(version, TAG, `${pin.name} in ${file}`);
        }
      }
    }
  });
});
