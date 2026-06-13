/**
 * check-db-auth.cjs — Check if DB has data using authenticated session
 * Tests both anon access and tries to find data via RPC
 */
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://dwpdrclupradpnsminvi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cGRyY2x1cHJhZHBuc21pbnZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNDIwNzYsImV4cCI6MjA4ODYxODA3Nn0.yOp2fT_V5q42nHiAp3qP505Ax1MmKKuX2844LVwHrH4";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log("=== Supabase Database Diagnostic ===\n");

  // 1. Check invoices with anon key
  const { data: inv, error: invErr, count: invCount } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true });
  console.log(`invoices (anon):     ${invErr ? `ERROR: ${invErr.message}` : `${invCount ?? inv?.length ?? 0} rows`}`);

  // 2. Check collection_transactions
  const { data: coll, error: collErr, count: collCount } = await supabase
    .from("collection_transactions")
    .select("id", { count: "exact", head: true });
  console.log(`collections (anon):  ${collErr ? `ERROR: ${collErr.message}` : `${collCount ?? coll?.length ?? 0} rows`}`);

  // 3. Check cash_flow_transactions
  const { data: cf, error: cfErr, count: cfCount } = await supabase
    .from("cash_flow_transactions")
    .select("id", { count: "exact", head: true });
  console.log(`cash_flow (anon):    ${cfErr ? `ERROR: ${cfErr.message}` : `${cfCount ?? cf?.length ?? 0} rows`}`);

  // 4. Check ipc_projects
  const { data: proj, error: projErr, count: projCount } = await supabase
    .from("ipc_projects")
    .select("id", { count: "exact", head: true });
  console.log(`ipc_projects (anon): ${projErr ? `ERROR: ${projErr.message}` : `${projCount ?? proj?.length ?? 0} rows`}`);

  // 5. Check board_share_tokens
  const { data: bst, error: bstErr, count: bstCount } = await supabase
    .from("board_share_tokens")
    .select("id", { count: "exact", head: true });
  console.log(`board_tokens (anon): ${bstErr ? `ERROR: ${bstErr.message}` : `${bstCount ?? bst?.length ?? 0} rows`}`);

  // 6. Check ongoing_projects
  const { data: op, error: opErr, count: opCount } = await supabase
    .from("ongoing_projects")
    .select("id", { count: "exact", head: true });
  console.log(`ongoing_proj (anon): ${opErr ? `ERROR: ${opErr.message}` : `${opCount ?? op?.length ?? 0} rows`}`);

  // 7. Try system health RPC
  console.log("\n--- RPC Checks ---");
  const { data: health, error: healthErr } = await supabase.rpc("ipc_system_health");
  if (healthErr) {
    console.log(`ipc_system_health:   ERROR: ${healthErr.message}`);
  } else {
    console.log(`ipc_system_health:   OK`);
    if (health) {
      try {
        const parsed = typeof health === "string" ? JSON.parse(health) : health;
        for (const [k, v] of Object.entries(parsed)) {
          console.log(`  ${k}: ${JSON.stringify(v)}`);
        }
      } catch { console.log(`  raw: ${JSON.stringify(health).slice(0, 500)}`); }
    }
  }

  // 8. Try get_board_snapshot with dummy token
  const { error: snapErr } = await supabase.rpc("get_board_snapshot", { input_token: "test-dummy" });
  console.log(`get_board_snapshot:  ${snapErr ? `ERROR: ${snapErr.message}` : "OK (RPC exists)"}`);

  // 9. Try create_board_token
  const { error: cbtErr } = await supabase.rpc("create_board_token", { input_data: { test: true } });
  console.log(`create_board_token:  ${cbtErr ? `ERROR: ${cbtErr.message}` : "OK (RPC exists)"}`);

  // 10. Check if RLS is blocking — try to read with a direct count query
  console.log("\n--- RLS Diagnosis ---");
  const { error: rlsErr } = await supabase.from("invoices").select("count").limit(0);
  if (rlsErr) {
    if (rlsErr.message.includes("permission") || rlsErr.code === "42501") {
      console.log("invoices: ⚠️ RLS is BLOCKING anon reads (data may exist but is hidden)");
    } else {
      console.log(`invoices: ${rlsErr.message}`);
    }
  } else {
    console.log("invoices: anon can read (RLS allows or table is empty)");
  }

  console.log("\n=== Done ===");
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
