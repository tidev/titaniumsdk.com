import { API_VERSION } from './v1.ts';

/**
 * A 404 a machine can read.
 *
 * The site's own 404 is an HTML page, which is the wrong answer to a client
 * that asked for JSON and will try to parse whatever it gets.
 */
export function notFoundJson(message: string): Response {
  return Response.json({ apiVersion: API_VERSION, error: 'not_found', message }, { status: 404 });
}
