/* Local dev server for the Observant prototype — zero dependencies.
   Serves the static app + routes /api/selfserve/* to the serverless
   handlers (shimming Vercel's res.status/res.json). NOT for production.
   Run:  ANTHROPIC_API_KEY=... node dev-server.js   (key already in your shell)
   Then: http://localhost:5050/thread
*/
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = process.env.PORT || 5050;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".jsx": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml",
};

const REWRITES = {
  "/": "/observant/Landing.html",
  "/thread": "/app/Thread.html",
  "/join": "/app/Join.html",
  "/setup": "/app/SelfServe.html",
  "/portal": "/app/SelfServe.html",
};

const API = {
  "/api/selfserve/interview": "./api/selfserve/interview.js",
  "/api/selfserve/simulate": "./api/selfserve/simulate.js",
  "/api/selfserve/answer": "./api/selfserve/answer.js",
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  let p = url.pathname;

  // API routes -> Vercel-style handler with a res shim
  if (API[p]) {
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (obj) => {
      if (!res.getHeader("Content-Type")) res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify(obj));
      return res;
    };
    try {
      const handler = require(API[p]);
      return Promise.resolve(handler(req, res)).catch((e) => {
        res.statusCode = 500; res.end(JSON.stringify({ ok: false, error: String(e && e.message || e) }));
      });
    } catch (e) {
      res.statusCode = 500; return res.end(JSON.stringify({ ok: false, error: String(e && e.message || e) }));
    }
  }

  // static (with rewrites)
  if (REWRITES[p]) p = REWRITES[p];
  const file = path.join(ROOT, decodeURIComponent(p));
  if (!file.startsWith(ROOT)) { res.statusCode = 403; return res.end("forbidden"); }
  fs.readFile(file, (err, data) => {
    if (err) { res.statusCode = 404; res.setHeader("Content-Type", "text/plain"); return res.end("not found: " + p); }
    res.setHeader("Content-Type", TYPES[path.extname(file)] || "text/plain; charset=utf-8");
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log("Observant dev server → http://localhost:" + PORT + "/thread");
  console.log("ANTHROPIC_API_KEY present: " + (process.env.ANTHROPIC_API_KEY ? "yes" : "NO — live thread will stub"));
});
