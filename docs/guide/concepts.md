# Core concepts

This page defines the terms the rest of the documentation uses, one short section each. Each section links to the page that covers its subject in full.

## Project, module and task

A **project** is a directory with a `main.lask` file. Every `lask` command reads `main.lask` in the current directory unless you pass `--module <path>`.

A **module** is one `.lask` file. `main.lask` is the entry module, and it can import other modules by relative path:

```lask
import { lint, test } from "./lib/steps.lask"
```

A **task** is a top-level function that the command line can call. Every top-level function is one, unless it is marked `internal`. There is no separate task syntax: a function that returns a string from a computation and one that deploys a service are declared the same way.

```lask
// Two tasks. The first runs no command, the second runs one.
greeting(--name = "World") = "Hello, #{name}!"
kernel() = $[#alpine:3.22.2] uname -r
```

More: [Functions](/language/functions), [Modules and imports](/language/modules).

## Environments

An **environment** is where a command runs. Lask has three ways to write one, all starting with `#`:

| Written as | Means |
| --- | --- |
| `#alpine:3.22.2` | A container from an image in a registry. A digest works too: `#alpine@sha256:...`. |
| `#./Dockerfile` | A container from an image Lask builds from that Dockerfile. |
| `#local` | The host, outside any container. |

Run options for a container go in braces after the image, such as `#alpine:3.22.2{memory: "256m", network: "none"}`. An environment with options has the type `Runnable`.

There is **no default environment**. A command that names no environment, and whose program no `command` declaration covers, is an error that `lask check` reports. A command runs on the host only when its environment is `#local`.

An image is always written out after `#` in the source. The result is a value: you can bind it to a name (`python = #python:3.13.7-alpine3.22`), pass it as an argument, keep several in a map and pick one at run time by a string key. What you can't do is build an image name from a string: `$[#alpine:#{tag}]` is a syntax error, and a `String` where an environment belongs is a type error. That is how `lask sync` finds every image a project uses without running anything.

More: [Execution environments](/language/environments).

## Commands and command declarations

A **command** is a line of shell after `$`. Its value is the command's stdout, and a non-zero exit code is an error.

```lask
// Runs in the alpine:3.22.2 image.
alpine_release() = $[#alpine:3.22.2] cat /etc/alpine-release
```

Writing the environment on every command gets repetitive, so a **command declaration** says once where a program comes from:

```lask
command { "go" } on #golang:1.25
command { "git" } on #local

// Runs in the Go image.
build() = $ go build ./...
```

A `$` with no `[...]` looks at the programs its command line calls (`go` above) and runs in the environment declared for them. The spec calls this **dispatch**. It happens when the file is checked, so `lask check` reports a misspelled program name (`E-TYPE-COMMAND-NOENV`) before anything runs. A command line that calls programs from two different environments, such as `ls dist && npm publish` with `ls` on `#local` and `npm` in a container, is an error too (`E-TYPE-COMMAND-CONFLICT`).

`$` has variants: `$*` returns `{code, stdout, stderr}` and never fails on the exit code, `$2` returns stderr. More: [Commands](/language/commands).

## How a command runs

In a container, Lask:

- mounts the project directory (the one holding the entry module) at `/work`, read-write, and makes `/work` the working directory;
- runs the command with `/bin/sh -c`, so the image must contain `/bin/sh`;
- starts the container with the image digest the lock file pins, and removes the container when the command ends.

A `#local` command runs on the host, also in the project directory.

While a command runs, its output is copied to stderr as the **command log**, one line at a time:

```text
2026-10-08T16:07:52.630Z [#ghcr.io/astral-sh/ruff:0.13.3-alpine:1] $ ruff check --fix app
2026-10-08T16:07:52.790Z [#ghcr.io/astral-sh/ruff:0.13.3-alpine:1] 1| Found 1 error (1 fixed, 0 remaining).
2026-10-08T16:07:53.118Z [#ghcr.io/astral-sh/ruff:0.13.3-alpine:1] exit 0
```

`1|` is the command's stdout and `2|` its stderr. The number after the environment counts commands within one run, which tells concurrent commands apart.

## check, sync and the lock file

