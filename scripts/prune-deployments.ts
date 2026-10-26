import './lib/env.ts';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * Deletes old Vercel deployments to reclaim Deployment Storage.
 *
 *   node scripts/prune-deployments.ts                 # dry run, always
 *   node scripts/prune-deployments.ts --yes           # actually delete
 *   node scripts/prune-deployments.ts --keep 10 --older-than 60 --yes
 *
 * ## Why this exists alongside `cleanup-previews.yml`
 *
 * That workflow fires on `pull_request_target: [closed]` and passes
 * `--environment preview`, so it only ever removes the previews belonging to
 * one pull request as it closes. It deliberately never touches production
 * deployments - its own header comment says why - and nothing else does either.
 * Production deployments are therefore the half of the storage problem that
 * accumulates unattended: they reached 61 before the manual sweep of
 * 2026-09-14, which is most of how the free tier's 10 GB filled.
 *
 * This is the on-demand sweep for everything that workflow leaves behind: the
 * production backlog, and the previews it missed (a preview whose pull request
 * closed while `VERCEL_TOKEN` was unset, or before the fork fix landed, was
 * never offered to it and will sit there forever).
 *
 * ## Dry run is the default, which is the opposite of `prune-builds.ts`
 *
 * `--check` on the other prune script is opt-in because that one rewrites
 * registry JSON that git can restore. Deleting a deployment is a remote,
 * irreversible call: the build is gone and cannot be re-uploaded, only rebuilt
 * from the commit. So the flag is inverted here - this prints what it would
 * remove and exits, and `--yes` is required to send a single DELETE.
 *
 * ## What is never deleted
 *
 * Four guards, because the cost of being wrong is an outage rather than a
 * wasted minute:
 *
 *   1. **The live production deployment**, read from the project's
 *      `targets.production.id` rather than inferred from the ordering. The most
 *      recently created production deployment is not necessarily the one
 *      serving traffic - a rollback makes an older one live - and sorting by
 *      date would then delete the site.
 *   2. **Anything a domain currently resolves to**, asked per deployment via
 *      `/v2/deployments/{id}/aliases`. Not the `aliasAssigned` field on the
 *      list response, which is a timestamp recording that aliasing happened
 *      when that deployment was built and stays set forever - every production
 *      deployment here has one, so believing it meant "serving traffic"
 *      protected all 31 and the first dry run found nothing to delete. A
 *      deployment can genuinely be reachable without being the production
 *      target, which is why this is asked rather than inferred:
 *      `preview.titaniumsdk.com` is served by this project.
 *   3. **Anything not in a terminal state.** A `BUILDING` or `QUEUED`
 *      deployment is an in-flight deploy, quite possibly the one about to
 *      become live.
 *   4. **The `--keep` newest of each target**, whatever their age. This is the
 *      rollback window. The 2026-09-14 sweep left exactly one production
 *      deployment and so left no rollback target at all; the default of 5 is
 *      chosen so that running this cannot recreate that situation.
 */

/**
 * Identifiers, not credentials - the same pair `cleanup-previews.yml` sets, and
 * they change only if the project is recreated or moved. Not read from
 * `.vercel/repo.json`, which is gitignored and so absent in CI.
 */
const TEAM_ID = process.env.VERCEL_ORG_ID ?? 'team_av3JbwDsQiwntXs2XWbz7JhJ';
const PROJECT_ID = process.env.VERCEL_PROJECT_ID ?? 'prj_Emee30vHKLvUjwbyZu4gVAuVaQsC';

const API = 'https://api.vercel.com';

/** Deployment states that mean "still working on it". Never deleted. */
const IN_FLIGHT = new Set(['BUILDING', 'QUEUED', 'INITIALIZING']);

type Target = 'production' | 'preview';

interface Deployment {
  uid: string;
  url: string;
  created: number;
  state?: string;
  readyState?: string;
  target?: string | null;
  meta?: Record<string, string>;
}

