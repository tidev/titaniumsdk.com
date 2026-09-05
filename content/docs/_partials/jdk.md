## Install a JDK

Titanium requires **JDK 17, 21, or 25**. JDK 26 needs Titanium SDK 14 or newer.
Any distribution works. The commands below install
[Temurin](https://adoptium.net/) or your distribution's OpenJDK.

:::only macos

:::tabs

@tab Homebrew

```sh
brew install --cask temurin@21
```

@tab Installer

Download the macOS `.pkg` from
[Adoptium](https://adoptium.net/temurin/releases/?version=21).

:::

:::

:::only linux

:::tabs

@tab apt

```sh
sudo apt install openjdk-21-jdk
```

@tab dnf

```sh
sudo dnf install java-21-openjdk-devel
```

:::

:::

:::only windows

:::tabs

@tab winget

```powershell
winget install EclipseAdoptium.Temurin.21.JDK
```

@tab Installer

Download the `.msi` from
[Adoptium](https://adoptium.net/temurin/releases/?version=21).

:::

:::

```sh
javac -version
```

`javac` rather than `java`: Android builds compile Java, so a JRE is not
enough.
