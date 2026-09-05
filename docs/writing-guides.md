# Writing guides

How to write the prose under `content/docs`. The API reference is generated from
the SDK's own YAML and is not covered here — nothing in this file applies to it.

Read this before writing a page. Most of these rules exist because the docs
being replaced did the opposite, and the audit in
[`docs/legacy-guide-audit.md`](legacy-guide-audit.md) records what that cost:
of 336 pages, **69 said something factually wrong** and 92 were worth archiving
rather than moving. Nearly all of that is drift — prose that was true when it
was written and was never revisited.

## Voice

**Write to one reader, doing one thing.** They have a terminal open. They are
not reading for pleasure and will not read the paragraph before the one they
need, so each section has to stand up alone.

**Second person, present tense, active voice.** "Run `ti build`", not "the build
can then be run". Say _you_ for the reader and _Titanium_ for the software. Do
not say _we_ — there is no we on a documentation page, and it usually smuggles
in an opinion the reader cannot evaluate.

**Say what is true on the reader's machine.** Not what is true in principle.
"iOS builds require macOS" beats "iOS builds have platform requirements".

**Lead with the outcome, then the steps.** A reader scanning for whether a page
is the right one needs the first sentence to answer that. Do not open with
history, motivation, or a definition of a term the title already used.

**Cut every sentence that only reassures.** "Don't worry, this is easy" tells
the reader nothing and is wrong for whoever is stuck. "Simply", "just", "of
course" and "as you would expect" all mean the writer stopped thinking about who
might not.

**Name versions and dates, never "recently" or "currently".** The legacy pages
are full of "the latest version", written across a decade of latest versions.
Write `12.1.0`, and use `:::since` when a passage only applies from a release.

**Do not apologise for the software.** If something is awkward, describe it
plainly and say what to do instead. If it is broken, that is an issue, not a
paragraph.

**Spelling:** American — `color`, not `colour`, matching `backgroundColor` and
every other API name a reader will type. Where prose and an API name disagree,
write the API name exactly as it appears in code, in backticks.

## Where a page goes

The structure is fixed in [`src/lib/docs/ia.ts`](../src/lib/docs/ia.ts) and was
approved before any of this was written. **You cannot add a page by adding a
file.** A file with no entry in `ia.ts` fails the build, because a page that
appears in no sidebar is a page nobody finds.

To add a page, add it to `ia.ts` first — which is a change to the approved
structure, so raise it rather than doing it in passing.

```
content/docs/setup/macos.md         ->  /docs/setup/macos
content/docs/build/ui/index.md      ->  /docs/build/ui
content/docs/build/ui/layout.md     ->  /docs/build/ui/layout
content/docs/_partials/install.md   ->  not a page
```

Three segments after `/docs` is the ceiling, and only `build` uses the third.

## Frontmatter

```yaml
---
title: macOS
description: Set up a Mac to build for iOS and Android.
platforms: [macos, ios, android]
since: 12.1.0
draft: false
---
```

| Key           | Required | Meaning                                                                                                                                                    |
| ------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`       | yes      | The `<h1>`, the tab title, and the breadcrumb. Do not repeat it as a heading in the body.                                                                  |
| `description` | no       | One sentence, for the search result and the tab preview. It is not shown on the page, so do not write it as a lede — the body's opening paragraph is that. |
| `platforms`   | no       | What the page applies to: `macos`, `windows`, `linux`, `ios`, `android`. Absent means all of them. Drives `:::only`.                                       |
| `since`       | no       | The SDK version the page's content assumes. Renders as a line under the title.                                                                             |
| `draft`       | no       | Renders at its URL, is not linked from the sidebar, says so at the top, and asks search engines to skip it.                                                |

Unknown keys fail the build. A misspelled `platform` would otherwise silently
apply to nothing.

## Headings

`##` and `###` only. `#` is the title, which comes from frontmatter, and
anything below `###` produces a contents list too fine to navigate.

Write headings a reader could scan as a list and know what the page does:
"Install the Android SDK", not "Installation". Ids are generated from the text,
so renaming a heading breaks any link to it — search the repo before you do.

## Code samples

**Every sample must run.** Not a fragment that would run inside something the
reader has to guess at. If it needs surrounding context, show the context.

**Tag the language.** An untagged block is not highlighted; the corpus has 44 of
them and nobody has ever gone back to fix one. The tags that work:

`js` `jsx` `ts` `xml` `tss` `html` `json` `sh` `bash` `shell` `console`
`powershell` `ps1` `java` `swift` `objc`

Use `xml` for Alloy views and `tss` for styles. Use `sh` for macOS and Linux
shells and `powershell` for Windows — an unhighlighted Windows block sitting
next to a highlighted macOS one reads as a bug rather than as a choice.

**Program output is the exception.** A block that quotes what a command printed
is not a language, and tagging it colours it as one — leave those untagged. The
rule is about code the reader will run.

**Shell samples show the command, not the prompt.** No leading `$`. The page has
a copy button, and a copied `$` does not run.

**Use real names.** `Hello`, `myapp`, a real module id. Never `foo`, `bar`, or
`YOUR_VALUE_HERE` where a real example would do.

