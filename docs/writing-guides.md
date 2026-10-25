# Writing guides

How to write the prose under `content/docs`. The API reference is generated from
the SDK's own YAML and is not covered here - nothing in this file applies to it.

Read this before writing a page. Most of these rules exist because the docs
being replaced did the opposite, and the audit in
[`docs/legacy-guide-audit.md`](legacy-guide-audit.md) records what that cost:
of 336 pages, **69 said something factually wrong** and 92 were worth archiving
rather than moving. Nearly all of that is drift - prose that was true when it
was written and was never revisited.

## Voice

**Write to one reader, doing one thing.** They have a terminal open. They are
not reading for pleasure and will not read the paragraph before the one they
need, so each section has to stand up alone.

**Second person, present tense, active voice.** "Run `ti build`", not "the build
can then be run". Say _you_ for the reader and _Titanium_ for the software. Do
not say _we_ - there is no we on a documentation page, and it usually smuggles
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

**No em dashes.** Not in prose, not in headings, not in a page title. Use the
punctuation the sentence actually wants: a colon before an explanation, a comma
or parentheses around an aside, a full stop between two thoughts. Where none of
those fit, a spaced hyphen does. `pnpm check:em-dash` fails the build on one, so
this is enforced rather than remembered.

**Spelling:** American - `color`, not `colour`, matching `backgroundColor` and
every other API name a reader will type. Where prose and an API name disagree,
write the API name exactly as it appears in code, in backticks.

## Where a page goes

The structure is fixed in [`src/lib/docs/ia.ts`](../src/lib/docs/ia.ts) and was
approved before any of this was written. **You cannot add a page by adding a
file.** A file with no entry in `ia.ts` fails the build, because a page that
appears in no sidebar is a page nobody finds.

To add a page, add it to `ia.ts` first - which is a change to the approved
structure, so raise it rather than doing it in passing.

```
content/docs/setup/macos.md         ->  /docs/setup/macos
content/docs/build/ui/index.md      ->  /docs/build/ui
content/docs/build/ui/layout.md     ->  /docs/build/ui/layout
content/docs/_partials/install.md   ->  not a page
```

Three segments after `/docs` is the ceiling, and only `build` uses the third.

## Versioning

The guides are versioned by **SDK major**. The current major is unversioned and
is the one you edit; older majors are frozen snapshots under a prefix.

```
/docs/setup/macos       the current major. Canonical, indexed, and the URL to link.
/docs/v13/setup/macos   an archived major. Frozen, banner at the top, canonical
                        pointing at the current page.
```

The current major is written down in exactly one place,
[`content/doc-versions.json`](../content/doc-versions.json). It is never in
frontmatter: every page in a tree has the same answer and they all change at
once, so a per-page copy is only a chance to disagree.

The API reference is versioned differently, per release
(`/docs/sdk/13.4.1/...`), because its surface changes per release and prose does
not. The switcher shows "Guides v13" in one place and "Version 13.4.1" in the
other so the two are not mistaken for one scheme.

### Cutting a major

When an SDK major ships, one command snapshots the current guides and moves the
live set on:

```sh
pnpm docs:snapshot v14 --dry-run   # see the plan
pnpm docs:snapshot v14             # cut it
```

That copies `content/docs` to `content/docs-archive/v13`, points the manifest at
`v14`, drops anything past the retention window, and tells you what to commit.
Do not do it by hand: the copy has to take `_partials` as well as the pages, and
the manifest and the directories have to move together or the build fails.

After it, keep editing `content/docs` as normal. The snapshot is a separate
tree and does not follow.

`pnpm docs:snapshot:check` reports drift between the manifest and the
directories. `pnpm check:docs` runs the same check, plus the full content
pipeline over every archived tree, so an archive that has lost a partial of its
own, or a page whose `ia.ts` entry was deleted out from under it, fails the
build instead of rendering a hole. A snapshot carries its own `_partials`, so
renaming one in current does not reach into an archive.

### Retention

Two archived majors, and the current one. Older majors are deleted and their
URLs redirect to the same page in current. One archived major costs about 13MB
of built output against a 100MB deployment cap, so this is a budget; guides for
a major nobody runs are read by nobody and invite someone to follow instructions
that stopped being true years ago.

### Fixing an archived page

**Patch it.** An archive is not a historical record of what the site once said;
it is the manual for a major some readers are still running, and a known-wrong
instruction in it costs them the same afternoon it would cost in current. Edit
the file under `content/docs-archive/<major>/`, and say what changed in the pull
request as you would for any other page.

