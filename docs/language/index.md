# Language guide

The language guide covers all of Lask, one topic per page. Each topic is a small, complete project: a `main.lask` whose comments explain the code next to them, and a few commands to run while you read.

If you haven't yet, start with [Getting started](/guide/getting-started), [Your first real task file](/guide/first-task-file) and [Core concepts](/guide/concepts). This guide assumes you know what a task, an environment and `lask sync` are.

## How to try a topic

Every topic lives in the lask repository, under `example/02-language/`. Clone it once:

```bash
git clone https://github.com/lask-task-runner/lask.git
cd lask/example/02-language/02-functions
lask check
lask eval greet alice --prefix hi
```

Most topics are a single file. For those, you can also paste the source shown on the page into a `main.lask` in an empty directory. The topic page says when it has more than one file.

Topics marked "Lask only" in the table run no commands, so they need no Docker. For the others, run `lask sync` in the topic's directory before the first `run` or `eval`, to pull the images it uses.

In the commands on each page, `eval` prints a task's return value, so you can see what it computed. `run` prints only the command log, on stderr.

## Topics

The table is in reading order. The first three topics are the language itself; Environments and Commands are what make it a task runner; the rest build on those.

<!--@include: ./_topics.md-->

The [Quick reference](/reference/quick-reference) covers the same ground on one page, and the [specification](/reference/spec) has the exact rules.
