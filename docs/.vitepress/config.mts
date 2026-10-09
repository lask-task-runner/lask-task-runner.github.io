import { defineConfig } from "vitepress";
import fs from "node:fs";
import laskGrammar from "./lask.tmLanguage.json" with { type: "json" };

const REPO = "https://github.com/lask-task-runner/lask";

// Written by scripts/sync.mjs from the lask repository.
const manifestPath = new URL("./generated/manifest.json", import.meta.url);
const manifest: {
  topics: { slug: string; title: string }[];
  projects: { slug: string; title: string }[];
  migrations?: { slug: string; title: string }[];
} = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, "utf8"))
  : { topics: [], projects: [] };

// Which version this build is, and what the others are: set by
// scripts/build-versions.mjs. A plain `vitepress dev`/`build` (lask run dev)
// is the newest version in versions.json, at the root, flagged unreleased.
type VersionInfo = {
  latestRelease: string | null;
  default: string;
  versions: { version: string; released: boolean }[];
};
const listed: { versions: { version: string }[] } = JSON.parse(
  fs.readFileSync(new URL("../../versions.json", import.meta.url), "utf8"),
);
const versionInfo: VersionInfo = process.env.DOCS_MANIFEST
  ? JSON.parse(process.env.DOCS_MANIFEST)
  : {
      latestRelease: null,
      default: listed.versions[0].version,
      versions: listed.versions.map((v) => ({ version: v.version, released: false })),
    };
const currentVersion = process.env.DOCS_VERSION ?? versionInfo.default;
// Where a generated page's source is edited: the branch lask develops on.
const laskEditBranch = process.env.LASK_EDIT_BRANCH ?? "dev";
// VitePress prefixes links with the base, but not what `head` names.
const base = process.env.DOCS_BASE ?? "/";

// Written by scripts/modules.mjs from the official modules' help.
const modulesPath = new URL("./generated/modules.json", import.meta.url);
const modules: { ref?: string; pages: { slug: string; title: string }[] } = fs.existsSync(modulesPath)
  ? JSON.parse(fs.readFileSync(modulesPath, "utf8"))
  : { pages: [] };

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
  base,
  outDir: process.env.DOCS_OUT_DIR ?? ".vitepress/dist",
  cleanUrls: true,
  lastUpdated: true,
  srcExclude: ["**/_*.md"],
  // The examples point at servers they start themselves.
  ignoreDeadLinks: "localhostLinks",

  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: `${base}logo.svg` }],
    ["link", { rel: "icon", type: "image/png", sizes: "32x32", href: `${base}favicon-32.png` }],
    ["link", { rel: "apple-touch-icon", href: `${base}apple-touch-icon.png` }],
    ["meta", { name: "theme-color", content: "#4f46e5" }],
  ],

  // The edit link of a generated page names its file in the lask repository
  // (frontmatter `source`). The editLink pattern runs in the browser and
  // cannot read this file's constants, so the URL is set here, at build.
  transformPageData(pageData) {
    const source = pageData.frontmatter.source;
    if (source) {
      pageData.frontmatter.editUrl = `${REPO}/edit/${laskEditBranch}/${source}`;
    }
  },

  // Lets the Playwright container reach the dev server as host.docker.internal.
  vite: { server: { allowedHosts: ["host.docker.internal"] } },

  markdown: {
    languages: [laskGrammar as any],
    languageAlias: { ebnf: "txt" },
    anchor: { slugify: githubSlug },
  },

  themeConfig: {
    // Read by the version switcher (theme/VersionSwitch.vue).
    docsVersion: { current: currentVersion, ...versionInfo },
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
      ...(modules.pages.length ? [{ text: "Modules", link: "/modules/tools/", activeMatch: "^/modules/" }] : []),
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
        ...(manifest.migrations?.length
          ? [
              {
                text: "Migrating",
                items: manifest.migrations.map((m) => ({ text: m.title, link: `/guide/migration/${m.slug}` })),
              },
            ]
          : []),
        { text: "Next", items: [{ text: "Language guide", link: "/language/" }] },
      ],
      "/modules/": [
        {
          text: "The tools module",
          items: [
            { text: "Overview", link: "/modules/tools/" },
            ...modules.pages.map((p) => ({ text: p.title, link: `/modules/tools/${p.slug}` })),
          ],
        },
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

    // Generated pages carry the URL transformPageData made for them; a
    // hand-written page is edited here. The function is serialized to the
    // browser, so it cannot refer to REPO.
    editLink: {
      pattern: ({ filePath, frontmatter }) =>
        frontmatter.editUrl ??
        `https://github.com/lask-task-runner/lask-task-runner.github.io/edit/main/docs/${filePath}`,
      text: "Edit this page on GitHub",
    },

    footer: {
      message: "Released under the MIT License.",
    },
  },
});
