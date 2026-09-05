---
title: Linux
description: Set up a Linux machine to build Titanium apps for Android.
platforms: [linux, android]
since: 13.4.0
---

Linux builds for Android. Everything below assumes you have already installed
[Node.js and a JDK](/docs/setup/prerequisites).

:::unavailable ios

Building for iOS needs Xcode, and Apple ships Xcode only for macOS. There is no
supported path on Linux — not through a container, not through a virtual
machine. If you need iOS, you need access to a Mac for that half of the work.

:::

:::include install-cli

:::include android-sdk

The command-line tools are usually the better choice on Linux, particularly on a
headless machine. Android Studio is packaged for most distributions and works
fine on a desktop.

Wherever you unpack the SDK, keep it somewhere your user owns — `~/Android/Sdk`
is the conventional location and is what Android Studio uses. Installing it
under `/opt` or `/usr/local` means every `sdkmanager` run needs `sudo`, and the
files it writes end up owned by root.

## Set up an emulator

The emulator needs hardware acceleration, which on Linux means KVM. Without it
the emulator either refuses to start or runs too slowly to use.

Check that your CPU supports virtualisation and that it is enabled in the BIOS:

```sh
egrep -c '(vmx|svm)' /proc/cpuinfo
```

A `0` means no virtualisation support is visible to the kernel. Anything higher
is fine.

Install KVM and add yourself to the group that may use it:

```sh
sudo apt install qemu-kvm
sudo usermod -aG kvm $USER
```

Log out and back in for the group change to apply — this is the step people skip
and then spend an hour on.

Create a virtual device with Android Studio's Device Manager, or from the
command line with `avdmanager`, which ships in the command-line tools package.

A physical Android device over USB works too, and is faster than any emulator.
It needs USB debugging turned on in Developer options, and a udev rule so your
user can reach it — Android's
[udev rules](https://developer.android.com/studio/run/device) cover the common
vendors.

:::include verify

## Troubleshooting

### `ti info` cannot find the Android SDK

Run `ti setup android` and give it the path. That writes the location to the
CLI's own config, which is checked before any environment variable.

If you set `ANDROID_HOME` and expected it to work: Titanium's app build does not
read that variable. Use `ANDROID_SDK_ROOT`, or let `ti setup android` record the
path.

### `sdkmanager` fails with a Java error

The command-line tools need a JDK on the path, and are sensitive to where they
are unpacked. Confirm `java -version` reports 17 or newer, then confirm the
tools sit at `<sdk>/cmdline-tools/latest/bin/sdkmanager`. Unpacking the zip
directly into the SDK root — so the path is `<sdk>/cmdline-tools/bin` — is the
usual cause, and the error does not mention the layout.

### The emulator starts and then exits

Almost always KVM. Check that `/dev/kvm` exists and that your user can read it:

```sh
ls -l /dev/kvm
```

If the group is `kvm` and you are not in it, the `usermod` above has not taken
effect yet.

### Build fails with a permissions error under the SDK directory

The SDK was installed as root. Either reinstall it somewhere your user owns, or
take ownership:

```sh
sudo chown -R $USER: ~/Android/Sdk
```

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
