/**
 * PZone IPC V2 — Portable Server
 * Serves the built dist folder on localhost and auto-opens the browser.
 * Packaged as a single .exe using Node.js SEA.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const PORT = 9090;
const DIST = path.join(__dirname, "dist");

// MIME types for static assets
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js":   "application/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif":  "image/gif",
  ".svg":  "image/svg+xml",
  ".ico":  "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2":"font/woff2",
  ".ttf":  "font/ttf",
  ".webmanifest": "application/manifest+json",
};

function getMime(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return MIME[ext] || "application/octet-stream";
}

const server = http.createServer((req, res) => {
  // Decode URL and strip query string
  let url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/") url = "/index.html";

  let filePath = path.join(DIST, url);

  // Security: prevent path traversal
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  // Try to serve the file
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, {
      "Content-Type": getMime(filePath),
      "Cache-Control": filePath.endsWith(".html") ? "no-cache" : "public, max-age=31536000, immutable",
    });
    res.end(content);
  } else {
    // SPA fallback: serve index.html for all routes (React Router)
    const indexPath = path.join(DIST, "index.html");
    if (fs.existsSync(indexPath)) {
      const content = fs.readFileSync(indexPath);
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(content);
    } else {
      res.writeHead(404);
      res.end("Not Found");
    }
  }
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n  ╔══════════════════════════════════════════╗`);
  console.log(`  ║  PZone IPC V2 — Running on ${url}  ║`);
  console.log(`  ║  Press Ctrl+C to stop                    ║`);
  console.log(`  ╚══════════════════════════════════════════╝\n`);

  // Auto-open browser
  const cmd = process.platform === "win32" ? `start ${url}`
    : process.platform === "darwin" ? `open ${url}`
    : `xdg-open ${url}`;
  exec(cmd);
});

// Graceful shutdown
process.on("SIGINT", () => { server.close(); process.exit(0); });
process.on("SIGTERM", () => { server.close(); process.exit(0); });
