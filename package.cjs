/**
 * Package PZone IPC V2 into a distributable folder.
 * Run: node package.cjs
 * 
 * Output: ./PZone-IPC-V2-Portable/
 *   ├── dist/          (built web app)
 *   ├── server.cjs     (Node.js static server)
 *   └── PZone-IPC.bat  (double-click to launch)
 */
const fs = require("fs");
const path = require("path");

const OUT_DIR = path.join(__dirname, "PZone-IPC-V2-Portable");
const DIST_SRC = path.join(__dirname, "dist");

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    console.error(`  ✗ Source not found: ${src}`);
    process.exit(1);
  }
  
  if (fs.statSync(src).isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const child of fs.readdirSync(src)) {
      copyRecursive(path.join(src, child), path.join(dest, child));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

console.log("\n  📦 Packaging PZone IPC V2...\n");

// 1. Create output folder
if (fs.existsSync(OUT_DIR)) {
  fs.rmSync(OUT_DIR, { recursive: true });
}
fs.mkdirSync(OUT_DIR, { recursive: true });

// 2. Copy dist
console.log("  → Copying dist/ ...");
copyRecursive(DIST_SRC, path.join(OUT_DIR, "dist"));

// 3. Copy server
console.log("  → Copying server.cjs ...");
fs.copyFileSync(
  path.join(__dirname, "server.cjs"),
  path.join(OUT_DIR, "server.cjs")
);

// 4. Copy launcher
console.log("  → Copying PZone-IPC.bat ...");
fs.copyFileSync(
  path.join(__dirname, "PZone-IPC.bat"),
  path.join(OUT_DIR, "PZone-IPC.bat")
);

// 5. Count files
let fileCount = 0;
function countFiles(dir) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) countFiles(full);
    else fileCount++;
  }
}
countFiles(OUT_DIR);

// 6. Get total size
function getFolderSize(dir) {
  let total = 0;
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) total += getFolderSize(full);
    else total += fs.statSync(full).size;
  }
  return total;
}
const sizeMB = (getFolderSize(OUT_DIR) / 1024 / 1024).toFixed(1);

console.log(`\n  ╔══════════════════════════════════════════╗`);
console.log(`  ║  ✅ Package complete!                     ║`);
console.log(`  ║  📁 ${OUT_DIR}  `);
console.log(`  ║  📊 ${fileCount} files, ${sizeMB} MB total         `);
console.log(`  ║                                          ║`);
console.log(`  ║  To share:                                ║`);
console.log(`  ║  1. ZIP the "PZone-IPC-V2-Portable" folder║`);
console.log(`  ║  2. Receiver needs Node.js installed      ║`);
console.log(`  ║  3. Double-click PZone-IPC.bat to run     ║`);
console.log(`  ╚══════════════════════════════════════════╝\n`);
