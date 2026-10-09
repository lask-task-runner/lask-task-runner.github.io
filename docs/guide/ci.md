# Running in CI

Lask does not replace your CI service. GitHub Actions, GitLab CI or Jenkins still decide when a job runs, with which permissions and secrets. The job itself calls `lask`, and what it runs is defined in `main.lask`, so you can run the same thing on your laptop.

## What a CI job needs

- **A Linux runner with Docker.** The `docker` command must be on the `PATH` and able to reach a daemon. GitHub's `ubuntu-latest` runners have both.
- **Lask itself.** It is one binary. Install a fixed version rather than the latest release, and upgrade when you choose to.
- **The lock file, committed.** `lask.lock.json` pins every image by digest and every dependency by content hash. CI then uses what your laptop used.

## The steps

```bash
lask sync --frozen    # pulls the pinned images and fetches dependencies; fails if the lock is out of date
lask check            # fails on any static error
lask run ci           # runs the task
```

`lask sync --frozen` pulls each image by the digest in `lask.lock.json`. If the project has dependencies in `lask.json`, it also fetches them into `.lask/` in the project directory and checks them against the hashes in the lock. If `main.lask` names an image the lock doesn't pin (someone changed an image tag and didn't commit the updated lock), it fails with exit code 1 instead of updating the lock:

```text
$ lask sync --frozen
...
E-MODULE-LOCK-STALE: the images in the lock file are out of date (--frozen)
```

Run `lask sync` locally and commit the lock file to fix it.

`lask check` exits with code 1 on an error. It runs nothing and doesn't use Docker. It does need the project's dependencies and never fetches them itself. On a fresh runner it therefore comes after `lask sync`. Run it before sync and a project with dependencies fails like this:

```text
$ lask check
(no location): E-MODULE-UNRESOLVED [static]: dependency 'tools' is not in the cache; run 'lask sync'
```

`lask run ci` exits with the exit code of whatever failed, so the CI step fails when the task does. Use your own task name; `ci` is the one from [Your first real task file](./first-task-file).

## GitHub Actions

```yaml
name: ci
on: [push, pull_request]

permissions:
  contents: read

jobs:
  ci:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4.3.1
      - name: Install Lask
        env:
          LASK_VERSION: v0.7.0
          LASK_SHA256: da8faa6f0049c55d4b548a7217b2e55410e7512433bf3eec9170e54b07be6d09
        run: |
          curl -fsSL -o lask.tar.gz \
            "https://github.com/lask-task-runner/lask/releases/download/${LASK_VERSION}/lask-${LASK_VERSION}-linux-amd64.tar.gz"
          echo "${LASK_SHA256}  lask.tar.gz" | sha256sum -c -
          tar -xzf lask.tar.gz
          sudo mv ./lask /usr/local/bin
          lask version
      - run: lask sync --frozen
      - run: lask check
      - run: lask run ci
```

Notes on the workflow:

- **Release archives.** Release tags start with `v`, and the archive holds the single `lask` binary. GitHub records the `sha256` of each archive. The value above is for `v0.7.0` on `linux-amd64`; when you change the version, look up the new one with `gh release view <tag> --repo lask-task-runner/lask --json assets`, which lists each archive's `digest`. Other platforms' archives are on the [releases page](https://github.com/lask-task-runner/lask/releases).
- **Actions pinned by commit.** A tag such as `@v4` can be moved to other code; a commit SHA can't. The comment keeps the version readable.
- **Images are pulled on every run.** A fresh runner has no images, and `lask sync --frozen` pulls them each time. Pick small images where you can.

The [Next.js example](/examples/nextjs-e2e#in-ci) has a workflow that also uploads a test report when the job fails. It installs the latest release; pin it as above.

## Secrets

Pass a secret from your CI service as an environment variable, on the step that needs it only:

```yaml
      - run: lask run publish
        env:
          API_TOKEN: ${{ secrets.API_TOKEN }}
```

In the task, read it into a parameter marked secret with `!!`, so its value is masked in the command log. [Core concepts](./concepts#secrets) shows how to hand it to a container through its environment, and how to make a dry run work without it. Don't pass a secret as a command-line option such as `--token`: command lines are visible to other processes and end up in logs.

On GitHub, workflows triggered by pull requests from forks get no secrets. The variable is then set to an empty string, so a task should treat `""` as "not set"; the recipe in Core concepts does.

## Other CI services

The three commands are the same everywhere. What differs is how the job gets a Docker daemon:

- On a VM runner with Docker installed (GitLab's shell executor, a Jenkins agent on a Linux VM, CircleCI's `machine` executor), install Lask as above and run the commands.
- If the job itself runs in a container, it needs access to a Docker daemon from inside, through the service's Docker-in-Docker setup or a mounted Docker socket. Lask uses whichever daemon the `docker` command in the job reaches. The daemon's filesystem must also see the project directory at the same path, because Lask mounts it into each container.

## Things to know

- **stdin.** A task that uses `stdin` reads it to the end before it starts. If your CI system or a wrapper script leaves stdin open without writing to it, such a task waits; run it with `</dev/null`. A task that never refers to `stdin` doesn't read it.
- **Logs.** The command log goes to stderr, with a timestamp on each line. `--format json` makes every stderr line a JSON object, if your CI parses logs: `lask run --format json ci`.
- **Platforms.** For an image published for several platforms, the lock records the digest of the whole multi-platform index, so a lock written on an arm64 laptop works on an amd64 runner, and each machine pulls its own variant. An image built only for `linux/amd64` runs under emulation on an arm64 runner, if the runner supports that.
- **`.lask/`.** Dependencies are fetched into `.lask/` in the project directory. Add it to `.gitignore`: `lask sync` fetches it again from what the lock pins.