Two things not to do: do not rewrite an archived page to describe a newer major,
and do not add pages to an archive. Both make the snapshot a worse answer to
"what did this look like in v13" without making it a better answer to anything
else.

The blog is outside all of this. A post is dated and describes a moment, so it
is never versioned and never snapshotted.

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
| `description` | no       | One sentence, for the search result and the tab preview. It is not shown on the page, so do not write it as a lede - the body's opening paragraph is that. |
| `platforms`   | no       | What the page applies to: `macos`, `windows`, `linux`, `ios`, `android`. Absent means all of them. Drives `:::only`.                                       |
| `since`       | no       | The SDK release the page's content assumes, within its major. Renders as a line under the title. Not the major: that is the tree the file is in.           |
| `draft`       | no       | Renders at its URL, is not linked from the sidebar, says so at the top, and asks search engines to skip it.                                                |

Unknown keys fail the build. A misspelled `platform` would otherwise silently
apply to nothing.

## Headings

`##` and `###` only. `#` is the title, which comes from frontmatter, and
anything below `###` produces a contents list too fine to navigate.

Write headings a reader could scan as a list and know what the page does:
"Install the Android SDK", not "Installation". Ids are generated from the text,
so renaming a heading breaks any link to it - search the repo before you do.

## Code samples

**Every sample must run.** Not a fragment that would run inside something the
reader has to guess at. If it needs surrounding context, show the context.

**Tag the language.** An untagged block is not highlighted; the corpus has 44 of
them and nobody has ever gone back to fix one. The tags that work:

`js` `jsx` `ts` `xml` `tss` `html` `json` `sh` `bash` `shell` `console`
`powershell` `ps1` `java` `swift` `objc`

Use `xml` for Alloy views and `tss` for styles. Use `sh` for macOS and Linux
shells and `powershell` for Windows - an unhighlighted Windows block sitting
next to a highlighted macOS one reads as a bug rather than as a choice.

**Program output is the exception.** A block that quotes what a command printed
is not a language, and tagging it colours it as one - leave those untagged. The
rule is about code the reader will run.

**Shell samples show the command, not the prompt.** No leading `$`. The page has
a copy button, and a copied `$` does not run.

**Use real names.** `Hello`, `myapp`, a real module id. Never `foo`, `bar`, or
`YOUR_VALUE_HERE` where a real example would do.

**Keep them short.** A sample longer than about twenty lines is documenting the
wrong thing, or is an example app that belongs in a repository.

## Components

Eight of them. Each solves one problem; reach for the plainest one that fits, and
if none fits, write a paragraph.

Every marker needs **a blank line above and below it**. Without one, markdown
folds the marker into the paragraph and the block does not render - the build
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
a row means neither is worth reading** - merge them, or turn one into a
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

Two to six panels. No headings inside a panel - it would appear in the contents
list pointing at something hidden.

**Picking a tab switches every group on the page with a tab of that name**, and
is remembered on the next page. So label consistently: a group offering
`npm` / `Yarn` and another offering `npm` / `Yarn` / `pnpm` still move together,
but `Yarn` and `yarn` do not.

Do not use tabs for content the reader needs to compare - they can only see one
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

A panel with prose in it is rejected - that is `:::tabs`.

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

### Card grids

A chooser at the top of a page that covers two or three things, where the reader
arrives already knowing which one they want. Each card is an image over a label,
and the whole card is the link.

```md
:::cards

@card [Visual Studio Code](#visual-studio-code)

![](/docs/guides/vscode.png)

@card [Pulsar](#pulsar)

![](/docs/guides/pulsar.png)

:::
```

The `@card` marker is an ordinary markdown link: its text is the label and its
target is where the card goes, so there is no second syntax to remember. The
image under it is optional, and a card without one still renders - a chooser is
useful before its artwork exists.

Two to six cards. One is a link wearing a chooser's costume, and the build says
so. Nothing but an image may sit under a card: prose there would be rendered
inside the link.

Images belong in `public/docs/guides/` and are referenced from the site root,
as above. `public/docs/img/` is the registry's and is gitignored.

### Missing screenshots

A picture the page wants and nobody has taken yet. It draws a box the shape of
the image, crossed through, saying what belongs there.

```md
:::missing 9:16

The two-tab template running on an Android emulator, with the second tab open.

:::
```

