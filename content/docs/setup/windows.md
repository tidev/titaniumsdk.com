---
title: Windows
description: Set up a Windows machine to build Titanium apps for Android.
platforms: [windows, android]
since: 13.4.0
---

Windows builds for Android.

:::unavailable ios

Building for iOS needs Xcode, and Apple ships Xcode only for macOS. If you need
iOS, you need a Mac for that half of the work.

:::

Run the commands below in PowerShell.

:::include nodejs

:::include jdk

:::include install-cli

:::include android-sdk

Android Studio installs the SDK to `%LOCALAPPDATA%\Android\Sdk`, which the CLI
already checks.

> [!IMPORTANT]
> Do not put the SDK anywhere with a space or an ampersand in the path. Titanium
> checks for ampersands and refuses to build, because the Android build tools
> mis-parse them. That rules out `C:\Program Files`.

## Set up an emulator

The emulator needs hardware acceleration — either Windows Hypervisor Platform or
Intel HAXM. Android Studio's setup wizard enables whichever applies.

If it will not start, enable **Windows Hypervisor Platform** in _Turn Windows
features on or off_, reboot, and try again.

A physical device over USB is faster. It needs USB debugging turned on in
Developer options and the vendor's USB driver.

:::include verify

## Troubleshooting

### `ti` is not recognised as a command

Reopen PowerShell — a fresh install does not affect a shell that was already
running. If it still fails, check that npm's global directory is on your `PATH`:

```powershell
npm config get prefix
```

### `ti info` cannot find the Android SDK

Run `ti setup android` and give it the path. If you set `ANDROID_HOME` and
expected it to work, use `ANDROID_SDK_ROOT` instead.

### The build fails complaining about the SDK path

Check the path for spaces and ampersands. Moving the SDK is the only fix.

### A build fails partway through with a file-in-use error

Antivirus scanning the build directory. Exclude your project's `build`
directory from real-time scanning.

## Prove it works

```sh
ti create
ti build -p android
```

If both finish, your environment is done.

## Next

[Your first app](/docs/build/first-app) covers what `ti create` produced.
