# Search architecture

TI-46. Measured against the real registry on 2026-09-02, not estimated.

**Recommendation: a prebuilt symbol index for the API, Pagefind for prose. Not Orama.**

## The corpus, as it actually is

| kind                | documents |                                              |
| ------------------- | --------- | -------------------------------------------- |
| SDK reference types | 348       | one page each                                |
| SDK members         | 4,954     | methods, properties, events                  |
| Modules             | 16        | plus 343 module API types across 47 versions |
| Blog posts          | 50        | the only prose that exists                   |
| **Total indexable** | **5,342** | after deduping 26 repeated member ids        |

Two findings before any tool is considered.

**The guides do not exist yet.** This ticket assumed a corpus of "~640 API reference pages and the rewritten guides". The guides are TI-32 and after; today the entire prose corpus is 50 blog posts, about 104 KB of markdown. Any measurement of prose search right now is a measurement of a corpus that is going to grow by roughly 4x when the audited legacy guides land as ~140 pages.

**26 member ids repeat**, where a type declares the same member name twice — `Titanium.UI.ImageView` has three. Any index keyed on `type#member` has to dedupe or it will throw. Orama does throw, which is how this surfaced.

## The measurements

Sizes are what a browser downloads. Brotli, because Vercel serves it.

### Orama, as a shipped client-side index

`@orama/orama` 3.1.18 with `@orama/plugin-data-persistence`.

| index                             | raw     | gzip   | **brotli** |
| --------------------------------- | ------- | ------ | ---------- |
| everything, including summaries   | 10.4 MB | 1.9 MB | **841 KB** |
| symbols only, names, no summaries | 7.1 MB  | 1.2 MB | **450 KB** |
| prose only, 50 posts              | 518 KB  | 78 KB  | **48 KB**  |

Build cost is not the problem — 104ms to insert 5,342 documents, 56ms to serialise. The problem is that all of it must be in the browser before the first keystroke returns anything. **841 KB is more than the entire rest of the page**; the four vendored IBM Plex faces together are 70 KB.

Note the ratio: the source documents are 159 KB brotli, and Orama's index of them is 841 KB. The engine inflates the corpus about 5x, and that is inherent to shipping an inverted index rather than a technique that can be tuned away.

### Pagefind

Pagefind 1.5.2 over the 755 prerendered HTML pages. Indexing takes 0.6s.

Total index on disk is 6.3 MB, but it is chunked and almost none of it is fetched. Measured with a logging server across seven queries:

|                                                                        | bytes      |
| ---------------------------------------------------------------------- | ---------- |
| boot — `pagefind.js` 44.5 KB + `wasm.en.pagefind` 71 KB + entry 0.2 KB | **116 KB** |
| 5 index chunks, across 7 queries                                       | 139 KB     |
| 19 result fragments                                                    | 111 KB     |

A first query costs roughly **116 KB + one ~28 KB chunk**. Subsequent queries reuse what is cached and cost a chunk or nothing. This is the property that matters: cost is set by the query, not by the size of the corpus, so it does not degrade as the guides land.

### A prebuilt symbol index

Just the symbols, generated from the registry, matched client-side.

| shape                                   | raw      | gzip   | **brotli** |
| --------------------------------------- | -------- | ------ | ---------- |
| objects with summaries                  | 1,444 KB | 193 KB | 148 KB     |
| objects, no summaries                   | 1,010 KB | 91 KB  | 73 KB      |
| `[kind, qualified]` pairs, href derived | 211 KB   | 33 KB  | **27 KB**  |
| newline-joined columns                  | 185 KB   | 33 KB  | **27 KB**  |

**All 5,292 symbols fit in 27 KB brotli** if the href is derived from the qualified name rather than stored. That is a third of one font file.

## Relevance, on real queries

Pagefind, against the real index. Top three results:

| query                    |     |                                                                                                        |
| ------------------------ | --- | ------------------------------------------------------------------------------------------------------ |
| `Titanium.UI.View`       | ✅  | correct page first                                                                                     |
| `createHTTPClient`       | ✅  | `Titanium.Network`, where the method lives                                                             |
| `http client`            | ✅  | `Titanium.Network.HTTPClient` first                                                                    |
| `hyperloop`              | ✅  | blog posts first, which is right                                                                       |
| `createWindow`           | ⚠️  | 3 results; `Titanium.UI.Window` ranks **third**, below `Dictionary`                                    |
| `addEventListener`       | ❌  | 206 results; top three are `ProgressBarStyle`, `WebViewDecisionHandler`, `TableViewCellSelectionStyle` |
| `creatWindow` (misspelt) | ❌  | 253 results, nothing relevant                                                                          |