The argument is the shape as `width:height` - `9:16` for a phone, `16:9` for a
window, `4:3` for a dialog. The width is capped from it so a tall screenshot
does not leave a storey of empty box in the middle of the page.

Write the body as an instruction to whoever takes the shot: what is on screen,
on which platform, and what to look for. It is also what a reader gets in place
of the picture, so it should be worth reading on its own.

Use one rather than leaving a gap. A gap loses the fact that a picture was
wanted; a stale screenshot is worse than either. Outstanding ones are tracked in
TI-78.

### Platform-scoped source

`:::only` removes a block before rendering, based on the page's `platforms`. It
is not a component - the reader never sees that it happened.

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

A screenshot of a third-party UI dates faster than anything else on a page -
Android Studio and Xcode both rearrange their settings panes between releases.
Use one where the UI is genuinely hard to describe, and say what to look for in
prose as well, so the page still works when the screenshot is a year stale.

### Screenshot conventions

Settled under TI-78 and listed here because reshooting for consistency is the
expensive part. A shot of app UI should not be taken by hand at all:
`scripts/capture-screenshots.ts` applies all of this, and a reshoot after an
SDK change is then one command rather than an afternoon.

| | |
| ---------------- | ------------------------------------------------------------------------------ |
| Theme            | **Light only.** The harness produces dark from one flag if this is revisited |
| iOS device       | iPhone 17 Pro Max, 440x956pt                                                 |
| Android device   | Pixel 10 emulator, 411dp wide at density 2.625                               |
| Status bar       | Fixed at 9:41, charged, full bars, or cropped out of frame                   |
| Project name     | `Hello`, which is the name the guides already use                            |

Never in frame: signing identities, team names, keystore paths, tokens, or any
console line carrying a password argument. See the
`displayBuildCommandInConsole` warning on `/docs/setup/ide-integration`.

**Crop to the part that carries the point, not to the device.** A whole
portrait screenshot cannot be used in the prose at any scale: `.prose-docs img`
is `max-width: 100%` in a column of about 700px, so a 0.46:1 image is either
1500px tall at full width or 190px wide at the height the page allows. Shoot a
band instead. Where two platforms are being compared, the harness stitches
them, side by side for tall panes and stacked for wide short ones.

## Links

Internal links are root-relative and have no extension: `/docs/build/ui/layout`.
A link to a `/docs` path the structure does not define **fails the build**, so
you can link a page that is not written yet as long as it exists in `ia.ts`.

Never write the version into a guide link. Inside an archived major the site
rewrites `/docs/build/ui/layout` to `/docs/v13/build/ui/layout` when it renders,
so one link is correct in every major and the archive does not walk a reader
back into current without saying so.

Link to the API reference unversioned - `/docs/sdk/Titanium.UI.Window` - and
write the type name as the link text. That is the canonical address and it
tracks the newest release, so a link written today keeps pointing at current
documentation. `/docs/sdk/13.4.1/Titanium.UI.Window` is a real page too, and
what you want only when the passage is about that release in particular.

Do not write "click here", and do not link a bare URL. The link text should say
where it goes when read on its own, because that is how it is read aloud.

## Your page is also published as markdown

Every guide is served a second time as plain markdown at its own address plus
`.md`, and is listed in `/llms.txt` and concatenated into `/llms-full.txt`. That
is the corpus models read, and it is generated from the same file you are
editing, so there is nothing to add and nothing to keep in step.

Two things follow for how you write.

**A directive has to survive being turned into text.** `:::platform ios` becomes
"Applies to iOS only." and `@tab macOS` becomes a bold label. A reader with no
tab strip and no badges gets the same facts, but only because those markers
carry them. Do not use a tab group where the difference between panels is
invisible in the panel text itself.

**`description` is read out of context.** It becomes the one line under the
entry in `/llms.txt`, next to forty others, which is the only thing a model sees
before deciding whether to fetch your page.

`pnpm check:docs` prints both corpus sizes and fails on an index entry that
resolves to nothing.

**These addresses 404 in `next dev`.** The corpus is published on
`titaniumsdk.com` only, and the check is on the `Host` header, so `localhost`
is refused along with the preview domain. That is deliberate, and it is not a
broken page. To read your own markdown locally, ask for it as the live host:

```sh
curl -H 'Host: titaniumsdk.com' http://localhost:3002/docs/setup/macos.md
```

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
