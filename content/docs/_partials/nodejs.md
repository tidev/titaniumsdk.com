## Install Node.js

Titanium requires **Node.js 22.19.0 or 24.x**.

:::only macos

:::tabs

@tab nvm

```sh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.7/install.sh | bash
```

Reopen your terminal, then:

```sh
nvm install 24
```

@tab Homebrew

```sh
brew install node@24
```

Versioned formulas are keg-only. Add `$(brew --prefix node@24)/bin` to your
`PATH`.

@tab Installer

Download the macOS `.pkg` from
[nodejs.org](https://nodejs.org/dist/latest-v24.x/).

:::

:::

:::only linux

:::tabs

@tab nvm

```sh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.7/install.sh | bash
```

Reopen your terminal, then:

```sh
nvm install 24
```

@tab apt

```sh
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs
```

Debian and Ubuntu ship a Node too old for Titanium, so this adds
[NodeSource](https://github.com/nodesource/distributions).

:::

:::

:::only windows

:::tabs

@tab winget

```powershell
winget install OpenJS.NodeJS.LTS
```

`.LTS` follows whatever is LTS at the time — confirm the version below.

@tab nvm

```powershell
winget install CoreyButler.NVMforWindows
```

Reopen PowerShell as Administrator, then:

```powershell
nvm install 24
nvm use 24
```

@tab Installer

Download the `.msi` from [nodejs.org](https://nodejs.org/dist/latest-v24.x/).

:::

:::

```sh
node -v
```

> [!IMPORTANT]
> **Node 26 is only compatible with Titanium SDK 14 or newer.** Node 24
> works with every SDK.

:::only macos

On SDK 13.4 and earlier, Node 26 breaks every CLI command. Those releases reach
a physical iPhone through `node-ios-device`, which ships prebuilt binaries for
Node 18 through 24. There is none for Node 26, so npm compiles from source and
the compile fails:

```
Error: Rebuild failed:
node-pre-gyp ERR! install response status 404 Not Found on
https://github.com/tidev/node-ios-device/releases/download/v1.13.0/node_ios_device-v1.13.0-node-v147-darwin-arm64.tar.gz
```

Switch to Node 24, or to SDK 14, which drops the dependency.

:::
