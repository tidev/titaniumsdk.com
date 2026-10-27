# Image inventory

Every image the site wants and does not have, in one place: what it is of, which
page it is for, roughly how big it should be, and - for anything showing app UI -
which platform to shoot and the code that puts it on screen.

Derived from the tree on 2026-09-13: the seven `:::missing` blocks in
`content/docs`, the 54 screenshots the API reference inherits from the SDK's
apidoc, and the type index in `registry/sdk/main/contents.json`. TI-78 tracks the
work; this is the long form of its **Needed** section and should be kept in step
with it.

**Status is the next section.** Rows further down carry a **Shipped** marker
once done, and that marker is the detail behind the summary.

## Status

Ten images are shipped, all light theme, all produced by
`scripts/capture-screenshots.ts` and reproducible with it.

| Group                       | Shipped | Left                                                      |
| --------------------------- | ------- | --------------------------------------------------------- |
| Guides, marked `:::missing` | 5 of 7  | #4, #6                                                    |
| Guides, tooling             | 0 of 7  | #8, #9, #10, and three `ti info` shots that want a decision |
| Guides, unmarked but wanted | 5 of 10 | #18 to #22                                                |
| API reference               | 0 of 80 | all of it, and it lands in `tidev/titanium-sdk`           |

### Shipped

| #   | Page                                | File                             |
| --- | ----------------------------------- | -------------------------------- |
| 1   | `build/ui/layout` precedence        | `layout-precedence-ios.png`      |
| 2   | `build/ui/lists`                    | `list-view.png`                  |
| 3   | `build/ui/platform-conventions`     | `back-affordance.png`            |
| 5   | `build/notifications`               | `notification-shade-android.png` |
| 7   | `build/location`                    | `map-callout-ios.png`            |
| 13  | `build/first-app` "Run it"          | `template-app.png`               |
| 14  | `build/first-app` "Change something" | `first-app-tap-ios.png`         |
| 15  | `build/ui/layout` three modes       | `layout-modes-ios.png`           |
| 16  | `build/ui/layout` horizontal        | `horizontal-wrap-ios.png`        |
| 17  | `build/ui/index`                    | `one-codebase.png`               |

### Left, and what each one needs

**Nothing left in the guides can be shot by the harness.** Every remaining
guide image is either a desktop application, a launcher, or a decision.

- **#8, #9, #10** the VS Code Titanium view, the Pulsar toolbar, the JetBrains
  build explorer. **#18** three Alloy files open side by side. **#19** VS Code
  stopped at a breakpoint. **#20** Xcode's signing pane. **#21** the Play
  Console. A person at a desk with the application open.
- **#4** the launcher icon masks. Needs the `com.android.theme.icon.*` overlay
  packages to switch mask shape, and `cmd overlay list` on the Pixel 10 image
  has none of them. Wants a system image carrying the Pixel themes, or a real
  device.
- **#6** the camera overlay and captured photo. The emulator's fake camera can
  be driven, but the shutter needs a tap at a coordinate and the test scene is
  not worth putting on a page. Shoot by hand or drop it.
- **#22** the three iOS 18 icon appearances. A home screen customisation
  setting that `simctl` does not expose.
