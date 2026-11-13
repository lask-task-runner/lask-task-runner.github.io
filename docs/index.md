---
layout: home

hero:
  name: Lask
  text: Tasks in pinned containers, checked before they run
  tagline: Tasks are typed functions in one file. Their commands run in container images pinned by digest, the same on your laptop and in CI, and never on the host unless the file says so.
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: Why Lask
      link: /guide/why-lask
    - theme: alt
      text: GitHub
      link: https://github.com/lask-task-runner/lask

features:
  - title: One small file
    details: A project is a <code>main.lask</code> in a small language with familiar syntax. Lask and a container engine are all it needs.
    link: /guide/getting-started
  - title: Checked before it runs
    details: <code>lask check</code> verifies the whole file, from names and types to where each command runs, before anything runs. Your editor shows the same errors as you type.
    link: /guide/concepts#check-sync-and-the-lock-file
  - title: The same everywhere
    details: Every command runs in the environment the file names, a container image pinned by digest unless it says otherwise, on a laptop and in CI alike.
    link: /language/environments
  - title: Tasks are functions
    details: Tasks take typed arguments, call each other, and handle errors and concurrency in the language. Each one is also a command with its own <code>--help</code>.
    link: /language/functions
  - title: Reusable
    details: Import tasks, and the environments they run in, from other projects. The lock file pins each one.
    link: /language/dependencies
  - title: Safe by default
    details: Nothing runs on the host unless the file says so, secrets stay out of the log, and what a task may reach can be declared and checked.
    link: /guide/concepts#what-a-container-can-reach
---


<div class="home-demo">

<video controls playsinline preload="metadata" width="1280" height="720" poster="/media/lask-tour.jpg" aria-label="Lask in one minute: a command in the REPL, the same command kept as a task, a run in containers, the same run on a laptop and in CI, and secrets kept in Vault">
  <source src="/media/lask-tour.mp4" type="video/mp4">
</video>

Lask in one minute, in five steps: try a command in the REPL, keep it as a task, run it, run the same thing on a laptop and in CI, and keep secrets in Vault.

</div>

<div class="home-sample">

A `main.lask` that lints and tests a Python project, with neither Python nor the linter installed:

```lask
// Each program comes from a pinned image.
command { "python" } on #python:3.13.7-alpine3.22
command { "ruff" } on #ghcr.io/astral-sh/ruff:0.13.3-alpine

// Lint and test at the same time.
ci() = do {
  lint = async $ ruff check app
  test = async $ python -m unittest discover -s app
  all([lint, test])
}
```

```bash
$ lask sync      # pull both images and pin their digests in lask.lock.json
$ lask run ci    # run both commands, each in its own container
```

Misspell `python` as `pyhton` on line 8, and `lask check` reports it before anything runs:

```text
$ lask check
main.lask:8:16-8:52: E-TYPE-COMMAND-NOENV [static]: 'pyhton' is not a declared command; ...
```

[Your first real task file](/guide/first-task-file) builds this file step by step.

</div>
