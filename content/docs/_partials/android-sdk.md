## Install the Android SDK

Titanium needs four things out of the Android SDK:

| Component      | Why                   | Supported by SDK 13.4 |
| -------------- | --------------------- | --------------------- |
| SDK Platform   | Compiles against it   | API 23 to 36          |
| Build Tools    | Packages the APK      | 30.0.2 to 35.x        |
| Platform Tools | Provides `adb`        | 33.x                  |
| Emulator       | Runs a virtual device | Any current version   |

Two ways to get them. Android Studio is the path Google supports and the one to
take if you have no reason not to; the command-line tools are smaller and are
what you want on a build server.

:::tabs

@tab Android Studio

Install [Android Studio](https://developer.android.com/studio), open it, and let
the setup wizard run. It installs a platform, build tools and platform tools by
default.

Then open **Settings → Languages & Frameworks → Android SDK** and confirm that
at least one SDK Platform is installed, and that under **SDK Tools** you have
**Android SDK Build-Tools**, **Android SDK Platform-Tools** and **Android
Emulator**.

@tab Command line

Download the **command-line tools** package from the
[Android Studio downloads page](https://developer.android.com/studio#command-line-tools-only),
unzip it, and arrange it as `<sdk>/cmdline-tools/latest` — the tools expect that
exact layout and fail confusingly without it.

Then install the packages:

```sh
sdkmanager "platforms;android-36" "build-tools;35.0.0" "platform-tools" "emulator"
```

> [!NOTE]
> Google has deprecated `sdkmanager` in favour of a newer `android` command:
> `android sdk install platforms/android-36 build-tools/35.0.0`. Both work
> today. `sdkmanager` still ships in the command-line tools package, and is
> what most existing CI scripts call.

:::

## Point Titanium at it

Titanium looks for the Android SDK in this order, and stops at the first one
that works:

1. Its own config setting, `android.sdkPath`
2. The `ANDROID_SDK_ROOT` environment variable
3. The `ANDROID_SDK` environment variable
4. `adb` on your `PATH`, walking up from there
5. A scan of the usual install directories

> [!IMPORTANT]
> `ANDROID_HOME` is not on that list. Most Android documentation tells you to
> set it, and Titanium's app build does not read it. Set `ANDROID_SDK_ROOT`, or
> better, let the CLI record the path itself.

The reliable way is to let the CLI ask:

```sh
ti setup android
```

It finds the SDK, shows you what it found, and writes the answer to its config
so no environment variable has to be right.

## Versions that are newer than Titanium expects

Google ships new API levels and build tools faster than any SDK declares support
for them, so a current Android Studio install usually produces warnings:

```
!  Android API Android 17 (android-37) is too new and may or may not work with
   Titanium SDK 13.4.0.
   The maximum supported Android API level by Titanium SDK 13.4.0 is API level 36.
```

These are warnings, not errors, and Titanium builds anyway. Leave them alone
until a build actually fails. When one does, pin a version Titanium knows:

```sh
ti config android.buildTools.selectedVersion 35.0.0
```

Keeping a supported API level installed alongside the newest one costs a few
hundred megabytes and saves the argument entirely.
