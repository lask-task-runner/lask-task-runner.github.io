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

<video controls playsinline preload="metadata" width="1280" height="720" poster="/media/lask-tour.jpg" aria-label="Lask in under a minute: tasks that run anywhere and touch anything become functions, get types that turn the wrong input away, go into pinned containers that are the same on every machine, and get bounds that let the project's files and a registry through and stop an attacker; then many functions combine into modules, with a pinned module from elsewhere, reaching the same places the tasks first touched, where the attacker, a secret and the Docker socket are refused, and gather into the Lask logo: Functions. Types. Containers. Bounds.">
  <source src="/media/lask-tour.mp4" type="video/mp4">
</video>

Lask in under a minute: from tasks that run anywhere and touch anything, to typed functions in pinned containers, with bounds on what they reach, combined into modules.

</div>

<div class="home-sample">

A `main.lask` that lints and tests a Python project, with neither Python nor the linter installed:

```lask
// Each program comes from a pinned image.
command { "python" } on #python:3.13.7-alpine3.22
command { "ruff" } on #ghcr.io/astral-sh/ruff:0.13.3-alpine

// What a check may reach: no secret, and nothing on the host.
access Sandboxed = { secrets: false, runs: ["container"] }

// Lint and test at the same time.
ci() within Sandboxed = do {
  lint = async $ ruff check app
  test = async $ python -m unittest discover -s app
  all([lint, test])
}
```

```bash
$ lask sync      # pull both images and pin their digests in lask.lock.json
$ lask run ci    # run both commands, each in its own container
```

Misspell `python` as `pyhton` on line 11, and `lask check` reports it before anything runs:

```text
$ lask check
main.lask:11:16-11:52: E-TYPE-COMMAND-NOENV [static]: 'pyhton' is not a declared command; ...
```

Run `ruff` on the host instead, as `$[#local] ruff check app`, and `within Sandboxed` stops that too:

```text
$ lask check
main.lask:10:16-10:40: E-TYPE-WITHIN-EXCEEDED [static]: #local reaches the whole host, which within Sandboxed of 'ci' does not allow (runs)
```

[Your first real task file](/guide/first-task-file) builds this file step by step, and [Core concepts](/guide/concepts#what-a-container-can-reach) covers `access` and `within`.

</div>
