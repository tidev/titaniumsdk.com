---
title: Windows
description: Set up a Windows machine to build Titanium apps for Android.
platforms: [windows, android]
since: 13.4.0
---

Windows builds for Android. Everything below assumes you have already installed
[Node.js and a JDK](/docs/setup/prerequisites).

:::unavailable ios

Building for iOS needs Xcode, and Apple ships Xcode only for macOS. There is no
supported path on Windows. If you need iOS, you need access to a Mac for that
half of the work.

:::

Run the commands below in **PowerShell**. Nothing here needs an administrator
prompt unless a specific step says so.

:::include install-cli

:::include android-sdk

Android Studio is the straightforward choice on Windows. It installs the SDK to
`%LOCALAPPDATA%\Android\Sdk` by default, which the Titanium CLI already knows to
look in.

> [!IMPORTANT]
> Do not put the Android SDK anywhere with a space or an ampersand in the path.
> Titanium checks for ampersands specifically and refuses to build, because the
> Android build tools mis-parse them. `C:\Program Files\...` is a bad choice for
> the same reason — use the default location or something like `C:\Android\Sdk`.

## Set up an emulator

The Android emulator needs hardware acceleration. On Windows that is either
**Windows Hypervisor Platform** or Intel HAXM, and Android Studio's setup wizard
turns on whichever applies.

If the emulator will not start, the usual cause is that Hyper-V and the
emulator's accelerator disagree. Enable **Windows Hypervisor Platform** in
_Turn Windows features on or off_, reboot, and try again.

A physical Android device over USB is faster than any emulator. It needs USB
debugging turned on in Developer options, and on Windows it also needs the
vendor's USB driver — Google ships one for Pixel devices, and other
manufacturers ship their own.

:::include verify

## Troubleshooting

### `ti` is not recognised as a command

npm's global directory is not on your `PATH`. Close and reopen PowerShell first,
since a fresh install does not affect a shell that was already running. If it
still fails, check where npm puts global packages:

```powershell
npm config get prefix
```

That directory needs to be on your `PATH`.

### `ti info` cannot find the Android SDK

Run `ti setup android` and give it the path. That writes the location to the
CLI's own config, which is checked before any environment variable.

If you set `ANDROID_HOME` and expected it to work: Titanium's app build does not
read that variable. Use `ANDROID_SDK_ROOT`, or let `ti setup android` record the
path.

### The build fails complaining about the SDK path

Check the path for spaces and ampersands. See the note above — this is a real
constraint of the Android build tools, not a Titanium limitation, and the only
fix is to move the SDK.

### A build fails partway through with a file-in-use error

Windows locks files that are open, and antivirus software scanning the build
directory is the common culprit. Exclude your project's `build` directory from
real-time scanning.

## Prove it works

`ti info` says the tools are there. A build says they work together.

```sh
ti create
ti build -p android
```

`ti create` prompts for a project name and settings; `ti build` compiles and
launches it on a running emulator or a connected device. If both finish, your environment is done.

## Next

[Your first app](/docs/build/first-app) covers what `ti create` produced and
what to change first.