`lask check` reads the whole project and reports syntax errors, undefined names, wrong argument counts and types, and commands with no environment. It runs nothing, pulls nothing, and does not need Docker. In a project with [dependencies](#dependencies), it needs `lask sync` to have fetched them once; it never fetches them itself.

`lask sync` pulls every image the project uses, builds every image it has a Dockerfile for, fetches any [dependencies](#dependencies), and writes **`lask.lock.json`**. The lock file records the digest of each image and the content hash of each dependency. Commit it: `run` and `eval` use exactly what it pins, and never pull or build anything themselves. A missing image is an error that tells you to run `lask sync`.

`lask sync --frozen` fails instead of changing the lock file, which is what you want in CI. See [Running in CI](./ci).

## run, eval, cmd and repl

| Command | Does | stdout |
| --- | --- | --- |
| `lask run <task> [args]` | Runs a task. | Nothing. |
| `lask eval <task> [args]` | Runs a task. | Its return value, as JSON. |
| `lask cmd <program> [args]` | Runs one declared program in its environment, like `lask cmd ruff --version`. | The program's own stdout. |
| `lask repl` | Evaluates expressions you type. | Each result, as you type. |

In all of them, logs, the command log and errors go to stderr. Because `run` keeps stdout empty and `eval` prints only the value, you can pipe one task into another: `lask eval a | lask run b`, where `b` reads `stdin`.

A task's parameters are its command-line arguments. `deploy(target: String, --dry_run = false)` is called as `lask run deploy prod --dry-run true`. Positional parameters come first, then keyword parameters by name, and `-` and `_` in names are interchangeable. Options for `lask` itself, such as `--module`, go before the task name.

More: [Documentation and the command line](/language/docs-and-cli), [Input, output and secrets](/language/io-and-secrets).

## Secrets

Mark a parameter or binding as secret with `!!`. Its value is then masked as `***` in the command log, wherever it appears. Masking covers the log only: the value `lask eval` prints and the output a command returns are not masked.

To hand a secret to a container, put it in the container's environment rather than in the command string:

```lask
// The token reaches the container as an environment variable, so it is
// never part of the command string.
internal with_token(token: String): Runnable =
  runnable(#alpine:3.22.2, env = {"API_TOKEN": token})

// Publish, or only say what would happen.
//
// @param dry_run  Report what would happen instead of publishing.
publish(--dry_run = false, --token!!: String = get_env_or("API_TOKEN", "")): String = do {
  log("publishing, dry run: #{dry_run}")
  if (dry_run) { return "would publish" }
  if (token == "") { return fail(error(2, "API_TOKEN is not set")) }
  $[with_token(token)] sh -c 'echo "token has ${#API_TOKEN} characters: $API_TOKEN"'
}
```

```text
$ API_TOKEN=s3cr3t-value lask run publish
2026-10-08T17:01:24.329Z info publishing, dry run: false
2026-10-08T17:01:24.371Z [#alpine:3.22.2:1] $ sh -c 'echo "token has ${#API_TOKEN} characters: $API_TOKEN"'
2026-10-08T17:01:24.532Z [#alpine:3.22.2:1] 1| token has 12 characters: ***
2026-10-08T17:01:24.838Z [#alpine:3.22.2:1] exit 0
$ lask eval publish --dry-run true
2026-10-08T17:01:24.256Z info publishing, dry run: true
"would publish"
```

- `runnable(image, env = {...})` sets variables in the container. Lask passes only the variable's name on the `docker` command line, never its value, and the single-quoted `$API_TOKEN` is expanded by the shell inside the container.
- A keyword parameter's default is evaluated before the task starts, even when the task returns early. With `get_env("API_TOKEN")` as the default, a dry run would fail with `E-RUNTIME-ACCESS: environment variable is not set` when the variable is unset. `get_env_or("API_TOKEN", "")` gives `""` instead, and the task decides what an empty token means. This also covers a CI system that sets the variable to an empty string when the secret is missing.
- Pass secrets through the environment, not as `--token` on the command line, where other processes and your shell history can see them.
- Masking replaces every occurrence of the value, so a very short secret also masks the same letters inside other words in the log.

More: [Input, output and secrets](/language/io-and-secrets), which also covers secret references such as `{vault://secret/app#token}`.

## Dependencies

A project can import modules from another repository. `lask deps add` records a dependency in `lask.json` (a Git URL and a tag or commit, or a URL), and `lask sync` fetches it into `.lask/` in the project directory and records its hash in the lock file. `import` then refers to it by name:

```bash
lask deps add tools --git https://github.com/lask-task-runner/lask-module-tools.git --rev v0.3.0
```

```lask
import * as tools from "tools"

// The Go version in the image tools.go() returns.
go_version() = $[tools.go()] go version
```

```text
$ lask sync
...
$ lask eval go-version 2>/dev/null
"go version go1.27.1 linux/arm64\n"
```

Add `.lask/` to `.gitignore`; `lask sync` fetches it again from what the lock pins. A module's command declarations come with it only through `import command { ... } from ...`, so each file says which programs it takes from elsewhere.

To see what a dependency exports, point the help at its entry module. Each dependency is in a directory of `.lask/deps/` named after its hash, which `lask deps list` shows; with a single dependency, a `*` finds it:

```bash
lask run --module .lask/deps/sha256-*/main.lask --help        # its functions
lask run --module .lask/deps/sha256-*/main.lask go --help     # one function's parameters
lask cmd --module .lask/deps/sha256-*/main.lask --help        # the command words it declares
```

The tools module used here also documents itself in its [README](https://github.com/lask-task-runner/lask-module-tools).

More: [External dependencies](/language/dependencies).

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Success. |
| `1` | A static error in the file, found by `check`, `run` or `eval` before any task ran; or a stale lock under `lask sync --frozen`. |
| `2` | The default for other run-time errors. |
| `3` | The default for errors outside the language, such as a missing image or an unreachable Docker daemon. |
| `4` | The command line was wrong: unknown task, missing or mistyped argument. |
| Anything else | A failed command's own exit code, or the code passed to `fail(error(code, ...))`. |

A command that exits with 1 or 4 gives the same code, so read the error code on stderr when the distinction matters. [Troubleshooting](./troubleshooting) explains the error codes.
