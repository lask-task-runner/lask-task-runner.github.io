// Generate the site's pages from a checkout of lask-task-runner/lask.
//
// The lask repository stays the single source: its README, doc/ and
// example/ are read here and written into docs/ on every build, so the
// generated pages are never committed (see .gitignore).
//
//   LASK_SRC=../lask node scripts/sync.mjs

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const SRC = path.resolve(process.env.LASK_SRC ?? "../lask");
const DOCS = path.resolve("docs");
const REPO = "https://github.com/lask-task-runner/lask";
const BRANCH = process.env.LASK_REF ?? "main";

const MEDIA = /\.(png|jpe?g|gif|svg|webp|mp4)$/i;
const SKIP_FILES = new Set(["lask.lock.json", ".gitignore", ".DS_Store"]);

if (!fs.existsSync(path.join(SRC, "doc", "spec.md"))) {
  console.error(`sync: ${SRC} is not a lask checkout (set LASK_SRC)`);
  process.exit(1);
}

const read = (rel) => fs.readFileSync(path.join(SRC, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(SRC, rel));
const isDir = (rel) => exists(rel) && fs.statSync(path.join(SRC, rel)).isDirectory();

// VitePress compiles a page as a Vue template, so `{{ ... }}` outside a code
// block is an expression to evaluate: GitHub Actions' `${{ secrets.X }}` in a
// table cell fails the build. Such inline code becomes <code v-pre>, which
// Vue leaves alone.
function guardInterpolation(md) {
  const html = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return splitFences(md)
    .map(({ code, text }) =>
      code ? text : text.replace(/`([^`\n]*\{\{[^`\n]*)`/g, (_, c) => `<code v-pre>${html(c)}</code>`),
    )
    .join("");
}

function write(rel, content) {
  if (rel.endsWith(".md")) content = guardInterpolation(content);
  const out = path.join(DOCS, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, content);
}

// "02-webapp-on-aws" -> "webapp-on-aws"
const slugOf = (dir) => dir.replace(/^\d+-/, "");

const frontmatter = (fields) =>
  "---\n" +
  Object.entries(fields)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join("\n") +
  "\n---\n\n";

// ---------------------------------------------------------------------------
// Inventory: what exists in the lask repo, and where each piece lands.

const listDirs = (rel) =>
  fs
    .readdirSync(path.join(SRC, rel), { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d+-/.test(d.name))
    .map((d) => d.name)
    .sort();

// Hello, world is the file Getting started walks through, in an older
// form; on the site, that page replaces it. Its links go to GitHub.
const SKIP_PROJECTS = new Set(["01-hello-world"]);

const projectDirs = listDirs("example/01-projects").filter((d) => !SKIP_PROJECTS.has(d));
const topicDirs = listDirs("example/02-language");

const PROJECT_TITLES = {
  "webapp-on-aws": "Web app on AWS",
  "local-llm": "Local LLM",
  "nextjs-e2e": "Next.js end-to-end tests",
  "go-supply-chain": "Go supply chain",
};

const titleFromSlug = (slug) =>
  slug
    .split("-")
    .map((w, i) => (i === 0 ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");

// Repo path -> site route. Directories and their README map to the same page.
const routes = new Map([
  // The README's only bare link on the site is the quick reference's
  // "Installation and the case for Lask are in the README": the reader
  // following it wants to install.
  ["README.md", "/guide/installation"],
  ["doc/quick-reference.md", "/reference/quick-reference"],
  ["doc/spec.md", "/reference/spec"],
  ["doc/compatibility.md", "/reference/compatibility"],
  ["doc/migration/from-make.md", "/guide/migration/from-make"],
  ["doc/migration/from-github-actions.md", "/guide/migration/from-github-actions"],
  ["example", "/examples/"],
  ["example/README.md", "/examples/"],
  ["example/01-projects", "/examples/"],
  ["example/02-language", "/language/"],
  ["example/02-language/README.md", "/language/"],
]);
for (const d of projectDirs) {
  routes.set(`example/01-projects/${d}`, `/examples/${slugOf(d)}`);
  routes.set(`example/01-projects/${d}/README.md`, `/examples/${slugOf(d)}`);
}
for (const d of topicDirs) {
  routes.set(`example/02-language/${d}`, `/language/${slugOf(d)}`);
}

// README sections that became pages of their own. Why Lask and Getting
// started are written by hand in this repository; Installation is the
// only page still taken from the README.
const README_ANCHORS = {
  install: "/guide/installation",
  "editor-support": "/guide/installation#editor-support",
  usage: "/reference/quick-reference#cli",
  "why-lask": "/guide/why-lask",
  comparison: "/guide/why-lask#how-lask-compares",
  feedback: `${REPO}/discussions`,
};

// ---------------------------------------------------------------------------
// Links: every relative link is resolved against the source file's location,
// then sent to a site page, a copied media file, or the file on GitHub.

function resolveLink(target, fromRel, { localAnchors = {} } = {}) {
  if (/^([a-z]+:|\/\/)/i.test(target)) return target;
  if (target.startsWith("#")) return localAnchors[target.slice(1)] ?? target;

  const [p, hash = ""] = target.split("#");
  const rel = path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), p));
  const anchor = hash ? `#${hash}` : "";

  if (rel === "README.md" && README_ANCHORS[hash]) return README_ANCHORS[hash];
  if (routes.has(rel)) return routes.get(rel) + anchor;

  if (MEDIA.test(rel) && exists(rel)) {
    const out = path.join(DOCS, "public", "lask", rel);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.copyFileSync(path.join(SRC, rel), out);
    return `/lask/${rel}`;
  }

  if (!exists(rel)) console.warn(`sync: ${fromRel}: broken link ${target}`);
  return `${REPO}/${isDir(rel) ? "tree" : "blob"}/${BRANCH}/${rel}${anchor}`;
}

// Rewrites links outside fenced code blocks only.
function rewriteLinks(md, fromRel, opts) {
  const fix = (t) => resolveLink(t, fromRel, opts);
  return splitFences(md)
    .map(({ code, text }) =>
      code
        ? text
        : text
            .replace(/\]\(([^)\s]+)\)/g, (_, t) => `](${fix(t)})`)
            .replace(/\b(src|href|srcset)="([^"]+)"/g, (_, a, t) => `${a}="${fix(t)}"`),
    )
    .join("");
}

