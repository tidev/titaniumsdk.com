---
title: 'Titanium SDK 12.0.0.GA released'
description: 'The stable version (GA) of the Titanium SDK 12.0.0 is available.'
date: '2022-12-30'
author: 'Hans Knöchel'
category: 'Releases'
source: 'https://tidev.io/blog/sdk_12_0_0_ga'
social: |-
  Titanium SDK 12.0.0.GA is out!

  iOS gains Dynamic Island support and a new error page, while Android moves to targetSDK 33 with Material 3 themes.

  Blog: https://titaniumsdk.com/blog/sdk-12-0-0-ga
  Install: ti sdk i 12.0.0.GA

  #titaniumsdk #mobiledev #javascript
---

The stable version (GA) of the Titanium SDK<b>12.0.0</b> is now available. Titanium SDK 12.0.0 is a major release of the SDK, addressing high-priority issues from previous releases.

iOS adds support for the `Dynamic Island` API and adds a new error page layout. Andorid targetSDK is now 33 and you can use `Material3` themes like `Theme.Titanium.Material3.DayNight`.

For a more detailed overview, known issues and closed tickets, see the release notes: [Titanium SDK 12.0.0.GA Release Note](https://titaniumsdk.com/guide/Titanium_SDK/Titanium_SDK_Release_Notes/Titanium_SDK_Release_Notes_12.x/Titanium_SDK_12.0.0.GA_Release_Note.html).

## Install

**Follow these steps to get SDK 12.0.0.GA:**

1. Install the CLI with `[sudo] npm i -g titanium alloy`
2. Run `titanium sdk install 12.0.0.GA`
3. Set `<sdk-version>12.0.0.GA</sdk-version>` in your `tiapp.xml`

## Rollback

Execute `titanium sdk install latest --default` to rollback.

## Report Bugs

As always, please test it on your apps and give feedback. If you run into any issues that seem related to the updates, please report them on [GitHub](https://github.com/tidev/titanium-sdk/issues).

## How can I support?

If you like our work and want to support, think about a [donation](/donate) or to [contribute](/contribute) with your time and code.
