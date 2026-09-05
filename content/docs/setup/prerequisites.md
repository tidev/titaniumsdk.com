---
title: Prerequisites
description: Node.js and the JDK, before anything Titanium-specific.
---

Two things are needed on every platform, and neither belongs to Titanium:
Node.js, which the CLI runs on, and a JDK, which the Android build needs.

Install these first. The rest of setup assumes them.

## Node.js

The Titanium CLI declares **Node.js 22.19.0 or newer**.

Install an **active LTS release** — Node 22 (Jod) or Node 24 (Krypton) — from
[nodejs.org](https://nodejs.org/), or with a version manager if you already use
one.

> [!IMPORTANT]
> Do not install the newest Node release available. On macOS, Node 26 breaks the
> CLI outright — see below. "Latest LTS" is the right choice here; "latest" is
> not.

:::platform macos

Titanium SDK 13.4 talks to a physical iPhone through a native add-on,
`node-ios-device`, which ships prebuilt binaries per Node ABI. It has builds for
Node 18, 19, 20, 22 and 24. It has none for Node 26, so npm falls back to
compiling it from source, and that compile fails.

The failure is not subtle and it is not limited to device builds — `ti info`
itself exits with an unhandled error:

```
Error: Rebuild failed:
node-pre-gyp ERR! install response status 404 Not Found on
https://github.com/tidev/node-ios-device/releases/download/v1.13.0/node_ios_device-v1.13.0-node-v147-darwin-arm64.tar.gz
```

`node-v147` is Node 26's ABI. If you see this, you are on Node 26. Switch to
Node 24 and run the command again.

:::

Check what you have:

```sh
node -v
```

## JDK

Android builds need a **JDK 17 or newer**. Titanium does not bundle one and does
not care which distribution you use — [Eclipse
Temurin](https://adoptium.net/) and Microsoft's OpenJDK are both fine, and so is
the JDK that Android Studio installs.

```sh
java -version
```

If that prints a version below 17, or reports nothing, install a JDK before
going further. Every Android build fails without one, and the error names the
JDK rather than the thing you were trying to build.

## What you do not need yet

Not the Android SDK, not Xcode, and not an editor. Those come on the page for
your operating system, which installs them in the order Titanium expects to find
them.

You also do not need the Appcelerator CLI, Appcelerator Studio, or an account
with anyone. Titanium has not required any of those since it moved to TiDev in 2022. Any guide that tells you to run `appc` is describing software that no
longer exists.

## Next

- [Linux](/docs/setup/linux)
- [macOS](/docs/setup/macos)
- [Windows](/docs/setup/windows)
