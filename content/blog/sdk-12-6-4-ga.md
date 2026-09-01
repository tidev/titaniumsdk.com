---
title: 'Titanium SDK 12.6.4.GA released'
description: 'Compatibility with Xcode 16.3+'
date: '2025-04-04'
author: 'Hans Knöchel'
category: 'Releases'
cover: '/blog/titanium-general.png'
source: 'https://tidev.io/blog/sdk_12_6_4_ga'
social: |-
  Titanium SDK 12.6.4.GA is out!

  Restores compatibility with Xcode 16.3 and later, required to build for iOS 18.4+.

  Blog: https://titaniumsdk.com/blog/sdk-12-6-4-ga
  Install: ti sdk i 12.6.4.GA

  #titaniumsdk #mobiledev #javascript
---

![Titanium SDK 12.6.4.GA](/blog/titanium-general.png)

This version fixes the compatibility with Xcode 16.3 and later.
Please make sure to use this version in order to build apps for iOS 18.4 and later, as Apple has
introduced a breaking change affecting the discovery of simulators between Xcode 16.2 and 16.3.

For a more detailed overview and all changes, see the release notes: [Titanium SDK 12.6.4.GA Release Note](https://titaniumsdk.com/guide/Titanium_SDK/Titanium_SDK_Release_Notes/Titanium_SDK_Release_Notes_12.x/Titanium_SDK_12.6.4.GA_Release_Note.html).

## Install

**Follow these steps to get SDK 12.6.4.GA:**

1. Install the CLI with `[sudo] npm i -g titanium alloy`
2. Run `titanium sdk install 12.6.4.GA`
3. Set `<sdk-version>12.6.4.GA</sdk-version>` in your `tiapp.xml`

## Report Bugs

If you run into any issues that seem related to the update, please report them on [GitHub](https://github.com/tidev/titanium-sdk/issues).

## How can I support?

If you like our work and want to support, think about a [donation](/donate) or to [contribute](/contribute) with your time and code.
