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
  - title: Checked before it runs
    details: <code>lask check</code> resolves every name, argument and type, and the environment of every command, without running anything. Your editor shows the same errors as you type.
    link: /guide/concepts#check-sync-and-the-lock-file
  - title: Pinned images
    details: Declare once that <code>go</code> comes from <code>#golang:1.25</code>. <code>lask sync</code> records the image's digest, and every machine runs that image.
    link: /language/environments
  - title: No implicit host
    details: A command whose program has no declared environment is a check error. Commands run on the host only where you write <code>#local</code>.
    link: /guide/concepts#environments
  - title: Tasks are functions
    details: Tasks have typed parameters, defaults and return values. <code>if</code>, <code>case</code>, <code>try</code>/<code>catch</code> and <code>async</code> are part of the language, so there is no shell glue to get wrong.
    link: /language/functions
  - title: A command line for every task
    details: <code>deploy(--dry_run = false)</code> is <code>lask run deploy --dry-run true</code>, and the comment above it is its <code>--help</code>.
    link: /language/docs-and-cli
  - title: Reuse across projects
    details: Import tasks, and the images they run in, from other repositories. The lock file pins each one by content hash.
    link: /language/dependencies
---

<div class="home-demo">

<img loading="lazy" decoding="async" width="960" height="540" alt="Lask in 20 seconds: write tasks in main.lask, run them with lask run, and get the same run on a laptop and in CI on the same pinned images" src="/lask/doc/assets/lask-pv-short.gif">

A 20-second animation: a typo caught in the editor, then a `release` task whose tests run side by side and whose deploy steps each run in their own container, the same on a laptop and in CI. Its tasks are a shortened form of the [Web app on AWS](/examples/webapp-on-aws) example.

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