function flag(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return fallback;
  const n = Number(process.argv[i + 1]);
  if (!Number.isFinite(n) || n < 0) throw new Error(`--${name} needs a non-negative number`);
  return n;
}

const apply = process.argv.includes('--yes');
const keep = flag('keep', 5);
const olderThanDays = flag('older-than', 30);
/**
 * A cap on one run's deletions, so a mistake in the filters above cannot empty
 * the project before anyone reads the output. Raise it deliberately.
 */
const limit = flag('limit', 200);

const targetArg = (() => {
  const i = process.argv.indexOf('--target');
  if (i === -1) return 'all';
  const v = process.argv[i + 1];
  if (v !== 'production' && v !== 'preview' && v !== 'all') {
    throw new Error('--target must be production, preview or all');
  }
  return v;
})();

/**
 * `VERCEL_TOKEN` first, so CI and a one-off `VERCEL_TOKEN=... node ...` both
 * work. Falling back to the CLI's own credentials file is what makes this
 * usable locally straight after `vercel login` without copying a token out of
 * the dashboard. That file holds a short-lived token - when it has expired the
 * API answers 403 and `fail()` below says so rather than reporting a
 * permissions problem.
 */
function token(): string {
  if (process.env.VERCEL_TOKEN) return process.env.VERCEL_TOKEN;

  const candidates = [
    join(homedir(), 'Library/Application Support/com.vercel.cli/auth.json'),
    join(homedir(), '.local/share/com.vercel.cli/auth.json'),
  ];
  for (const path of candidates) {
    try {
      const { token } = JSON.parse(readFileSync(path, 'utf8')) as { token?: string };
      if (token) return token;
    } catch {
      // Missing or unreadable is just "not this one".
    }
  }

  throw new Error(
    'No Vercel credentials. Run `vercel login`, or set VERCEL_TOKEN in .env.local or the environment.'
  );
}

const TOKEN = token();

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const url = new URL(path, API);
  url.searchParams.set('teamId', TEAM_ID);

  const res = await fetch(url, {
    ...init,
    headers: { authorization: `Bearer ${TOKEN}`, ...init?.headers },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        `Vercel answered ${res.status} for ${path}. The token is invalid or expired - ` +
          `run \`vercel login\` again, or check VERCEL_TOKEN. ${body.slice(0, 200)}`
      );
    }
    throw new Error(`Vercel answered ${res.status} for ${path}. ${body.slice(0, 200)}`);
  }

  return (await res.json()) as T;
}

/** The deployment actually serving production, which may not be the newest. */
async function liveProductionId(): Promise<string | null> {
  const project = await api<{ targets?: { production?: { id?: string } | null } }>(
    `/v9/projects/${PROJECT_ID}`
  );
  return project.targets?.production?.id ?? null;
}

/**
 * The domains currently resolving to one deployment.
 *
 * Asked one deployment at a time because the list endpoint cannot answer it -
 * see guard 2 above. Only called for deployments already eligible for deletion,
 * so this costs one request per thing about to be removed rather than one per
 * deployment in the project.
 */
async function liveAliases(uid: string): Promise<string[]> {
  const res = await api<{ aliases?: { alias?: string }[] }>(`/v2/deployments/${uid}/aliases`);
  return (res.aliases ?? []).map((a) => a.alias).filter((a): a is string => Boolean(a));
}

/**
 * Every deployment, oldest call first. `/v6/deployments` returns at most 100
 * and pages with `until`, a created-at bound rather than an offset, so a
 * deployment created mid-walk cannot shift the window and hide another.
 */
async function allDeployments(): Promise<Deployment[]> {
  const out: Deployment[] = [];
  let until: number | undefined;

  for (;;) {
    const path = `/v6/deployments?projectId=${PROJECT_ID}&limit=100${
      until ? `&until=${until}` : ''
    }`;
    const page = await api<{
      deployments?: Deployment[];
      pagination?: { next?: number | null };
    }>(path);

    const batch = page.deployments ?? [];
    out.push(...batch);

    const next = page.pagination?.next;
    if (!next || !batch.length) break;
    until = next;
  }

  return out;
}

