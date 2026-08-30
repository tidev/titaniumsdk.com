import './env.ts';

/**
 * Minimal GitHub REST helper.
 *
 * Deliberately not Octokit: this repo pulls in one dependency for the whole
 * build pipeline and paginating three endpoints does not justify another.
 */

const API = 'https://api.github.com';

function token(): string {
  const t = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (!t) {
    throw new Error('GITHUB_TOKEN (or GH_TOKEN) is required');
  }
  return t;
}

/** `accept` is the only thing that varies, and only for the raw-content endpoint. */
const headers = (accept = 'application/vnd.github+json') => ({
  accept,
  authorization: `Bearer ${token()}`,
  'x-github-api-version': '2022-11-28',
});

/**
 * Pulls the page of results out of a response body.
 *
 * Most list endpoints return a bare array, but some wrap it in an envelope
 * beside `total_count` — `/actions/runs` yields `{ total_count, workflow_runs }`
 * and `/actions/artifacts` yields `{ total_count, artifacts }`. Unwrapping the
 * single array property here means no call site has to know which style its
 * endpoint uses, and adding one cannot reintroduce the mistake.
 */
function pageItems<T>(body: unknown, url: string): T[] {
  if (Array.isArray(body)) return body as T[];

  if (body && typeof body === 'object') {
    const arrays = Object.entries(body).filter(([, v]) => Array.isArray(v));
    if (arrays.length === 1) return arrays[0][1] as T[];
    if (arrays.length > 1) {
      const keys = arrays.map(([k]) => k).join(', ');
      throw new Error(`GET ${url} -> ambiguous envelope, several arrays: ${keys}`);
    }
  }

  throw new Error(`GET ${url} -> expected a list, got ${typeof body}`);
}

/** Follows the `rel="next"` Link header until exhausted. */
export async function* paginate<T>(
  path: string,
  params: Record<string, string | number> = {}
): AsyncGenerator<T[]> {
  const url = new URL(`${API}${path}`);
  url.searchParams.set('per_page', '100');
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }

  let next: string | null = url.toString();
  while (next) {
    const res: Response = await fetch(next, { headers: headers() });
    if (!res.ok) {
      throw new Error(`GET ${next} -> ${res.status} ${res.statusText}`);
    }
    yield pageItems<T>(await res.json(), next);

    // e.g. <https://api.github.com/...&page=2>; rel="next", <...>; rel="last"
    const link = res.headers.get('link');
    const m = link?.match(/<([^>]+)>;\s*rel="next"/);
    next = m ? m[1] : null;
  }
}

export async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: headers() });
  if (!res.ok) {
    throw new Error(`GET ${path} -> ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

/**
 * One file's contents at a ref, or null if it is not there.
 *
 * Absence is an answer here rather than a failure, which is why this does not
 * go through `get`. A module's iOS manifest sits at `ios/manifest` in one era
 * and `iphone/manifest` in another, and asking is the only way to find out
 * which era a given tag belongs to.
 */
export async function file(repo: string, path: string, ref: string): Promise<string | null> {
  const url = `${API}/repos/${repo}/contents/${path}?ref=${encodeURIComponent(ref)}`;
  const res = await fetch(url, { headers: headers('application/vnd.github.raw') });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`GET ${url} -> ${res.status} ${res.statusText}`);
  }
  return await res.text();
}

/**
 * Descending compare for plain `x.y.z`. The full semver package is overkill:
 * every version here matches \d+\.\d+\.\d+ by the time it reaches us, since
 * anything else fails the asset-name regex.
 */
export function rcompare(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pb[i] ?? 0) - (pa[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}
