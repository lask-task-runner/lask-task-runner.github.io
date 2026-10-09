# lask-task-runner.github.io

The documentation site for [Lask](https://github.com/lask-task-runner/lask), published at <https://lask-task-runner.github.io/>. Built with [VitePress](https://vitepress.dev/).

## Where the content lives

Most pages are generated from the lask repository at build time by [scripts/sync.mjs](scripts/sync.mjs), and are not committed here:

| Page | Source in lask |
| --- | --- |
| Guide → Installation | `README.md` (its sections) |
| Language guide topics, and the overview's topic table | `example/02-language/` (the README and each topic's files) |
| Examples | `example/01-projects/*/README.md` |
| Reference | `doc/quick-reference.md`, `doc/spec.md`, `doc/compatibility.md` |

To change one of those, edit it in the lask repository; every generated page's "Edit this page" link goes there. Written here by hand: the home page ([docs/index.md](docs/index.md)), the Guide pages other than Installation ([docs/guide/](docs/guide)), the language guide's overview ([docs/language/index.md](docs/language/index.md)), the navigation ([docs/.vitepress/config.mts](docs/.vitepress/config.mts)) and the `lask` syntax highlighting ([docs/.vitepress/lask.tmLanguage.json](docs/.vitepress/lask.tmLanguage.json)).

## Develop

You need Lask and Docker, and the lask repository checked out next to this one. Node and VitePress run in a container ([main.lask](main.lask)):

```bash
lask sync                              # one-time: pulls the Node image
lask run dev                           # http://localhost:5173, reloads as you edit
lask run dev --lask-src ~/src/lask     # another checkout (or set LASK_SRC)
lask run preview                       # the production build, http://localhost:4173
lask run --help                        # every task
```

The pages from the lask checkout are generated when `dev` starts; after changing it, restart `dev` or run `lask run pages` beside it. `node_modules` lives in a Docker volume (`lask-docs-node-modules`), so `lask run install` after `package.json` changes, and `docker volume rm lask-docs-node-modules` to start over.

## Deploy

[.github/workflows/deploy.yml](.github/workflows/deploy.yml) builds and deploys to GitHub Pages on every push to `main`, on a `lask-docs-updated` repository dispatch from the lask repository, and once a day.
