---
title: Distributing apps
description: Signing a build and getting it to testers and to the two stores.
since: 13.4.0
---

A build you can run on your own device and a build you can give to somebody
else differ in one thing: signing. Every page in this section is downstream of
that.

## The shape of it

|                     | iOS                                       | Android                        |
| ------------------- | ----------------------------------------- | ------------------------------ |
| Signed with         | A certificate plus a provisioning profile | A keystore                     |
| Issued by           | Apple, tied to your developer account     | You, on your own machine       |
| Lost identity means | Revoke and reissue                        | **You cannot update your app** |
| Store artifact      | `.ipa`                                    | `.aab` app bundle              |
| Build target        | `dist-appstore`                           | `dist-playstore`               |

The asymmetry in the third row is the one to internalise. An Apple certificate
is replaceable. An Android keystore is not: Google Play identifies your app by
the key it was signed with, and losing it means publishing a new listing.

## The pages

[Certificates and provisioning](/docs/distribute/signing) is the identities
themselves, and how to make them once.

[Apple App Store](/docs/distribute/ios) is archiving, uploading, and what
review looks for.

[Google Play](/docs/distribute/android) is the app bundle, the version code,
and Play App Signing.

[Source code encryption](/docs/distribute/encryption) is what the build does to
your JavaScript, and what that is and is not worth.

## Before any of it

`version` in `tiapp.xml` is what people see. On Android
`android:versionCode` is a separate integer that has to increase on every
upload. See [tiapp.xml](/docs/reference/tiapp-xml).

Build with `--deploy-type production` for anything you distribute, even outside
a store. It turns on minification and JavaScript encryption and turns off
debugging and profiling, which a `development` build leaves on.
