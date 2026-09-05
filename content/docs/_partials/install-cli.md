## Install the Titanium CLI

The CLI is an npm package. Installing it globally puts `ti` on your path.

:::only macos, linux

```sh
sudo npm install -g titanium
```

The `sudo` is needed only because a default Node install owns its global
directory as root. If you installed Node with a version manager, drop it.

:::

:::only windows

```powershell
npm install -g titanium
```

:::

Check it:

```sh
ti -v
```

That prints the CLI version — `9.1.0` at the time of writing. The command is
also available as `titanium`; the two are the same program.

## Install the Titanium SDK

The CLI and the SDK are separate. The CLI is the tool you run; the SDK is what
builds your app, and you can have several installed at once.

```sh
ti sdk install
```

With no version, that downloads the latest stable release and makes it the
default. It is a few hundred megabytes.

To see what you have, and what is available:

```sh
ti sdk list
ti sdk list --releases
```
