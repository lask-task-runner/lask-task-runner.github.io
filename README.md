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
lask run preview                       # every version, as deployed, http://localhost:4173
lask run --help                        # every task
```

`dev` builds one version at the root, from the lask checkout as it is, whatever branch it is on. `build` and `preview` build every version in [versions.json](versions.json) into `site-dist/`, each from its own refs (see [Versions](#versions)), so the checkout needs the lask tags and its development branch fetched.

The pages from the lask checkout are generated when `dev` starts; after changing it, restart `dev` or run `lask run pages` beside it. `node_modules` lives in a Docker volume (`lask-docs-node-modules`), so `lask run install` after `package.json` changes, and `docker volume rm lask-docs-node-modules` to start over.

## Deploy

[.github/workflows/deploy.yml](.github/workflows/deploy.yml) builds and deploys to GitHub Pages on every push to `main`, on a `lask-docs-updated` repository dispatch from the lask repository, and once a day.

## Versions

Each version of Lask has its own copy of the site, at `/<version>/`. [versions.json](versions.json) lists them, newest first:

```json
{ "version": "0.8.0", "site": "HEAD", "lask": "dev" }
```

- `site`: the ref of this repository the hand-written pages come from. `HEAD` is the checkout being deployed, so the newest version follows `main`.
- `lask`: the lask branch the generated pages come from until lask has the tag `v<version>`. Once the tag exists, the build uses it.

The tag is also what makes a version released. Until lask is tagged, the version switcher shows "(unreleased)", and every page has a banner saying that the latest release may not have what the page describes. The first build after the tag, which the daily schedule guarantees, removes both. A version older than the latest release gets a banner pointing to the latest instead.

`/` redirects to the newest released version, or to the newest version while none is released. A path without a version, such as a link from before versions existed, redirects to the same page in that version. A page a version does not have redirects to that version's home.

### When a version is released and the next one starts

1. On `main`, update what names the release: the `lask version` output in Getting started, and the version and `sha256` in the workflow on Running in CI.
2. Freeze that state for the released version: `git tag docs-0.8.0 && git push origin docs-0.8.0`.
3. In `versions.json`, point the released version at that tag, and add the next version at the top:

   ```json
   {
     "versions": [
       { "version": "0.9.0", "site": "HEAD", "lask": "dev" },
       { "version": "0.8.0", "site": "docs-0.8.0", "lask": "dev" }
     ]
   }
   ```

From then on, `main` describes the next version, and a fix to the released version's pages goes on a branch from its tag.
