# lask-task-runner.github.io

The documentation site for [Lask](https://github.com/lask-task-runner/lask), published at <https://lask-task-runner.github.io/>. Built with [VitePress](https://vitepress.dev/).

## Where the content lives

Most pages are generated from the lask repository at build time by [scripts/sync.mjs](scripts/sync.mjs), and are not committed here:

| Page | Source in lask |
| --- | --- |
| Guide → Why Lask, Installation | `README.md` (its sections) |
| Language guide | `example/02-language/` (the README and each topic's files) |
| Examples | `example/01-projects/*/README.md` |
| Reference | `doc/quick-reference.md`, `doc/spec.md`, `doc/compatibility.md` |

To change one of those, edit it in the lask repository; every generated page's "Edit this page" link goes there. Written here by hand: the home page ([docs/index.md](docs/index.md)), [Getting started](docs/guide/getting-started.md), the navigation ([docs/.vitepress/config.mts](docs/.vitepress/config.mts)) and the `lask` syntax highlighting ([docs/.vitepress/lask.tmLanguage.json](docs/.vitepress/lask.tmLanguage.json)).

## Develop

With the lask repository checked out next to this one:

```bash
npm install
npm run dev                           # sync from ../lask, then serve with hot reload
LASK_SRC=/path/to/lask npm run dev    # another checkout
npm run build                         # what CI runs
```

## Deploy

[.github/workflows/deploy.yml](.github/workflows/deploy.yml) builds and deploys to GitHub Pages on every push to `main`, on a `lask-docs-updated` repository dispatch from the lask repository, and once a day.
