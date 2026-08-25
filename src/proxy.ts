import { isIndexableHost } from '@/lib/site';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Marks every response from a non-production host as noindex.
 *
 * A header rather than a <meta> tag so it also covers non-HTML responses —
 * the sitemap, JSON, and the generated registry files.
 */
export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  if (!isIndexableHost(request.headers.get('host'))) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  return response;
}

export const config = {
  // Everything except build output and the favicon. robots.txt and sitemap.xml
  // stay in scope deliberately — the header is harmless there, and excluding
  // them is one more thing to keep in sync.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
