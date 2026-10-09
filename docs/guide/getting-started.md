# Getting started

This page takes you from installing Lask to running a first task in a container, in about five minutes. It shows what each command prints, and why.

## What you need

- **Lask.** On macOS with Homebrew:

  ```bash
  brew tap lask-task-runner/tap
  brew trust lask-task-runner/tap
  brew install lask
  ```

  Linux, Windows and building from source are on the [Installation](./installation) page, with shell completion and the VS Code extension.

- **Docker**, with the daemon running and the `docker` command on your `PATH`: Docker Desktop on macOS and Windows, Docker Engine on Linux, or another runtime that provides the `docker` command, such as Colima, OrbStack or Rancher Desktop. If `docker info` works, Lask can use it.

Check the install with `lask version`:

```text
$ lask version
lask 0.8.0
```

## A first project

A directory with a `main.lask` file in it is a Lask project. Make an empty directory and create `main.lask`:

```lask
// cowsay comes from this image. `lask sync` pins it in lask.lock.json.
command { "cowsay" } on #rancher/cowsay

// A task that runs no command is an ordinary function.
hello(--name = "World") = "Hello, #{name}!"

// Calls hello, then runs cowsay in its container.
cowsay_hello(name: String) = do {
  message = hello(name = name)
  $ cowsay "#{message}"
}
```

The file has three declarations:

- `command { "cowsay" } on #rancher/cowsay` says that the program `cowsay` comes from the Docker image `rancher/cowsay`. `#` followed by an image name is how Lask writes an image.
- `hello` is a task with one keyword parameter, `--name`, which defaults to `"World"`.
- `cowsay_hello` takes one positional parameter, calls `hello`, then runs a command. `$ cowsay ...` is a shell command, and Lask runs it in the image declared for `cowsay`.

The `--` in `--name` marks a keyword parameter in the declaration. A caller passes it by name, as `hello(name = ...)` does in `cowsay_hello`.

Any top-level function is a task: you can run it from the command line.

## Check it

```text
$ lask check
the module is valid
```

`lask check` reads the file and resolves every name, argument and type, and finds the image each command runs in. It runs nothing and needs no Docker. If you misspell a name or pass a number where a string goes, this is where you find out.

## Run a task with no command

```text
$ lask eval hello --name Lask
"Hello, Lask!"
```

`hello` runs no command, so it needs no image and no Docker. `eval` prints the task's return value on stdout, as JSON, which is why the string is in quotes.

## Pin the image

A task that runs a command needs its image pinned first:

```text
$ lask run cowsay-hello Lask
E-IO-IMAGE-MISSING: image 'rancher/cowsay' is not pinned in lask.lock.json; run 'lask sync'
stack trace (innermost first):
  at cowsay_hello (main.lask)
$ echo $?
3
```

`lask sync` pulls every image the file names and records each image's digest in `lask.lock.json`:

```text
$ lask sync
...
Images
ENVIRONMENT      KIND      PINNED               REQUIRED BY                STATUS  TIME
#rancher/cowsay  registry  sha256:5dab61268bc1  main.lask: command cowsay  pulled  2.4s

0 modules, 1 image (1 pulled) in 2.4s — lask.lock.json updated
```

Commit `lask.lock.json`. Every machine that runs this project, your laptop and CI included, then uses the same image, even if the `rancher/cowsay` tag moves later. `run` and `eval` never download an image: a missing one is an error that names `lask sync`, as above.

## Run it

```text
$ lask run cowsay-hello Lask
2026-10-08T16:02:11.737Z [#rancher/cowsay:1] $ cowsay "Hello, Lask!"
2026-10-08T16:02:12.025Z [#rancher/cowsay:1] 1|  ______________
2026-10-08T16:02:12.025Z [#rancher/cowsay:1] 1| < Hello, Lask! >
2026-10-08T16:02:12.025Z [#rancher/cowsay:1] 1|  --------------
2026-10-08T16:02:12.026Z [#rancher/cowsay:1] 1|         \   ^__^
2026-10-08T16:02:12.027Z [#rancher/cowsay:1] 1|          \  (oo)\_______
2026-10-08T16:02:12.028Z [#rancher/cowsay:1] 1|             (__)\       )\/\
2026-10-08T16:02:12.028Z [#rancher/cowsay:1] 1|                 ||----w |
2026-10-08T16:02:12.029Z [#rancher/cowsay:1] 1|                 ||     ||
2026-10-08T16:02:12.328Z [#rancher/cowsay:1] exit 0
```

What you see is the **command log**, and Lask writes all of it to stderr:

- `[#rancher/cowsay:1]` is the image the command ran in, and the command's number within this run. When several commands run at once, the number tells their lines apart.
- The `$` line is the command, as the shell received it.
- `1|` lines are the command's stdout, and `2|` lines its stderr.
- `exit 0` is its exit code.

`lask run` writes nothing to stdout: it runs the task for its effects and does not print the return value. `lask eval` runs the task the same way and also prints the return value on stdout. Here that is the cow, so the command below prints the same cow as one JSON string:

```text
$ lask eval cowsay-hello Lask 2>/dev/null
" ______________ \n< Hello, Lask! >\n -------------- \n        \\   ^__^\n ..."
```

::: tip On Apple silicon
`rancher/cowsay` is built for `linux/amd64` only. On an arm64 Mac, Docker runs it under emulation and the log has one more line:

```text
[#rancher/cowsay:1] 2| WARNING: The requested image's platform (linux/amd64) does not match the detected host platform (linux/arm64/v8) and no specific platform was requested
```

It is harmless. To ask for that platform explicitly and remove the warning, write the image as `#rancher/cowsay(platform = "linux/amd64")` and run `lask sync` again.
:::

## Names on the command line

A task's signature is its command line. `cowsay_hello(name: String)` is `lask run cowsay-hello <name>`, and `hello(--name = "World")` is `lask eval hello --name <value>`. Lask replaces `-` with `_` in task and parameter names, so `cowsay-hello` and `cowsay_hello` both work.

`--help` lists the tasks, with the first line of the comment above each:

```text
$ lask run --help
Usage: lask run [--module PATH] [--format text|json] [--trace-id ID]
...
Functions in main.lask:
  hello         A task that runs no command is an ordinary function.
  cowsay_hello  Calls hello, then runs cowsay in its container.
```

After a task's name, `--help` describes that task: its parameters, its return type and the images it needs.

```text
$ lask run cowsay-hello --help
cowsay_hello - Calls hello, then runs cowsay in its container.

Usage:
  lask run cowsay_hello <name>

Parameters:
  name : String

Returns:
  String

Environments:
  docker  rancher/cowsay

Defined at main.lask:8
```

The return type was inferred: the file never says `String`. A `$` command's value is its stdout, so `cowsay_hello` returns a `String`.

## Next

- [Your first real task file](./first-task-file) builds a lint and test setup for a small project, step by step: concurrent steps, an option, and a failure with a readable error.
- [Core concepts](./concepts) explains the pieces you have just used: tasks, environments, command declarations, `check`, `sync` and the lock file.
- [Why Lask](./why-lask) compares Lask with make, Taskfile and Dagger.
