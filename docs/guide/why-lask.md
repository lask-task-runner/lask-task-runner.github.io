# Why Lask

Lask (lambda + task) is a task runner. You write tasks as typed functions in a `main.lask` file. Each command in a task runs in an environment the file names, usually a container image pinned by digest, and `lask check` checks the whole file before anything runs. To use it, you install Lask and Docker.

## Where it fits

Make and Taskfile run commands with whatever tools the machine has installed, and check little before they start. Dagger runs every step in a container, but you write the pipeline in Go, Python or TypeScript against its SDK, and run its engine.

Lask sits between them. Steps run in pinned containers, the file is type-checked before anything runs, and the definition is a short file in a small language rather than a program built against an SDK. It is most useful when your tasks take arguments, call each other, need specific tool versions, or run steps in parallel. Make and YAML pipelines tend to push that kind of logic into shell scripts, where nothing checks it before it runs.

## What you get

### A project starts as one file

A directory with a `main.lask` file is a project. There is no scaffolding and no configuration file to start with. The syntax borrows from languages you probably know: C-style braces, `try`/`catch`, `async`/`await`, and TypeScript-like type notation. The whole language and CLI fit on the [Quick reference](/reference/quick-reference), which takes about ten minutes to read.

### Checked before it runs

`lask check` resolves every name, argument and type, and finds the environment of every command, without running anything or contacting Docker. Your laptop and CI run the same file, and what passes `lask check` locally is what CI runs. The [VS Code extension](./installation#editor-support) shows the same errors as you type, so you see a typo in the editor before it reaches CI.

### Pinned environments

Each command runs in the environment the file gives it: written on the command as `$[#image]`, or once per program with a declaration. `command { "go" } on #golang:1.25` says that `go` comes from that image, and every `$ go ...` in the file runs there. `lask sync` records each image's digest in `lask.lock.json`, and every machine runs those exact images.

Running on the host is possible, by writing `#local`, but it is never a default. A command whose program has no declared environment is a `lask check` error, so a missing declaration or a misspelled program name doesn't quietly run whatever the host has installed.

### Tasks are functions

A task is a function with typed parameters, defaults and a return value. `if`, `case`, `try`/`catch` and `async`/`await` are part of the language, so you don't need `set -e`, `&&` chains or background jobs. Tasks call each other like functions, and modules import tasks and their environments from other projects, pinned by content hash in the lock file.

### Every task has a command line

A task's signature is its command line: calling `release(dry_run = true)` in Lask is the same call as `lask run release --dry-run true` from the shell. `--help` and the editor's hover both show the comment above the task, its `@param` and `@example` tags, the inferred return type, and the images the task needs. `lask cmd go test ./...` runs a single declared program in its image, and `lask repl` evaluates expressions.

### Secrets and isolation

A parameter or binding marked secret with `!!`, like `--token!!: String = get_env("TOKEN")`, is masked as `***` wherever its value appears in the command log. An environment variable can hold a reference such as `{vault://secret/aws#secret_key}`, which Lask resolves from Vault when the task reads it, so the same file works with and without a vault. Masking covers the log only: a command's captured output and the value `lask eval` prints are not masked.

Containers can be locked down with run options such as `{network: "none", read_only: true, cap_drop: ["ALL"]}`.

Separately, `lask.json` can make a task such as `deploy` ask for a typed confirmation before it runs. That guards against running the wrong task by mistake; it is not a security boundary.

## Not a CI service

Lask is not a build system or a CI service. You keep GitHub Actions, GitLab CI or Jenkins for triggers, permissions and secrets, and your CI job calls `lask run`. The tasks themselves live in `main.lask`, so you can run them locally, and moving to another CI provider means rewriting one step. See [Running in CI](./ci).

## How Lask compares

|  | Lask | make | Taskfile | Dagger |
| --- | --- | --- | --- | --- |
| Checks before running | Types, names and arguments (`lask check`) | None | Schema only | Through the SDK's language |
| Typed task arguments with defaults | Yes: `--name: String = "World"` | No | Untyped variables | Yes, in the SDK's language |
| Where commands run | The environment the file names; host only with `#local` | The host | The host | Containers |
| Concurrency | `async` / `await` | `-j`, per target | `deps` run in parallel | Implicit in the DAG |
| Reuse across projects | Module imports, pinned by hash | `include` | `includes` | Git modules |
| Incremental rebuilds | No | File targets | Checksum or timestamp | Content-addressed cache |
| Written in | A small typed language | Makefile | YAML | Go, Python or TypeScript |
| What you install | Lask and Docker | make, and every tool a task uses | One binary, and every tool a task uses | The Dagger CLI, Docker, and an SDK toolchain |

## When to use something else

- If your tasks are mostly "rebuild only what changed" over files, use make or a build system such as Bazel. Lask does not track whether files are up to date.
- If you need artifact caching at build-system scale, or want to write the pipeline in Go or TypeScript with a full SDK, Dagger goes further than Lask. In exchange, you run its engine and maintain code against its SDK.
- If every task is a single command with no arguments, a Makefile is shorter.

## Status

Lask is before 1.0. Every feature is experimental until then, and breaking changes are still possible. The [compatibility policy](/reference/compatibility) says what "stable" will mean after 1.0. Feedback in [GitHub Discussions](https://github.com/lask-task-runner/lask/discussions) helps decide what becomes stable.
