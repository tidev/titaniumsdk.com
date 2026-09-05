## Install the Titanium CLI

:::code-group

@tab npm

```sh
npm install -g titanium
```

@tab pnpm

```sh
pnpm add -g titanium
```

:::

:::only macos, linux

Prefix that with `sudo` if you installed Node with apt or the installer — their
global directory is owned by root.

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
