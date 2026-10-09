// Build every version of the site listed in versions.json, each under its
// own path, /<version>/, into site-dist/.
//
// A version's pages come from two sources: the site repository at its
// "site" ref (HEAD is this checkout), and the lask repository at tag
// v<version> once that tag exists, or at its "lask" branch until then.
// Whether the tag exists is what makes a version released, so the
// "unreleased" flag goes away on the first build after lask is tagged.
//
//   LASK_SRC=../lask node scripts/build-versions.mjs

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";

const SITE = path.resolve(".");
const LASK = path.resolve(process.env.LASK_SRC ?? "../lask");
const OUT = path.resolve(process.env.DOCS_OUT ?? "site-dist");
const { versions } = JSON.parse(fs.readFileSync(path.join(SITE, "versions.json"), "utf8"));

// The checkouts may belong to another user (a mount in a container).
const git = (dir, ...args) =>
  execFileSync("git", ["-c", "safe.directory=*", "-C", dir, ...args], { encoding: "utf8" }).trim();

const commitOf = (dir, ref) => {
  try {
    return git(dir, "rev-parse", "-q", "--verify", `${ref}^{commit}`);
  } catch {
    return null;
  }
};

// A branch as CI's clone has it (origin/<name>) or as a local checkout does.
const branchCommit = (dir, name) =>
  commitOf(dir, `refs/remotes/origin/${name}`) ?? commitOf(dir, `refs/heads/${name}`);

const semver = (v) => v.replace(/^v/, "").split(".").map(Number);
const newer = (a, b) => {
  const [x, y] = [semver(a), semver(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
};

// The newest lask release, whether or not the site documents it.
const latestRelease = git(LASK, "tag", "-l", "v[0-9]*.[0-9]*.[0-9]*")
  .split("\n")
  .filter(Boolean)
  .reduce((best, t) => (best === null || newer(t, best) ? t : best), null)
  ?.replace(/^v/, "") ?? null;

const resolved = versions.map((v) => {
  const tag = `v${v.version}`;
  const tagged = commitOf(LASK, `refs/tags/${tag}`);
  const laskRef = tagged ? tag : v.lask;
  const laskCommit = tagged ?? branchCommit(LASK, v.lask);
  if (!laskCommit) throw new Error(`${v.version}: lask has neither ${tag} nor a branch '${v.lask}'`);
  return { ...v, released: Boolean(tagged), laskRef, laskCommit };
});

// The version / redirects to: the newest released one, or the newest of
// all while none is released.
const preferred = resolved.find((v) => v.released) ?? resolved[0];

const manifest = {
  latestRelease,
  default: preferred.version,
  versions: resolved.map(({ version, released }) => ({ version, released })),
};

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "lask-docs-"));

for (const v of resolved) {
  console.log(`build-versions: ${v.version} from site ${v.site}, lask ${v.laskRef} (${v.released ? "released" : "unreleased"})`);

  // The lask sources, as a clone that shares the checkout's objects: sync.mjs
  // lists tracked files with git, and the checkout itself may be read-only.
  // clone reads the checkout through upload-pack, which does not inherit -c,
  // so it gets safe.directory itself: in the container the checkout belongs
  // to another user.
  const laskDir = path.join(tmp, `lask-${v.version}`);
  execFileSync("git", [
    "-c", "safe.directory=*", "clone", "-q", "--shared", "--no-checkout",
    "-u", "git -c safe.directory=* upload-pack", LASK, laskDir,
  ]);
  git(laskDir, "checkout", "-q", "--detach", v.laskCommit);

  // The site sources: this checkout, or an older ref exported beside it,
  // sharing this checkout's node_modules.
  let siteDir = SITE;
  if (v.site !== "HEAD") {
    siteDir = path.join(tmp, `site-${v.version}`);
    fs.mkdirSync(siteDir);
    execFileSync("sh", ["-c", `git -c safe.directory='*' -C "${SITE}" archive "${v.site}" | tar -x -C "${siteDir}"`]);
    fs.symlinkSync(path.join(SITE, "node_modules"), path.join(siteDir, "node_modules"));
  }

  const env = {
    ...process.env,
    LASK_SRC: laskDir,
    LASK_REF: v.laskRef,
    DOCS_VERSION: v.version,
    DOCS_BASE: `/${v.version}/`,
    DOCS_OUT_DIR: path.join(OUT, v.version),
    DOCS_MANIFEST: JSON.stringify(manifest),
  };
  execFileSync("node", ["scripts/sync.mjs"], { cwd: siteDir, env, stdio: "inherit" });
  // The module reference, from the help lask gave for the module version
  // this Lask version documents (main.lask dumps it before this runs).
  if (v.tools && fs.existsSync(path.join(siteDir, "scripts/modules.mjs"))) {
    execFileSync("node", ["scripts/modules.mjs"], {
      cwd: siteDir,
      env: { ...env, MODULE_HELP: path.join(SITE, ".module-help", `tools-${v.tools}`) },
      stdio: "inherit",
    });
  }
  execFileSync(path.join(SITE, "node_modules/.bin/vitepress"), ["build", "docs"], { cwd: siteDir, env, stdio: "inherit" });
}

fs.rmSync(tmp, { recursive: true, force: true });

// The root: the manifest, a redirect to the default version, and a 404 that
// sends a path without a version (every link to the site before versions)
// to the same page in the default version.
fs.writeFileSync(path.join(OUT, "versions.json"), JSON.stringify(manifest, null, 2) + "\n");

const known = JSON.stringify(resolved.map((v) => v.version));
const redirect = (title, script) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta http-equiv="refresh" content="0; url=/${preferred.version}/">
<script>${script}</script>
</head>
<body><p><a href="/${preferred.version}/">Lask documentation</a></p></body>
</html>
`;

fs.writeFileSync(
  path.join(OUT, "index.html"),
  redirect("Lask", `location.replace("/${preferred.version}/" + location.search + location.hash);`),
);
fs.writeFileSync(
  path.join(OUT, "404.html"),
  redirect(
    "Lask: page not found",
    `(function () {
  var known = ${known};
  var parts = location.pathname.split("/").filter(Boolean);
  // A page a version does not have: that version's home.
  if (parts.length && known.indexOf(parts[0]) >= 0) {
    location.replace("/" + parts[0] + "/");
    return;
  }
  // A path from before versions: the same page in the default version.
  location.replace("/${preferred.version}/" + parts.join("/") + location.search + location.hash);
})();`,
  ),
);

console.log(`build-versions: ${resolved.length} version(s) into ${OUT}; / goes to ${preferred.version}`);
