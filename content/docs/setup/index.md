---
title: Environment Setup
description: Get a machine ready to build Titanium apps.
---

Titanium builds native apps, so it needs the native toolchains: Google's for
Android, Apple's for iOS. Setting up installs those, then the Titanium CLI and
SDK.

Budget an hour on a clean machine. Most of it is downloads.

## Start here

Follow the page for your operating system. Each one covers that machine end to
end: Node.js, a JDK, the Titanium CLI and SDK, and the native tooling.

- [Linux](/docs/setup/linux) — Android only
- [macOS](/docs/setup/macos) — Android and iOS
- [Windows](/docs/setup/windows) — Android only

## Why macOS is different

**iOS builds require macOS.** Apple ships Xcode only for macOS, and Xcode
compiles, signs and installs iOS apps. No cross-platform framework works around
this.

Android builds work on all three. If you are on Windows or Linux and need iOS
later, you need access to a Mac at that point.

## When you are done

`ti info` reports a working Android SDK, a working Xcode if you are on macOS,
and no errors. It is worth running again whenever a build starts failing for no
visible reason.
