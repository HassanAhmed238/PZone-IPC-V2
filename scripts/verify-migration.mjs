/**
 * verify-migration.mjs
 * Quick verification that the migration tables exist in Supabase.
 */

const PROJECT_REF = "dwpdrclupradpnsminvi";
const ACCESS_TOKEN = process.argv[2];

if (!ACCESS_TOKEN) { process.exit(1); }

const checks = [
  { name: "ipc_projects table",        sql: "select count(*) from public.ipc_projects" },
  { name: "board_share_tokens table",  sql: "select count(*) from public.board_share_tokens" },
  { name: "collection_transactions",   sql: "select count(*) from public.collection_transactions" },
  { name: "get_board_snapshot fn",     sql: "select public.get_board_snapshot('test-token-nonexistent') as snap" },
  { name: "post_collection_transaction fn", sql: "select routine_name from information_schema.routines where routine_name='post_collection_transaction'" },
];

const endpoint = `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`;

for (const check of checks) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Authorization": `Bearer ${ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: check.sql }),
  });
  const text = await res.text();
  const icon = res.ok ? "✅" : "❌";
  console.log(`${icon}  ${check.name}: HTTP ${res.status}${res.ok ? "" : " → " + text.slice(0, 120)}`);
}
