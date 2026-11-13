import assert from 'node:assert/strict';
import { AsyncLocalStorage } from 'node:async_hooks';
import { registerHooks } from 'node:module';
import { describe, test } from 'node:test';

/**
 * Where the proxy runs (TI-100), through Next's own matcher rather than a copy
 * of its rules. What it does once it runs is `proxyAnswer()`, tested in
 * `lib/markdown-copy.test.ts`.
 *
 * Two things plain Node does not do that Next's bundler does, set up before
 * anything is imported:
 *
 * - Resolve `proxy.ts`'s imports. `@/` is the tsconfig alias, and `next/server`
 *   has no `exports` map, so ESM needs the `.js`. The proxy keeps the bare
 *   specifier because Next's compiler rewrites exactly that one into the
 *   individual modules it uses.
 * - Provide `globalThis.AsyncLocalStorage`, which Next's testing module reaches
 *   for and its server sets up before loading anything.
 */
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      return nextResolve(new URL(`./${specifier.slice(2)}.ts`, import.meta.url).href, context);
    }
    return nextResolve(specifier === 'next/server' ? 'next/server.js' : specifier, context);
  },
});
Object.assign(globalThis, { AsyncLocalStorage });

const { config } = await import('./proxy.ts');
const { unstable_doesMiddlewareMatch } = await import('next/experimental/testing/server.js');

const PREFETCH = { 'next-router-prefetch': '1' };

const runs = (url: string, headers: Record<string, string> = {}) =>
  unstable_doesMiddlewareMatch({ config, url, headers });

describe('the proxy matcher', () => {
  test('runs on every page that has a Markdown copy', () => {
    for (const url of [
      '/docs',
      '/docs/setup/macos',
      '/docs/sdk',
      '/docs/sdk/13.4.1',
      '/docs/sdk/Titanium.UI.Window',
      '/docs/sdk/13.4.1/Titanium.UI.Window',
      '/modules',
      '/modules/ti.map',
    ]) {
      assert.equal(runs(url), true, url);
      // A navigation, as opposed to a prefetch, still passes through.
      assert.equal(runs(url, { rsc: '1', accept: 'text/x-component' }), true, url);
    }
  });

  test('runs on the paths it refuses, whatever the headers say', () => {
    for (const url of ['/md', '/md/docs/setup/macos', '/sitemap.xml']) {
      assert.equal(runs(url), true, url);
      // A refusal a prefetch header could switch off would not be one.
      assert.equal(runs(url, PREFETCH), true, url);
    }
  });

  test('skips router prefetches of pages', () => {
    for (const url of ['/docs/setup/macos', '/modules', '/modules/ti.map']) {
      assert.equal(runs(url, PREFETCH), false, url);
    }
  });

  test('skips everything it has nothing to do with', () => {
    for (const url of [
      '/',
      '/blog',
      '/blog/some-post',
      '/downloads',
      '/robots.txt',
      '/llms.txt',
      '/favicon.ico',
      '/registry/v1/modules',
      '/_next/static/chunks/main.js',
      '/docs-archive',
      '/mdx',
      '/modulesx',
      // A module's sub-pages have no copy.
      '/modules/ti.map/api',
      // The `.md` addresses beside the roots, which the config rewrite serves.
      '/docs.md',
      '/modules.md',
    ]) {
      assert.equal(runs(url), false, url);
    }
  });
});
