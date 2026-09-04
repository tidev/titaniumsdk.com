/**
 * Exact-and-near name matching over every symbol in the corpus (TI-70).
 *
 * Pagefind ranks pages, which is the right model for prose and the wrong one
 * for `addEventListener` — a name every proxy inherits, so it appears on 205
 * pages and none of them is the answer. Pagefind also has no typo tolerance.
 * TI-46 measured both. This runs first and answers the name questions; Pagefind
 * keeps the prose ones.
 *
 * Four rules, tried in order, each stronger evidence than the next:
 *
 *   exact    the query is the whole qualified name
 *   segment  the query is the last segment — `createWindow`, `open`
 *   tokens   every token of the query begins a segment of the name
 *   fuzzy    the last segment is within a small edit distance
 *
 * Within a rule the shorter qualified name wins, which is a decent proxy for
 * how central a symbol is: `Titanium.UI.Window` before
 * `Titanium.UI.iOS.PreviewContext.Window`.
 */

export type SymbolPayload = {
  sdk: string;
  /** [type, [member, ...]] — a member is `name` or `name>anchor`. */
  t: [string, string[]][];
  /** [moduleId, [type, ...]] */
  m: [string, string[]][];
};

export type SymbolHit = {
  /** The qualified name, as shown. */
  title: string;
  url: string;
  kind: 'api' | 'module';
  /** Which rule matched, for ordering and for tests. */
  rule: 'exact' | 'segment' | 'tokens' | 'fuzzy';
};

type Entry = {
  title: string;
  lower: string;
  /** Last dotted segment, lowercased — the part people actually type. */
  segment: string;
  /** Every dotted segment, for the token rule. */
  segments: string[];
  url: string;
  kind: 'api' | 'module';
};

/** Flattens the payload once, at load, so each query is a scan over strings. */
export function buildSymbolTable(payload: SymbolPayload): Entry[] {
  const out: Entry[] = [];
  const push = (title: string, url: string, kind: 'api' | 'module') => {
    const lower = title.toLowerCase();
    out.push({
      title,
      lower,
      segment: lower.slice(lower.lastIndexOf('.') + 1),
      segments: lower.split('.'),
      url,
      kind,
    });
  };

  for (const [type, members] of payload.t) {
    push(type, `/docs/sdk/${payload.sdk}/${type}`, 'api');
    for (const raw of members) {
      // `name>anchor` where the anchor was disambiguated; see the generator.
      const cut = raw.indexOf('>');
      const name = cut === -1 ? raw : raw.slice(0, cut);
      const anchor = cut === -1 ? raw : raw.slice(cut + 1);
      push(`${type}.${name}`, `/docs/sdk/${payload.sdk}/${type}#${anchor}`, 'api');
    }
  }
  for (const [id, types] of payload.m) {
    // The module's own id, which is what people type — `ti.map`, not
    // `Modules.Map.View`.
    push(id, `/modules/${id}`, 'module');
    for (const type of types) push(type, `/modules/${id}/api#${type}`, 'module');
  }
  return out;
}

/**
 * Levenshtein distance, abandoned once it cannot come in under `max`.
 *
 * The bound is what keeps this cheap across five thousand entries: most
 * comparisons fail on the length check without allocating anything.
 */
function within(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false;
  if (a === b) return true;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
      row.push(value);
      if (value < best) best = value;
    }
    // Every remaining row can only grow, so this can no longer come in.
    if (best > max) return false;
    prev = row;
  }
  return prev[b.length] <= max;
}

/** How wrong a name may be before a match stops being a reasonable guess. */
function tolerance(length: number): number {
  if (length <= 4) return 0;
  if (length <= 8) return 1;
  return 2;
}

export function lookupSymbols(table: Entry[], query: string, limit = 8): SymbolHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const tokens = q.split(/[\s.]+/).filter(Boolean);
  const last = tokens[tokens.length - 1] ?? '';
  const max = tolerance(last.length);

  const buckets: Record<SymbolHit['rule'], Entry[]> = {
    exact: [],
    segment: [],
    tokens: [],
    fuzzy: [],
  };

  for (const entry of table) {
    if (entry.lower === q) buckets.exact.push(entry);
    else if (entry.segment === q) buckets.segment.push(entry);
    // Each token must begin a segment, not merely occur somewhere. Matching
    // anywhere made `ti.map` find `util.types.isMap` — `ti` inside `util` —
    // and let `window open` prefer `openWindowParams` over
    // `Titanium.UI.Window.open`.
    else if (
      tokens.length > 1 &&
      tokens.every((t) => entry.segments.some((seg) => seg.startsWith(t)))
    )
      buckets.tokens.push(entry);
    else if (max > 0 && within(entry.segment, last, max)) buckets.fuzzy.push(entry);
  }

  const byCentrality = (a: Entry, b: Entry) =>
    a.title.length - b.title.length || a.title.localeCompare(b.title);

  const hits: SymbolHit[] = [];
  for (const rule of ['exact', 'segment', 'tokens', 'fuzzy'] as const) {
    for (const entry of buckets[rule].sort(byCentrality)) {
      if (hits.length >= limit) return hits;
      hits.push({ title: entry.title, url: entry.url, kind: entry.kind, rule });
    }
  }
  return hits;
}
