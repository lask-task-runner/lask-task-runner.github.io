# Installation

Lask is a single binary; it needs Docker to run containers. Pick your platform below, then take the [Getting started](/guide/getting-started) guide.

::: details macOS · Homebrew

```bash
$ brew tap lask-task-runner/tap
$ brew trust lask-task-runner/tap
$ brew install lask
```

:::

::: details macOS / Linux · download the binary

```bash
$ VERSION=$(curl -fsSL https://api.github.com/repos/lask-task-runner/lask/releases/latest | grep -m1 '"tag_name"' | cut -d '"' -f4)
$ TARGET=linux-amd64 # or macos-amd64, macos-arm64
$ curl -fsSL -o lask.tar.gz "https://github.com/lask-task-runner/lask/releases/download/${VERSION}/lask-${VERSION}-${TARGET}.tar.gz"
$ tar -xzf lask.tar.gz
$ sudo mv ./lask /usr/local/bin
```

Uninstall with `sudo rm /usr/local/bin/lask`.

:::

::: details Debian / Ubuntu · .deb package

```bash
$ VERSION=$(curl -fsSL https://api.github.com/repos/lask-task-runner/lask/releases/latest | grep -m1 '"tag_name"' | cut -d '"' -f4)
$ curl -fsSL -o lask.deb "https://github.com/lask-task-runner/lask/releases/download/${VERSION}/lask-${VERSION}-linux-amd64.deb"
$ sudo dpkg -i lask.deb
```

amd64 only; on another architecture, take the tarball above. Uninstall with `sudo apt remove lask`.

:::

::: details Windows · PowerShell

```powershell
> $version = (Invoke-RestMethod https://api.github.com/repos/lask-task-runner/lask/releases/latest).tag_name
> Invoke-WebRequest -Uri "https://github.com/lask-task-runner/lask/releases/download/$version/lask-$version-windows-amd64.zip" -OutFile lask.zip
> Expand-Archive -Path lask.zip -DestinationPath "$env:LOCALAPPDATA\Programs\lask" -Force
> setx PATH "$env:PATH;$env:LOCALAPPDATA\Programs\lask"
```

Restart your terminal for the updated `PATH` to take effect. Uninstall with `Remove-Item -Recurse -Force "$env:LOCALAPPDATA\Programs\lask"`.

:::

::: details From source · Haskell toolchain

Needs [GHCup](https://www.haskell.org/ghcup/) or `brew install haskell-stack`.

```bash
$ stack --local-bin-path /usr/local/bin/ install
```

:::

Verify with `lask version`. Lask runs containers through the `docker` command, so Docker must be installed and its daemon running (Docker Desktop on macOS and Windows, Docker Engine on Linux). Archives and packages for every platform are on the [latest release](https://github.com/lask-task-runner/lask/releases/latest); an APT repository and Chocolatey support are planned.

::: details Shell completion · bash, zsh, fish

Completion knows your module, not just the CLI: it completes the functions the repository you are standing in defines, each function's keyword parameters, and the commands it declares.

```bash
$ lask run <TAB>
build-on-docker     install             test                uninstall-completion
doctest             install-completion  uninstall           unittest
$ lask run install --<TAB>
--output  --env  --help
$ lask run install --env <TAB>
docker  local
$ lask cmd <TAB>
mv  rm  stack  uname
```

**fish** — nothing else to do:

```fish
$ lask completion fish > ~/.config/fish/completions/lask.fish
```

**bash** — write the script somewhere and source it:

```bash
$ mkdir -p ~/.bash_completion.d
$ lask completion bash > ~/.bash_completion.d/lask
```

then, in `~/.bash_profile` (macOS Terminal starts a login shell, which does not read `~/.bashrc`) or in `~/.bashrc` (Linux):

```bash
source ~/.bash_completion.d/lask
```

With the `bash-completion` package installed — most Linux distributions have it — writing the script to `~/.local/share/bash-completion/completions/lask` instead loads it on demand, with nothing added to your rc file. That directory does nothing on a system without the package, which includes a stock macOS. Note that `source <(lask completion bash)` cannot be used there either: the `source` builtin in bash 3.2, still macOS's `/bin/bash`, silently reads nothing from a process substitution.

**zsh** — the completion system has to be switched on, which macOS does not do for you:

```zsh
$ mkdir -p ~/.zsh/completions
$ lask completion zsh > ~/.zsh/completions/_lask
```

then, in `~/.zshrc`:

```zsh
fpath=(~/.zsh/completions $fpath)
autoload -Uz compinit && compinit
```

If `compinit` already runs in your `~/.zshrc` — every framework does it for you — only the `fpath` line is new, and any directory already on `$fpath` works just as well. `compinit` caches what it found, so after adding a file, delete `~/.zcompdump*` and open a new shell. If completion does nothing and `command not found: compdef` appears when zsh starts, `compinit` has not run.

The script only ever asks the binary, so it keeps working across upgrades. Completion reads your module without running it: no task, no default value, and no environment is ever evaluated to answer a `<TAB>`.

:::

## Editor support

`lask serve` is a language server built into the same binary. Install the [Lask extension from the VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=ToruIkeda.vscode-lask), or search for "Lask" in VS Code.

The language server also formats a file, with the same rules as `lask fmt`: run **Format Document** in VS Code, or set `editor.formatOnSave` to format on every save.

