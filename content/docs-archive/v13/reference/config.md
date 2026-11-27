---
title: CLI configuration
description: Where the CLI keeps its settings, the keys it understands, and which ones matter.
since: 13.4.0
---

The CLI stores its own settings, separately from any project. They live in
`~/.titanium/config.json`, and `ti config` is how to read and write them.

```sh
ti config                                  # everything
ti config cli.logLevel                     # one key
ti config cli.logLevel info                # set it
ti config cli.logLevel --remove            # back to the default
```

The path is printed by `ti config --help`, so a machine that keeps it elsewhere
will say so.

## Keys

### Paths

| Key              | What                                     |
| ---------------- | ---------------------------------------- |
| `paths.sdks`     | Extra directories to find SDKs in        |
| `paths.modules`  | Extra directories to find modules in     |
| `paths.plugins`  | Extra directories to find CLI plugins in |
| `paths.commands` | Extra CLI commands                       |
| `paths.hooks`    | Extra build hooks                        |

These take lists, so they have `--append` and `--remove`:

```sh
ti config paths.modules --append ~/shared/modules
```

A path added here applies to every project on the machine, which makes a build
depend on the machine. It is useful for a shared module cache and a liability
for anything a colleague needs too.

### Android

| Key                                  | What                                       |
| ------------------------------------ | ------------------------------------------ |
| `android.sdkPath`                    | Where the Android SDK is                   |
| `android.ndkPath`                    | Where the NDK is, if you build native code |
| `android.buildTools.selectedVersion` | Pin build tools when the newest is too new |

`android.sdkPath` is what `ti setup android` writes, and it is the answer to
"the build cannot find the Android SDK" - not an environment variable.
`ANDROID_HOME` is **not** read by the app build; the detection order is this
config key, then `ANDROID_SDK_ROOT`, then `ANDROID_SDK`, then `adb` on `PATH`.

### iOS

| Key                    | What                             |
| ---------------------- | -------------------------------- |
| `ios.developerName`    | Default development certificate  |
| `ios.distributionName` | Default distribution certificate |

Setting these saves passing `--developer-name` on every device build.

### CLI behaviour

| Key                      | Default | What                                  |
| ------------------------ | ------- | ------------------------------------- |
| `cli.logLevel`           | `trace` | Default verbosity                     |
| `cli.colors`             | `true`  | ANSI colour                           |
| `cli.progressBars`       | `true`  | Progress bars                         |
| `cli.prompt`             | `true`  | Ask for missing values                |
| `cli.width`              | `80`    | Wrap width                            |
| `cli.completion`         | `false` | Shell completion                      |
| `cli.httpProxyServer`    | empty   | Proxy for CLI requests                |
| `cli.rejectUnauthorized` | `true`  | Verify TLS on CLI requests            |
| `cli.ignoreDirs`         | a regex | Directories never copied into a build |
| `cli.ignoreFiles`        | a regex | Files never copied into a build       |

> [!WARNING]
> `cli.rejectUnauthorized false` disables certificate verification for
> everything the CLI fetches, including SDK downloads. If a corporate proxy is
> the reason, set `cli.httpProxyServer` instead and leave verification on.

`cli.ignoreDirs` and `cli.ignoreFiles` are why `.git` and `.DS_Store` do not end
up inside your app. Widen them to keep something else out; replacing them
wholesale is how a `.git` directory ships to the store.

### App

| Key             | What                               |
| --------------- | ---------------------------------- |
| `app.workspace` | Default directory for new projects |
| `user.name`     | Name used in generated files       |

## Per-run overrides

`--config` takes JSON and applies for that run only, which is the way to script
something without changing the machine:

```sh
ti build --platform android --config '{"cli":{"logLevel":"warn"}}'
```

`--config-file` points at a different file entirely, which is how CI can carry
its own settings without touching a developer's.

## What is not here

Anything about the app itself - id, name, version, permissions, modules - is in
`tiapp.xml`, not here. See [tiapp.xml](/docs/reference/tiapp-xml). The rule is
that this file describes the machine and `tiapp.xml` describes the app, which
is also why this one is not in version control and that one is.
