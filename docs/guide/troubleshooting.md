# Troubleshooting

This page explains how to read a Lask error, then lists the errors newcomers meet most often, with the message you will see and what to do about it.

## Reading an error

An error found by `lask check`, or before a task starts, names the file, the line and column, the error code, and the stage that found it:

```text
main.lask:5:19-5:20: E-TYPE-MISMATCH [static]: type mismatch
  expected: Bool
  actual:   Number
```

An error during a run gives the code and message, then the chain of calls that led to it, innermost first:

```text
E-RUNTIME-COMMAND-NONZERO: ...
stack trace (innermost first):
  at lint (main.lask)
  at ci (main.lask)
```

The code tells you what kind of problem it is:

- `E-SYNTAX-`: the file doesn't parse. Every command that reads the file reports it.
- `E-NAME-`: a name that isn't defined, or is defined twice. Found by `check`, and by `run` and `eval` before they start.
- `E-TYPE-`: a type mismatch, a wrong argument, or a command with no environment. Found by `check`, and by `run` and `eval` before they start.
- `E-MODULE-`: an import or dependency can't be resolved, or the lock is out of date. Found by `check` and `sync`.
- `E-CLI-`: the `lask` command line is wrong. Any `lask` command can report it.
- `E-IO-`: something outside the language failed: an image, Docker, a file, stdin, a secret store. Found by `sync`, `run` and `eval`.
- `E-RUNTIME`: a command failed, `fail` was called, or a built-in got a bad value. Found by `run` and `eval`.
- `W-`: a warning. It doesn't change the result or the exit code.

