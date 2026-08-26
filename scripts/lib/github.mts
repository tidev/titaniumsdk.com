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
    const res: Response = await fetch(next, {
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${token()}`,
        'x-github-api-version': '2022-11-28',
      },
    });
    if (!res.ok) {
      throw new Error(`GET ${next} -> ${res.status} ${res.statusText}`);
    }
    yield (await res.json()) as T[];

    // e.g. <https://api.github.com/...&page=2>; rel="next", <...>; rel="last"
    const link = res.headers.get('link');
    const m = link?.match(/<([^>]+)>;\s*rel="next"/);
    next = m ? m[1] : null;
  }
}

export async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token()}`,
      'x-github-api-version': '2022-11-28',
    },
  });
  if (!res.ok) {
    throw new Error(`GET ${path} -> ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
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
