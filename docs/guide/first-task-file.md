# Your first real task file

This tutorial builds the `main.lask` for a small Python project, one step at a time. By the end, it will:

- run the tests and a linter, each in its own pinned image,
- run both at the same time,
- take a typed option from the command line,
- fail with an error that says what went wrong.

You need Lask and Docker, as in [Getting started](./getting-started). You don't need Python or the linter installed: both come from images.

## The project

Make a directory with two Python files in `app/`:

::: code-group

```python [app/calc.py]
def add(a, b):
    return a + b
```

```python [app/test_calc.py]
import unittest

from calc import add


class AddTest(unittest.TestCase):
    def test_add(self):
        self.assertEqual(add(2, 3), 5)
```

:::

## Step 1: a test task

Create `main.lask` next to `app/`:

```lask
python = #python:3.13.7-alpine3.22

command { "python" } on python

// Run the unit tests.
test() = $ python -m unittest discover -s app
```

`python = #python:3.13.7-alpine3.22` binds a name to an image, so the image is written once. The `command` declaration says that the program `python` comes from that image. `test` runs one command, and because the program it calls is `python`, Lask runs it in the Python image.

Check the file, pin the image, and run the task:

```text
$ lask check
the module is valid
$ lask sync
...
#python:3.13.7-alpine3.22  registry  sha256:9ba6d8cbebf0  main.lask: python  pulled  6.3s
$ lask run test
[#python:3.13.7-alpine3.22:1] $ python -m unittest discover -s app
[#python:3.13.7-alpine3.22:1] 2| .
[#python:3.13.7-alpine3.22:1] 2| ----------------------------------------------------------------------
[#python:3.13.7-alpine3.22:1] 2| Ran 1 test in 0.000s
[#python:3.13.7-alpine3.22:1] 2|
[#python:3.13.7-alpine3.22:1] 2| OK
[#python:3.13.7-alpine3.22:1] exit 0
```

(Lask starts each log line with a timestamp; this page leaves them out. There is no option to turn them off, but `--format json` gives one JSON object per line if you want to process the log.)

The test found `app/` because of how Lask starts a container:

- Your project directory, the one that holds `main.lask`, is mounted at `/work` in the container, and `/work` is the working directory. Relative paths such as `app` mean the same thing in the container as in your project.
- The command is run by `/bin/sh -c`, so pipes, `&&` and quotes work as they do in a shell script.
- The mount is read-write. Files a command creates under `/work` appear in your project: after this run there is an `app/__pycache__` directory.

