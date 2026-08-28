import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';

/**
 * Loads `.env` from the repo root.
 *
 * Imported for its side effect by the modules that read credentials, so a
 * script cannot forget to do it and fail with a confusing "token is required".
 *
 * Two properties this relies on, both dotenv defaults:
 *
 *   - A real environment variable always wins. CI passes `GITHUB_TOKEN` through
 *     `env:` from secrets, and that must not be shadowed by a stray `.env` on a
 *     runner.
 *   - A missing file is a no-op, not an error. There is no `.env` in CI.
 *
 * Resolved from this file rather than `process.cwd()`, so it works no matter
 * where the script was invoked from.
 */
config({
  path: fileURLToPath(new URL('../../.env', import.meta.url)),
  quiet: true,
});
