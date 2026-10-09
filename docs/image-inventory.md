# Image inventory

Every image the site wants and does not have, in one place: what it is of, which
page it is for, roughly how big it should be, and - for anything showing app UI -
which platform to shoot and the code that puts it on screen.

Derived from the tree on 2026-09-13: the seven `:::missing` blocks in
`content/docs`, the 54 screenshots the API reference inherits from the SDK's
apidoc, and the type index in `registry/sdk/main/contents.json`. TI-78 tracks the
work; this is the long form of its **Needed** section and should be kept in step
with it.

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

**Sizing is currently unhandled and needs a decision before anyone shoots 50
images.** `.prose-docs img` is `max-width: 100%; height: auto`, and nothing emits
`width`/`height`, so an image renders at its intrinsic pixel size capped at the
prose column, which is about **700px**. A 2x asset of a small control therefore
renders at double its intended size rather than at the same size and twice the
density. The cheap fix is to emit `width`/`height` at half the intrinsic size for
a `@2x`-named file - `src/lib/docs/markdown.ts` already allows both attributes
through the sanitiser, and `assetUrl` in `src/lib/docs/assets.ts` is the hook.
Until that exists, the **Deliver** column below is a plain pixel size that looks
right at 1x.

**Conventions to settle before shooting** (TI-78 acceptance criteria, repeated
here because they apply to every row):

- Light or dark, or both. The site has both themes and a light-only screenshot
  on a dark page is the first thing a reader notices.
- One device per platform for everything, so scale does not wander page to page.
  Suggest iPhone 16 (393x852pt) and a Pixel 8 emulator (412x915dp).
- Status bars: clean them or crop them. A real clock and battery level date an
  image and leak the machine it was taken on.
- Project names from the guides - `Hello`, `myapp` - not whatever was on disk.
- Never in frame: signing identities, team names, keystore paths, tokens, or any
  console line carrying a password argument. See the
  `displayBuildCommandInConsole` warning on `/docs/setup/ide-integration`.
- Watch total weight. Deployment is capped at 100MB measured against static
  output, which was 93MB. The six legacy iOS behaviour GIFs alone are 8.3MB.

**Snippets.** Each one below is a complete `Resources/app.js` for a Classic
project - `ti create --type app --name Hello --id com.example.hello --platforms
android,ios --workspace-dir .`, drop the file in, `ti build --platform ios` or
`--platform android`. They are written to fill the frame with the control and
nothing else, which is not what the SDK's own examples do.

---

## 1. Guides: already marked `:::missing`

Seven, each already drawn on the page as a crossed box carrying its own brief.
These are the ones a reader can currently see are absent.

