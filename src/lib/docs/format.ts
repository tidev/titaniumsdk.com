import type { ApiPlatform, Member, TypeRef } from '../registry/index.ts';

/** Display order and labels for the four platform values the reference uses. */
export const PLATFORM_LABELS: Record<ApiPlatform, string> = {
  android: 'Android',
  iphone: 'iPhone',
  ipad: 'iPad',
  macos: 'macOS',
};

export const PLATFORM_ORDER: ApiPlatform[] = ['android', 'iphone', 'ipad', 'macos'];

export const sortPlatforms = (p: readonly ApiPlatform[]): ApiPlatform[] =>
  PLATFORM_ORDER.filter((x) => p.includes(x));

/**
 * `since` is a bare version on most members and a per-platform map on 441 of
 * them. Collapsed to one string when every platform agrees, which is the common
 * case and avoids "0.8, 0.8, 0.8, 0.8".
 */
export function formatSince(since: Member['since']): string | null {
  if (!since) return null;
  if (typeof since === 'string') return since;
  const entries = Object.entries(since);
  if (!entries.length) return null;
  const values = new Set(entries.map(([, v]) => v));
  if (values.size === 1) return entries[0][1];
  return entries.map(([p, v]) => `${PLATFORM_LABELS[p as ApiPlatform] ?? p} ${v}`).join(', ');
}

/** Flattens a parsed type reference back to source-like text: `Dictionary<Titanium.UI.View>`. */
export function typeRefText(ref: TypeRef): string {
  return ref.kind === 'generic' ? `${ref.name}<${ref.args.map(typeRefText).join(', ')}>` : ref.name;
}

export const typeListText = (refs: TypeRef[] | undefined): string =>
  refs?.length ? refs.map(typeRefText).join(' | ') : '';

/**
 * OS version constraints, e.g. `{ ios: { min: '9.1' } }` becomes `iOS 9.1+`.
 *
 * Distinct from `since`, which is the Titanium version. This is the platform's
 * own minimum, and 176 members carry one.
 */
export function formatOsver(osver: unknown): string | null {
  if (!osver || typeof osver !== 'object') return null;
  const parts: string[] = [];
  for (const [platform, range] of Object.entries(osver as Record<string, unknown>)) {
    if (!range || typeof range !== 'object') continue;
    const { min, max } = range as { min?: string; max?: string };
    const label = platform === 'ios' ? 'iOS' : platform === 'android' ? 'Android' : platform;
    if (min && max) parts.push(`${label} ${min}–${max}`);
    else if (min) parts.push(`${label} ${min}+`);
    else if (max) parts.push(`${label} ≤${max}`);
  }
  return parts.length ? parts.join(', ') : null;
}

/**
 * A release date, as the registry stores it: an ISO instant.
 *
 * Pinned to UTC rather than the builder's zone. These are rendered once at
 * build time and served to everyone, so a machine an hour behind UTC would
 * otherwise stamp a different day into the HTML than the last build did.
 */
export function formatDate(iso: string | undefined): string | null {
  if (!iso) return null;
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  return at.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Splits a fully-qualified constant into the type that holds it and its name. */
export function splitConstant(ref: string): { owner: string; name: string } | null {
  const dot = ref.lastIndexOf('.');
  if (dot <= 0) return null;
  return { owner: ref.slice(0, dot), name: ref.slice(dot + 1) };
}
