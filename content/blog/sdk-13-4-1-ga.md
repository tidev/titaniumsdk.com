---
title: 'Titanium SDK 13.4.1.GA released'
description: 'BottomNavigation keyboard fixes on Android and an iOS window deadlock fix'
date: '2026-08-25'
author: 'Hans Knöchel'
category: 'Releases'
cover: '/blog/titanium-general.png'
source: 'https://tidev.io/blog/sdk_13_4_1_ga'
social: |-
  Titanium SDK 13.4.1.GA is out!

  Fixed BottomNavigation keyboard and the androidback event handling on Android and a deadlock opening windows on iOS.

  Blog: https://titaniumsdk.com/blog/sdk-13-4-1-ga
  Install: ti sdk i 13.4.1.GA

  #titaniumsdk #mobiledev #javascript
---

![Titanium SDK 13.4.1.GA](/blog/titanium-general.png)

Titanium SDK 13.4.1 is a patch release of the SDK, addressing high-priority issues from previous releases.

Here are the highlights of the release:

- Android: Fixed keyboard issues in `BottomNavigation` and the `androidback` event handling
- iOS: Fixed a possible deadlock when opening windows

Thanks to everyone in the community who contributed fixes and improvements to this release, especially Michael Gangolf!

For a more detailed overview and all changes, see the release notes: [Titanium SDK 13.4.1.GA Release Note](https://titaniumsdk.com/guide/Titanium_SDK/Titanium_SDK_Release_Notes/Titanium_SDK_Release_Notes_13.x/Titanium_SDK_13.4.1.GA_Release_Note.html).

## Install

**Follow these steps to get SDK 13.4.1.GA:**

1. Install the CLI with `npm i -g titanium alloy`
2. Run `titanium sdk install 13.4.1.GA`
3. Set `<sdk-version>13.4.1.GA</sdk-version>` in your `tiapp.xml`

## Report Bugs

If you run into any issues that seem related to the update, please report them on [GitHub](https://github.com/tidev/titanium-sdk/issues).

## How can I support?

If you like our work and want to support, think about a [donation](https://github.com/sponsors/tidev) or to [contribute](/contribute) with your time and code.
A donation helps us to cover the monthly maintenance costs of the projects, so we can continue to release feature- and compatibility updates in the future. Your help is appreciated!
