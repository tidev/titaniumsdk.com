---
title: Linux
description: Set up a Linux machine to build Titanium apps for Android.
platforms: [linux, android]
since: 13.4.0
---

Linux builds for Android.

:::unavailable ios

Building for iOS needs Xcode, and Apple ships Xcode only for macOS — not in a
container, not in a virtual machine. If you need iOS, you need a Mac for that
half of the work.

:::

:::include nodejs

:::include jdk

:::include install-cli

:::include android-sdk

Keep the SDK somewhere your user owns. `~/Android/Sdk` is the conventional
location and the one Android Studio uses. Under `/opt` or `/usr/local`, every
`sdkmanager` run needs `sudo` and the files it writes end up owned by root.

## Set up an emulator

The emulator needs KVM. Without it, it either refuses to start or runs too
slowly to use.

```sh
egrep -c '(vmx|svm)' /proc/cpuinfo
```

`0` means virtualisation is not enabled in the BIOS. Anything higher is fine.

```sh
sudo apt install qemu-kvm
sudo usermod -aG kvm $USER
```

Log out and back in for the group change to take effect.

Create a virtual device with Android Studio's Device Manager, or with
`avdmanager` from the command-line tools.

A physical device over USB is faster than any emulator. It needs USB debugging
turned on in Developer options, and a
[udev rule](https://developer.android.com/studio/run/device) so your user can
reach it.

:::include verify

## Troubleshooting

### `ti info` cannot find the Android SDK

Run `ti setup android` and give it the path. If you set `ANDROID_HOME` and
expected it to work, use `ANDROID_SDK_ROOT` instead.

### `sdkmanager` fails with a Java error

Check `javac -version` reports 17, 21 or 25, then check the tools are at
`<sdk>/cmdline-tools/latest/bin/sdkmanager`. Unzipping straight into the SDK
root leaves them at `<sdk>/cmdline-tools/bin`, and the error does not mention
the layout.

### The emulator starts and then exits

KVM. Check `/dev/kvm` exists and your user can read it:

```sh
ls -l /dev/kvm
```

If the group is `kvm` and you are not in it, the `usermod` above has not taken
effect yet.

### Permission errors under the SDK directory

The SDK was installed as root:

```sh
sudo chown -R $USER: ~/Android/Sdk
```

## Prove it works

```sh
ti create
ti build -p android
```

If both finish, your environment is done.

## Next

[Your first app](/docs/build/first-app) covers what `ti create` produced.