function splitFences(md) {
  const parts = [];
  const re = /^(```|~~~)[^\n]*\n[\s\S]*?^\1[ \t]*$/gm;
  let last = 0;
  for (const m of md.matchAll(re)) {
    parts.push({ code: false, text: md.slice(last, m.index) });
    parts.push({ code: true, text: m[0] });
    last = m.index + m[0].length;
  }
  parts.push({ code: false, text: md.slice(last) });
  return parts;
}

// "lask fragment" -> "lask"; ebnf has no grammar in Shiki.
const normalizeFences = (md) =>
  md.replace(/^```lask fragment\b/gm, "```lask").replace(/^```ebnf\b/gm, "```txt");

// <details><summary>…</summary> … </details>  ->  ::: details … :::
function detailsToContainers(md) {
  return md
    .replace(/<details(?: open)?>\s*<summary>([\s\S]*?)<\/summary>/g, (_, s) => {
      const label = s
        .replace(/<[^>]+>/g, "")
        .replace(/&middot;/g, "·")
        .trim();
      return `::: details ${label}`;
    })
    .replace(/<\/details>/g, ":::");
}

// Sections of a Markdown file by their "## " heading.
function sections(md) {
  const out = {};
  const parts = md.split(/^## /m);
  out[""] = parts[0];
  for (const part of parts.slice(1)) {
    const nl = part.indexOf("\n");
    out[part.slice(0, nl).trim()] = part.slice(nl + 1).replace(/\n---\s*$/, "\n");
  }
  return out;
}

const source = (rel) => ({ source: rel });

// Joining sections leaves runs of blank lines; Markdown renders them the
// same, but they make the generated files hard to read and diff.
const collapseBlankLines = (md) =>
  splitFences(md)
    .map(({ code, text }) => (code ? text : text.replace(/\n{3,}/g, "\n\n")))
    .join("");

// "## Table of Contents" and its list, up to the next heading. The site
// shows its own outline beside the page.
const dropTableOfContents = (md) =>
  md.replace(/^## Table of Contents\n[\s\S]*?(?=^## )/m, "");

// How to get a copy of a directory of the lask repository.
const cloneBlock = (dirRel) =>
  "```bash\n" + `git clone ${REPO}.git\n` + `cd lask/${dirRel}\n` + "```\n";

// ---------------------------------------------------------------------------
// Pages from README.md: Installation only. Why Lask and Getting started
// are written by hand (docs/guide/), so the pitch can be shaped for the
// site and every sample on them checked against the binary.

// The home page's demo.
resolveLink("doc/assets/lask-pv-short.gif", "README.md");

const readme = read("README.md");
const readmeSections = sections(readme);

write(
  "guide/installation.md",
  frontmatter(source("README.md")) +
    collapseBlankLines(
      rewriteLinks(
        normalizeFences(
          detailsToContainers(
            [
              "# Installation\n",
              readmeSections["Install"],
              "## Editor support\n",
              readmeSections["Editor Support"],
            ].join("\n"),
          ),
        ),
        "README.md",
      ),
    ),
);

// ---------------------------------------------------------------------------
// Reference: doc/*.md, whole

for (const [file, route] of [
  ["doc/quick-reference.md", "quick-reference"],
  ["doc/spec.md", "spec"],
  ["doc/compatibility.md", "compatibility"],
]) {
  write(
    `reference/${route}.md`,
    frontmatter({ ...source(file), outline: [2, 3] }) +
      collapseBlankLines(rewriteLinks(normalizeFences(dropTableOfContents(read(file))), file)),
  );
}

// ---------------------------------------------------------------------------
// Migration guides: doc/migration/*.md, whole. A lask checkout from before
// the guides were written has none, and the sidebar lists what exists.

const MIGRATIONS = [
  ["doc/migration/from-make.md", "from-make"],
  ["doc/migration/from-github-actions.md", "from-github-actions"],
];
const migrations = MIGRATIONS.filter(([file]) => exists(file)).map(([file, slug]) => {
  const md = read(file);
  write(
    `guide/migration/${slug}.md`,
    frontmatter({ ...source(file), outline: [2, 3] }) +
      collapseBlankLines(rewriteLinks(normalizeFences(md), file)),
  );
  return { slug, title: md.match(/^# (.+)$/m)?.[1] ?? slug };
});

// ---------------------------------------------------------------------------
// Language guide: example/02-language/<topic>/ plus its README section

const langReadme = read("example/02-language/README.md");
const langSections = sections(langReadme);
const topicAnchors = Object.fromEntries(
  topicDirs.map((d) => [d, `/language/${slugOf(d)}`]),
);

const lang = (rel) => {
  const ext = path.extname(rel);
  if (ext === ".lask") return "lask";
  if (path.basename(rel) === "Dockerfile" || rel.endsWith(".Dockerfile")) return "dockerfile";
  return { ".json": "json", ".yaml": "yaml", ".yml": "yaml", ".toml": "toml", ".sh": "bash" }[ext] ?? "txt";
};

// Every tracked source file in a directory, main.lask first. Tracked only,
// so a local checkout gives the same pages as CI's fresh clone.
function sourceFiles(dirRel) {
  const files = execFileSync("git", ["-c", "safe.directory=*", "-C", SRC, "ls-files", "-z", "--", dirRel], { encoding: "utf8" })
    .split("\0")
    .filter((f) => f && !SKIP_FILES.has(path.posix.basename(f)) && !MEDIA.test(f));
  const main = `${dirRel}/main.lask`;
  return [main, ...files.filter((f) => f !== main).sort()].filter(exists);
}

function codeGroup(dirRel) {
  const blocks = sourceFiles(dirRel).map((f) => {
    const label = path.posix.relative(dirRel, f);
    return "```" + `${lang(f)} [${label}]\n${read(f).replace(/\n$/, "")}\n` + "```";
  });
  return blocks.length > 1 ? `::: code-group\n\n${blocks.join("\n\n")}\n\n:::\n` : blocks.join("") + "\n";
}

// The first comment line of main.lask is the topic's title: "// Functions".
const topicTitle = (dir) =>
  read(`example/02-language/${dir}/main.lask`).match(/^\/\/ (.+)$/m)?.[1] ?? titleFromSlug(slugOf(dir));

// What each topic covers, from the table in example/README.md.
const topicCovers = Object.fromEntries(
  [...read("example/README.md").matchAll(/^\| \[(\d+-[^/\]]+)\/?\]\(02-language\/[^)]*\) \| (.+?) \|$/gm)].map(
    (m) => [m[1], m[2]],
  ),
);

// What a topic needs to run, from the bold lead of its README section:
// "**Pure.**" or "**Docker** for the last task.".
function topicNeeds(dir) {
  const m = (langSections[dir] ?? "").match(/^\*\*([^*]+)\*\*([^.\n]*)/m);
  if (!m) return "";
  const lead = m[1].endsWith(".") ? m[1].slice(0, -1) : (m[1] + m[2]).trim();
  return lead === "Pure" ? "Lask only" : lead;
}

const topics = topicDirs.map((d) => ({
  dir: d,
  slug: slugOf(d),
  title: topicTitle(d),
  covers: topicCovers[d] ?? "",
  needs: topicNeeds(d),
}));

// The overview page (language/index.md) is written by hand; this is the
// table of topics it includes.
write(
  "language/_topics.md",
  "| Topic | Covers | Needs |\n| --- | --- | --- |\n" +
    topics.map((t) => `| [${t.title}](./${t.slug}) | ${t.covers} | ${t.needs} |`).join("\n") +
    "\n",
);

for (const t of topics) {
  const dirRel = `example/02-language/${t.dir}`;
  const files = sourceFiles(dirRel);
  const tree = `${REPO}/tree/${BRANCH}/${dirRel}`;
  const pure = t.needs === "Lask only";
  const howToTry =
    files.length === 1
      ? `To try the commands above, paste the source below into \`main.lask\` in an empty directory${
          pure ? "" : " and run `lask sync` first"
        }, or clone the repository:\n\n`
      : `This topic has ${files.length} files, so clone the repository to try it:\n\n`;
  write(
    `language/${t.slug}.md`,
    // The prose on this page is the topic's section of the README; the
    // files under "Source" say where they come from themselves.
    frontmatter(source("example/02-language/README.md")) +
      `# ${t.title}\n\n` +
      collapseBlankLines(
        rewriteLinks(langSections[t.dir] ?? "", "example/02-language/README.md", {
          localAnchors: topicAnchors,
        }),
      ).trim() +
      "\n\n" +
      howToTry +
      cloneBlock(dirRel) +
      `\n## Source\n\n` +
      `${files.length === 1 ? "This is" : "These are"} [${dirRel}](${tree}) in the lask repository.\n\n` +
      codeGroup(dirRel),
  );
}

// ---------------------------------------------------------------------------
// Examples: example/01-projects/<project>/README.md

// Descriptions from the table in example/README.md.
const projectBlurbs = Object.fromEntries(
  [...read("example/README.md").matchAll(/^\| \[(\d+-[^/\]]+)\/?\]\([^)]*\) \| (.+?) \| (.+?) \|$/gm)].map(
    (m) => [m[1], { blurb: m[2], needs: m[3] }],
  ),
);

const projects = projectDirs.map((d) => ({
  dir: d,
  slug: slugOf(d),
  title: PROJECT_TITLES[slugOf(d)] ?? titleFromSlug(slugOf(d)),
  ...projectBlurbs[d],
}));

for (const p of projects) {
  const dirRel = `example/01-projects/${p.dir}`;
  const readmeRel = `${dirRel}/README.md`;
  const tree = `${REPO}/tree/${BRANCH}/${dirRel}`;
  // A README is written for someone standing in a checkout, so its first
  // `cd example/...` becomes a clone on the site, where there is none.
  const fromCheckout = (md) =>
    md.replace(
      new RegExp(`^cd ${dirRel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[ \\t]*$`, "m"),
      `git clone ${REPO}.git\ncd lask/${dirRel}`,
    );
  const body = exists(readmeRel)
    ? collapseBlankLines(fromCheckout(rewriteLinks(normalizeFences(read(readmeRel)), readmeRel)))
    : `${p.blurb ?? ""}\n\nTo try it, clone the repository:\n\n${cloneBlock(dirRel)}\n## main.lask\n\n${codeGroup(dirRel)}`;
  write(
    `examples/${p.slug}.md`,
    frontmatter(source(exists(readmeRel) ? readmeRel : `${dirRel}/main.lask`)) +
      `# ${p.title}\n\n` +
      (p.needs ? `<Badge type="info" text="Needs: ${p.needs}" />\n\n` : "") +
      body.replace(/^# .+\n/, "") +
      `\n---\n\nThe whole project is on GitHub: [${dirRel}](${tree}).\n`,
  );
}

write(
  "examples/index.md",
  frontmatter(source("example/README.md")) +
    "# Examples\n\n" +
    "Whole projects, where the language is in service of a job. To run one, you need Lask and what its Needs column lists. The tools the tasks use come from container images, so none of them is installed on your machine.\n\n" +
    "| Example | What it does | Needs |\n| --- | --- | --- |\n" +
    projects.map((p) => `| [${p.title}](./${p.slug}) | ${p.blurb ?? ""} | ${p.needs ?? ""} |`).join("\n") +
    "\n\nFor how something is written rather than what it is for, see the [language guide](/language/).\n",
);

// ---------------------------------------------------------------------------
// The sidebar reads this, so a new example or topic needs no config change.

write(
  ".vitepress/generated/manifest.json",
  JSON.stringify(
    {
      topics: topics.map(({ slug, title }) => ({ slug, title })),
      projects: projects.map(({ slug, title }) => ({ slug, title })),
      migrations,
    },
    null,
    2,
  ) + "\n",
);

console.log(`sync: ${topics.length} topics, ${projects.length} examples from ${SRC}`);
