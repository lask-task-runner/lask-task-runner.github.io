---
layout: home

hero:
  name: Lask
  text: Tasks in pinned containers, checked before they run
  tagline: A task runner with a small typed language. Install Docker and Lask, and you have everything a task needs, on your laptop and in CI alike.
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
  - title: Verifiable
    details: lask check resolves every name, argument and type before a single command runs, and the same errors appear in your editor as you type.
    link: /reference/quick-reference#cli
  - title: Portable
    details: "An execution environment is a value: pin an image once, and every command that names it runs there, wherever Lask runs."
    link: /language/environments
  - title: Programmable
    details: A task is an ordinary typed function. Control flow, errors and concurrency belong to the language, not to shell convention.
    link: /language/functions
  - title: Runnable
    details: A task's signature is its command line, and its doc comment is the single source for --help and the editor's hover.
    link: /language/docs-and-cli
  - title: Reusable
    details: Import tasks and the environments they run in across projects, pinned by content hash in a committed lock file.
    link: /language/dependencies
  - title: Secure
    details: Secrets are masked wherever they appear, and every command runs in a container you can lock down.
    link: /language/io-and-secrets
---

<div class="home-demo">

<img alt="Lask in 20 seconds: write tasks in main.lask, run them with lask run, and get the same run on a laptop and in CI on the same pinned images" src="/lask/doc/assets/lask-pv-short.gif">

</div>

<div class="home-sample">

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

```bash
$ lask check                   # names, arguments and types; nothing runs
$ lask sync                    # pull and pin the images
$ lask run cowsay-hello Lask
```

</div>
