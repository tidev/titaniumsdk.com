---
title: macOS
description: Set up a Mac to build Titanium apps for iOS and Android.
platforms: [macos, ios, android]
since: 13.4.0
---

macOS is the only platform that builds for both iOS and Android. Everything
below assumes you have already installed
[Node.js and a JDK](/docs/setup/prerequisites).

> [!IMPORTANT]
> Check your Node version before anything else. On macOS, Node 26 makes the CLI
> exit with an unhandled error on every command, including `ti info`. Node 24 is
> the newest release that works. [Why](/docs/setup/prerequisites).

:::include install-cli

## Install Xcode

Xcode compiles, signs and installs iOS apps. Titanium drives it; it does not
replace it.

Install it from the Mac App Store, or from
[Apple's developer downloads](https://developer.apple.com/download/all/) if you
need a specific version. It is large — around 10 GB — and the App Store gives no
useful progress, so start it before you need it.

Open Xcode once after installing. It finishes setting itself up on first launch,
and Titanium cannot use it until that has happened.

Then install the command line tools, which Titanium calls directly:

```sh
xcode-select --install
```

If you have more than one Xcode installed, point the toolchain at the one you
mean:

```sh
sudo xcode-select -s /Applications/Xcode.app
```

### Which Xcode version

Titanium SDK 13.4 declares support for **Xcode 15.0 through 26.x**.

A newer Xcode is not blocked. Titanium reports it as too new and builds anyway,
which may or may not work — the same treatment it gives any component past its
declared range. If a build breaks in a way that makes no sense, an unsupported
Xcode is worth ruling out early, and `xcode-select -s` lets you keep an older
one alongside for exactly that.

### Simulators

Xcode installs one iOS runtime with itself. For anything else, open
**Xcode → Settings → Components** and install the simulator runtimes you want to
test against.

Titanium SDK 13.4 builds apps with a minimum deployment target of **iOS 15.0**,
so a simulator older than that cannot run what you build.

## Set up signing for a device

A simulator build needs nothing. Installing on a real iPhone needs a development
certificate and a provisioning profile that names the device.

The least painful route is to let Xcode do it:

1. Open **Xcode → Settings → Accounts** and add your Apple ID.
2. Select the team and choose **Manage Certificates**, then add an **Apple
   Development** certificate.
3. Connect the device and let Xcode register it.

Titanium reads the certificates and profiles from your keychain and from
`~/Library/MobileDevice/Provisioning Profiles`, so once Xcode has them, `ti
info` lists them and `ti build -p ios -T device` can use them.

A free Apple ID is enough to install on your own device. Distributing to anyone
else needs a paid Apple Developer account — that, and everything about
distribution certificates, is covered under
[Distributing Apps](/docs/distribute/signing) rather than here.

:::include android-sdk

Android Studio installs the SDK to `~/Library/Android/sdk` on macOS, which the
Titanium CLI already knows to look in.

## Set up an Android emulator

Create a virtual device with Android Studio's Device Manager. On Apple silicon,
choose an `arm64-v8a` system image — an x86 image runs under emulation and is
slow enough to be unusable.

A physical Android device over USB works too and needs no driver on macOS. Turn
on USB debugging in Developer options and accept the prompt on the device.

:::include verify

## Troubleshooting

### Every command exits with "Rebuild failed"

You are on Node 26. The SDK's iOS device support has no prebuilt binary for it
and the fallback compile fails. Switch to Node 24 —
[the detail is on the prerequisites page](/docs/setup/prerequisites).

### `ti info` reports no iOS certificates

Xcode has not created a development certificate, or it is in a different
keychain. Open **Xcode → Settings → Accounts → Manage Certificates** and confirm
an **Apple Development** certificate is listed. Adding it there puts it in the
login keychain, which is where Titanium looks.

### Build Tools or API level "too new"

`ti info` reports these as warnings rather than errors:

```
!  Android Build Tools 36.0.0 are too new and may or may not work with Titanium.
   If you encounter problems, select a supported version with:
      ti config android.buildTools.selectedVersion ##.##.##
```

They are safe to ignore until a build fails. When one does, pin a supported
version with the command in the message — Titanium SDK 13.4 supports Build
Tools up to 35.x and API level up to 36.

### `xcode-select` points at the wrong Xcode

```sh
xcode-select -p
```

That prints the active developer directory. If it names an Xcode beta or a
version you have removed, set it explicitly with `sudo xcode-select -s`.

## Prove it works

`ti info` says the tools are there. A build says they work together.

```sh
ti create
ti build -p android
```

`ti create` prompts for a project name and settings; `ti build` compiles and
launches it on a running emulator or a connected device. On this
machine you can build for iOS too:

````sh
ti build -p ios
```. If both finish, your environment is done.

## Next

[Your first app](/docs/build/first-app) covers what `ti create` produced and
what to change first.
````
