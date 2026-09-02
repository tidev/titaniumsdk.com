# Search architecture

TI-46. Measured against the real registry on 2026-09-02, not estimated.

**Recommendation: Orama behind a cached search endpoint, with an exact-name lookup in front of it.**

An earlier draft of this document recommended a prebuilt symbol index plus Pagefind, and dismissed Orama on the strength of its client-side index size. That was wrong in a way worth recording, because the reasoning error is easy to repeat: it measured Orama only in the one configuration where it looks worst, and it treated "the build touches no network" as if it also meant "nothing may run at request time". Those are different guarantees. TI-25 constrains the build; it says nothing about a runtime function.

## The corpus, as it actually is

| kind                | documents |                                    |
| ------------------- | --------- | ---------------------------------- |
| SDK reference types | 283       | one page each                      |
| SDK member symbols  | 4,928     | methods, properties, events        |
| Module API types    | 131       | latest released version per module |
| Modules             | 16        | the packages themselves            |
| Blog posts          | 50        | the only prose that exists         |
| **Total indexable** | **5,408** | after deduping repeated member ids |

Two things surfaced before any tool was considered.

**The guides do not exist yet.** This ticket assumed "~640 API reference pages and the rewritten guides". The guides are TI-32 and after; today the whole prose corpus is 50 blog posts, about 104 KB of markdown, and it roughly quadruples when the audited legacy pages land as ~140 guides.

**26 member ids repeat**, where a type declares the same member name twice — `Titanium.UI.ImageView` has three. Any index keyed on `type#member` must dedupe or it throws. Orama throws, which is how this surfaced.

## Two questions, not one

The thing that decides the architecture is that a docs search gets two unrelated kinds of query:

- **A name.** `Titanium.UI.View`, `createWindow`, `addEventListener`. There is exactly one right answer and the user knows what it is called. This is a lookup wearing a search box.
- **A description.** `hyperloop`, `http client`, or a misspelling of a name. There is no exact key; this is actual search.

Measured over the fixed query set, **6 of 9 queries are answered by a lookup and never need a search engine at all**:

| pass                                  | queries                                                |
| ------------------------------------- | ------------------------------------------------------ |
| exact qualified name                  | `Titanium.UI.View`                                     |
| exact last segment                    | `createWindow`, `addEventListener`, `createHTTPClient` |
| all tokens appear in a qualified name | `ui view`, `http client`                               |
| **search engine**                     | `creatWindow`, `addEventLisener`, `hyperloop`          |

That last row is the whole job for the engine: **typos and prose**. Which is exactly what a lookup cannot do and what Orama does well.

## Index scope: latest only

Only the newest version of anything is indexed. Someone searching for
`Titanium.UI.View` wants the current one, and returning the same symbol once
per historical version would be worse than useless — it would bury the answer
under its own history.

|                                              | types   |
| -------------------------------------------- | ------- |
| module API types, every version              | 343     |
| module API types, latest released per module | **131** |
| unreleased `main` trees, excluded            | 103     |

That is a 62% cut of the module types, but it is worth being honest about the
scale: **the SDK is 96% of the corpus** (5,211 of 5,408 documents) and modules
are 147. Scoping modules to latest is correct, and it is close to free either
way.

The number that would matter is the SDK's. There is exactly one SDK doc tree
today, `registry/sdk/main`, so the SDK half is already single-version — not by
choice but because versioned reference docs do not exist yet. **TI-59 changes
that.** Versioning the reference across three major lines triples the dominant
96%: roughly 15,600 documents, a ~31 MB index, ~165 ms to restore, ~117 MB of
heap. All still fine in a function on a 1 GB runtime.

It would be fatal to a client-side index. 841 KB becomes ~2.5 MB brotli, which
settles the question that TI-59 would otherwise reopen: the server-side shape
is the one that survives versioned docs.

## Keeping the index fresh

The index must not be a committed artifact. Generate it during `next build`,
from `registry/` on disk, and freshness follows from the deploy pipeline that
already exists:

```
SDK or module release
  -> repository_dispatch to regen-api-docs.yml (or the schedule in regen-builds.yml)
  -> the workflow writes registry/ and commits via git-auto-commit-action
  -> push to main
  -> Vercel builds
  -> the index is rebuilt from the registry in that same commit
```

