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
    details: <code>deploy(dry_run = true)</code> in Lask is the same call as <code>lask run deploy --dry-run true</code> from the shell, and the comment above the task is its <code>--help</code>.
    link: /language/docs-and-cli
  - title: Reuse across projects
    details: Import tasks, and the images they run in, from other repositories. The lock file pins each one by content hash.
    link: /language/dependencies
---

<script setup>
import { onMounted } from "vue";

// A muted autoplay video stays paused after Vue hydrates the page, though
// the same markup plays in a plain page. Start it once the page is mounted;
// a browser that refuses still shows the poster and the controls.
onMounted(() => {
  for (const v of document.querySelectorAll(".home-demo video[autoplay]")) {
    v.muted = true;
    v.play().catch(() => {});
  }
});
</script>


<div class="home-demo">

<video autoplay muted loop playsinline preload="metadata" width="960" height="540" poster="/media/lask-tour-short.jpg" aria-label="Lask in 20 seconds: a typo caught in the editor, then a release task whose tests run side by side and whose deploy steps each run in their own container, the same on a laptop and in CI">
  <source src="/media/lask-tour-short.mp4" type="video/mp4">
</video>

A 20-second clip: a typo caught in the editor, then a `release` task whose tests run side by side and whose deploy steps each run in their own container, the same on a laptop and in CI. Its tasks are a shortened form of the [Web app on AWS](/examples/webapp-on-aws) example.

<h2 class="home-demo-title">Lask in one minute</h2>

<video controls playsinline preload="none" width="1280" height="720" poster="/media/lask-tour.jpg" aria-label="Lask in one minute: a command in the REPL, the same command kept as a task, a run in containers, the same run on a laptop and in CI, and secrets kept in Vault">
  <source src="/media/lask-tour.mp4" type="video/mp4">
</video>

The full tour, in five steps: try a command in the REPL, keep it as a task, run it, run the same thing on a laptop and in CI, and keep secrets in Vault.

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
