---
title: Google Play
description: The app bundle, the version code, and signing your app so you can still update it.
since: 13.4.0
---

Android distribution needs a keystore and a Google Play developer account. The
account is a one-off fee; the keystore you make yourself. See
[certificates and provisioning](/docs/distribute/signing) - and back the
keystore up before you read any further.

## Build

```sh
ti build --platform android --target dist-playstore \
  --keystore /secure/myapp.keystore --alias myapp \
  --output-dir ./dist
```

The output is an **`.aab`**, an Android App Bundle, not an APK. Google Play has
required bundles for new apps since 2021: you upload the bundle and Play
generates the APKs each device needs from it.

The build runs Gradle's `bundleRelease`, so it is a full release build and
slower than a debug one.

## The version code

```xml
<android xmlns:android="http://schemas.android.com/apk/res/android">
  <manifest android:versionCode="2">
```

`android:versionCode` is an integer, separate from `version`, and **Play
rejects an upload whose version code is not higher than the last one**. It is
the single most common failed upload.

<!-- Parked under TI-78: wanted, nobody can shoot it yet. Uncomment when the image exists.

:::missing 16:9

The Play Console's App bundle explorer for an uploaded `.aab`, with its version
code visible. Redact the developer account name.

:::

-->

`version` is what users see. The two move independently, and a common scheme is
to derive the code from the version so they cannot drift.

## Upload

Play Console, under the release track you want. Four tracks: internal, closed,
open, and production. Internal is the fastest way to get a build onto a
tester's phone, and it is the one to use instead of emailing an APK.

Uploading is not releasing. A bundle goes to a track, and the track is rolled
out - possibly to a percentage of users.

## Before you submit

**Declare your permissions honestly.** Play asks about sensitive ones -
location, background location, storage - and wants a reason. A permission a
module pulled in without you noticing is still yours to justify; check the
merged manifest in `build/android/` if the list surprises you.

**A privacy policy URL** is required for essentially every app now.

**Target API level.** Play enforces a minimum target, raised annually, and it is
a hard block rather than a warning. Titanium 13.4 supports up to API 36; set
`<tool-api-level>` in `tiapp.xml` if you need to pin it.

**Data safety.** A form in Play Console, separate from the manifest, describing
what you collect. It is checked against what your app appears to do.

## Testing the exact artifact

An `.aab` is not directly installable. To run the thing you are about to
publish, either use an internal testing track, or use Google's `bundletool` to
generate and install APKs from the bundle.

Do that at least once before a first release. A bundle that Play splits
differently from your debug build is a class of bug you will not otherwise see.

## Next

[Source code encryption](/docs/distribute/encryption) covers what the build did
to your JavaScript on the way in.
