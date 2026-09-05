## Install the Android SDK

Titanium needs four pieces of it:

| Component      | Why                   | Supported by SDK 13.4 |
| -------------- | --------------------- | --------------------- |
| SDK Platform   | Compiles against it   | API 23 to 36          |
| Build Tools    | Packages the APK      | 30.0.2 to 35.x        |
| Platform Tools | Provides `adb`        | 33.x                  |
| Emulator       | Runs a virtual device | Any current version   |

Android Studio is the straightforward way to get them. The command-line tools
are smaller and are what you want on a build server.

:::tabs

@tab Android Studio

Install [Android Studio](https://developer.android.com/studio) and let the setup
wizard run. It installs a platform, build tools and platform tools.

Then open **Settings → Languages & Frameworks → Android SDK** and check that
**SDK Tools** lists **Android SDK Build-Tools**, **Android SDK Platform-Tools**
and **Android Emulator**.

@tab Command line

Download the **command-line tools** from the
[Android Studio downloads page](https://developer.android.com/studio#command-line-tools-only)
and unzip them to `<sdk>/cmdline-tools/latest`. The tools expect that exact
layout and fail confusingly without it.

```sh
sdkmanager "platforms;android-36" "build-tools;35.0.0" "platform-tools" "emulator"
```

> [!NOTE]
> Google has deprecated `sdkmanager` in favour of `android sdk install
platforms/android-36 build-tools/35.0.0`. Both work. `sdkmanager` still ships
> in the command-line tools and is what most CI scripts call.

:::

## Point Titanium at it

```sh
ti setup android
```

This finds the SDK and writes the path to the CLI's config, so no environment
variable has to be right.

If you would rather set one, Titanium checks `ANDROID_SDK_ROOT` and
`ANDROID_SDK`, then looks for `adb` on your `PATH`, then scans the usual install
directories.

> [!IMPORTANT]
> `ANDROID_HOME` is not one of them. Most Android documentation tells you to set
> it; Titanium's app build does not read it.

## Versions newer than Titanium supports

Google ships API levels and build tools faster than the SDK adds support, so a
current Android Studio usually produces warnings:

```
!  Android API Android 17 (android-37) is too new and may or may not work with
   Titanium SDK 13.4.0.
   The maximum supported Android API level by Titanium SDK 13.4.0 is API level 36.
```

Titanium builds anyway. Leave them until a build fails, then pin a version it
knows:

```sh
ti config android.buildTools.selectedVersion 35.0.0
```