Both regen workflows already commit back — `Regen API docs for ${SOURCE_REPO}@${TARGET_VERSION}`
and `Regen SDK releases and builds` — and skip committing when nothing changed,
so there is no empty-deploy churn.

The consequence worth stating: **there is no "regenerate the search index" step
to remember, and no way for the index to be older than the registry it
describes**, because the two are produced by the same build from the same
commit. That is TI-47's "can never drift from what is deployed", satisfied
structurally rather than by discipline.

The rule that keeps it true: if the index is ever checked in — for build speed,
or to skip a step — this property is lost and staleness becomes possible again.

## Measurements

### Orama, server-side

`@orama/orama` 3.1.18, index built during `next build` and restored in the function.

|                                   |                     |
| --------------------------------- | ------------------- |
| index on disk                     | 10.3 MB             |
| `restore()` — the cold-start cost | **55 ms**           |
| heap after restore                | 39 MB               |
| warm query, median / max          | **0.7 ms / 2.8 ms** |
| response to the client            | **93–474 bytes**    |

The client downloads a few hundred bytes per query. Cold start is 63ms of restore on top of the function's own, and the index is a bundled file rather than a fetch, so it does not reintroduce a network dependency.

Search queries are also unusually cacheable — a docs corpus has a very head-heavy query distribution, and `s-maxage` on the endpoint means the popular terms are served from the edge without invoking anything. That is reasoning, not a measurement; there is no traffic to measure yet.

### Orama, client-side — for contrast

This is the configuration the first draft measured, and it is genuinely bad here:

| index                             | raw     | gzip   | **brotli** |
| --------------------------------- | ------- | ------ | ---------- |
| everything, including summaries   | 10.4 MB | 1.9 MB | **841 KB** |
| symbols only, names, no summaries | 7.1 MB  | 1.2 MB | **450 KB** |
| prose only, 50 posts              | 518 KB  | 78 KB  | **48 KB**  |

841 KB before the first keystroke, against 70 KB for all four vendored IBM Plex faces. The source documents are 159 KB brotli, so the index inflates them about 5x. Shipping this to a browser is not an option; running it in a function is a different question with a different answer.

### Pagefind — the alternative that needs no runtime

Pagefind 1.5.2 over the 755 prerendered pages, 0.6s to index. Measured with a logging server across seven queries: **116 KB to boot** (`pagefind.js` 44.5 KB + `wasm.en.pagefind` 71 KB), then ~28 KB per index chunk and ~6 KB per result fragment. Cost is set by the query rather than the corpus, so it does not degrade as the guides land. It indexes built HTML, so it cannot drift from what is deployed.

### A prebuilt symbol index — if the lookup half runs client-side

| shape                                   | raw      | gzip   | **brotli** |
| --------------------------------------- | -------- | ------ | ---------- |
| objects with summaries                  | 1,444 KB | 193 KB | 148 KB     |
| objects, no summaries                   | 1,010 KB | 91 KB  | 73 KB      |
| `[kind, qualified]` pairs, href derived | 211 KB   | 33 KB  | **27 KB**  |

All 5,292 symbols in 27 KB brotli, which is a third of one font file.

## Relevance

Same fixed query set, top three results. Expected answer in **bold** when it is not first.

| query                        | Pagefind                      | Orama + lookup                      |
| ---------------------------- | ----------------------------- | ----------------------------------- |
| `Titanium.UI.View`           | correct first                 | correct first                       |
| `createHTTPClient`           | `Titanium.Network`            | `Titanium.Network.createHTTPClient` |
| `http client`                | correct first                 | correct first                       |
| `hyperloop`                  | blog posts                    | blog posts                          |
| `createWindow`               | **third**, below `Dictionary` | `Titanium.UI.createWindow`          |
| `addEventListener`           | 206 hits, **none relevant**   | `Titanium.Proxy.addEventListener`   |
| `ui view`                    | not tested                    | `Titanium.UI.View`                  |
| `creatWindow` (misspelt)     | 253 hits, **none relevant**   | `Titanium.UI.createWindow`          |
| `addEventLisener` (misspelt) | not tested                    | `Titanium.Proxy.addEventListener`   |
|                              | **3/7 usable**                | **8/8 correct first**               |