The pattern is exactly what this ticket predicted. Pagefind ranks **pages**, and a member that appears on hundreds of pages cannot be ranked usefully that way — `addEventListener` is on nearly every proxy, so page-level scoring is noise. Prose queries are good; symbol queries are not.

A symbol index does not have this problem, because a symbol is the unit rather than the page: `addEventListener` is one entry per type that declares it, ranked by prefix and qualified-name match, and the answer is a jump rather than a search result.

## Why not Orama

Not because it is bad — the API is pleasant and it is fast to build. It is the wrong shape for this site:

1. **841 KB before the first result.** Against 116 KB for Pagefind and 27 KB for a symbol index. On a mobile connection this is the whole interaction budget, spent before anyone types.
2. **It does not get better as the corpus grows.** The guides will roughly quadruple the prose. Orama's cost is the corpus; Pagefind's is the query.
3. **The hosted answer trades the problem for a different one.** Orama Cloud removes the download but adds an external service, a sync step, and a bill — which is the objection this ticket already raises against Algolia, and Algolia is at least free for open source.
4. **The server-side answer contradicts the architecture.** Running Orama in a route handler means a runtime function on a site where every route is `force-static` with `dynamicParams = false`, and TI-25 just finished proving the build touches nothing but the filesystem.

Where Orama would genuinely fit is as the engine for the prose half — 48 KB today is cheaper than Pagefind's 116 KB boot. That inverts once the guides land, and taking it now would mean adopting a dependency we would then replace.

## Offline and preview builds

Pagefind indexes with no network: verified by running it behind a dead proxy, exit 0, same 755 pages. The binary is a platform-specific optional dependency (`@pagefind/darwin-arm64` locally, `@pagefind/linux-x64` on Vercel), resolved at install rather than build, so it does not violate the TI-25 guarantee.

One thing to watch: pnpm and platform-specific optional dependencies are a known source of "works locally, missing in CI". The lockfile must carry the Linux binary, and the first CI build is where that shows up.

Both options work in preview builds, because both index what was just built. Neither needs a crawler, which is the main operational argument against DocSearch: a crawler indexes what is deployed and public, so preview branches get stale or empty results.

## Cost and maintenance

|                   | cost         | maintenance                                                         |
| ----------------- | ------------ | ------------------------------------------------------------------- |
| symbol index      | none         | a generator script beside the others; regenerates with the registry |
| Pagefind          | none         | a build step and a dependency with a native binary                  |
| Algolia DocSearch | free for OSS | crawler config, an external account, no preview results             |
| Orama Cloud       | paid         | sync pipeline, external account                                     |

## The recommendation

**Two indexes, because there are two questions.**

1. **Symbols — a prebuilt index generated from the registry.** 27 KB brotli, exact and prefix matching on qualified names, grouped by kind. This is the case Pagefind is worst at and it is also the most common thing anyone types on an API reference. Generated from `registry/` at build time, so it cannot drift from the pages it points at — TI-47 asks for exactly that.

2. **Prose — Pagefind over the built HTML.** 116 KB boot, ~28 KB per query, no service, no cost, works in previews, and indexes what was actually rendered rather than a parallel description of it. Right now it covers 50 blog posts; it is chosen for the 190 pages it will cover once the guides land.

The union is smaller on first use than Orama's index alone, and each half is good at what the other is bad at.

### What this does not settle

- **Module API symbols across versions.** 343 types across 47 versions; indexing every version multiplies the symbol index for little gain. The measurement above indexes the latest version per module only. Whether an older version's symbols need to be searchable is a product question, not a measurement.
- **Ranking between the two indexes.** When a query matches both a symbol and a page, TI-47 groups results by kind, which sidesteps having to score them against each other. If that grouping ever collapses into one list, this needs revisiting.
- **Pagefind reported 20,599 words across 755 pages**, which is lower than expected for this much reference content. Worth a look during TI-47 — if the API pages are being shallowly indexed, the prose case is unaffected but the numbers above are conservative rather than wrong.