**Keep them short.** A sample longer than about twenty lines is documenting the
wrong thing, or is an example app that belongs in a repository.

## Components

Six of them. Each solves one problem; reach for the plainest one that fits, and
if none fits, write a paragraph.

Every marker needs **a blank line above and below it**. Without one, markdown
folds the marker into the paragraph and the block does not render — the build
catches this and names the marker, so it cannot reach a live page.

### Callouts

GitHub's alert syntax, so an editor previews it and a README can be pasted in.

```md
> [!NOTE]
> Windows are not modal by default.
```

`NOTE` `TIP` `IMPORTANT` `WARNING` `CAUTION` `DEPRECATED`.

Use one for something the reader would otherwise miss and then have to undo.
Use `WARNING` for losing work or money, not for inconvenience. **Two callouts in
a row means neither is worth reading** — merge them, or turn one into a
sentence.

### Tabs

For content that differs by a choice the reader has already made: their package
manager, their platform, Alloy versus classic.

```md
:::tabs

@tab Alloy

Alloy generates a `views` directory.

@tab Classic

Classic gives you one `app.js`.

:::
```

Two to six panels. No headings inside a panel — it would appear in the contents
list pointing at something hidden.

**Picking a tab switches every group on the page with a tab of that name**, and
is remembered on the next page. So label consistently: a group offering
`npm` / `Yarn` and another offering `npm` / `Yarn` / `pnpm` still move together,
but `Yarn` and `yarn` do not.

Do not use tabs for content the reader needs to compare — they can only see one
at a time. Use a table.

### Code groups

Tabs whose panels are each a single code block, with the strip welded onto the
code.

````md
:::code-group

@tab npm

```sh
npm install -g titanium
```

@tab Yarn

```sh
yarn global add titanium
```

:::
````

A panel with prose in it is rejected — that is `:::tabs`.

### Platform blocks

For a passage that applies to some platforms and not others.

```md
:::platform android

Release builds must be signed with a keystore you keep.

:::
```

And the negative case, which the structure leans on: the Windows and Linux setup
pages have to say that iOS is not possible there, as a fact rather than as an
absence.

```md
:::unavailable ios

Building for iOS requires macOS. There is no supported path on Windows or Linux.

:::
```

Platform ids: `macos` `windows` `linux` `ios` `android`. Anything else fails the
build.

### Version notices

For a passage that only applies from a release. Page-wide, use `since` in
frontmatter instead.

```md
:::since 12.1.0

`ti create` gained the `--alloy` flag in this release.

:::
```

### Platform-scoped source

`:::only` removes a block before rendering, based on the page's `platforms`. It
is not a component — the reader never sees that it happened.

````md
:::only macos, linux

```sh
sudo npm install -g titanium
```

:::
````

Use it inside a **shared partial**, which is what it exists for. Other block
directives may nest inside it.

A page with no `platforms` in its frontmatter keeps every `:::only` block, on
the grounds that a page which has not said what it targets should not silently
lose content. So `:::only` does nothing until the page declares what it is for.

## Shared content

Anything true on more than one page is written once in `content/docs/_partials`
and included:

```md
:::include install-cli
```

The partial is spliced in before rendering, so its headings get anchors and
contents entries on every page that includes it, and its links are checked like
any other. It inherits the including page's `platforms`, which is how one
install fragment says `sudo` on macOS and Linux and something else on Windows.

This is not an optimisation. Installing the CLI is identical on three setup
pages; written out three times it drifts, and the docs this replaces are what
that looks like after ten years.

## Images

Put the file in `public/docs/guides/` and reference it from the site root:

```md
![The Android SDK Manager, with Build-Tools selected](/docs/guides/android-sdk-manager.png)
```

Name it for what it shows, in the same kebab-case as a page slug. These are
committed like any other source file.

Do not put anything in `public/docs/img/`. That directory is generated from the
registry on every build, its filenames are content hashes, and the build deletes
anything in it that it did not write. `public/docs/README.md` says which is
which.

**Write alt text that replaces the image, not that labels it.** "The SDK Manager
with Build-Tools 35.0.0 checked" is useful to someone who cannot see it; "SDK
Manager screenshot" is not.

A screenshot of a third-party UI dates faster than anything else on a page —
Android Studio and Xcode both rearrange their settings panes between releases.
Use one where the UI is genuinely hard to describe, and say what to look for in
prose as well, so the page still works when the screenshot is a year stale.

## Links

Internal links are root-relative and have no extension: `/docs/build/ui/layout`.
A link to a `/docs` path the structure does not define **fails the build**, so
you can link a page that is not written yet as long as it exists in `ia.ts`.

Link to the API reference by its real URL — `/docs/sdk/latest/Titanium.UI.Window`
— and write the type name as the link text.

Do not write "click here", and do not link a bare URL. The link text should say
where it goes when read on its own, because that is how it is read aloud.

## Before you open a pull request

```sh
pnpm check:docs   # frontmatter, structure, directives, links
pnpm test         # includes the rendering pipeline
pnpm dev          # look at the page
```

`pnpm build` runs `check:docs` too, so a broken page cannot deploy.

Look at the page. The checks prove it parses and links somewhere real; they
cannot tell you the tabs are the wrong shape for the content, or that the third
callout should have been a sentence.