const age = (created: number) => Math.floor((Date.now() - created) / 86_400_000);

async function main() {
  const live = await liveProductionId();
  const deployments = await allDeployments();

  if (!deployments.length) {
    console.log('The project has no deployments.');
    return;
  }

  // Newest first, so "the --keep newest" is a prefix of each target's list.
  deployments.sort((a, b) => b.created - a.created);

  const kept = new Map<string, string>();
  const candidates: Deployment[] = [];
  const seen: Record<Target, number> = { production: 0, preview: 0 };
  const cutoff = Date.now() - olderThanDays * 86_400_000;

  // The guards that cost nothing, so the alias lookup below is only paid for
  // deployments that have survived all of them.
  for (const d of deployments) {
    const target: Target = d.target === 'production' ? 'production' : 'preview';
    const rank = seen[target]++;
    const state = d.readyState ?? d.state ?? '';

    const reason =
      d.uid === live
        ? 'live production'
        : IN_FLIGHT.has(state)
          ? `in flight (${state})`
          : targetArg !== 'all' && targetArg !== target
            ? `not --target ${targetArg}`
            : rank < keep
              ? `${target} rollback window (#${rank + 1} of ${keep})`
              : d.created > cutoff
                ? `only ${age(d.created)}d old`
                : null;

    if (reason) kept.set(d.uid, reason);
    else candidates.push(d);
  }

  const doomed: Deployment[] = [];
  for (const d of candidates) {
    const aliases = await liveAliases(d.uid);
    if (aliases.length) kept.set(d.uid, `serves ${aliases.join(', ')}`);
    else doomed.push(d);
  }

  console.log(
    `${deployments.length} deployment(s): ${seen.production} production, ${seen.preview} preview.`
  );
  console.log(`Live production: ${live ?? 'none - nothing is serving the production target'}`);
  console.log(
    `Keeping ${kept.size}, ${doomed.length} eligible for deletion ` +
      `(older than ${olderThanDays}d, beyond the newest ${keep} per target).\n`
  );

  for (const [uid, reason] of kept) {
    const d = deployments.find((x) => x.uid === uid)!;
    console.log(`  keep    ${d.url}  ${age(d.created)}d  ${reason}`);
  }
  console.log();

  if (!doomed.length) {
    console.log('Nothing to prune.');
    return;
  }

  const batch = doomed.slice(0, limit);
  for (const d of batch) {
    const pr = d.meta?.githubPrId ? ` PR #${d.meta.githubPrId}` : '';
    console.log(`  delete  ${d.url}  ${age(d.created)}d  ${d.target ?? 'preview'}${pr}`);
  }
  if (doomed.length > batch.length) {
    console.log(`\n  ...and ${doomed.length - batch.length} more, held back by --limit ${limit}.`);
  }

  if (!apply) {
    console.log(`\nDry run. Re-run with --yes to delete ${batch.length} deployment(s).`);
    return;
  }

  console.log();
  let removed = 0;
  let failed = 0;
  for (const d of batch) {
    try {
      // Sequential on purpose. Vercel rate-limits deletes, and a parallel sweep
      // that trips the limit reports failures for deployments it never tried.
      await api(`/v13/deployments/${d.uid}`, { method: 'DELETE' });
      removed++;
      console.log(`  removed ${d.url}`);
    } catch (err) {
      failed++;
      console.error(`  FAILED  ${d.url}: ${(err as Error).message}`);
    }
  }

  console.log(`\nRemoved ${removed} deployment(s)${failed ? `, ${failed} failed` : ''}.`);
  if (failed) process.exitCode = 1;
}

await main();
