---
title: Environment Setup
description: Get a machine ready to build Titanium apps.
---

Titanium builds native apps, so it needs the native toolchains: Google's for
Android, Apple's for iOS. Setting up means installing those, then installing the
Titanium CLI and SDK and pointing them at each other.

Budget an hour on a clean machine. Most of it is downloads.

## Start here

[Prerequisites](/docs/setup/prerequisites) covers Node.js and the JDK, which
every platform needs and neither of which is Titanium-specific. Read it first —
the version you install matters more than it usually does.

Then follow the page for your operating system. Each one runs from an empty
machine to a working build without sending you elsewhere:

- [Linux](/docs/setup/linux) — Android only
- [macOS](/docs/setup/macos) — Android and iOS
- [Windows](/docs/setup/windows) — Android only

## What decides your platform

**iOS builds require macOS.** Apple only ships Xcode for macOS, and Xcode is
what compiles, signs and installs an iOS app. No Titanium feature works around
this, and neither does any other cross-platform framework.

Android builds work on all three. If you are on Windows or Linux and need iOS
later, you need access to a Mac at that point — not before.

## When you are done

`ti info` reports a working Android SDK, a working Xcode if you are on macOS,
and no errors. That is the check every page ends with, and it is worth running
again whenever a build starts failing for no visible reason.
