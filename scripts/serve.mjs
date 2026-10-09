// Serve site-dist/ the way GitHub Pages does: a directory serves its
// index.html, a path without an extension serves <path>.html, and anything
// else falls back to the root 404.html, which redirects.
//
//   node scripts/serve.mjs [port]

import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.env.DOCS_OUT ?? "site-dist");
const PORT = Number(process.argv[2] ?? 4173);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".mp4": "video/mp4",
  ".woff2": "font/woff2",
};

const file = (p) => fs.existsSync(p) && fs.statSync(p).isFile();

http
  .createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const base = path.join(ROOT, path.normalize(url));
    const found = [base, path.join(base, "index.html"), `${base}.html`].find(
      (p) => p.startsWith(ROOT) && file(p),
    );
    const target = found ?? path.join(ROOT, "404.html");
    res.writeHead(found ? 200 : 404, { "content-type": TYPES[path.extname(target)] ?? "application/octet-stream" });
    fs.createReadStream(target).pipe(res);
  })
  .listen(PORT, "0.0.0.0", () => console.log(`serving ${ROOT} on http://localhost:${PORT}`));
