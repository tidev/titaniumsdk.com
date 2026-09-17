---
title: Compatibility
description: Which toolchain versions each Titanium SDK release supports, and which APIs exist on which platform.
---

Two things change between Titanium releases: what the SDK needs from your
machine, and which APIs exist on which platform. Both tables below are generated
from the SDK itself on every build of this site, so neither can describe a
release that shipped something else.

The page this replaces was hand-maintained and, by the time it was retired, was
wrong about Java, Xcode and the Android SDK at once. Nothing here is typed by
hand.

## Check your machine first

```sh
ti info
```

`ti info` reports what it found and what is out of range, for the SDK you
actually have installed. It reads the same declarations these tables do, so it
is faster than comparing this page against your installation and it is right
about your machine in a way that no page can be.

## Toolchain

Every release below also has a page of its own, linked as "Compatibility" from
its [API reference](/docs/sdk) index. Read that one when you have already picked
a release; read this one to see where a requirement changed.

:::include toolchain

A component newer than its range is a warning rather than an error on Android,
and the build usually works until it does not. Pin the build tools with
`ti config android.buildTools.selectedVersion` when a new one breaks. On iOS a
newer Xcode is reported as too new and builds anyway, so rule it out early when
a build fails in a way that makes no sense.

The NDK is only needed if you compile native code. A missing NDK is a warning.

> [!IMPORTANT]
> The Node.js range has no upper bound on any 13.x release, and there is still a
> ceiling in practice. 13.4.1 bundles `ioslib` 5.3.0, which depends on
> `node-ios-device` 1.13.0, and that publishes prebuilt binaries only through
> Node 24. On Node 26 it has to build from source, and the iOS tooling fails to
> load when it cannot. Node 22 or 24 is the pairing to use with 13.4.1.

The Titanium CLI has a floor of its own, separate from the SDK's. `titanium`
9.1.0 declares `engines.node` as `>=22.19.0`, higher than any released SDK asks
for, so the CLI is what sets the floor you have to meet.

## Operating systems

iOS builds require macOS, because Xcode compiles, signs and installs iOS apps
and Xcode is macOS-only. Android builds work on macOS, Windows and Linux. See
[environment setup](/docs/setup).

## Platform API support

Which Titanium APIs exist where, and since which release. Every type links to
its own reference page, which carries the same information per property, method
and event.

:::include platform-support
