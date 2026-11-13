import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

/**
 * The Ignored Build Step, run for real.
 *
 * What matters is the exit code Vercel sees, and Vercel reads it backwards
 * (1 builds, 0 skips), so these assert on the process rather than on a helper.
 * The script reads CODEOWNERS from `process.cwd()`, so a scratch directory is
 * all the isolation it needs.
 */

const SCRIPT = fileURLToPath(new URL('../preview-gate.ts', import.meta.url));
const BUILD = 1;
const SKIP = 0;

const CODEOWNERS = `# A comment naming @commented-out, which is not an owner.
* @Owner-One
/docs/ @second-owner @tidev/some-team someone@example.com # trailing @also-not
`;

const repo = mkdtempSync(join(tmpdir(), 'preview-gate-'));
mkdirSync(join(repo, '.github'));
writeFileSync(join(repo, '.github/CODEOWNERS'), CODEOWNERS);

const empty = mkdtempSync(join(tmpdir(), 'preview-gate-empty-'));

after(() => {
  rmSync(repo, { recursive: true, force: true });
  rmSync(empty, { recursive: true, force: true });
});

function gate(env: Record<string, string>, cwd = repo): number | null {
  // Start from a clean slate, so a VERCEL_* variable in the shell running the
  // tests cannot leak into a case that means to leave it unset.
  const base = { ...process.env };
  delete base.VERCEL_ENV;
  delete base.VERCEL_GIT_COMMIT_AUTHOR_LOGIN;
  return spawnSync(process.execPath, [SCRIPT], { cwd, env: { ...base, ...env } }).status;
}

describe('preview-gate', () => {
  test('production always builds, whoever wrote the commit', () => {
    assert.equal(
      gate({ VERCEL_ENV: 'production', VERCEL_GIT_COMMIT_AUTHOR_LOGIN: 'stranger' }),
      BUILD
    );
    assert.equal(gate({ VERCEL_ENV: 'production' }, empty), BUILD);
  });

  test('a code owner gets a preview, whatever the case of the login', () => {
    assert.equal(
      gate({ VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_AUTHOR_LOGIN: 'owner-one' }),
      BUILD
    );
    assert.equal(
      gate({ VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_AUTHOR_LOGIN: 'second-owner' }),
      BUILD
    );
  });

  test('anyone else is skipped', () => {
    assert.equal(gate({ VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_AUTHOR_LOGIN: 'stranger' }), SKIP);
  });

  test('comments, teams and emails do not grant previews', () => {
    for (const login of [
      'commented-out',
      'also-not',
      'tidev/some-team',
      'some-team',
      'someone@example.com',
    ]) {
      assert.equal(
        gate({ VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_AUTHOR_LOGIN: login }),
        SKIP,
        login
      );
    }
  });

  test('a commit with no linked GitHub account is skipped', () => {
    assert.equal(gate({ VERCEL_ENV: 'preview' }), SKIP);
    assert.equal(gate({ VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_AUTHOR_LOGIN: '  ' }), SKIP);
  });

  test('a missing CODEOWNERS skips the preview rather than crashing into a build', () => {
    assert.equal(
      gate({ VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_AUTHOR_LOGIN: 'owner-one' }, empty),
      SKIP
    );
  });
});
