import { proxyAnswer } from '@/lib/markdown-copy';
import { NextResponse } from 'next/server';
import type { NextRequest, ProxyConfig } from 'next/server';

/**
 * The sitemap's host guard and the docs' Markdown copies.
 *
 * - No sitemap off the production host, and `/md/...`, where `next.config.ts`
 *   sends a `.md` address, is refused when it is asked for by name.
 * - A docs or modules page asked for with an `Accept` that prefers
 *   `text/markdown` is its Markdown copy (TI-97).
 *
 * Both are `proxyAnswer()` in `lib/markdown-copy`, where a test can hold them;
 * this only turns the answer into a response.
 *
 * The noindex header on non-production hosts is not here any more. It is a
 * `headers()` rule in `next.config.ts`, from `noindexHeaders()` in `lib/site`,
 * which the platform applies without running any code (TI-100).
 */
export function proxy(request: NextRequest) {
  const answer = proxyAnswer({
    pathname: request.nextUrl.pathname,
    host: request.headers.get('host'),
    accept: request.headers.get('accept'),
  });

  if ('notFound' in answer) {
    return new NextResponse(answer.notFound, {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  return 'rewrite' in answer
    ? NextResponse.rewrite(new URL(answer.rewrite, request.url))
    : NextResponse.next();
}

/**
 * Only the paths `proxyAnswer()` can change, because every request it matches is
 * a function invocation. Before TI-100 it matched nearly every request the site
 * served and changed almost none of them.
 *
 * - `/md/...` and `/sitemap.xml` with no conditions. A refusal that a request
 *   header could switch off would not be one: a `next-router-prefetch` header
 *   on `/md/docs/setup/macos` would otherwise reach the route by name.
 * - The page shapes `hasMarkdownCopy()` accepts, `/docs/...`, `/modules` and
 *   `/modules/<id>`, minus router prefetches. A prefetch asks for an RSC
 *   payload, never for Markdown, so it has nothing to negotiate. The other
 *   requests the router makes, navigations, still pass through; their `Accept`
 *   is `text/x-component`, which `prefersMarkdown()` answers with HTML.
 *
 * `robots.txt` is out of scope now that the noindex header is not set here: its
 * route reads the host itself. `/docs/...` includes the `.md` addresses, which
 * `proxyAnswer()` passes, and that is cheaper than a matcher that tries to
 * exclude them.
 *
 * Literal values, not shared constants: Next reads this at build time by static
 * analysis and ignores anything it would have to evaluate. `proxy.test.ts` runs
 * it through Next's own matcher.
 */
export const config = {
  matcher: [
    '/md/:path*',
    '/sitemap.xml',
    {
      source: '/docs/:path*',
      missing: [{ type: 'header', key: 'next-router-prefetch' }],
    },
    {
      source: '/modules/:id?',
      missing: [{ type: 'header', key: 'next-router-prefetch' }],
    },
  ],
} satisfies ProxyConfig;
