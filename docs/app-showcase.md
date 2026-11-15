# Which apps get into the showcase

Settled in [TI-54](https://linear.app/titanium-sdk/issue/TI-54). Read this
before adding or removing anything under `registry/showcase/`, and before
reviewing a pull request that does.

The companion document is [`developer-directory.md`](./developer-directory.md),
which this is deliberately shaped like: one JSON file per entry, a picture
committed beside it, a pull request as the submission form, and
`pnpm check:registry` as the gate. The differences are all in what is being
judged, and they are set out below.

## What this page is for

A framework in its seventeenth year is asked one question before any other: **is
anyone still shipping with this?**

Nothing else on the site answers it. A feature list describes what the SDK can
do, the module registry describes what has been written for it, and the
developer directory says who can be hired. Only a list of shipped apps says that
the thing works, in production, for real users - and a reader can check it
without believing a word of it, by opening one on their own phone.

That is why the bar below is about evidence rather than quality.

## The bar

**The app shipped, and a stranger can verify it.**

Not "is it a good app", which is not a question this project can answer, and not
"is it impressive", which would quietly turn the page into a list of the four
biggest names anyone could remember. Shipped and checkable.

Checkable takes two forms, and the second matters more than it looks:

- **A store listing.** App Store, Google Play, or both.
- **The app's own site.** For an app built for one organisation and never sold
  publicly. A great deal of Titanium's real history is exactly this - field
  tools, logistics, internal apps at companies whose names are not on any store
  - and a rule that only took store links would exclude the most persuasive half
    of the evidence.

The schema requires at least one of `appStore`, `playStore` or `website`, so
there is always somewhere to go.

**A store link has to go to that store.** `appStore` is checked against
`apps.apple.com` and `itunes.apple.com`, `playStore` against `play.google.com`.
This is not tidiness. The page draws a labelled link for each, and a label
saying "App Store" is a promise about where a tap lands; borrowing it to send a
reader somewhere else is the one abuse a page like this invites. See
`HostedUrl` in `src/lib/registry/fields.ts`.

## Who may submit

The people who built the app, or who own it.

This is the part that differs most from the module registry, and it is not a
formality. An entry publishes somebody's name, icon and description on a page
that is not theirs. Opening a pull request from your own GitHub account, in
public, is how permission is recorded: it is signed, dated, attributable, and it
sits in `git log` for as long as the entry does.

**Do not submit an app you merely admire.** If you know a Titanium app that
should be here, ask the people who made it to submit it. An entry added on
somebody else's behalf is removed on request, without argument, and no reviewer
should have to have that conversation.

Removal on request is unconditional, for the same reason. An app is pulled from
sale, a company would rather not be named, a client asks - delete the file and
the icon in one pull request.

## What is not published, ever

**No email addresses**, in any field, including inside a URL. Same rule and same
mechanism as the directory: the schema rejects `mailto:`, `tel:` and anything
shaped like an address in any text a submitter writes. `src/lib/registry/fields.ts`
holds it for both, and it is pinned by tests so a future refactor cannot quietly
relax it.

## Icons

**Every entry has one, and it is required.** This is the opposite of the
directory, where a picture is optional and a listing without one shows initials.
The reasoning inverts with the subject: a person declining to publish a
photograph of themselves should not be pushed down the page for it, but every
app that shipped already has an icon, and a grid of app cards with a hole in it
reads as broken rather than as modest.

An icon is **a file committed beside the entry**, at
`registry/showcase/<id>.png` (or `.jpg`, or `.webp`), and nothing in the JSON
refers to it - the filename is the link. `src/lib/registry-images.ts` sets out
why it is a committed file rather than a URL, and the short version is that a
hotlinked image reports every visitor's address and user agent to a host of the
submitter's choosing, and can be swapped for a tracking pixel the day after
review.

What is enforced, and checked by `pnpm check:registry`:

- `.png`, `.jpg` or `.webp`, and the file has to actually be what its extension
  says. A renamed file is refused rather than published.
- **No SVG.** It is a document that can carry script and pull in remote
  resources, and it would be served from this site's own origin.
- **512x512px and 100KB per file, at most.** Roughly 256x256 saved as `.webp`
  is plenty - it is never drawn larger than 80px. The byte cap is a deployment
  budget rather than a matter of taste - see below.
- One icon per entry, no orphans, and **no entry without one**. All three fail
  the build rather than rendering a gap. A numbered file is a screenshot, and
  is covered below.

## Screenshots

**Optional, and at most five.** Committed beside the entry like the icon, as
`registry/showcase/<id>-1.png` (or `.jpg`, or `.webp`) through `<id>-5`, and
again nothing in the JSON refers to them - the number in the filename is the
order they are shown in. The app page draws them in a row under the platforms,
and a tap opens one in a lightbox. An entry with none has a shorter page, not a
broken one.

Every rule above applies to a screenshot as it does to an icon - format, magic
bytes, no SVG, **100KB per file** - except the pixel cap, which is for icons: a
phone screenshot is taller than it is wide and a 512px square would not fit
one. Saved as `.webp` at about 540px wide, a screenshot comes in under the cap
at a quality nobody will notice on a thumbnail or in the lightbox. A file
numbered `0`, or `6` and up, is refused with a message saying what the
numbering is, and `src/lib/showcase/icon.ts` holds the rules.

Why five, and why 100KB: the deployment size limit is 100MB, and it is measured
against the **prerendered static output**, which was 93MB when the showcase was
built. The headroom is therefore single-digit megabytes, shared with the entire
compiled documentation set. Screenshots at a realistic quality were first
refused outright on that arithmetic - roughly 1MB per entry - and the cap is
what makes them affordable now: an entry with all five at the limit is half a
megabyte. That still adds up, so if the showcase grows past a couple of dozen
entries, **re-measure the output before the limit does**. The stores host the
full-size screenshots and keep them current; these are a preview, and an entry
links out for the rest.

## Freshness, and why nothing expires

The directory expires listings after three months because it publishes a claim
about the present - somebody is available now - and a stale claim actively
misleads a reader who acts on it.

**An app that shipped shipped.** The fact does not decay, and there is nothing
for a submitter to re-confirm. Renewal friction here would only empty the page
of true entries, which for a showcase reads as the framework dying - the exact
impression the page exists to correct.

Two consequences to be honest about:

- `sdkVersion` is the version the app was **built with when it was listed**, not
  what is in the store today. The page says so, in those words, rather than
  presenting the number as current.
- Store links rot. An app pulled from sale is removed by pull request like
  anything else. Nothing automatic catches this, and pretending otherwise would
  be worse than saying it plainly here.

## Ordering, and the worked examples

Entries are shown in a rotating order that changes daily, so no name buys a
place at the top. It is deterministic and computed at build time -
`src/lib/fair-order.ts`, shared with the directory, has the whole argument.

While the showcase holds no real entry, it shows **worked examples**, badged as
examples wherever they appear. They exist so the page can be reviewed and so a
submitter can read a complete entry before writing one, and they remove
themselves the day the first real app is merged, with no follow-up pull request
for anyone to remember. See `liveApps()` in `src/lib/showcase/app.ts`.

The two examples cover the two shapes an entry takes: one on both stores and all
four form factors, one built for a single organisation with only a website. The
store links on the first point at real store hostnames with ids that do not
exist, because the host check is real and an example that dodged it would be
teaching the wrong lesson.
