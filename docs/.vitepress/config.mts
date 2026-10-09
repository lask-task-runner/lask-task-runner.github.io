import { defineConfig } from "vitepress";
import fs from "node:fs";
import laskGrammar from "./lask.tmLanguage.json" with { type: "json" };

const REPO = "https://github.com/lask-task-runner/lask";

// Written by scripts/sync.mjs from the lask repository.
const manifestPath = new URL("./generated/manifest.json", import.meta.url);
const manifest: {
  topics: { slug: string; title: string }[];
  projects: { slug: string; title: string }[];
} = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, "utf8"))
  : { topics: [], projects: [] };

// GitHub's heading ids, so links written for the lask repository
// ("spec.md#112-function-invocation") work here unchanged.
const githubSlug = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s/g, "-");

export default defineConfig({
  title: "Lask",
  description:
    "A task runner with a small typed language: tasks run in pinned containers and are checked before anything executes.",
  lang: "en-US",
  cleanUrls: true,
  lastUpdated: true,
  srcExclude: ["**/_*.md"],
  // The examples point at servers they start themselves.
  ignoreDeadLinks: "localhostLinks",

  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: "/logo.svg" }],
    ["link", { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32.png" }],
    ["link", { rel: "apple-touch-icon", href: "/apple-touch-icon.png" }],
    ["meta", { name: "theme-color", content: "#4f46e5" }],
  ],

  // Lets the Playwright container reach the dev server as host.docker.internal.
  vite: { server: { allowedHosts: ["host.docker.internal"] } },

  markdown: {
    languages: [laskGrammar as any],
    languageAlias: { ebnf: "txt" },
    anchor: { slugify: githubSlug },
  },

  themeConfig: {
    logo: { src: "/logo.svg", alt: "" },
    notFound: {
      title: "Page not found",
      quote: "That page moved or never existed. Try the search, or start from the home page.",
      linkLabel: "home page",
      linkText: "Back to home",
    },
    nav: [
      { text: "Guide", link: "/guide/getting-started", activeMatch: "^/guide/" },
      { text: "Language", link: "/language/", activeMatch: "^/language/" },
      { text: "Examples", link: "/examples/", activeMatch: "^/examples/" },
      { text: "Reference", link: "/reference/quick-reference", activeMatch: "^/reference/" },
      {
        text: "Links",
        items: [
          { text: "Releases", link: `${REPO}/releases` },
          { text: "Discussions", link: `${REPO}/discussions` },
          {
            text: "VS Code extension",
            link: "https://marketplace.visualstudio.com/items?itemName=ToruIkeda.vscode-lask",
          },
        ],
      },
    ],

    sidebar: {
      "/guide/": [
        {
          text: "Guide",
          items: [
            { text: "Why Lask", link: "/guide/why-lask" },
            { text: "Getting started", link: "/guide/getting-started" },
            { text: "Your first real task file", link: "/guide/first-task-file" },
            { text: "Core concepts", link: "/guide/concepts" },
            { text: "Running in CI", link: "/guide/ci" },
            { text: "Troubleshooting", link: "/guide/troubleshooting" },
            { text: "Installation", link: "/guide/installation" },
          ],
        },
        { text: "Next", items: [{ text: "Language guide", link: "/language/" }] },
      ],
      "/language/": [
        {
          text: "Language guide",
          items: [
            { text: "Overview", link: "/language/" },
            ...manifest.topics.map((t) => ({ text: t.title, link: `/language/${t.slug}` })),
          ],
        },
      ],
      "/examples/": [
        {
          text: "Examples",
          items: [
            { text: "Overview", link: "/examples/" },
            ...manifest.projects.map((p) => ({ text: p.title, link: `/examples/${p.slug}` })),
          ],
        },
      ],
      "/reference/": [
        {
          text: "Reference",
          items: [
            { text: "Quick reference", link: "/reference/quick-reference" },
            { text: "Language specification", link: "/reference/spec" },
            { text: "Compatibility policy", link: "/reference/compatibility" },
          ],
        },
      ],
    },

    socialLinks: [{ icon: "github", link: REPO }],

    search: { provider: "local" },

    outline: { level: [2, 3] },

    // Generated pages carry `source:` in their frontmatter: edit that file in
    // the lask repository. Hand-written pages are edited here. The function is
    // serialized to the browser, so it cannot refer to REPO.
    editLink: {
      pattern: ({ filePath, frontmatter }) =>
        frontmatter.source
          ? `https://github.com/lask-task-runner/lask/edit/main/${frontmatter.source}`
          : `https://github.com/lask-task-runner/lask-task-runner.github.io/edit/main/docs/${filePath}`,
      text: "Edit this page on GitHub",
    },

    footer: {
      message: "Released under the MIT License.",
      copyright: "Docker is a trademark of Docker, Inc. Other names belong to their owners.",
    },
  },
});
