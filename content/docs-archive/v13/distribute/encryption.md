---
title: Source code encryption
description: What the build does to your JavaScript, when, and what it is worth.
since: 13.4.0
---

Your app is JavaScript, and a shipped app package can be unzipped. Titanium
encrypts your JavaScript assets so they are not plainly readable in the package.

You do not turn it on. It follows the deploy type.

| Deploy type   | JavaScript encrypted | Minified | Debugging |
| ------------- | -------------------- | -------- | --------- |
| `development` | No                   | No       | On        |
| `test`        | **Yes**              | Yes      | On        |
| `production`  | **Yes**              | Yes      | Off       |

A `dist-appstore` or `dist-playstore` build is a production build, so anything
you ship to a store is encrypted without your doing anything.

## Which module does it

`ti.cloak` by default. `ti.crypt` is an open-source alternative you opt into in
`tiapp.xml`:

```xml
<encryption>ti.crypt</encryption>
```

Any other value falls back to `ti.cloak` with a warning in the build log, so a
typo here is quiet rather than fatal. Changing the value forces a full rebuild,
because the previous build's assets were encrypted by a different module.

## What it is worth

**It stops casual reading.** Unzip an `.ipa` or an `.aab` and the JavaScript is
not sitting there in plain text to be copied.

**It is not a security boundary.** The app has to decrypt its own code to run
it, so the key ships with the app. Anyone willing to attach a debugger or read
the binary can recover the source. Treat it as raising the cost, not as
preventing anything.

That distinction decides what you may put in your code:

> [!WARNING]
> **An API key in your source is compromised the moment you ship it**, encrypted
> or not. So is one in `config.json`, in `tiapp.xml`, or in a property. Anything
> that must stay secret belongs on a server you control, with the app
> authenticating to it.

## Apple's encryption question

App Store Connect asks, on every upload, whether your app uses encryption.
Because Titanium encrypts your JavaScript, the answer is not automatically no.

Most apps qualify for an exemption - encryption limited to protecting the app's
own code, or standard HTTPS - but the determination is yours to make and the
answer has export-control weight. Declare it once in `tiapp.xml` and stop being
asked:

```xml
<ios>
  <plist>
    <dict>
      <key>ITSAppUsesNonExemptEncryption</key>
      <false/>
    </dict>
  </plist>
</ios>
```

Set that only if the exemption genuinely applies to your app. If you ship your
own cryptography beyond what is described above, it does not.

## Debugging an encrypted build

You largely cannot, which is why `test` exists: it encrypts and minifies like
production but leaves debugging and profiling on, so a bug that only appears in
a shipped build has somewhere to be reproduced.

A stack trace from a production build points into minified code. Build with
`--source-maps` if you need to map it back.

## Next

Back to [building apps](/docs/build), or the
[Titanium API](/docs/sdk) for what any of these calls actually do.
