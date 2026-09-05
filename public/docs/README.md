# public/docs

Two different kinds of thing live here. Only one of them is yours to edit.

## `img/` and `assets.json` — generated, do not edit

Built by `scripts/sync-doc-assets.ts`, which runs as part of `pnpm build`:

```sh
node scripts/sync-doc-assets.ts
```

It mirrors the doc images out of `registry/` and into `img/`. The filenames are
hashes because the registry stores these images content-addressed — every SDK
version references the same screenshots, and all 54 are byte-identical across a
13-month span, so one file per distinct image is written rather than one per
version.

The readable name is not lost. `registry/sdk/<version>/contents.json` maps it:

```
Titanium/UI/alertdialog_android.png  ->  d68b0885db127265.png
```

`assets.json` is the flattened form of that mapping, and `src/lib/docs/assets.ts`
reads it to rewrite an image URL at render time.

The source of truth is upstream, in `tidev/titanium-sdk` under `apidoc/`, where
the file is named `alertdialog_android.png` and sits beside the YAML that
references it. Nothing here is edited by hand: both paths are gitignored, and
the script deletes anything in `img/` it did not write.

## `guides/` — committed, edit freely

Images an author added to a page under `content/docs`. Named by whoever added
them, committed like any other source file, and never touched by the script.
Reference one from a guide by its path:

```md
![The SDK Manager](/docs/guides/android-sdk-manager.png)
```

See `docs/writing-guides.md` for the conventions.

---

This file is not served. `next.config.ts` rewrites `/docs/README.md` away
before the static handler sees it — see the note there.