Pagefind ranks _pages_. A member that appears on hundreds of pages cannot be ranked that way — `addEventListener` is on nearly every proxy, so page-level scoring is noise. It also has no typo tolerance, and both misspellings return hundreds of irrelevant results. The two ranking failures are structural rather than tuning.

The Orama column needs one caveat: naive Orama scored 5/8, and the three failures were all multi-token (`Titanium.UI.View`, `ui view`, `http client`), because tokenising a dotted name turns a key into a bag of words. Adding the exact-name lookup in front takes it to 8/8. So the good number belongs to the _combination_, not to Orama alone — which is the point of the section above.

## Offline and preview builds

Pagefind indexes with no network, verified behind a dead proxy: exit 0, same 755 pages. Its binary is a platform-specific optional dependency resolved at install rather than build, and pnpm plus optional platform deps is a known "works locally, missing in CI" trap.

Orama has no such issue — it is plain JavaScript, and building the index is a script beside the other generators, reading the same registry the pages read.

Both work in preview builds. Neither needs a crawler, which is the main operational argument against DocSearch: a crawler indexes what is deployed and public, so preview branches get stale or empty results.

## Cost and maintenance

|                     | cost                                                | maintenance                                          |
| ------------------- | --------------------------------------------------- | ---------------------------------------------------- |
| exact-name lookup   | none                                                | a generator beside the others                        |
| Orama in a function | Vercel invocations, mostly absorbed by edge caching | a dependency and one route                           |
| Pagefind            | none                                                | a build step, and a native binary in the lockfile    |
| Algolia DocSearch   | free for OSS                                        | crawler config, external account, no preview results |
| Orama Cloud         | paid                                                | sync pipeline, external account                      |

## The recommendation

**A search endpoint that tries a lookup first and falls back to Orama.**

1. **Exact-name lookup.** Qualified name, then last segment, then all-tokens-in-a-name, ranked types above members. Answers 6 of 9 measured queries with no engine involved, and it is a `Map` and an array filter over 5,342 entries.
2. **Orama for the rest** — typos and prose, where a lookup has nothing to offer. `tolerance: 1` turns `creatWindow` and `addEventLisener` into the right answer; Pagefind returns hundreds of irrelevant results for both.
3. **Cache the endpoint at the edge.** Query distributions on docs sites are head-heavy, so most traffic should never reach the function.

The index is generated during `next build` from `registry/`, scoped to the latest version of everything, and never committed. Freshness is then a property of the pipeline rather than a step anyone has to remember: a release commits to `registry/`, which deploys, which rebuilds the index from that same commit.

### Why not Pagefind, given it needs no runtime

Because it cannot do the half of the job that matters most here. 3 of 7 usable results, no typo tolerance, and `addEventListener` — one of the most likely queries on this site — is unanswerable by page-level ranking. Adding a symbol index in front of it would fix the name queries, but the misspellings would remain broken, and that combination is no simpler than the one recommended above.

Pagefind stays the right answer for a site that must have no runtime at all. This site can afford one function.

### An alternative worth keeping in mind

If the runtime function turns out to be unwanted, the lookup half runs perfectly well in the browser on the 27 KB symbol index, answering those 6 of 9 queries with no network at all, and the endpoint is only consulted when the local pass comes up short. That is strictly more moving parts, so it is not the recommendation, but it is the fallback if invocation cost or cold starts disappoint.

### What this does not settle

- **Module API symbols across versions.** 343 types across 47 versions; the measurements index the latest version per module only. Whether older versions need to be searchable is a product question.
- **Ranking between kinds** when a query matches both a symbol and a page. TI-47 groups results by kind, which sidesteps scoring them against each other.
- **The tokenizer.** Measurements used `stemming: false`; stemming helps prose and hurts symbols, and the two-index-in-one-engine question was not explored.
- **Pagefind reported 20,599 words across 755 pages**, lower than expected for this much reference content. It does not affect the recommendation, but it means the Pagefind numbers here are conservative rather than wrong.
