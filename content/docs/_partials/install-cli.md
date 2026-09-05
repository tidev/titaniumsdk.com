## Install the Titanium CLI

:::only macos, linux

```sh
sudo npm install -g titanium
```

Drop the `sudo` if you installed Node with a version manager.

:::

:::only windows

```powershell
npm install -g titanium
```

:::

```sh
ti -v
```

The command is also available as `titanium`.

## Install the Titanium SDK

The CLI is the tool you run; the SDK is what builds your app. You can have
several SDKs installed at once.

```sh
ti sdk install
```

With no version, that installs the latest stable release and makes it the
default. It is a few hundred megabytes.

```sh
ti sdk list
ti sdk list --releases
```
