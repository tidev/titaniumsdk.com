---
title: macOS
description: Set up a Mac to build Titanium apps for iOS and Android.
platforms: [macos, ios, android]
since: 13.4.0
---

:::include nodejs

:::include jdk

:::include install-cli

## Install Xcode

Xcode compiles, signs and installs iOS apps. Titanium drives it rather than
replacing it.

Install it from the Mac App Store, or from
[Apple's developer downloads](https://developer.apple.com/download/all/) for a
specific version. It is around 10 GB.

Open it once after installing — it finishes setting itself up on first launch,
and Titanium cannot use it before that. Then install the command line tools:

```sh
xcode-select --install
```

With more than one Xcode installed, point the toolchain at the one you mean:

```sh
sudo xcode-select -s /Applications/Xcode.app
```

### Which version

Titanium SDK 13.4 supports **Xcode 15.0 through 26.x**. A newer one is not
blocked — Titanium reports it as too new and builds anyway. If a build breaks
in a way that makes no sense, rule that out early.

### Simulators

Xcode installs one iOS runtime with itself. For others, open **Xcode → Settings
→ Components**.

SDK 13.4 builds with a minimum deployment target of **iOS 15.0**, so a simulator
older than that cannot run what you build.

## Set up signing for a device

A simulator build needs nothing. A real iPhone needs a development certificate
and a provisioning profile naming the device. Let Xcode create them:

1. **Xcode → Settings → Accounts**, add your Apple ID.
2. Select the team, choose **Manage Certificates**, add an **Apple Development**
   certificate.
3. Connect the device and let Xcode register it.

Titanium reads certificates from your keychain and profiles from
`~/Library/MobileDevice/Provisioning Profiles`, so `ti build -p ios -T device`
picks them up.

A free Apple ID covers your own device. Distributing to anyone else needs a paid
Apple Developer account — see [Distributing Apps](/docs/distribute/signing).

:::include android-sdk

Android Studio installs the SDK to `~/Library/Android/sdk`, which the CLI already
checks.

## Set up an Android emulator

Create a virtual device with Android Studio's Device Manager. On Apple silicon,
choose an `arm64-v8a` system image — an x86 image runs under emulation and is
unusably slow.

A physical device over USB needs no driver on macOS. Turn on USB debugging in
Developer options and accept the prompt on the device.

:::include verify

## Troubleshooting

### Every command exits with "Rebuild failed"

You are on Node 26 with SDK 13.4 or earlier. Switch to Node 24, or to SDK 14 —
[detail here](#install-node-js).

### `ti info` reports no iOS certificates

Open **Xcode → Settings → Accounts → Manage Certificates** and check an **Apple
Development** certificate is listed. Adding it there puts it in the login
keychain, which is where Titanium looks.

### Build Tools or API level "too new"

Warnings, not errors. Ignore them until a build fails, then pin a supported
version with the command in the message.

### `xcode-select` points at the wrong Xcode

```sh
xcode-select -p
```

If that names a beta or a version you removed, set it with
`sudo xcode-select -s`.

## Prove it works

```sh
ti create
ti build -p android
ti build -p ios
```

If those finish, your environment is done.

## Next

[Your first app](/docs/build/first-app) covers what `ti create` produced.