`lask check` reports every error of the same kind it finds, but an earlier kind can hide a later one: fix the undefined names, and type errors may appear on the next run. The full list of codes is in [chapter 14 of the specification](/reference/spec#14-error-system), and the exit codes are on [Core concepts](./concepts#exit-codes).

## Images and Docker

### "is not pinned in lask.lock.json"

```text
E-IO-IMAGE-MISSING: image 'rancher/cowsay' is not pinned in lask.lock.json; run 'lask sync'
```

The file names an image the lock file doesn't have yet: you added it, or changed its tag. Run `lask sync`. `run` and `eval` never pull images themselves.

### "is not in the cache"

```text
(no location): E-MODULE-UNRESOLVED [static]: dependency 'tools' is not in the cache; run 'lask sync'
```

A dependency in `lask.json` hasn't been fetched on this machine yet, which is the case after every fresh clone. Run `lask sync`. `check`, `run` and `eval` never fetch dependencies themselves.

### "is not on the Docker daemon"

```text
E-IO-IMAGE-MISSING: image 'rancher/cowsay' (pinned as rancher/cowsay@sha256:5dab61268bc1...) is not on the Docker daemon; run 'lask sync'
```

The lock pins the image, but this machine doesn't have it: a fresh clone, a new CI runner, or images removed with `docker image prune`. `lask sync` pulls it by the pinned digest.

### "not found" during sync

```text
#ghcr.io/astral-sh/ruff:0.6.9-alpine: E-IO-IMAGE-MISSING: Error response from daemon: failed to resolve reference "ghcr.io/astral-sh/ruff:0.6.9-alpine": ghcr.io/astral-sh/ruff:0.6.9-alpine: not found
```

The registry has no image with that name or tag. The reason is on the image's progress line; the summary table at the end shows only `failed: E-IO-IMAGE-MISSING`, and `lask sync` exits with code 3. `lask check` can't catch this, because it doesn't contact the registry; it only checks that every command has an environment. Look up the right tag on the image's registry page.

In Lask 0.7.0, a failed `lask sync` still rewrites `lask.lock.json`. If you replaced a working tag with a bad one, the old tag's pin is gone too, so after you fix the tag, run `lask sync` again.

### "cannot reach the Docker daemon"

```text
E-IO-ENV-RESOLVE: cannot reach the Docker daemon: failed to connect to the docker API at unix:///var/run/docker.sock; check if the path is correct and if the daemon is running: ...
```

Docker isn't running, or the `docker` command can't reach it. Start Docker Desktop or the Docker service, and check that `docker info` works in the same shell. Tasks that run no command, and `lask check`, work without Docker.

### No such file: /bin/sh {#no-such-file-bin-sh}

```text
[#ghcr.io/astral-sh/ruff:0.13.3:1] 2| docker: Error response from daemon: ... exec: "/bin/sh": stat /bin/sh: no such file or directory
[#ghcr.io/astral-sh/ruff:0.13.3:1] exit 127
```

Lask runs every command with `/bin/sh -c` in the container, and this image has no shell. Minimal ("distroless" or `scratch`-based) images often contain only the tool's binary. Use a variant that has a shell, usually tagged `-alpine`, `-slim` or with a distribution name. For Ruff, `ghcr.io/astral-sh/ruff:0.13.3-alpine` works and `ghcr.io/astral-sh/ruff:0.13.3` doesn't.

### A platform warning on Apple silicon

```text
2| WARNING: The requested image's platform (linux/amd64) does not match the detected host platform (linux/arm64/v8) and no specific platform was requested
```

The image is built only for `linux/amd64`, so Docker runs it under emulation. It works, more slowly. To state the platform and remove the warning, add it to the image: `#rancher/cowsay(platform = "linux/amd64")`, then run `lask sync`.

## Commands

### A command fails with an empty message

```text
E-RUNTIME-COMMAND-NONZERO:
stack trace (innermost first):
  at lint (main.lask)
```

When a `$` command exits with a non-zero code, the error message is the command's stderr. Many tools, linters especially, print their findings on stdout, so the message is empty. The output is still in the command log above the error. To put it in the error, run the command with `$*` and fail with your own message, as in [Your first real task file](./first-task-file#step-5-a-readable-failure).

### "is not a declared command"

```text
main.lask:8:16-8:52: E-TYPE-COMMAND-NOENV [static]: 'pyhton' is not a declared command; declare it with `command { "<name>" } on <environment>`, import it with `import command { "<name>" } from "<module>"`, or give the environment explicitly with $[...]
```

A `$` command with no `[environment]` runs where a `command` declaration says its program comes from, and nothing declares this program. Either it's a typo, as here, or the declaration is missing. Lask never falls back to running it on the host.

### "which are not known to be one environment"

```text
main.lask:14:14-14:40: E-TYPE-COMMAND-CONFLICT [static]: this command runs both 'git' (#local) and 'go' (#golang:1.25), which are not known to be one environment; ...
```

One command line calls programs declared in different environments. A command runs as one process in one place, so split it into two commands, or write the environment explicitly with `$[...]`.

### "unexpected" on a line with a command

```text
main.lask:6:7: E-SYNTAX-UNEXPECTED-TOKEN [syntax]: unexpected =
```

A `$` command takes the rest of its line, closing brackets included. `passed($* ruff check app)` sends `ruff check app)` to the shell and leaves the call unclosed. Put the command on a line of its own, bound to a name (`r = $* ruff check app`), and use the name. For the same reason, a `//` comment after a command is passed to the shell.

## The language

### "an if statement without else"

```text
main.lask:4:3-4:43: E-SYNTAX-RETURN-POSITION [syntax]: an if statement without else is allowed only when its block ends with return
```

`if` is an expression and needs an `else`. The only exception is a guard that returns early: `if (dry_run) { return "skipped" }`. For a side effect such as a log line, write an empty `else`:

```lask
if (verbose) { log("verbose") } else {}
```

### "expected: Void, actual: Null"

You wrote `else { null }`, or a branch that ends in `null`, where the other branch returns nothing, such as a `log` call:

```lask
note(--verbose = false): Void =
  if (verbose) { log("verbose") } else { null }
```

```text
main.lask:2:42-2:46: E-TYPE-MISMATCH [static]: type mismatch
  expected: Void
  actual:   Null
```

`Void` is the type of "no value", such as what `log` returns. `null` is a value, of type `Null`. An empty block, `{}`, is the way to write a `Void` branch: `else {}`.

### A type mismatch on a parameter you didn't annotate

```lask
release(--dry_run = "no"): String = do {
  if (dry_run == 1) { return "skipped" }
  "released"
}
```

```text
main.lask:2:7-2:19: E-TYPE-MISMATCH [static]: type mismatch
  expected: String
  actual:   Number
```

A keyword parameter without a type annotation gets its type from its default. `--dry_run = "no"` makes `dry_run` a `String`, so comparing it with a number is the error, and the message points at the comparison. Change the default (`--dry_run = false`), or annotate the parameter (`--dry_run: Bool = false`) so a wrong default is the error instead.

### "environment variable is not set"

```text
E-RUNTIME-ACCESS: environment variable is not set: 'API_TOKEN'
```

`get_env("API_TOKEN")` fails when the variable is unset. As a parameter default, it is evaluated even when the task returns early, so a dry run fails too. Use `get_env_or("API_TOKEN", "")` and decide in the task what an empty value means; [Core concepts](./concepts#secrets) shows the pattern for a secret.

## The command line

### Usage errors

All of these exit with code 4, before anything runs:

```text
E-CLI-USAGE: no such function: 'hellp'
E-CLI-USAGE: keyword argument '--fix' needs a value
E-CLI-USAGE: keyword argument '--fix' 'maybe' does not fit the parameter type: expected Bool, got String
E-CLI-USAGE: unknown keyword argument: '--fixx'
E-CLI-USAGE: too many positional arguments: expected 0, got 1
```

`lask run --help` lists the tasks and `lask run <task> --help` shows a task's parameters. A `Bool` parameter takes a value: `--fix true`, or `--fix=true`. Options for `lask` itself, such as `--module`, go before the task name; everything after it belongs to the task.

### `lask` starts and nothing happens

`lask run` and `lask eval` read stdin to the end before the task starts, so a task can use what was piped in. If stdin is open and nothing writes to it, which happens when another program or a script starts `lask`, it waits. Add `</dev/null` to the command.

### `--frozen` fails in CI

```text
E-MODULE-LOCK-STALE: the images in the lock file are out of date (--frozen)
```

`main.lask` names an image that `lask.lock.json` doesn't pin. Run `lask sync` locally and commit the lock file.

## Concurrency

### W-ASYNC-UNAWAITED

```text
W-ASYNC-UNAWAITED: the async at main.lask:31:7 was never awaited; it was waited for at the end of the run and completed
```

A task started with `async` was never awaited, usually because an earlier `await` failed and the task stopped there. Lask waits for it before exiting and reports it, with its error if it failed. The warning doesn't change the exit code.

It is expected when you `await` handles in turn, as the warning in [Your first real task file](./first-task-file#step-5-a-readable-failure) suggests. `all([a, b])` stops at the first failure without this warning, but in Lask 0.7.0 it leaves the other steps' containers running in the background.

## Getting help

Ask in [GitHub Discussions](https://github.com/lask-task-runner/lask/discussions), or open an [issue](https://github.com/lask-task-runner/lask/issues) if Lask did something its documentation says it shouldn't.
