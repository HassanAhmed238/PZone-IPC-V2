/**
 * apply-migration.mjs
 * Applies 20260611_live_schema_repair.sql to the live Supabase project
 * via the Supabase Management API.
 *
 * Usage:
 *   node scripts/apply-migration.mjs <SUPABASE_ACCESS_TOKEN>
 *
 * Get your access token from: https://supabase.com/dashboard/account/tokens
 * (Create a new personal access token — it only needs "SQL Editor" access)
 */

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ───────────────────────────────────────────────────────────────────
const PROJECT_REF = "dwpdrclupradpnsminvi";
const ACCESS_TOKEN = process.argv[2];

if (!ACCESS_TOKEN) {
  console.error(
    "\n❌  No access token provided.\n\n" +
    "   Usage:  node scripts/apply-migration.mjs <SUPABASE_ACCESS_TOKEN>\n\n" +
    "   Get a token at: https://supabase.com/dashboard/account/tokens\n"
  );
  process.exit(1);
}

// ── Load SQL ─────────────────────────────────────────────────────────────────
const sqlPath = join(__dirname, "..", "supabase", "migrations", "20260611_live_schema_repair.sql");
const sql = readFileSync(sqlPath, "utf8");

console.log(`\n🚀  Applying migration to project: ${PROJECT_REF}`);
console.log(`📄  SQL file: ${sqlPath}`);
console.log(`📏  SQL length: ${sql.length} bytes\n`);

// ── Execute via Management API ───────────────────────────────────────────────
const endpoint = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

let response;
try {
  response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
} catch (err) {
  console.error("❌  Network error:", err.message);
  process.exit(1);
}

const body = await response.text();

if (!response.ok) {
  console.error(`❌  HTTP ${response.status} from Supabase Management API`);
  console.error(body);
  process.exit(1);
}

let result;
try {
  result = JSON.parse(body);
} catch {
  result = body;
}

console.log("✅  Migration applied successfully!\n");

if (Array.isArray(result) && result.length > 0) {
  console.log("Result rows:", JSON.stringify(result, null, 2));
} else {
  console.log("(No rows returned — DDL statements don't return rows)");
}

console.log("\n🎉  Done. Reload your app — ipc_projects and all dependent tables are now live.");
