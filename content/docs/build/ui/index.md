---
title: User interface
description: Build screens with Titanium's layout system, lists, icons, and the places the platforms differ.
since: 13.4.0
---

A Titanium view is a real native view. `Ti.UI.createButton()` makes a
`UIButton` on iOS and an `android.widget.Button` on Android, and you get a
handle to it. Nothing here is drawn by Titanium or approximated in a web view.

What Titanium adds on top is one layout system, shared by both platforms, so a
screen you describe once positions itself on either. That system is the first
thing to learn and the thing most new Titanium code gets wrong.

![Two boxed screenshots labelled iOS and Android, side by side, showing the same screen: a heading, a switch, a button and a slider in the same order at the same positions. Each control is drawn in its own platform's style, so the iOS switch is green and its button is plain blue text, while the Android switch is blue and its button is a filled rectangle.](/docs/guides/one-codebase.png)

## Start here

[Layout and positioning](/docs/build/ui/layout) is the one to read first. Three
layout modes, two sizing constants, and a precedence order that explains why a
view you gave a `height` to ignored your `bottom`.

[Lists and tables](/docs/build/ui/lists) covers `ListView` and `TableView`, and
which of the two to reach for. The short answer is `ListView`.

[Icons and launch screens](/docs/build/ui/icons-and-launch-screens) is a
reference: what sizes each platform wants and where the files go.

[Platform conventions](/docs/build/ui/platform-conventions) is for the places
iOS and Android genuinely diverge, rather than the small differences that fit
in a note on the page you were already reading.

## The API reference is the other half

These pages explain how the pieces fit together. What every property does, on
which platform, and since which release is in the
[Titanium API](/docs/sdk), which is generated from the SDK itself and is
complete. When a guide and the reference disagree, the reference is right.
