---
title: 'Titanium SDK 14.0.0.GA released'
description: 'iPhone Duo and Xcode 27.2 support, a native SplitWindow, iOS multi-scene support and more'
date: '2026-11-11'
author: 'Hans Knöchel'
category: 'Releases'
cover: '/blog/titanium-general.png'
draft: false
social: |-
  Titanium SDK 14.0.0.GA is out!

  iPhone Duo and Xcode 27.2 support, a native SplitWindow, iOS multi-scene support and more

  Blog: https://titaniumsdk.com/blog/sdk-14-0-0-ga
  Install: ti sdk i 14.0.0.GA

  #titaniumsdk #mobiledev #javascript
---

![Titanium SDK 14.0.0.GA](/blog/titanium-general.png)

Titanium SDK 14.0.0 is a major release of the SDK, adding support for iPhone Duo and Xcode 27.2, a native `Ti.UI.iOS.SplitWindow` and true multi-scene support on iOS. On Android, it modernizes the build stack with Gradle 9.4.1 and updated libraries, and makes the V8 runtime faster.

Here are the highlights of the release:

- iOS: Support for Xcode 27.2 and iPhone Duo, including the new `hingechange` event in `Ti.App.iOS`, `Ti.UI.Window.reservedRegions` to lay out around the fold and the inner camera, and vertical bar APIs like `Ti.UI.Button.visibilityPriority` and `Ti.UI.Window.verticalBarBehavior`
- iOS: `Ti.UI.iOS.SplitWindow` is now backed by the native `UISplitViewController` and exposes `displayMode`, `splitBehavior`, `presentsWithGesture` and the column width properties
- iOS: True multi-scene support, so an app can run in several windows that share one JavaScript runtime
- iOS: Device builds are installed and launched via CoreDevice (`devicectl`), which also finds devices connected over Wi-Fi
- iOS: Support for Icon Composer app icons as well as dark and tinted app icons
- iOS: The minimum iOS version is now 16, and building requires Xcode 16 or later
- Android: Updated the build stack to Gradle 9.4.1, Material 1.14.0 and newer AndroidX libraries
- Android: A faster V8 runtime with cached property names and no forced garbage collection after image operations, plus a faster and more reliable `getCurrentPosition()`
- Android: Change the app icon at runtime with `Ti.App.Android.changeIcon()`
- Android: `Ti.UI.Color` parity with iOS, so color objects can be passed to component properties
- Android: The `WebView` supports the camera and gallery picker for file inputs and a new `injectEventBindings()` method for external pages
- iOS and Android: Snapping for `ListView` and `TableView`, a ListView `itemlongpress` event, `borderDashPattern` for views, `padding` for labels and animatable rotation
- Tooling: The SDK release process is now automated, from the release note and this announcement to the downloads and API reference on the website

**Breaking changes:**

- iOS: The `masterView` and `detailView` of a `Ti.UI.iOS.SplitWindow` must be `Ti.UI.Window` instances. Plain windows get a system navigation bar unless you set `navBarHidden: true`. The layout properties `showMasterInPortrait`, `masterIsOverlayed`, `masterViewVisible`, `portraitSplit` and `landscapeSplit` are deprecated and have no effect anymore
- Android: `Ti.UI.fetchSemanticColor()` now returns a `Ti.UI.Color` object instead of a string, like on iOS. Pass it to properties directly, or call `toHex()` where you need the string

Thanks to everyone in the community who contributed fixes and improvements to this release, especially Michael Gangolf, Chris Barber, Prashant Saini, César Estrada, Marc Bender, Jason David Miller, abentley8 and Sergey Volkov!

For a more detailed overview and all changes, see the release notes: [Titanium SDK 14.0.0.GA Release Note](/docs/sdk/14.0.0/release-notes).

## Install

**Follow these steps to get SDK 14.0.0.GA:**

1. Install the CLI with `npm i -g titanium alloy`
2. Run `titanium sdk install 14.0.0.GA`
3. Set `<sdk-version>14.0.0.GA</sdk-version>` in your `tiapp.xml`

## Report Bugs

If you run into any issues that seem related to the update, please report them on [GitHub](https://github.com/tidev/titanium-sdk/issues).

## How can I support?

If you like our work and want to support, think about a [donation](/contribute#donate) or to [contribute](/contribute) with your time and code.
A donation helps us to cover the monthly maintenance costs of the projects, so we can continue to release feature- and compatibility updates in the future. Your help is appreciated!