- **`ti info` x3 (#12)** is a decision, not a shoot. A code block is
  searchable, copyable and cannot go stale silently; say yes and three images
  leave this list.
- **#11** the JetBrains logo treatment is a licensing question, tracked
  separately as TI-96.
- **The API reference, about 80 images.** This is where the volume is, and the
  harness is built for it: roughly half the example entries under
  `apidoc/Titanium/UI` are already self-contained runnable apps. It lands in
  `tidev/titanium-sdk`, so it wants its own ticket.

TI-78 asks for every image to be produced **or explicitly dropped with the
reason recorded**. #4, #6 and #22 have their reasons above but have not been
dropped, so the `:::missing` blocks for #4 and #6 are still on their pages.

---

## Read this first

**Three different repositories own these images.** Getting that wrong is the
expensive mistake, because a screenshot dropped in the wrong place either fails
review or is deleted by the next build.

| Group           | Lives in                           | Notes                                                                         |
| --------------- | ---------------------------------- | ----------------------------------------------------------------------------- |
| Guides          | `public/docs/guides/` in this repo | Committed source. Named in kebab-case for what they show                      |
| API reference   | `apidoc/` in `tidev/titanium-sdk`  | Beside the YAML that references them. Reaches this site through `pnpm docgen` |
| Registry mirror | `public/docs/img/`                 | **Do not touch.** Generated, content-hashed, and wiped on every build         |

An API reference image replaced upstream only appears in SDK versions compiled
after the change - `main` and the next release. Archived versions keep their
frozen manifests and their old pictures, which is correct: `/docs/sdk/13.4.1`
should show what 13.4.1 shipped.

**Sizing.** `.prose-docs img` is `max-width: 100%; height: auto`, and nothing
emits `width`/`height`, so an image renders at its intrinsic pixel size capped
at the prose column, which is about **700px**. For a wide screenshot that is
the right behaviour: anything wider than the column is scaled down to fit and
the extra pixels become density. It only bites for an image **narrower** than
the column, where a 2x asset of a small control renders at double its intended
size rather than at the same size and twice the density. The cheap fix, if one
is ever needed, is to emit `width`/`height` at half the intrinsic size for a
`@2x`-named file: `src/lib/docs/markdown.ts` already allows both attributes
through the sanitiser, and `assetUrl` in `src/lib/docs/assets.ts` is the hook.

What this means in practice is that a whole portrait screenshot is unusable at
any scale: at a readable width it is 1500px tall, and at the height the page
allows it is 190px wide. Shoot a band. Where the whole screen genuinely is the
subject, as in #13, the harness has `maxWidth` instead.

**Conventions are settled and written down** in `docs/writing-guides.md`, which
is where TI-78 asked for them. Repeated here because they apply to every row,
and `scripts/capture-screenshots.ts` applies them for you:

- **Light theme only.** The harness produces dark from one flag if that is ever
  revisited.
- One device per platform, so scale does not wander page to page. An iPhone 17
  Pro Max (440x956pt) and a Pixel 10 emulator (411dp wide at density 2.625).
  An iPhone 16 is no longer installable on a current Xcode.
- A comparison of two platforms gets its platform name above each half and a
  hairline box around it. Not a phone bezel: most of these are a band cropped
  out of a screen, and a bezel would claim they are whole phones.
- Status bars: clean them or crop them. A real clock and battery level date an
  image and leak the machine it was taken on.
- Project names from the guides - `Hello`, `myapp` - not whatever was on disk.
- Never in frame: signing identities, team names, keystore paths, tokens, or any
  console line carrying a password argument. See the
  `displayBuildCommandInConsole` warning on `/docs/setup/ide-integration`.
- Watch total weight. Deployment is capped at 100MB measured against static
  output, which was 93MB. The six legacy iOS behaviour GIFs alone are 8.3MB.

**Snippets live in `scripts/shots/`,** one `.js` per shot plus `shots.json`
holding the platforms, the crop band and anything else the shot needs. They are
not pasted into this file any more, so the picture and the code that produced
it cannot drift apart. `node scripts/capture-screenshots.ts --shot <id>` builds
one; a warm run is about 25 seconds.

---

## 1. Guides: already marked `:::missing`

Seven, each drawn on the page as a crossed box carrying its own brief. Five
are shipped and their blocks are gone; #4 and #6 are the two a reader can still
see are absent.

| #   | Page                                                                                    | Ratio | Deliver   | Platform | Of                                                                                                                                                                                                                                           |
| --- | --------------------------------------------------------------------------------------- | ----- | --------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | [layout.md:116](content/docs/build/ui/layout.md#L116)                                   | 4:3   | 1320x990  | iOS      | **Shipped**, light only, as `/docs/guides/layout-precedence-ios.png`. One iPhone screenshot, cropped to the band holding both panes. Left: a view with `top: 20, bottom: 20, height: 100` sitting at the top of its parent. Right: the same view with `height` removed, stretched between both pins. The point is that `height` outranks `bottom` |
| 2   | [lists.md:135](content/docs/build/ui/lists.md#L135)                                     | 3:1   | 2267x761  | **Both** | **Shipped**, light only, as `/docs/guides/list-view.png`. The same five-item `ListView` on iPhone and on an Android emulator, side by side, with a section header visible on each so the platform header styling is the difference on show                                                             |
| 3   | [platform-conventions.md:167](content/docs/build/ui/platform-conventions.md#L167)       | 5:3   | 1080x667  | **Both** | **Shipped**, light only, as `/docs/guides/back-affordance.png`. Stacked rather than side by side, because two navigation bars side by side render about 100px tall in the prose. The same two-screen app on both, on the detail screen, so the iOS back chevron in the navigation bar and the Android up affordance in the action bar are both visible                                                                        |
| 4   | [icons-and-launch-screens.md:97](content/docs/build/ui/icons-and-launch-screens.md#L97) | 16:9  | 1400x788  | Android  | The generated adaptive icon on an emulator launcher, three times with different mask shapes - circle, squircle, rounded square - so the cropping is visible                                                                                  |
| 5   | [notifications.md:123](content/docs/build/notifications.md#L123)                        | 3.3:1 | 1080x328  | Android  | **Shipped**, light only, as `/docs/guides/notification-shade-android.png`. Cropped to the card rather than the whole shade, which keeps the emulator's own notifications and its clock out of frame. An expanded notification in the emulator's shade, showing title, body and app icon from the local notification example on the page                                                                                                           |
| 6   | [media.md:143](content/docs/build/media.md#L143)                                        | 9:16  | 640x1138  | Android  | The camera overlay open with the shutter visible, and below it the captured photo shown in an `ImageView` on the same screen                                                                                                                 |
| 7   | [location.md:135](content/docs/build/location.md#L135)                                  | 4:3   | 1320x990  | iOS      | **Shipped**, light only, as `/docs/guides/map-callout-ios.png`. Moved from Android to iOS: MapKit needs no API key, where Android Maps does. A map with three annotations, centred on a city, with one annotation's callout open                                                                                                                                                          |

Snippets for the three that need code rather than a stock app. Each one that a
script can shoot lives in `scripts/shots/` as well, and
`pnpm run capture:shots` builds it, runs it on a fixed simulator with the status
bar overridden, and writes the cropped image. The ones below that are not a
snippet in a window stay manual.

**#1 - layout precedence (iOS)**

The two panes sit in a fixed band rather than filling the screen, and the shot
is cropped to that band. A full-height portrait screenshot cannot be used on
this page at any scale: `.prose-docs img` is `max-width: 100%` in a 700px
column, so a 0.46:1 image is either 1500px tall at full width or 190px wide at
the 26rem height the prose allows (`MISSING_MAX_HEIGHT`, `src/lib/docs/blocks.ts`).
A 330pt band on the 440pt-wide screen of an iPhone 17 Pro Max crops to exactly
4:3; on a 393pt iPhone 17 use 295, or pad the crop with the window's white,
which is uniform above and below the band.

The code is `scripts/shots/layout-precedence.js`, which is what
`node scripts/capture-screenshots.ts --shot layout-precedence` builds. It lives
there rather than inline here so the picture and the code that produced it
cannot drift apart.

Composite layout with each pane pinned by `left` or `right`, not a `horizontal`
window: in horizontal layout `Ti.UI.FILL` takes the full row height and `top: 60`
then pushes the bottom of both panes off the screen, which is the one edge this
image has to show.

**#4 and #6 - the two that are still open**

Neither is a snippet in a window, and neither is worth the machinery yet.

**#4, the adaptive icon under three launcher masks.** Android ships overlay
packages for the mask shapes and `cmd overlay enable` can switch between them,
so the three states are reachable. The cost is the crop: the picture is of one
icon on a launcher page, and finding it means either hard-coding a position for
one device or driving the launcher. Worth doing only if more launcher shots
turn up.

**#6, the camera overlay and the captured photo.** The emulator's fake camera
can be driven, but taking the photo means tapping a shutter at a coordinate,
and the emulator's test scene is not something worth putting on a page. The
honest options are to shoot it by hand on a real device or to drop the picture
and keep the prose.

**#5 and #7 - what it took**

Both needed something the harness did not have. `#5` posts the example's own
notification, which needs `POST_NOTIFICATIONS` declared and granted, and then
needs the app force-stopped and relaunched: a plain relaunch finds it already
running and the code never runs again. It also clears the emulator's own
notifications first, by tapping Clear all at a position that is specific to
this device. `#7` needs the `ti.map` module in the harness tiapp and calls
`selectAnnotation` so the callout is open without anyone tapping. On iOS 26 a
selected annotation draws its title and subtitle as a label rather than the old
bubble, which is what the picture shows.

**#2 and #3 - the two platform comparisons**

`scripts/shots/list-view.js` and `scripts/shots/back-affordance.js`, both shot
with `--platform both` and stitched by the capture script.

Two things the shoot turned up. On iOS a `ListView` given a fixed height
renders only the rows that fit the frame it was given, and quietly dropped the
fifth even with room to spare, so the list fills the window and the crop does
the framing. And Titanium Android puts no up caret on a child window unless
`actionBar.displayHomeAsUp` is set, which is worth saying on
`platform-conventions.md` itself rather than only showing in a picture.

---

## 2. Guides: tooling screenshots

No app UI in any of these - they are editor and terminal windows. Shoot at a
fixed window width so they do not vary in scale, and carry the same theme
decision as everything else.

| #   | Page                                                                                                                          | Deliver       | Of                                                                                                                                                                                                                                                                                                                                                                                        |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8   | [ide-integration.md](content/docs/setup/ide-integration.md) VS Code section                                                   | 1400x900      | The **Titanium view** in the Activity Bar, expanded to show platforms and their targets, with at least one simulator or device listed. The page describes it in prose only                                                                                                                                                                                                                |
| 9   | [ide-integration.md](content/docs/setup/ide-integration.md) Pulsar section                                                    | 1400x500      | The package's toolbar across the top of the editor with a project open. It is the main thing that differs from the VS Code extension, and the upstream README's shot is from 2018. Crop to the toolbar and the first line or two of editor                                                                                                                                                |
| 10  | [ide-integration.md](content/docs/setup/ide-integration.md) JetBrains section                                                 | 1400x900      | The build-explorer tool window and a Titanium run configuration. The page describes both; neither is pictured                                                                                                                                                                                                                                                                             |
| 11  | [ide-integration.md](content/docs/setup/ide-integration.md) cards grid                                                        | 256x256       | **Open licensing question, not a shooting task.** JetBrains is a monochrome Simple Icons silhouette next to two full-colour product logos and reads as the odd one out. Either source a full-colour JetBrains mark under a checked licence, or render all three monochrome. Monochrome needs no permission and would want inline SVG, which `:::cards` does not currently emit. See TI-78 |
| 12  | [macos.md](content/docs/setup/macos.md), [windows.md](content/docs/setup/windows.md), [linux.md](content/docs/setup/linux.md) | 1400x900 each | A terminal running `ti info` on a working setup. **Decide code block or image before shooting three.** A code block is searchable, copyable and cannot go stale silently; an image shows the colour and the check marks. Recommendation: code block, and skip these three                                                                                                                 |

---

## 3. Guides: not yet marked, worth adding

Gaps I would fill, in rough priority order. None had a `:::missing` block,
which is why they were easy to overlook. #13 to #17 are shipped and their
images are on the pages; #18 to #22 are still open, and either wants a
`:::missing` block adding or wants shooting, since that block is the mechanism
the site has for saying a picture is wanted.

| #   | Page                                                                                         | Ratio | Deliver   | Platform | Of                                                                                                                                                                                               |
| --- | -------------------------------------------------------------------------------------------- | ----- | --------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 13  | [first-app.md](content/docs/build/first-app.md) "Run it"                                     | 2:1  | 560x610  | **Both** | **Shipped**, light only, as `/docs/guides/template-app.png`. The generated two-tab template app running, iPhone and Android side by side. This is the first thing a reader builds and the page never shows it                                                 |
| 14  | [first-app.md](content/docs/build/first-app.md) "Change something"                           | 3:1  | 1320x420 | iOS      | **Shipped**, light only, as `/docs/guides/first-app-tap-ios.png`. The label-and-button screen from the snippet on the page, after the button has been tapped so the label reads "Hello from Titanium"                                                              |
| 15  | [layout.md](content/docs/build/ui/layout.md) "The three layout modes"                        | 11:6 | 1320x720 | iOS      | **Shipped**, light only, as `/docs/guides/layout-modes-ios.png`. One frame per mode - composite, vertical, horizontal - with the same four coloured children in each, so the difference is only the parent's `layout`. Snippet below                              |
| 16  | [layout.md](content/docs/build/ui/layout.md) "Horizontal layout"                             | 5:1  | 1320x270 | iOS      | **Shipped**, light only, as `/docs/guides/horizontal-wrap-ios.png`. The tag-chip example from the page, wrapped onto two rows, so `horizontalWrap` is visible rather than described                                                                                  |
| 17  | [ui/index.md](content/docs/build/ui/index.md)                                                | 4:1  | 2266x564 | **Both** | **Shipped**, light only, as `/docs/guides/one-codebase.png`. Optional. A single screen built from one codebase, rendered on both, for the page that opens with "a Titanium view is a real native view"                                                        |
| 18  | [alloy/views.md](content/docs/alloy/views.md)                                                | 16:9  | 1400x788  | n/a      | A three-pane editor shot: `index.xml`, `index.tss`, `index.js` open side by side with the same `id` highlighted in each. This is the one Alloy concept that a picture explains faster than prose |
| 19  | [debugging.md](content/docs/build/debugging.md) "Breakpoints"                                | 16:9  | 1400x788  | n/a      | VS Code stopped on a breakpoint in an Alloy controller, with the Variables pane showing a local. The page currently says breakpoints exist and shows nothing                                     |
| 20  | [distribute/signing.md](content/docs/distribute/signing.md)                                  | 16:9  | 1400x788  | n/a      | Xcode's **Settings, Accounts, Manage Certificates** sheet with an Apple Development certificate listed. **Redact the team name.** This is the step people get stuck on                           |
| 21  | [distribute/android.md](content/docs/distribute/android.md)                                  | 16:9  | 1400x788  | n/a      | The Play Console's App bundle explorer for an uploaded `.aab`, showing the version code. Redact the account name                                                                                 |
| 22  | [icons-and-launch-screens.md](content/docs/build/ui/icons-and-launch-screens.md) iOS section | 4:3   | 1400x1050 | iOS      | The three iOS 18 appearances of one icon - default, `-Dark`, `-Tinted` - side by side on a home screen. Pairs with the Android mask image already requested at #4                                |

**#15 - the three layout modes**

```js
const win = Ti.UI.createWindow({ backgroundColor: '#fff', layout: 'horizontal' });
const colors = ['#ff3b30', '#ff9500', '#34c759', '#0a84ff'];

for (const mode of ['composite', 'vertical', 'horizontal']) {
  const col = Ti.UI.createView({ width: '33%', height: Ti.UI.FILL, top: 60 });
  col.add(Ti.UI.createLabel({ text: mode, top: 0, font: { fontSize: 12 } }));

  const box = Ti.UI.createView({
    layout: mode,
    top: 24,
    bottom: 20,
    left: 8,
    right: 8,
    backgroundColor: '#f2f2f7',
  });
  for (const c of colors) {
    box.add(Ti.UI.createView({ width: 40, height: 40, top: 6, left: 6, backgroundColor: c }));
  }
  col.add(box);
  win.add(col);
}

win.open();
```

**#13 to #17 - what the shoot turned up**

Three of the five could not be photographed as the pages had them written,
which is worth more than the pictures:

- The chip example on `layout.md` rendered as one dark block, not as chips. A
  label in a horizontal container does not size to its text without an
  explicit `Ti.UI.SIZE`, so all five expanded. At the page's own `90%` the five
  short chips also did not wrap on a 440pt phone, so the picture would have
  shown nothing of `horizontalWrap`. **The page example is fixed** rather than
  the shot diverging from it: a picture that contradicts the code under it is
  worse than no picture. The page now carries the sizes and a 240 container,
  and a line saying why a child in a horizontal layout needs a size at all.
- The first screen a reader builds put its label at `top: 40`, which on a
  notched iPhone sits inside the status bar. Both the Classic and the Alloy
  version are changed to 80 and 140, which is what the picture shows.
- `#13` is the one shot where the whole screen is the subject, since the tab
  bar at the bottom is half the point. It uses `maxWidth` rather than a crop.

**#4 cannot be done on this emulator.** Switching the launcher's icon mask
needs the `com.android.theme.icon.*` overlay packages, and `cmd overlay list`
on the Pixel 10 image shows none of them. It wants a system image that carries
the Pixel themes, or a real device. `#22`, the three iOS 18 icon appearances,
is a home screen customisation setting that `simctl` does not expose.

---

## 4. API reference: replacing the 54 legacy screenshots

**All 54 need reshooting.** They are 1x, cropped tight, and most are from the
Android 4 and iOS 6 era - `slider_ios.png` is 193x25 and 400 bytes. Widths run
from 63px to 800px with no consistency, and several show retired chrome.

They live in `tidev/titanium-sdk` under `apidoc/Titanium/UI/`, referenced from
the YAML as `./name_platform.png`. Keep the existing filenames and the existing
`| Android | iOS |` table in each description, so nothing in the prose has to
change.

### 4a. Cross-platform controls - shoot both

Each of these needs **two** images, one per platform, because the description
already renders them in a two-column table. One snippet serves both: build it
for iOS, shoot, build for Android, shoot.

| #   | Type                            | Files                                    | Deliver each | Of                                                                                                                                                                                                    |
| --- | ------------------------------- | ---------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 23  | `Titanium.UI.ActivityIndicator` | `activityindicator_{android,ios}.png`    | 240x160      | A spinner mid-spin with its message label                                                                                                                                                             |
| 24  | `Titanium.UI.AlertDialog`       | `alertdialog_{android,ios}.png`          | 800x480      | A two-button dialog over a dimmed window                                                                                                                                                              |
| 25  | `Titanium.UI.Button`            | `button_{android,ios}.png`               | 320x140      | One default button, unpressed                                                                                                                                                                         |
| 26  | `Titanium.UI.EmailDialog`       | `emaildialog_{android,ios}.png`          | 640x1138     | The composer with To, Subject and body filled. **Use `someone@example.com`**                                                                                                                          |
| 27  | `Titanium.UI.ListView`          | `listview_{android,ios}.png`             | 800x1000     | Five rows under a section header                                                                                                                                                                      |
| 28  | `Titanium.UI.OptionDialog`      | `optiondialog_{android,iphone,ipad}.png` | 640x480      | Three options plus cancel. Three files: the iPad one is a popover and genuinely differs                                                                                                               |
| 29  | `Titanium.UI.Picker`            | `picker_{android,ios}.png`               | 800x600      | A single-column picker with a value selected mid-list                                                                                                                                                 |
| 30  | `Titanium.UI.ProgressBar`       | `progressbar_{android,ios}.png`          | 800x160      | About 60% filled, with its message                                                                                                                                                                    |
| 31  | `Titanium.UI.SearchBar`         | `searchbar_{android,ios}.png`            | 800x160      | Unfocused, showing the hint text                                                                                                                                                                      |
| 32  | `Titanium.UI.Slider`            | `slider_{android,ios}.png`               | 800x160      | Thumb about a third along                                                                                                                                                                             |
| 33  | `Titanium.UI.Switch`            | `switch_{android,ios}.png`               | 200x140      | On. Android additionally wants the checkbox and toggle-button styles - see the snippet                                                                                                                |
| 34  | `Titanium.UI.TableView`         | `tableview_{android,ios}.png`            | 800x1000     | Five rows, one section header                                                                                                                                                                         |
| 35  | `Titanium.UI.TextArea`          | `textarea_{android,ios}.png`             | 800x400      | Two or three lines of text, unfocused                                                                                                                                                                 |
| 36  | `Titanium.UI.TextField`         | `textfield_{android,ios}.png`            | 800x160      | Unfocused with hint text                                                                                                                                                                              |
| 37  | `Titanium.UI.TabGroup`          | `tabgroup_{android,ios}.png`             | 640x1138     | Three tabs, second selected. **Android only today; iOS is missing entirely**                                                                                                                          |
| 38  | `Titanium.UI.Label`             | `label_{android,ios}.png`                | 800x300      | Two labels, one wrapping. **Android only today; iOS is missing**                                                                                                                                      |
| 39  | `Titanium.UI.ButtonBar`         | `buttonbar_{android,ios}.png`            | 800x160      | Three segments, first selected. **Android only today; iOS is missing**                                                                                                                                |
| 40  | `Titanium.UI.OptionBar`         | `optionbar_{android,ios}.png`            | 800x160      | Three options, one selected. **Android only today; iOS is missing**                                                                                                                                   |
| 41  | `Titanium.UI.ScrollableView`    | `scrollableview_{android,ios}.png`       | 640x1000     | Three pages with the paging dots visible, mid-page. **Android only today; iOS is missing**                                                                                                            |
| 42  | `Titanium.UI.RefreshControl`    | `refreshcontrol_{android,ios}.png`       | 800x600      | A list pulled down with the spinner showing. **Android only today; iOS is missing** - and the type's own summary is written about `UIRefreshControl`, so the iOS one is the more important of the two |

Snippets:

```js
// #23 ActivityIndicator
const win = Ti.UI.createWindow({ backgroundColor: '#fff' });
const ind = Ti.UI.createActivityIndicator({
  message: 'Loading...',
  style:
    Ti.Platform.osname === 'android'
      ? Ti.UI.ActivityIndicatorStyle.BIG
      : Ti.UI.ActivityIndicatorStyle.BIG_DARK,
});
win.add(ind);
win.addEventListener('open', () => ind.show());
win.open();
```

```js
// #24 AlertDialog
const win = Ti.UI.createWindow({ backgroundColor: '#fff' });
win.addEventListener('open', () => {
  Ti.UI.createAlertDialog({
    title: 'Delete note',
    message: 'This cannot be undone.',
    buttonNames: ['Cancel', 'Delete'],
    cancel: 0,
  }).show();
});
win.open();
```

```js
// #25 Button
const win = Ti.UI.createWindow({ backgroundColor: '#fff' });
win.add(Ti.UI.createButton({ title: 'Save note', width: 200, height: 48 }));
win.open();
```

```js
// #26 EmailDialog - opens the composer; shoot it, then discard the draft
const win = Ti.UI.createWindow({ backgroundColor: '#fff' });
win.addEventListener('open', () => {
  const mail = Ti.UI.createEmailDialog({
    subject: 'Site visit 214',
    toRecipients: ['someone@example.com'],
    messageBody: 'Report attached. Three findings, none blocking.',
  });
  if (mail.isSupported()) mail.open();
});
win.open();
```

```js
// #27 ListView and #42 RefreshControl - same app, shoot twice
const win = Ti.UI.createWindow({ backgroundColor: '#fff' });

const section = Ti.UI.createListSection({ headerTitle: 'Modules' });
section.setItems([
  { properties: { title: 'ti.map' } },
  { properties: { title: 'ti.barcode' } },
  { properties: { title: 'ti.coremotion' } },
  { properties: { title: 'ti.crypto' } },
  { properties: { title: 'ti.nfc' } },
]);

const control = Ti.UI.createRefreshControl({
  title: Ti.UI.createAttributedString({ text: 'Pull to refresh' }),
});
control.addEventListener('refreshstart', () => setTimeout(() => control.endRefreshing(), 5000));

win.add(Ti.UI.createListView({ sections: [section], refreshControl: control }));
win.open();
// For #42, drag the list down and hold while the spinner is showing.
```

```js
// #28 OptionDialog
const win = Ti.UI.createWindow({ backgroundColor: '#fff' });
win.addEventListener('open', () => {
  Ti.UI.createOptionDialog({
    title: 'Export as',
    options: ['PDF', 'Markdown', 'Plain text', 'Cancel'],
    cancel: 3,
  }).show();
});
win.open();
```

```js
// #29 Picker
const win = Ti.UI.createWindow({ backgroundColor: '#fff' });
const picker = Ti.UI.createPicker({ selectionIndicator: true, width: Ti.UI.FILL });
picker.add(
  ['Daily', 'Weekly', 'Fortnightly', 'Monthly', 'Quarterly'].map((t) =>
    Ti.UI.createPickerRow({ title: t })
  )
);
win.add(picker);
win.addEventListener('open', () => picker.setSelectedRow(0, 2, false));
win.open();
```

```js
// #30 ProgressBar
const win = Ti.UI.createWindow({ backgroundColor: '#fff' });
win.add(
  Ti.UI.createProgressBar({
    min: 0,
    max: 10,
    value: 6,
    width: '80%',
    message: 'Downloading SDK',
    color: '#000',
  })
);
win.open();
```

```js
// #31 SearchBar
const win = Ti.UI.createWindow({ backgroundColor: '#fff' });
win.add(Ti.UI.createSearchBar({ hintText: 'Search modules', top: 20, width: Ti.UI.FILL }));
win.open();
```

```js
// #32 Slider
const win = Ti.UI.createWindow({ backgroundColor: '#fff' });
win.add(Ti.UI.createSlider({ min: 0, max: 100, value: 35, width: '80%' }));
win.open();
```

```js
// #33 Switch - Android needs all three styles, iOS only has the one
const win = Ti.UI.createWindow({ backgroundColor: '#fff', layout: 'vertical' });
win.add(Ti.UI.createSwitch({ value: true, top: 40 }));

if (Ti.Platform.osname === 'android') {
  win.add(
    Ti.UI.createSwitch({
      style: Ti.UI.SWITCH_STYLE_CHECKBOX,
      title: 'Sync over cellular',
      value: true,
      top: 24,
    })
  );
  win.add(
    Ti.UI.createSwitch({
      style: Ti.UI.SWITCH_STYLE_TOGGLE_BUTTON,
      titleOn: 'Notifications on',
      titleOff: 'Notifications off',
      value: true,
      width: 220,
      height: 48,
      top: 24,
    })
  );
}
win.open();
```

```js
// #34 TableView
const win = Ti.UI.createWindow({ backgroundColor: '#fff' });
const section = Ti.UI.createTableViewSection({ headerTitle: 'Settings' });
for (const title of ['General', 'Notifications', 'Privacy', 'Storage', 'About']) {
  section.add(Ti.UI.createTableViewRow({ title }));
}
win.add(Ti.UI.createTableView({ data: [section] }));
win.open();
```

```js
// #35 TextArea and #36 TextField
const win = Ti.UI.createWindow({ backgroundColor: '#fff', layout: 'vertical' });
win.add(
  Ti.UI.createTextField({
    hintText: 'Note title',
    top: 40,
    width: '80%',
    borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
  })
);
win.add(
  Ti.UI.createTextArea({
    value: 'Inspected the north gantry. Two bolts replaced, one still to order.',
    top: 24,
    width: '80%',
    height: 120,
    borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,
  })
);
win.open();
```

```js
// #37 TabGroup
const win = Ti.UI.createTabGroup();
for (const [title, text] of [
  ['Inbox', '12 unread'],
  ['Drafts', '3 drafts'],
  ['Sent', 'Nothing recent'],
]) {
  const w = Ti.UI.createWindow({ title, backgroundColor: '#fff' });
  w.add(Ti.UI.createLabel({ text }));
  win.addTab(Ti.UI.createTab({ title, window: w }));
}
win.open();
// Select the second tab before shooting.
```

```js
// #38 Label
const win = Ti.UI.createWindow({ backgroundColor: '#fff', layout: 'vertical' });
win.add(
  Ti.UI.createLabel({ text: 'Site visit 214', top: 40, font: { fontSize: 22, fontWeight: 'bold' } })
);
win.add(
  Ti.UI.createLabel({
    text: 'A label wraps onto as many lines as it needs when its width is constrained.',
    top: 12,
    width: '80%',
  })
);
win.open();
```

```js
// #39 ButtonBar and #40 OptionBar
const win = Ti.UI.createWindow({ backgroundColor: '#fff', layout: 'vertical' });
win.add(
  Ti.UI.createButtonBar({
    labels: ['Day', 'Week', 'Month'],
    index: 0,
    top: 40,
    width: 260,
    height: 32,
  })
);
win.add(Ti.UI.createOptionBar({ labels: ['List', 'Grid', 'Map'], index: 1, top: 32, width: 260 }));
win.open();
```

```js
// #41 ScrollableView
const win = Ti.UI.createWindow({ backgroundColor: '#fff' });
const pages = ['#ff3b30', '#ff9500', '#34c759'].map((backgroundColor, i) => {
  const v = Ti.UI.createView({ backgroundColor });
  v.add(Ti.UI.createLabel({ text: `Page ${i + 1}`, color: '#fff', font: { fontSize: 28 } }));
  return v;
});
win.add(Ti.UI.createScrollableView({ views: pages, showPagingControl: true, currentPage: 1 }));
win.open();
```

### 4b. Android-only

| #   | Type                                    | File                            | Deliver  | Of                                                                                                                                                                                                        |
| --- | --------------------------------------- | ------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 43  | `Titanium.UI.Android.CardView`          | `cardview_android.png`          | 800x500  | Two stacked cards with the elevation shadow clearly visible                                                                                                                                               |
| 44  | `Titanium.UI.Android.CollapseToolbar`   | `collpasetoolbar_android.jpg`   | 800x800  | Mid-collapse, so both the image and the shrinking title are visible. **Filename typo is upstream - keep it**, renaming breaks the YAML reference. Convert to `.png` only if you also update the reference |
| 45  | `Titanium.UI.Android.DrawerLayout`      | `drawerlayout_android.png`      | 640x1138 | Drawer open over dimmed content                                                                                                                                                                           |
| 46  | `Titanium.UI.Android.ProgressIndicator` | `progressindicator_android.png` | 800x500  | The determinate dialog variant, partway through                                                                                                                                                           |
| 47  | `Titanium.UI.Android.SearchView`        | `searchview_android.png`        | 800x200  | Focused with a query typed                                                                                                                                                                                |
| 48  | `Titanium.UI.Android.Snackbar`          | `snackbar_android.png`          | 800x200  | Message plus action button, at the bottom of the screen                                                                                                                                                   |
| 49  | `Titanium.UI.Notification`              | `toast_android.png`             | 800x250  | A toast over app content                                                                                                                                                                                  |

```js
// #43 CardView
const win = Ti.UI.createWindow({ backgroundColor: '#eee', layout: 'vertical' });
for (const [title, body] of [
  ['ti.map', 'Google Maps for Titanium'],
  ['ti.barcode', 'Scan QR and barcodes'],
]) {
  const card = Ti.UI.Android.createCardView({
    top: 16,
    width: '90%',
    height: 100,
    elevation: 8,
    borderRadius: 8,
    padding: 16,
  });
  const stack = Ti.UI.createView({ layout: 'vertical', height: Ti.UI.SIZE });
  stack.add(
    Ti.UI.createLabel({ text: title, left: 0, font: { fontSize: 18, fontWeight: 'bold' } })
  );
  stack.add(Ti.UI.createLabel({ text: body, left: 0, top: 6, color: '#666' }));
  card.add(stack);
  win.add(card);
}
win.open();
```

```js
// #44 CollapseToolbar - scroll a little before shooting
const win = Ti.UI.createWindow({ theme: 'Theme.Titanium.DayNight.NoTitleBar' });
const content = Ti.UI.createView({ layout: 'vertical', height: Ti.UI.SIZE });
for (let i = 1; i <= 40; i++) {
  content.add(Ti.UI.createLabel({ text: `Item ${i}`, height: 40, left: 16 }));
}
const bar = Ti.UI.Android.createCollapseToolbar({
  top: 0,
  title: 'Modules',
  image: 'default.png',
  contentScrimColor: '#333',
});
win.addEventListener('open', () => {
  bar.contentView = content;
  bar.displayHomeAsUp = true;
});
win.add(bar);
win.open();
```

```js
// #45 DrawerLayout
const menu = Ti.UI.createView({ backgroundColor: '#fff', layout: 'vertical' });
for (const t of ['Inbox', 'Drafts', 'Sent', 'Archive']) {
  menu.add(Ti.UI.createLabel({ text: t, left: 24, height: 48 }));
}
const center = Ti.UI.createView({ backgroundColor: '#fafafa' });
center.add(Ti.UI.createLabel({ text: 'Inbox' }));

const drawer = Ti.UI.Android.createDrawerLayout({
  leftView: menu,
  centerView: center,
  leftWidth: '260dp',
});
const win = Ti.UI.createWindow({ theme: 'Theme.Titanium.DayNight.NoTitleBar' });
win.add(drawer);
win.addEventListener('open', () => drawer.toggleLeft());
win.open();
```

```js
// #46 ProgressIndicator
const win = Ti.UI.createWindow({ backgroundColor: '#fff' });
const p = Ti.UI.Android.createProgressIndicator({
  message: 'Installing SDK 13.4.1',
  location: Ti.UI.Android.PROGRESS_INDICATOR_DIALOG,
  type: Ti.UI.Android.PROGRESS_INDICATOR_DETERMINANT,
  min: 0,
  max: 10,
  value: 6,
});
win.addEventListener('open', () => p.show());
win.open();
```

```js
// #47 SearchView
const win = Ti.UI.createWindow({ backgroundColor: '#fff' });
const search = Ti.UI.Android.createSearchView({
  hintText: 'Search modules',
  value: 'barcode',
  top: 0,
});
win.add(search);
win.open();
```

```js
// #48 Snackbar
const win = Ti.UI.createWindow({ backgroundColor: '#fff' });
const snack = Ti.UI.Android.createSnackbar({
  message: 'Note deleted',
  length: Ti.UI.Android.Snackbar.LENGTH_INDEFINITE,
  action: 'UNDO',
});
win.add(snack);
win.addEventListener('open', () => snack.show());
win.open();
```

```js
// #49 Notification (toast)
const win = Ti.UI.createWindow({ backgroundColor: '#fff' });
win.add(Ti.UI.createLabel({ text: 'Inbox' }));
win.addEventListener('open', () => {
  Ti.UI.createNotification({
    message: 'Saved to drafts',
    duration: Ti.UI.NOTIFICATION_DURATION_LONG,
  }).show();
});
win.open();
```

### 4c. iOS-only

| #     | Type                           | File                                                                                                                                 | Deliver       | Of                                                                                                                                                                                                                                                                                                                                                                          |
| ----- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 50    | `Titanium.UI.iOS.Stepper`      | `stepper.png`                                                                                                                        | 320x140       | The default stepper                                                                                                                                                                                                                                                                                                                                                         |
| 51    | `Titanium.UI.iOS.Stepper`      | `stepper_custom.png`                                                                                                                 | 320x140       | The same with `tintColor` and custom increment and decrement images, so the difference from #50 is the point                                                                                                                                                                                                                                                                |
| 52    | `Titanium.UI.iOS.SystemButton` | `system_icons.png`                                                                                                                   | 1024x2400     | A contact sheet of every `SystemButton` constant with its name beside it. The current one is 512x1736 and predates several constants - **audit the list against the type before shooting**                                                                                                                                                                                  |
| 53-59 | `Titanium.UI.iOS.*Behavior`    | `gravity.gif`, `pushforce.gif`, `collision.gif`, `snapbehavior.gif`, `viewattachment.gif`, `anchorattachment.gif`, `dynamicitem.gif` | 600x1100 each | Seven animations of the 2D physics behaviours. **These are 8.5MB of the registry's 8.9MB of distinct images** - `pushforce.gif` alone is 3.1MB. Re-encode as short muted MP4 or WebP rather than GIF and the whole group drops by an order of magnitude. That needs the renderer to accept a `<video>`, which it currently does not. Lowest priority here, biggest size win |

```js
// #50 and #51 Stepper
const win = Ti.UI.createWindow({ backgroundColor: '#fff', layout: 'vertical' });
win.add(Ti.UI.iOS.createStepper({ value: 3, minimum: 0, maximum: 10, top: 40 }));
win.add(
  Ti.UI.iOS.createStepper({ value: 3, minimum: 0, maximum: 10, top: 32, tintColor: '#34c759' })
);
win.open();
// Shoot each separately, cropped to the control.
```

### 4d. Drop rather than replace

| #   | File                                | Why                                                                                                                                                                            |
| --- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 60  | `Titanium/UI/searchbar_windows.png` | Windows is a retired platform. `Titanium.UI.SearchBar` reports `android, iphone, ipad, macos` and nothing else. Delete the file and the table column upstream                  |
| 61  | `Titanium/UI/window-modal.png`      | 800x1067 and referenced by nothing - no description or example in the current type set points at it. Delete unless the `Titanium.UI.Window` prose is being rewritten to use it |

---

## 5. API reference: types with no image at all

Twenty-four view-kind types have no screenshot. Not all of them want one - a
`View` is by definition an empty rectangle - so this is the subset worth
shooting, in priority order. Same destination as section 4: `apidoc/` in
`tidev/titanium-sdk`, with the `![Android](./x.png)` table added to the type's
description in the same shape the documented types already use.

| #   | Type                                       | Platform | Deliver       | Of                                                                                                                             |
| --- | ------------------------------------------ | -------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 62  | `Titanium.UI.Android.FloatingActionButton` | Android  | 320x320       | The FAB over list content, bottom right. Since 12.0.0 and never pictured                                                       |
| 63  | `Titanium.UI.Toolbar`                      | **Both** | 800x200 each  | Three buttons in a bottom toolbar. Cross-platform since 6.2.0 and undocumented visually on either                              |
| 64  | `Titanium.UI.TabbedBar`                    | **Both** | 800x160 each  | Three segments, one selected                                                                                                   |
| 65  | `Titanium.UI.ImageView`                    | **Both** | 800x600 each  | One image scaled to fit, and the animated-image case as a second frame                                                         |
| 66  | `Titanium.UI.WebView`                      | **Both** | 640x1138 each | Local HTML loaded - not a live site, which dates the shot and drags a third party into the docs                                |
| 67  | `Titanium.UI.ScrollView`                   | **Both** | 640x1138 each | Vertical content mid-scroll with the indicator visible                                                                         |
| 68  | `Titanium.UI.NavigationWindow`             | iOS      | 640x1138      | A pushed detail window with the back chevron in the bar                                                                        |
| 69  | `Titanium.UI.iPad.Popover`                 | iPad     | 1000x750      | A popover anchored to a bar button, with its arrow visible                                                                     |
| 70  | `Titanium.UI.iOS.SplitWindow`              | iPad     | 1400x1050     | Master and detail side by side, landscape                                                                                      |
| 71  | `Titanium.UI.iOS.BlurView`                 | iOS      | 800x600       | Blur over a photograph, so the effect is actually visible                                                                      |
| 72  | `Titanium.UI.iOS.Toolbar`                  | iOS      | 800x200       | The iOS-specific toolbar with system buttons in it                                                                             |
| 73  | `Titanium.UI.MaskedImage`                  | **Both** | 800x600 each  | An image and its masked result side by side                                                                                    |
| 74  | `Titanium.Media.VideoPlayer`               | **Both** | 640x1138 each | The player with its transport controls showing. Ship a short clip in the project rather than pulling a remote URL              |
| 75  | `Titanium.UI.DashboardView`                | iOS      | 640x1138      | Nine dashboard items in edit mode with one badged. Legacy Springboard UI - **confirm it is worth documenting before shooting** |
| 76  | `Titanium.UI.iOS.CoverFlowView`            | iOS      | 800x600       | Five covers, centre one face on. Same caveat as #75                                                                            |
| 77  | `Titanium.UI.iOS.LivePhotoView`            | iOS      | 640x1138      | A Live Photo mid-playback. Needs a real Live Photo asset; low priority                                                         |

Skip: `Titanium.UI.View`, `Titanium.UI.Window`, `Titanium.UI.Tab`,
`Titanium.UI.TableViewRow`, `Titanium.UI.PickerColumn`,
`Titanium.UI.PickerRow`, `Titanium.UI.iOS.NavigationWindow`,
`Titanium.UI.iOS.TabbedBar`. Each is either a container with no appearance of
its own or a duplicate of an entry above, and a screenshot would show the parent
rather than the type.

```js
// #62 FloatingActionButton
const win = Ti.UI.createWindow({ backgroundColor: '#fafafa' });
const list = Ti.UI.createListSection();
list.setItems(
  ['Site visit 214', 'Site visit 213', 'Site visit 212'].map((title) => ({ properties: { title } }))
);
win.add(Ti.UI.createListView({ sections: [list] }));
win.add(Ti.UI.Android.createFloatingActionButton({ bottom: 24, right: 24, image: '/appicon.png' }));
win.open();
```

```js
// #63 Toolbar and #64 TabbedBar
const win = Ti.UI.createWindow({ backgroundColor: '#fff' });
win.add(
  Ti.UI.createTabbedBar({
    labels: ['Day', 'Week', 'Month'],
    index: 1,
    top: 40,
    width: 260,
    height: 32,
  })
);
win.add(
  Ti.UI.createToolbar({
    items: [
      Ti.UI.createButton({ title: 'Send' }),
      Ti.UI.createButton({ title: 'Camera' }),
      Ti.UI.createButton({ title: 'Cancel' }),
    ],
    bottom: 0,
  })
);
win.open();
```

```js
// #65 ImageView
const win = Ti.UI.createWindow({ backgroundColor: '#fff' });
win.add(Ti.UI.createImageView({ image: '/appicon.png', width: 200, height: 200 }));
win.open();
```

```js
// #66 WebView - local HTML, no network
const html = `<!doctype html><meta name=viewport content="width=device-width,initial-scale=1">
<style>body{font:16px/1.5 system-ui;margin:24px}</style>
<h1>Release notes</h1><p>Titanium SDK 13.4.1 fixes three build regressions.</p>`;
const win = Ti.UI.createWindow({ backgroundColor: '#fff' });
win.add(Ti.UI.createWebView({ html }));
win.open();
```

```js
// #67 ScrollView
const win = Ti.UI.createWindow({ backgroundColor: '#fff' });
const scroll = Ti.UI.createScrollView({ layout: 'vertical', showVerticalScrollIndicator: true });
for (let i = 1; i <= 30; i++) {
  scroll.add(Ti.UI.createLabel({ text: `Row ${i}`, height: 44, left: 20 }));
}
win.add(scroll);
win.open();
```

```js
// #68 NavigationWindow
const root = Ti.UI.createWindow({ title: 'Notes', backgroundColor: '#fff' });
const nav = Ti.UI.createNavigationWindow({ window: root });
const detail = Ti.UI.createWindow({ title: 'Site visit 214', backgroundColor: '#fff' });
detail.add(Ti.UI.createLabel({ text: 'Two bolts replaced, one still to order.', width: '80%' }));
const open = Ti.UI.createButton({ title: 'Open' });
open.addEventListener('click', () => nav.openWindow(detail));
root.add(open);
nav.open();
```

```js
// #69 Popover (iPad)
const content = Ti.UI.createWindow({ backgroundColor: '#fff' });
content.add(Ti.UI.createLabel({ text: 'Sort by date\nSort by name', width: 200 }));
const popover = Ti.UI.iPad.createPopover({ width: 260, height: 160, contentView: content });
const win = Ti.UI.createWindow({ title: 'Notes', backgroundColor: '#fafafa' });
const anchor = Ti.UI.createButton({ title: 'Sort', top: 20, right: 20 });
anchor.addEventListener('click', () => popover.show({ view: anchor }));
win.add(anchor);
Ti.UI.createNavigationWindow({ window: win }).open();
```

```js
// #71 BlurView - needs a photo at Resources/assets/images/photo.jpg
const win = Ti.UI.createWindow({ backgroundColor: '#000' });
win.add(
  Ti.UI.createImageView({ image: 'images/photo.jpg', width: Ti.UI.FILL, height: Ti.UI.FILL })
);
win.add(
  Ti.UI.iOS.createBlurView({
    effect: Ti.UI.iOS.BLUR_EFFECT_STYLE_LIGHT,
    bottom: 0,
    height: 200,
    width: Ti.UI.FILL,
  })
);
win.open();
```

```js
// #73 MaskedImage - needs images/photo.jpg and a mask at images/mask.png
const win = Ti.UI.createWindow({ backgroundColor: '#fff', layout: 'horizontal' });
win.add(Ti.UI.createImageView({ image: 'images/photo.jpg', width: '45%', height: 200, left: 12 }));
win.add(
  Ti.UI.createMaskedImage({
    image: 'images/photo.jpg',
    mask: 'images/mask.png',
    mode: Ti.UI.BLEND_MODE_SOURCE_IN,
    width: '45%',
    height: 200,
    left: 12,
  })
);
win.open();
```

```js
// #74 VideoPlayer - ship a short clip at Resources/assets/clip.mp4
const win = Ti.UI.createWindow({ backgroundColor: '#000' });
const player = Ti.Media.createVideoPlayer({
  url: '/clip.mp4',
  width: Ti.UI.FILL,
  height: 260,
  mediaControlStyle: Ti.Media.VIDEO_CONTROL_DEFAULT,
});
win.add(player);
win.addEventListener('open', () => player.play());
win.open();
```

---

## 6. CLI reference

Nothing here shows app UI, and most of it should probably not be an image at
all.

| #   | Page                                                                                                                                                                                          | Recommendation                                                                                                                                                                                                  |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 78  | [reference/cli.md](content/docs/reference/cli.md)                                                                                                                                             | **No images.** Ten commands, each already documented with its options in a table. A terminal screenshot of `ti build` would not be searchable, not copyable, and stale the next time the CLI changes a log line |
| 79  | [reference/cli.md](content/docs/reference/cli.md) `ti info`                                                                                                                                   | Same decision as #12. If `ti info` gets a picture anywhere it should be here, once, rather than three times across the setup pages                                                                              |
| 80  | [reference/config.md](content/docs/reference/config.md), [reference/tiapp-xml.md](content/docs/reference/tiapp-xml.md), [reference/compatibility.md](content/docs/reference/compatibility.md) | **No images.** All three are generated or tabular reference. Compatibility is built from the SDK on every build and a picture of it would be wrong by the next release                                          |

---

## 7. Deliberately not doing

Recorded so nobody re-derives these.

| Area                          | Decision                                                                                                                                                                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App showcase screenshots      | Submitter-supplied, up to five per entry, committed beside the JSON as `<id>-1` to `<id>-5`. Not ours to make. Same rules as the icons, 100KB each; see `docs/app-showcase.md`                                                                    |
| Showcase and directory images | Submitter-supplied, one per entry, committed beside the JSON and named for the entry id. Not ours to make. Rules in `docs/app-showcase.md` and `src/lib/registry-images.ts`: raster only, magic bytes checked, 100KB each                         |
| Open Graph cards              | Generated from code. `src/app/*/opengraph-image.tsx` for blog, docs, downloads and modules; only the root `src/app/opengraph-image.png` is a file, and it exists                                                                                  |
| Blog post headers             | Complete. Every post that references an image has one, and nothing is broken                                                                                                                                                                      |
| Module documentation images   | Upstream. The registry mirrors module READMEs and apidocs verbatim; the only image in the whole module set is `ti.playservices/diagram.png`. A fix goes in `renderMarkdown`, not in the mirror                                                    |

---

## Counts

| Group                                | Shipped | Left | Notes                                                                                             |
| ------------------------------------ | ------- | ---- | --------------------------------------------------------------------------------------------------- |
| Guides, marked `:::missing`          | 5       | 2    | #4 and #6, neither shootable by the harness                                                       |
| Guides, tooling                      | 0       | 4+3  | Three of the latter are `ti info`, recommended as code blocks instead                             |
| Guides, unmarked but wanted          | 5       | 5    | #18 to #22, all editor, console or home screen shots                                              |
| API reference, replacing legacy      | 0       | 58   | 52 replacements (54 files, 2 dropped) plus 6 platform halves that never existed                   |
| API reference, missing platform half | 0       | 6    | Inside the 58 above: Label, ButtonBar, OptionBar, ScrollableView, RefreshControl, TabGroup        |
| API reference, types with nothing    | 0       | 22   | 16 entries, six wanting both platforms. Of 24 view types with no image; 8 deliberately skipped    |
| API reference, to delete             | 0       | 2    | `searchbar_windows.png`, `window-modal.png`                                                       |
| CLI reference                        | 0       | 0    | Recommended                                                                                        |

**Ten shipped, about 95 left.** Roughly 80 of those are API reference work that
lands in `tidev/titanium-sdk` rather than here, and about half of its
`Titanium/UI` examples are already self-contained runnable apps, so the harness
can shoot them as they stand. Of the fifteen left in this repository, none can
be automated: they are desktop applications, a launcher, a camera, and one
decision about `ti info`.

The conventions that used to block all of this are settled and recorded in
`docs/writing-guides.md`. The remaining open question is narrow: whether the
renderer should learn about `@2x` assets, which only matters for an image
narrower than the prose column, and none of the ten shipped so far is.
