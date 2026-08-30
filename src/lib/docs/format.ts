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
