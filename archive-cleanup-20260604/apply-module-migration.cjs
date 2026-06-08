const { createClient } = require('@supabase/supabase-js');

const URL = 'https://dwpdrclupradpnsminvi.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cGRyY2x1cHJhZHBuc21pbnZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA0MjA3NiwiZXhwIjoyMDg4NjE4MDc2fQ.-FYBGUwcv5VQ-3CP8RKQT00rCiLYyS9eBT5_eZBYUlY';
const PROJECT_REF = 'dwpdrclupradpnsminvi';

async function createTables() {
  console.log('Creating missing tables via Supabase Management API...\n');

  // Use the Supabase Management API (api.supabase.com) to run SQL
  // This requires a management token, not a service role key.
  // Let's try the pg-meta API endpoint instead.

  const sqlStatements = [
    // INVOICES table
    `CREATE TABLE IF NOT EXISTS public.invoices (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      project_code text NOT NULL,
      sector text,
      submitted_date date,
      project_name text NOT NULL,
      client text,
      contract_value numeric(15,2) DEFAULT 0,
      invoice_number text,
      work_previous numeric(15,2) DEFAULT 0,
      work_current numeric(15,2) DEFAULT 0,
      work_total numeric(15,2) DEFAULT 0,
      total_deductions numeric(15,2) DEFAULT 0,
      net_previous numeric(15,2) DEFAULT 0,
      net_current numeric(15,2) DEFAULT 0,
      net_total numeric(15,2) DEFAULT 0,
      approved_previous numeric(15,2) DEFAULT 0,
      approved_current numeric(15,2) DEFAULT 0,
      approved_total numeric(15,2) DEFAULT 0,
      approved_deductions numeric(15,2) DEFAULT 0,
      approved_net_previous numeric(15,2) DEFAULT 0,
      approved_net_current numeric(15,2) DEFAULT 0,
      approved_net_total numeric(15,2) DEFAULT 0,
      status text DEFAULT 'تحت الاعتماد',
      approval_date date,
      contract_percentage numeric(7,4) DEFAULT 0,
      total_collections numeric(15,2) DEFAULT 0,
      unbilled numeric(15,2) DEFAULT 0,
      expected_collection numeric(15,2) DEFAULT 0,
      contract_id uuid,
      project_id uuid,
      created_by uuid,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
    ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "invoices_select" ON public.invoices FOR SELECT USING (true);
    CREATE POLICY "invoices_insert" ON public.invoices FOR INSERT WITH CHECK (true);
    CREATE POLICY "invoices_update" ON public.invoices FOR UPDATE USING (true);
    CREATE POLICY "invoices_delete" ON public.invoices FOR DELETE USING (true);`,

    // ALARMS table
    `CREATE TABLE IF NOT EXISTS public.alarms (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      contract_id uuid,
      project_id uuid,
      type text NOT NULL,
      severity text DEFAULT 'medium',
      title text NOT NULL,
      description text,
      due_date date,
      is_resolved boolean DEFAULT false,
      resolved_at timestamptz,
      resolved_by uuid,
      metadata jsonb DEFAULT '{}'::jsonb,
      created_by uuid,
      created_at timestamptz DEFAULT now()
    );
    ALTER TABLE public.alarms ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "alarms_select" ON public.alarms FOR SELECT USING (true);
    CREATE POLICY "alarms_insert" ON public.alarms FOR INSERT WITH CHECK (true);
    CREATE POLICY "alarms_update" ON public.alarms FOR UPDATE USING (true);`,
  ];

  // Try the Supabase SQL query endpoint (used internally by Dashboard)
  const endpoints = [
    `${URL}/rest/v1/rpc/pgmeta`,
    `${URL}/pg/query`, 
    `${URL}/sql`,
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
  ];

  for (const sql of sqlStatements) {
    const tableName = sql.match(/public\.(\w+)/)?.[1] || 'unknown';
    console.log(`Creating table: ${tableName}`);

    let created = false;
    for (const ep of endpoints) {
      try {
        const r = await fetch(ep, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SERVICE_KEY,
            'Authorization': `Bearer ${SERVICE_KEY}`,
          },
          body: JSON.stringify({ query: sql }),
        });
        const status = r.status;
        const text = await r.text();
        if (status >= 200 && status < 300) {
          console.log(`  ✅ via ${ep.split('/').slice(-2).join('/')}`);
          created = true;
          break;
        }
        if (status === 201) {
          console.log(`  ✅ Created`);
          created = true;
          break;
        }
        // Don't log 404s — they're expected
        if (status !== 404) {
          console.log(`  [${status}] ${ep.split('/').pop()}: ${text.substring(0, 80)}`);
        }
      } catch (e) {}
    }
    if (!created) console.log(`  ℹ️  API methods exhausted — needs Dashboard SQL`);
  }

  // Verify
  console.log('\n🔍 Verifying...');
  const sb = createClient(URL, SERVICE_KEY, { auth: { persistSession: false } });
  for (const t of ['invoices', 'baselines', 'progress_updates', 'alarms']) {
    const { error } = await sb.from(t).select('id').limit(0);
    console.log(`  ${error ? '❌' : '✅'} ${t}`);
  }
}

createTables().catch(console.error);
