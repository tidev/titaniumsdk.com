## Install Node.js

Titanium requires **Node.js 22.19.0 or 24.x**.

> [!IMPORTANT]
> **Node 26 is only compatible with Titanium SDK 14 or newer.** Node 24
> works with every SDK.

:::only macos

:::tabs

@tab nvm

```sh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.8/install.sh | bash
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
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.8/install.sh | bash
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

`.LTS` follows whatever is LTS at the time, so confirm the version below.

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
