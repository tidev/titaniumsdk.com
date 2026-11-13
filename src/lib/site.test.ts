import { isIndexableHost, noindexHeaders } from './site.ts';
import assert from 'node:assert/strict';
import { AsyncLocalStorage } from 'node:async_hooks';
import { describe, test } from 'node:test';

/**
 * The noindex header on non-production hosts (TI-100), run through Next's own
 * `headers()` matching rather than a copy of it, because the rule is a regular
 * expression Next anchors and matches against the hostname, and getting that
 * wrong fails silently in one direction or the other.
 *
 * Next's testing module reaches for `globalThis.AsyncLocalStorage`, which its
 * server sets up before loading anything and plain Node does not, so it is set
 * here and the module is imported after.
 */
Object.assign(globalThis, { AsyncLocalStorage });
const { unstable_getResponseFromNextConfig } = await import('next/experimental/testing/server.js');

const robotsTag = async (url: string) => {
  const response = await unstable_getResponseFromNextConfig({
    url,
    nextConfig: { headers: async () => noindexHeaders() },
  });
  return response.headers.get('x-robots-tag');
};

describe('noindexHeaders', () => {
  test('leaves the production hosts alone', async () => {
    for (const origin of ['https://titaniumsdk.com', 'https://www.titaniumsdk.com']) {
      for (const path of ['/', '/docs/setup/macos', '/sitemap.xml', '/favicon.ico']) {
        assert.equal(await robotsTag(`${origin}${path}`), null, `${origin}${path}`);
      }
    }
  });

  test('marks every response on every other host, HTML or not', async () => {
    for (const origin of [
      'https://previewtitaniumsdkcom.vercel.app',
      'https://titaniumsdk-abc123-chris-barbers-projects.vercel.app',
      'https://preview.titaniumsdk.com',
      'http://localhost:3002',
    ]) {
      for (const path of [
        '/',
        '/docs/setup/macos',
        '/docs/setup/macos.md',
        '/robots.txt',
        '/sitemap.xml',
        '/favicon.ico',
        '/registry/v1/modules',
        '/_next/static/chunks/main.js',
      ]) {
        assert.equal(await robotsTag(`${origin}${path}`), 'noindex, nofollow', `${origin}${path}`);
      }
    }
  });

  test('is not fooled by a host that only contains a production one', async () => {
    // The value is a regular expression. Unescaped dots, or a match Next did
    // not anchor, would let these through as production.
    for (const host of ['titaniumsdkxcom', 'titaniumsdk.com.example.net', 'xtitaniumsdk.com']) {
      assert.equal(await robotsTag(`https://${host}/`), 'noindex, nofollow', host);
    }
  });

  test('agrees with isIndexableHost', async () => {
    for (const host of ['titaniumsdk.com', 'www.titaniumsdk.com', 'preview.titaniumsdk.com']) {
      assert.equal((await robotsTag(`https://${host}/`)) === null, isIndexableHost(host), host);
    }
  });
});
