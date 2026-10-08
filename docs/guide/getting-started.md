# Getting started

Lask is a task runner with a small language behind it. Tasks are typed functions in a `main.lask` file, each command runs in a Docker image the file names, and `lask check` verifies the whole file before anything runs.

You need two things: **Lask** and **Docker**. Nothing a task uses is installed on your machine.

## Install

On macOS with Homebrew:

```bash
brew tap lask-task-runner/tap
brew trust lask-task-runner/tap
brew install lask
```

Linux, Windows and building from source are covered in [Installation](./installation), along with shell completion and the VS Code extension.

## Your first project

One `.lask` file in a directory is already a project. Create `main.lask`:

```lask
// Environments are values: this task runs inside a Docker image, so
// nothing has to be installed locally.
cowsay(message: String): String = $[#rancher/cowsay] cowsay "#{message}"

// Types are inferred, so annotations are optional — and a task that
// runs no command at all is just a pure function.
hello(--name = "World") = "Hello, #{name}!"

// Tasks compose: call another task exactly like an ordinary function.
cowsay_hello(name: String) = do {
  message = hello(name = name)
  cowsay(message)
}
```

Then, from the same directory:

```bash
lask check                     # names, arguments and types; nothing runs
lask eval hello --name Lask    # a pure task: no Docker needed
lask sync                      # pull the image and pin its digest in lask.lock.json
lask run cowsay-hello Lask     # run it in its container
```

- `lask check` is the step to run first, and the one CI should run on every change.
- `lask sync` is the only command that touches the network. It writes `lask.lock.json`, which you commit, so every machine runs the same image.
- A task's signature is its command line: `hello(--name = "World")` is `lask eval hello --name ...`, and `cowsay_hello` is `cowsay-hello`.
- `lask run` prints nothing by design; `lask eval` prints the return value.

## The CLI at a glance

<!--@include: ./_usage.md-->

## Where to go next

- [Language guide](/language/): the whole language, one runnable topic at a time.
- [Examples](/examples/): whole projects, from a local LLM to a signed Go release.
- [Quick reference](/reference/quick-reference): the language and CLI on one page.
- [Why Lask](./why-lask): how it compares to make, Taskfile and Dagger.
