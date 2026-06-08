// Connect directly to Supabase Postgres and run the board share migration
// Supabase provides two connection methods:
// 1. Direct: postgresql://postgres.[ref]:[password]@db.[ref].supabase.co:5432/postgres
// 2. Pooler: postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.co:6543/postgres

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const PROJECT_REF = 'dwpdrclupradpnsminvi';

// Supabase database password - you set this when creating the project
// If you don't remember, reset it in Dashboard > Settings > Database > Database password
const DB_PASSWORD = process.argv[2] || process.env.SUPABASE_DB_PASSWORD;

if (!DB_PASSWORD) {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  Board Share Token Migration - Direct PostgreSQL Connection     ║
╠══════════════════════════════════════════════════════════════════╣
║                                                                  ║
║  Usage:  node apply-board-share.cjs <your-db-password>          ║
║                                                                  ║
║  To find your DB password:                                       ║
║  1. Go to Supabase Dashboard                                     ║
║  2. Settings > Database                                          ║
║  3. Copy the password OR reset it                                ║
║                                                                  ║
║  Dashboard link:                                                 ║
║  https://supabase.com/dashboard/project/${PROJECT_REF}/settings/database
║                                                                  ║
║  Alternative: Run SQL directly in Dashboard SQL Editor:          ║
║  https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new
║                                                                  ║
║  SQL file saved at:                                              ║
║  supabase/migrations/board_share_tokens.sql                      ║
╚══════════════════════════════════════════════════════════════════╝
`);
  process.exit(1);
}

const sql = fs.readFileSync(
  path.join(__dirname, 'supabase', 'migrations', 'board_share_tokens.sql'),
  'utf-8'
);

async function main() {
  // Try direct connection first, then pooler
  const configs = [
    {
      label: 'Direct connection',
      connectionString: `postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres`,
      ssl: { rejectUnauthorized: false }
    },
    {
      label: 'Connection pooler (Transaction mode)',
      connectionString: `postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`,
      ssl: { rejectUnauthorized: false }
    },
    {
      label: 'Connection pooler (Session mode)',
      connectionString: `postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`,
      ssl: { rejectUnauthorized: false }
    },
  ];

  for (const config of configs) {
    console.log(`\nTrying ${config.label}...`);
    const client = new Client({
      connectionString: config.connectionString,
      ssl: config.ssl,
      connectionTimeoutMillis: 10000,
    });

    try {
      await client.connect();
      console.log('✅ Connected to database!');
      
      console.log('📡 Running board share token migration...\n');
      await client.query(sql);
      
      console.log('✅ Migration completed successfully!');
      console.log('\n🎉 All done! Go back to the app and click "Generate Share Link".');
      
      // Verify
      const { rows } = await client.query(
        "SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name IN ('get_board_invoices', 'create_board_token', 'revoke_board_token')"
      );
      console.log('\nVerification - Created functions:');
      rows.forEach(r => console.log(`  ✅ ${r.routine_name}`));
      
      const { rows: tableCheck } = await client.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'board_share_tokens'"
      );
      console.log(`  ✅ board_share_tokens table: ${tableCheck.length > 0 ? 'EXISTS' : 'MISSING'}`);
      
      await client.end();
      return; // Success!
    } catch (err) {
      console.log(`❌ ${config.label} failed: ${err.message}`);
      try { await client.end(); } catch(e) {}
    }
  }

  console.log('\n❌ All connection methods failed.');
  console.log('Please check your database password and try again.');
  console.log(`Or run the SQL manually: https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`);
}

main().catch(console.error);
