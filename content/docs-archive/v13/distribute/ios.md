---
title: Apple App Store
description: Building an archive, uploading it, and the things review actually stops.
since: 13.4.0
---

Distributing on iOS requires macOS and an Apple Developer Program membership.
The membership is annual and paid; without it you cannot ship to anyone but
yourself.

## Build

```sh
ti build --platform ios --target dist-appstore \
  --distribution-name "Apple Distribution: Example Ltd (ABCDE12345)" \
  --pp-uuid <profile-uuid> \
  --output-dir ./dist
```

A distribution build always runs `xcodebuild` and always rebuilds, because the
archive has to be assembled from scratch. It is slower than a simulator build
and there is no way around it.

The result is an `.ipa` in `--output-dir`.

Use `dist-adhoc` instead for a build that installs on named devices without the
store. The profile has to list each device's UDID, which is the part people
forget when a tester says it will not install.

## Upload

Two ways, and both want the same `.ipa`.

**Xcode**, through **Window, Organizer**, which validates before it uploads and
explains what it found.

**Transporter**, Apple's standalone uploader, which is what to use from a
machine that does not have the project open. There is also `xcrun altool` for
scripting.

Uploading is not releasing. The build appears in App Store Connect, you attach
it to a version, and you submit that version for review.

## Before you submit

**Every permission needs a usage string.** A missing `NSCameraUsageDescription`
is a rejection, and before that the permission dialog silently never appears.
They go in `tiapp.xml` under `<ios><plist>` - see
[tiapp.xml](/docs/reference/tiapp-xml).

**Write real strings.** "Required by the app" is rejected. Say what the app
does with it.

**Encryption declaration.** Apple asks whether your app uses encryption. Titanium
encrypts your JavaScript on a production build, so the honest answer is not
automatically "no" - see
[source code encryption](/docs/distribute/encryption). Most apps qualify for
the exemption, and `ITSAppUsesNonExemptEncryption` in the plist stops it being
asked on every upload.

**A privacy manifest.** Apple requires `PrivacyInfo.xcprivacy` for apps using
certain APIs. It goes in `platform/ios/` and is copied into the build verbatim.

**Build with `--deploy-type production`**, which `dist-appstore` implies. A
`development` build leaves debugging on.

## What review stops

In rough order of how often it happens: missing or lazy permission strings; a
crash on launch on the reviewer's device; features behind a login with no demo
account; and anything that looks like a web page in a wrapper.

Review is a person. A build that fails on their hardware and works on yours is
usually a device family or an iOS version you never ran on.

## Versions

`version` in `tiapp.xml` is the marketing version. App Store Connect will not
accept the same build number twice for the same version, so bump `version`
between uploads or you will be re-uploading over a rejected build.

## Next

[Google Play](/docs/distribute/android) is the other half.