[Core concepts](./concepts#how-a-command-runs) sums these up.

## Step 2: a lint task

Add [Ruff](https://docs.astral.sh/ruff/) as a linter. Its image gets its own binding and declaration:

```lask
python = #python:3.13.7-alpine3.22
ruff = #ghcr.io/astral-sh/ruff:0.13.3-alpine

command { "python" } on python
command { "ruff" } on ruff

// Run the unit tests.
test() = $ python -m unittest discover -s app

// Check the code with ruff.
lint() = $ ruff check app
```

Run `lask sync` again, since the file names a new image, then the task:

```text
$ lask sync
...
$ lask run lint
[#ghcr.io/astral-sh/ruff:0.13.3-alpine:1] $ ruff check app
[#ghcr.io/astral-sh/ruff:0.13.3-alpine:1] 1| All checks passed!
[#ghcr.io/astral-sh/ruff:0.13.3-alpine:1] exit 0
```

::: warning The image needs a shell
The tag ends in `-alpine` for a reason. Because Lask runs every command with `/bin/sh -c`, the image must contain `/bin/sh`. Ruff's plain `ghcr.io/astral-sh/ruff:0.13.3` image holds only the `ruff` binary, and a command in it fails with exit code 127 and `exec: "/bin/sh": stat /bin/sh: no such file or directory`. Many tools publish an Alpine or Debian variant for this reason; see [Troubleshooting](./troubleshooting#no-such-file-bin-sh).
:::

## Step 3: run both at once

Add a `ci` task at the end of the file:

```lask
// Lint and test at the same time.
ci() = do {
  l = async lint()
  t = async test()
  all([l, t])
}
```

`do { ... }` runs its lines in order, and its value is the value of the last line. `async lint()` starts `lint` and gives back a handle at once, without waiting. `all([l, t])` waits for both handles and returns their results as an array.

```text
$ lask run ci
[#ghcr.io/astral-sh/ruff:0.13.3-alpine:2] $ ruff check app
[#python:3.13.7-alpine3.22:1] $ python -m unittest discover -s app
[#ghcr.io/astral-sh/ruff:0.13.3-alpine:2] 1| All checks passed!
[#python:3.13.7-alpine3.22:1] 2| .
[#python:3.13.7-alpine3.22:1] 2| ----------------------------------------------------------------------
[#python:3.13.7-alpine3.22:1] 2| Ran 1 test in 0.000s
[#python:3.13.7-alpine3.22:1] 2|
[#python:3.13.7-alpine3.22:1] 2| OK
[#ghcr.io/astral-sh/ruff:0.13.3-alpine:2] exit 0
[#python:3.13.7-alpine3.22:1] exit 0
```

The lines of the two commands are interleaved, and the number after the image name tells them apart. The numbers, and the order of the lines, can differ from run to run. `lask eval ci` would print the array of results: `["All checks passed!\n",""]`. The test's result is empty because `unittest` writes its report to stderr, and the value of `$` is the command's stdout.

## Step 4: a failing step

Break the lint on purpose. Add an unused import at the top of `app/calc.py`:

```python
import os
```

```text
$ lask run ci
[#ghcr.io/astral-sh/ruff:0.13.3-alpine:2] $ ruff check app
[#python:3.13.7-alpine3.22:1] $ python -m unittest discover -s app
[#ghcr.io/astral-sh/ruff:0.13.3-alpine:2] 1| F401 [*] `os` imported but unused
[#ghcr.io/astral-sh/ruff:0.13.3-alpine:2] 1|  --> app/calc.py:1:8
...
[#ghcr.io/astral-sh/ruff:0.13.3-alpine:2] 1| Found 1 error.
...
[#ghcr.io/astral-sh/ruff:0.13.3-alpine:2] exit 1
[#python:3.13.7-alpine3.22:1] killed
E-RUNTIME-COMMAND-NONZERO: the command exited with code 1 and wrote nothing to stderr; its output is in the command log
stack trace (innermost first):
  at lint (main.lask)
  at <lambda@15:7> (main.lask)
  at ci (main.lask)
$ echo $?
1
```

The run failed, and `lask` exited with Ruff's exit code, 1. The test was still running when the lint failed, so Lask stopped it: that is the `killed` line.

When a `$` command exits with a non-zero code, the error's message is the command's stderr. Ruff reports its findings on stdout, so the error only says where to look: the command log above it. In a long CI log, the reason for a failure is easiest to find when it is in the error itself.

## Step 5: a readable failure

`$*` runs a command without failing on its exit code. It returns a record with the `code`, `stdout` and `stderr`, and you decide what counts as a failure. Replace the whole file with this:

```lask
python = #python:3.13.7-alpine3.22
ruff = #ghcr.io/astral-sh/ruff:0.13.3-alpine

command { "python" } on python
command { "ruff" } on ruff

// Return a step's output, or fail with it so the reason is in the error.
internal passed(step: String, r: CommandResult): String =
  if (r.code == 0) { r.stdout } else {
    fail(error(r.code, "#{step} failed:\n#{r.stdout}#{r.stderr}"))
  }

// Run the unit tests.
test(): String = do {
  r = $* python -m unittest discover -s app
  passed("test", r)
}

// Check the code with ruff.
//
// @param fix  Let ruff fix what it can, in place.
lint(--fix = false): String = do {
  fix_flag = if (fix) { "--fix" } else { "" }
  r = $* ruff check #{fix_flag} app
  passed("lint", r)
}

// Lint and test at the same time.
ci() = do {
  l = async lint()
  t = async test()
  all([l, t])
}
```

What changed:

- `passed` is a helper. `internal` keeps it out of `lask run --help` and out of other modules' reach. `CommandResult` is the type of what `$*` returns.
- `fail(error(code, message))` raises an error with your own message. The code becomes the exit code of `lask`.
- `if` is an expression, so it needs an `else`, and both branches give a value. (There is one exception, shown [below](#an-if-without-else).) `#{...}` puts a value into a string.
- `lint` takes an option, `--fix`, which is described in the next step.

Run it with the unused import still in place:

```text
$ lask run ci
[#ghcr.io/astral-sh/ruff:0.13.3-alpine:1] $ ruff check  app
[#python:3.13.7-alpine3.22:2] $ python -m unittest discover -s app
...
[#ghcr.io/astral-sh/ruff:0.13.3-alpine:1] exit 1
[#python:3.13.7-alpine3.22:2] killed
E-RUNTIME: lint failed:
F401 [*] `os` imported but unused
 --> app/calc.py:1:8
  |
1 | import os
  |        ^^
  |
help: Remove unused import: `os`

Found 1 error.
[*] 1 fixable with the `--fix` option.

stack trace (innermost first):
  at passed (main.lask)
  at lint (main.lask)
  at <lambda@30:7> (main.lask)
  at ci (main.lask)
```

(The double space in `ruff check  app` is where the empty `fix_flag` went.)

`all` fails as soon as one of its handles fails, and stops the others: their commands and containers are stopped, and the log shows them as `killed`. If you want every step to finish and show its log even when one fails, `await` each handle in turn instead: `[await l, await t]`. Lask then waits for both. The result is still the first failure, and Lask reports the handle it never got to as `W-ASYNC-UNAWAITED`, which is expected here.

## Step 6: an option from the command line

`lint(--fix = false)` declares a keyword parameter. Its type, `Bool`, is inferred from the default. On the command line, it takes a value:

```text
$ lask run lint --fix true
[#ghcr.io/astral-sh/ruff:0.13.3-alpine:1] $ ruff check --fix app
[#ghcr.io/astral-sh/ruff:0.13.3-alpine:1] 1| Found 1 error (1 fixed, 0 remaining).
[#ghcr.io/astral-sh/ruff:0.13.3-alpine:1] exit 0
```

A `Bool` option is not a bare flag. `--fix` without a value is a usage error, and `--fix=true` works as well as `--fix true`:

```text
$ lask run lint --fix
E-CLI-USAGE: keyword argument '--fix' needs a value
```

The comment above `lint` is its help. The first line is the summary, and `@param` describes a parameter:

```text
$ lask run lint --help
lint - Check the code with ruff.

Usage:
  lask run lint [--fix <Bool>]

Parameters:
  --fix : Bool = false
      Let ruff fix what it can, in place.

Returns:
  String

Environments:
  docker  ghcr.io/astral-sh/ruff:0.13.3-alpine

Defined at main.lask:22
```

With the import fixed, `lask run ci` passes again and exits with code 0.

## Two mistakes worth knowing

### An `if` without `else`

Say you want a log line only when `--fix` is set, and you write:

```lask
command { "ruff" } on #ghcr.io/astral-sh/ruff:0.13.3-alpine

lint(--fix = false): String = do {
  if (fix) { log("fixing what ruff can") }
  $ ruff check app
}
```

```text
$ lask check
main.lask:4:3-4:43: E-SYNTAX-RETURN-POSITION [syntax]: an if statement without else is allowed only when its block ends with return; for a side effect under a condition, add an empty else: if (c) { ... } else {}
```

An `if` with no `else` is allowed in one case only: as a guard that ends in `return`, such as `if (dry_run) { return "skipped" }`. For a side effect, give it an empty `else`:

```lask
  if (fix) { log("fixing what ruff can") } else {}
```

### A command inside parentheses

A `$` command runs to the end of its line. Everything after the `$` on that line is part of the shell command, closing parentheses included. This looks reasonable but does not parse:

```lask
command { "ruff" } on #ghcr.io/astral-sh/ruff:0.13.3-alpine

internal passed(r: CommandResult): String = r.stdout

lint(): String = do {
  out = passed($* ruff check app)
  out
}
```

```text
$ lask check
main.lask:6:7: E-SYNTAX-UNEXPECTED-TOKEN [syntax]: unexpected =
expecting !=, &&, (, *, +, -, ., /, ;, <, <<, <=, <|, ==, >, >=, >>, [, newline, |>, ||, or }
  note: the command on line 6 runs to the end of its line, so its closing ')' was read as part of the command; a command cannot sit inside brackets: bind it to a name on its own line first
```

The shell command became `ruff check app)`, and the call to `passed` was never closed. The parser notices only later, at the `=`, but the note names the command. Bind the command's result to a name on its own line first, as Step 5 does with `r = $* ...`.

## What you have

The file from Step 5 is a complete CI definition for this project. It runs the same pinned images on any machine with Lask and Docker. [Running in CI](./ci) shows how to call it from a CI job.

You may want a `.gitignore` for what the tools leave in your project: `app/__pycache__/` from Python and `.ruff_cache/` from Ruff.

From here:

- [Core concepts](./concepts) names the ideas this page used.
- [Concurrency](/language/concurrency), [Errors](/language/errors) and [Commands](/language/commands) in the language guide cover `async`, `try`/`catch` and the forms of `$` in full.
- [Troubleshooting](./troubleshooting) lists the errors you are most likely to meet next.
