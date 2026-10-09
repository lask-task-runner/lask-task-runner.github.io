// Generate the reference of the official modules from what `lask` says about
// them (scripts/module-help.sh), into docs/modules/.
//
// The overview is the module's README. Each function is documented from its
// own doc comment and signature, as `lask run <fn> --help` reports them,
// on one page per category of the README's catalog.
//
//   MODULE_HELP=.module-help/tools-v0.3.0 node scripts/modules.mjs

import fs from "node:fs";
import path from "node:path";

const DOCS = path.resolve("docs");
const TOOLS_REPO = "https://github.com/lask-task-runner/lask-module-tools";

// Which help dump to read: MODULE_HELP, or the one versions.json names for
// the newest version (what `lask run dev` builds).
const listed = JSON.parse(fs.readFileSync("versions.json", "utf8")).versions[0];
const HELP = path.resolve(process.env.MODULE_HELP ?? `.module-help/tools-${listed.tools}`);

const manifestOut = path.join(DOCS, ".vitepress/generated/modules.json");
fs.mkdirSync(path.dirname(manifestOut), { recursive: true });
fs.rmSync(path.join(DOCS, "modules"), { recursive: true, force: true });

if (!fs.existsSync(path.join(HELP, "functions.json"))) {
  console.warn(`modules: no help dump at ${HELP}; run scripts/module-help.sh (lask run build does)`);
  fs.writeFileSync(manifestOut, JSON.stringify({ pages: [] }) + "\n");
  process.exit(0);
}

const readJson = (p) => JSON.parse(fs.readFileSync(path.join(HELP, p), "utf8"));
const ref = fs.readFileSync(path.join(HELP, "ref"), "utf8").trim();
const readme = fs.readFileSync(path.join(HELP, "README.md"), "utf8");
const listing = readJson("functions.json").functions;
const commands = readJson("commands.json");
const help = Object.fromEntries(listing.map((f) => [f.name, readJson(`functions/${f.name}.json`)]));

const write = (rel, content) => {
  const out = path.join(DOCS, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, content);
};
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const blob = (p) => `${TOOLS_REPO}/blob/${ref}/${p}`;

// ---------------------------------------------------------------------------
// Categories: the README's catalog headings and the functions in each table,
// then the setups, then whatever the catalog does not name.

function sectionsOf(md, level) {
  const marker = "#".repeat(level) + " ";
  const out = [];
  let cur = null;
  for (const line of md.split("\n")) {
    if (line.startsWith(marker)) {
      cur = { title: line.slice(marker.length).trim(), body: [] };
      out.push(cur);
    } else if (line.startsWith("#".repeat(level - 1) + " ") && level > 1) {
      cur = null;
    } else if (cur) cur.body.push(line);
  }
  return out.map((s) => ({ ...s, body: s.body.join("\n") }));
}

const tableNames = (body) =>
  [...body.matchAll(/^\| `([a-z_][a-z0-9_]*)` \|/gm)].map((m) => m[1]).filter((n) => help[n]);

const top = sectionsOf(readme, 2);
const catalog = top.find((s) => s.title === "Catalog")?.body ?? "";
const categories = sectionsOf(`## Catalog\n${catalog}`, 3).map((s) => ({
  title: s.title,
  slug: slug(s.title),
  names: tableNames(s.body),
}));
const setups = tableNames(top.find((s) => s.title === "Setups")?.body ?? "");
if (setups.length) categories.push({ title: "Setups", slug: "setups", names: setups });
const placed = new Set(categories.flatMap((c) => c.names));
const rest = listing.map((f) => f.name).filter((n) => !placed.has(n));
if (rest.length) categories.push({ title: "Helpers", slug: "helpers", names: rest });

const pageOf = Object.fromEntries(categories.flatMap((c) => c.names.map((n) => [n, c.slug])));

// ---------------------------------------------------------------------------
// One function, from its help document.

