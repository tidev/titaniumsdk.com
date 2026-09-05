---
title: Prerequisites
description: Node.js and the JDK, before anything Titanium-specific.
---

Two things are needed on every platform: Node.js, which the CLI runs on, and a
JDK, which the CLI and the Android build need.

## Node.js

The Titanium CLI requires **Node.js 22.19.0 or newer**. Install an active LTS
release — Node 22 or Node 24 — from [nodejs.org](https://nodejs.org/).

> [!IMPORTANT]
> Install an LTS release, not the newest one. Node 26 breaks the CLI on macOS.

:::platform macos

The SDK reaches a physical iPhone through `node-ios-device`, which ships
prebuilt binaries for Node 18 through 24. There is none for Node 26, so npm
compiles from source and the compile fails. Every command then exits with:

```
Error: Rebuild failed:
node-pre-gyp ERR! install response status 404 Not Found on
https://github.com/tidev/node-ios-device/releases/download/v1.13.0/node_ios_device-v1.13.0-node-v147-darwin-arm64.tar.gz
```

Switch to Node 24.

:::

```sh
node -v
```

## JDK

Android builds need a **JDK 17 or newer**. Any distribution works —
[Temurin](https://adoptium.net/), Microsoft's OpenJDK, or the one Android Studio
installs.

```sh
java -version
```

## What you do not need

Not the Android SDK and not Xcode. Those are on the page for your operating
system.

Not the Appcelerator CLI or Appcelerator Studio either. Titanium has not
required them since 2022, and a guide that tells you to run `appc` is describing
software that no longer exists.

## Next

- [Linux](/docs/setup/linux)
- [macOS](/docs/setup/macos)
- [Windows](/docs/setup/windows)
