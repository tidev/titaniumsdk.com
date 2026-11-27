---
title: Certificates & provisioning
description: The signing identities each platform needs for distribution, and how to make them.
since: 13.4.0
---

Development signing - getting a build onto your own device - is covered in
[environment setup](/docs/setup/macos). This page is the identities you need to
give a build to somebody else.

## Android: a keystore

A keystore is a file you generate once and keep for the life of the app.

```sh
keytool -genkey -v -keystore myapp.keystore -alias myapp \
  -keyalg RSA -keysize 2048 -validity 10000
```

`keytool` ships with the JDK, so it is already on the machine.

> [!WARNING]
> **Back this up somewhere you will still have in five years, and record the
> passwords with it.** Google Play identifies your app by its signing key. Lose
> the keystore or its password and you cannot ship an update - not with a
> support ticket, not with anything. The app has to be republished under a new
> id, losing its listing, reviews and installs.
>
> Do not commit it. A keystore in the repository is the signing identity of
> your app in every clone of it.

Build against it:

```sh
ti build --platform android --target dist-playstore \
  --keystore /secure/myapp.keystore --alias myapp --output-dir ./dist
```

The CLI prompts for the password. `--store-password` exists for CI, where it
should come from a secret rather than a shell history.

Save the path and alias so you stop retyping them:

```json
{
  "titanium.android.keystorePath": "/secure/myapp.keystore",
  "titanium.android.keystoreAlias": "myapp"
}
```

That is the VS Code extension's settings. The password is asked for each time
and is not stored.

### Play App Signing

Google Play can hold the signing key for you: you sign with an upload key, Play
re-signs with the real one. It removes the catastrophic-loss problem, because
an upload key can be reset by support.

Turn it on when you first publish. It cannot be added to an existing app
without Google's involvement.

## iOS: a certificate and a profile

Two things, and both come from Apple.

A **distribution certificate** identifies you. One per team, reused across
apps, valid for a year.

A **provisioning profile** ties a certificate to an app id and, for ad-hoc
builds, to a list of device UDIDs. One per app per distribution method.

Make them in Xcode - **Settings, Accounts, Manage Certificates** - or in the
developer portal. Xcode is less error-prone because it puts the private key in
your keychain at the same time.

<!-- Parked under TI-78: wanted, nobody can shoot it yet. Uncomment when the image exists.

:::missing 16:9

Xcode's Settings, Accounts, Manage Certificates sheet, listing an Apple
Development and an Apple Distribution certificate. Redact the team name and
anything else that identifies the account.

:::

-->

Titanium reads certificates from the keychain and profiles from where Xcode
keeps them, so anything Xcode can see it can use:

```sh
ti info -t ios
```

That lists the certificates and profiles it found, with their UUIDs. It is the
fastest way to answer "which profile does it think it has".

```sh
ti build --platform ios --target dist-appstore \
  --distribution-name "Apple Distribution: Example Ltd (ABCDE12345)" \
  --pp-uuid 12345678-1234-1234-1234-123456789012 \
  --output-dir ./dist
```

Set `ios.distributionName` in
[CLI configuration](/docs/reference/config) to stop passing the certificate
every time.

### The private key is the part that matters

A certificate without its private key is useless, and the key lives in the
keychain of the machine that made the request. Moving to a new machine means
exporting a `.p12` from the old one, not downloading the certificate again.

Export it when you create it, not when you need it.

## Which target signs with what

| Target           | Signing                          | Produces                       |
| ---------------- | -------------------------------- | ------------------------------ |
| `device`         | Development                      | An app on the connected device |
| `dist-adhoc`     | Distribution + ad-hoc profile    | `.ipa` for named devices       |
| `dist-appstore`  | Distribution + App Store profile | `.ipa` for upload              |
| `dist-playstore` | Your keystore                    | `.aab` for upload              |

## Next

[Apple App Store](/docs/distribute/ios) and
[Google Play](/docs/distribute/android) take it from here.
