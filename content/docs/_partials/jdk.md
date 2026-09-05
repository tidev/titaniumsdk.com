## Install a JDK

Titanium requires **JDK 17, 21, or 25**. JDK 26 is only compatible with
Titanium SDK 14 or newer.
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

## Set `JAVA_HOME`

Gradle and the Titanium SDK locate the JDK through `JAVA_HOME`. Most installers
leave it unset.

:::only macos

:::code-group

@tab zsh

```sh
echo 'export JAVA_HOME=$(/usr/libexec/java_home -v 21)' >> ~/.zshrc
source ~/.zshrc
$JAVA_HOME/bin/javac -version
```

@tab bash

```sh
echo 'export JAVA_HOME=$(/usr/libexec/java_home -v 21)' >> ~/.bash_profile
source ~/.bash_profile
$JAVA_HOME/bin/javac -version
```

@tab fish

```fish
echo 'set -gx JAVA_HOME (/usr/libexec/java_home -v 21)' >> ~/.config/fish/config.fish
source ~/.config/fish/config.fish
$JAVA_HOME/bin/javac -version
```

:::

The value stays unresolved on purpose: `/usr/libexec/java_home` reports where
the JDK is now, so an update cannot strand the path. Change `-v 21` if you
installed 17 or 25.

:::

:::only linux

:::code-group

@tab bash

```sh
JAVA_HOME=$(dirname "$(dirname "$(readlink -f "$(command -v javac)")")")
echo "export JAVA_HOME=$JAVA_HOME" >> ~/.bashrc
$JAVA_HOME/bin/javac -version
```

@tab zsh

```sh
JAVA_HOME=$(dirname "$(dirname "$(readlink -f "$(command -v javac)")")")
echo "export JAVA_HOME=$JAVA_HOME" >> ~/.zshrc
$JAVA_HOME/bin/javac -version
```

@tab fish

```fish
set -gx JAVA_HOME (dirname (dirname (readlink -f (command -v javac))))
echo "set -gx JAVA_HOME $JAVA_HOME" >> ~/.config/fish/config.fish
$JAVA_HOME/bin/javac -version
```

:::

The path differs by distribution — `/usr/lib/jvm/java-21-openjdk-amd64` on
Debian and Ubuntu, `/usr/lib/jvm/java-21-openjdk` on Fedora — so this reads it
off `javac` rather than naming one.

:::

:::only windows

```powershell
[Environment]::SetEnvironmentVariable(
  'JAVA_HOME',
  (Get-Item (Get-Command javac).Source).Directory.Parent.FullName,
  'User'
)
```

Reopen PowerShell, then:

```powershell
& "$env:JAVA_HOME\bin\javac" -version
```

:::