const code = (s) => "`" + String(s).replace(/`/g, "\\`") + "`";
// Doc comments are plain text: an angle bracket in them (`image = #python:<tag>`)
// is not HTML, and a brace pair is not a Vue interpolation.
// Markdown's own marks are escaped too, outside inline code: `__pycache__`
// is a name, not bold.
const text = (s) =>
  String(s ?? "")
    .split(/(`[^`]*`)/)
    .map((part, i) =>
      i % 2
        ? part
        : part
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/\{\{/g, "&#123;&#123;")
            .replace(/([_*])/g, "\\$1"),
    )
    .join("");

// A signature with one parameter per line, as the source writes it, split at
// the commas that are not inside a type's or a default's brackets.
function formatSignature(sig) {
  const open = sig.indexOf("(");
  let depth = 0;
  let close = -1;
  for (let i = open; i < sig.length; i++) {
    if ("(<[{".includes(sig[i])) depth++;
    else if (")>]}".includes(sig[i]) && !(sig[i] === ">" && sig[i - 1] === "-")) depth--;
    if (depth === 0) {
      close = i;
      break;
    }
  }
  if (open < 0 || close < 0) return sig;
  const inner = sig.slice(open + 1, close);
  if (!inner.trim()) return sig;
  const params = [];
  let cur = "";
  depth = 0;
  for (const ch of inner) {
    if ("(<[{".includes(ch)) depth++;
    else if (")>]}".includes(ch)) depth--;
    if (ch === "," && depth === 0) {
      params.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  params.push(cur.trim());
  return `${sig.slice(0, open)}(\n${params.map((p) => `  ${p}`).join(",\n")}\n${sig.slice(close)}`;
}
// Paragraphs as the comment wrote them, each joined onto one line.
const paragraphs = (s) =>
  text(s)
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean)
    .join("\n\n");

// The command words whose environment is this function's default image.
function commandWordsOf(h) {
  const targets = new Set((h.environments ?? []).map((e) => e.target));
  return commands.filter((c) => targets.has(c.target)).map((c) => c.name);
}

function renderFunction(name) {
  const h = help[name];
  const sig = listing.find((f) => f.name === name)?.signature ?? name;
  const lines = [`## ${name} {#${name}}`, ""];
  if (h.summary) lines.push(paragraphs(h.summary), "");
  lines.push("```lask", formatSignature(sig), "```", "");
  if (h.description) lines.push(paragraphs(h.description), "");

  // Parameters as a list: the types are too long for table columns.
  if (h.params?.length) {
    lines.push("**Parameters**", "");
    for (const p of h.params) {
      // `!!` marks a secret, as the declaration writes it.
      const flag = (p.kind === "keyword" ? `--${p.name}` : p.name) + (p.secret ? "!!" : "");
      lines.push(`- ${code(flag)}${p.doc ? ` ${text(p.doc)}` : ""}`);
    }
    lines.push("");
  }
  if (h.returns) lines.push(`**Returns** ${code(h.returns.type)}${h.returns.doc ? `: ${text(h.returns.doc)}` : ""}`, "");

  const images = (h.environments ?? []).map((e) => code(e.target.replace(/^recipe \.\//, "recipe ")));
  if (images.length) lines.push(`**Image** ${images.join(", ")}`, "");
  const words = commandWordsOf(h);
  if (words.length) lines.push(`**Command words** ${words.map(code).join(", ")}: \`import command { ${words.map((w) => `"${w}"`).join(", ")} } from "tools"\``, "");

  if (h.examples?.length) lines.push("```bash", ...h.examples, "```", "");
  lines.push(`<small>[${h.module}](${blob(h.module)})</small>`, "");
  return lines.join("\n");
}

const frontmatter = (fields) =>
  "---\n" + Object.entries(fields).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join("\n") + "\n---\n\n";

for (const c of categories) {
  write(
    `modules/tools/${c.slug}.md`,
    frontmatter({ editUrl: `${TOOLS_REPO}/tree/main/lib`, outline: [2, 2] }) +
      `# ${c.title}\n\n` +
      `Functions of the [tools module](./) at ${code(ref)}. Each returns what a command runs in; import it with \`import * as tools from "tools"\`.\n\n` +
      c.names.map(renderFunction).join("\n"),
  );
}

// ---------------------------------------------------------------------------
// The overview: the README, without what only the repository needs, with
// each function in its tables linked to its entry.

const keep = top.filter((s) => !["Layout", "Testing"].includes(s.title));
const intro = readme.split(/^## /m)[0].replace(/^# .+\n/, "");
let overview =
  `# The tools module\n\n` +
  `The official module of ready-made environments, [lask-module-tools](${TOOLS_REPO}), at ${code(ref)}. ` +
  `Each function below is documented in full on its category's page.\n\n` +
  intro +
  keep.map((s) => `## ${s.title}\n${s.body}`).join("\n");

overview = overview
  // Table cells naming a function link to its entry.
  .replace(/^\| `([a-z_][a-z0-9_]*)` \|/gm, (m, n) => (pageOf[n] ? `| [\`${n}\`](./${pageOf[n]}#${n}) |` : m))
  // Relative links point into the module's repository at this ref.
  .replace(/\]\((?!https?:|#|\.\/)([^)]+)\)/g, (_, p) => `](${blob(p)})`);

write(
  "modules/tools/index.md",
  frontmatter({ editUrl: `${TOOLS_REPO}/edit/main/README.md` }) + overview,
);

fs.writeFileSync(
  manifestOut,
  JSON.stringify({ ref, pages: categories.map(({ title, slug }) => ({ title, slug })) }, null, 2) + "\n",
);

console.log(`modules: ${listing.length} functions on ${categories.length} pages, tools at ${ref}`);