| #   | Page                                                                                    | Ratio | Deliver   | Platform | Of                                                                                                                                                                                                                                           |
| --- | --------------------------------------------------------------------------------------- | ----- | --------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | [layout.md:116](content/docs/build/ui/layout.md#L116)                                   | 4:3   | 1400x1050 | iOS      | Two iPhone frames side by side. Left: a view with `top: 20, bottom: 20, height: 100` sitting at the top of its parent. Right: the same view with `height` removed, stretched between both pins. The point is that `height` outranks `bottom` |
| 2   | [lists.md:135](content/docs/build/ui/lists.md#L135)                                     | 4:3   | 1400x1050 | **Both** | The same five-item `ListView` on iPhone and on an Android emulator, side by side, with a section header visible on each so the platform header styling is the difference on show                                                             |
| 3   | [platform-conventions.md:167](content/docs/build/ui/platform-conventions.md#L167)       | 4:3   | 1400x1050 | **Both** | The same two-screen app on both, on the detail screen, so the iOS back chevron in the navigation bar and the Android up affordance in the action bar are both visible                                                                        |
| 4   | [icons-and-launch-screens.md:97](content/docs/build/ui/icons-and-launch-screens.md#L97) | 16:9  | 1400x788  | Android  | The generated adaptive icon on an emulator launcher, three times with different mask shapes - circle, squircle, rounded square - so the cropping is visible                                                                                  |
| 5   | [notifications.md:123](content/docs/build/notifications.md#L123)                        | 16:9  | 1400x788  | Android  | An expanded notification in the emulator's shade, showing title, body and app icon from the local notification example on the page                                                                                                           |
| 6   | [media.md:143](content/docs/build/media.md#L143)                                        | 9:16  | 640x1138  | Android  | The camera overlay open with the shutter visible, and below it the captured photo shown in an `ImageView` on the same screen                                                                                                                 |
| 7   | [location.md:135](content/docs/build/location.md#L135)                                  | 9:16  | 640x1138  | Android  | A map with three annotations, centred on a city, with one annotation's callout open                                                                                                                                                          |

Snippets for the three that need code rather than a stock app:

**#1 - layout precedence (iOS)**

```js
const win = Ti.UI.createWindow({ backgroundColor: '#fff', layout: 'horizontal' });

function pane(title, props) {
  const outer = Ti.UI.createView({
    width: '50%',
    height: Ti.UI.FILL,
    top: 60,
    backgroundColor: '#f2f2f7',
  });
  outer.add(Ti.UI.createLabel({ text: title, top: 4, font: { fontSize: 12 } }));
  const parent = Ti.UI.createView({
    top: 30,
    bottom: 20,
    left: 12,
    right: 12,
    backgroundColor: '#e0e0e6',
  });
  parent.add(Ti.UI.createView({ backgroundColor: '#0a84ff', left: 0, right: 0, ...props }));
  outer.add(parent);
  return outer;
}

win.add(pane('height wins', { top: 20, bottom: 20, height: 100 }));
win.add(pane('no height', { top: 20, bottom: 20 }));
win.open();
```

**#2 - the same ListView on both platforms**

```js
const win = Ti.UI.createWindow({ backgroundColor: '#fff' });

const section = Ti.UI.createListSection({ headerTitle: 'Modules' });
section.setItems([
  { properties: { title: 'ti.map' } },
  { properties: { title: 'ti.barcode' } },
  { properties: { title: 'ti.coremotion' } },
  { properties: { title: 'ti.crypto' } },
  { properties: { title: 'ti.nfc' } },
]);

win.add(Ti.UI.createListView({ sections: [section] }));
win.open();
```

**#3 - back affordance on both platforms**

```js
const android = Ti.Platform.osname === 'android';
const root = Ti.UI.createWindow({ title: 'Notes', backgroundColor: '#fff' });
const nav = android ? null : Ti.UI.createNavigationWindow({ window: root });

const detail = Ti.UI.createWindow({ title: 'Shopping list', backgroundColor: '#fff' });
detail.add(Ti.UI.createLabel({ text: 'Milk, bread, coffee' }));

const open = Ti.UI.createButton({ title: 'Open detail' });
open.addEventListener('click', () => (nav ? nav.openWindow(detail) : detail.open()));
root.add(open);

(nav ?? root).open();
// Then tap through to the detail screen before shooting.
```

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

Gaps I would fill, in rough priority order. None has a `:::missing` block today,
so adding one alongside the image request is part of the task - that is the
mechanism the site has for saying a picture is wanted.

| #   | Page                                                                                         | Ratio | Deliver   | Platform | Of                                                                                                                                                                                               |
| --- | -------------------------------------------------------------------------------------------- | ----- | --------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 13  | [first-app.md](content/docs/build/first-app.md) "Run it"                                     | 4:3   | 1400x1050 | **Both** | The generated two-tab template app running, iPhone and Android side by side. This is the first thing a reader builds and the page never shows it                                                 |
| 14  | [first-app.md](content/docs/build/first-app.md) "Change something"                           | 9:16  | 640x1138  | iOS      | The label-and-button screen from the snippet on the page, after the button has been tapped so the label reads "Hello from Titanium"                                                              |
| 15  | [layout.md](content/docs/build/ui/layout.md) "The three layout modes"                        | 4:3   | 1400x1050 | iOS      | One frame per mode - composite, vertical, horizontal - with the same four coloured children in each, so the difference is only the parent's `layout`. Snippet below                              |
| 16  | [layout.md](content/docs/build/ui/layout.md) "Horizontal layout"                             | 16:9  | 1400x788  | iOS      | The tag-chip example from the page, wrapped onto two rows, so `horizontalWrap` is visible rather than described                                                                                  |
| 17  | [ui/index.md](content/docs/build/ui/index.md)                                                | 16:9  | 1400x788  | **Both** | Optional. A single screen built from one codebase, rendered on both, for the page that opens with "a Titanium view is a real native view"                                                        |
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

| Group                                | Images | Notes                                                                                                        |
| ------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------ |
| Guides, already marked `:::missing`  | 7      | Visible as gaps on the page today                                                                            |
| Guides, tooling                      | 4 + 3  | Three of the latter are `ti info`, likely code blocks instead                                                |
| Guides, unmarked but wanted          | 10     | Each needs a `:::missing` block adding alongside                                                             |
| API reference, replacing legacy      | 58     | 52 replacements (54 files, 2 dropped) plus 6 platform halves that never existed                              |
| API reference, missing platform half | 6      | Inside the 58 above: Label, ButtonBar, OptionBar, ScrollableView, RefreshControl, TabGroup have Android only |
| API reference, types with nothing    | 22     | 16 entries, six wanting both platforms. Of 24 view types with no image; 8 deliberately skipped               |
| API reference, to delete             | 2      | `searchbar_windows.png`, `window-modal.png`                                                                  |
| CLI reference                        | 0      | Recommended                                                                                                  |

**Roughly 105 images**, of which about 95 are app UI needing a simulator or
emulator, and 80 of those are API reference work that lands in
`tidev/titanium-sdk` rather than in this repository.

Two things to settle before any of it: the theme and device conventions above,
and whether the renderer learns about `@2x` assets. Both are cheaper now than
after fifty screenshots exist.
