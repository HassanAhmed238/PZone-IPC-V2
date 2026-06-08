import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read config
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY; // Anon key

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSQL() {
  try {
    const defaultHeaders = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`
    };

    // We can't run RAW SQL using the JS client without an RPC function, 
    // but the user cannot create an RPC function without the CLI/Dashboard.
    // Let's try to just insert the missing routes directly using JS client API
    const routes = [
      { module_path: '/', module_label: 'Dashboard', allowed_roles: ['all'] },
      { module_path: '/tenders', module_label: 'Tender & Estimation', allowed_roles: ['all'] },
      { module_path: '/budget', module_label: 'Budget', allowed_roles: ['admin','cost_control','estimator','finance','ceo','chairman'] },
      { module_path: '/contracts', module_label: 'Contract Analysis', allowed_roles: ['admin','cost_control','ceo','chairman'] },
      { module_path: '/projects', module_label: 'Project Setup', allowed_roles: ['admin','project_manager','ceo','chairman'] },
      { module_path: '/procurement', module_label: 'Procurement', allowed_roles: ['admin','procurement','project_manager','ceo'] },
      { module_path: '/inventory', module_label: 'Inventory', allowed_roles: ['admin','inventory','procurement','project_manager'] },
      { module_path: '/site-progress', module_label: 'Site Progress', allowed_roles: ['admin','site_engineer','project_manager','ceo'] },
      { module_path: '/cost-control', module_label: 'Cost Control', allowed_roles: ['admin','cost_control','finance','ceo','chairman'] },
      { module_path: '/invoices', module_label: 'Client Invoices', allowed_roles: ['admin','finance','ceo','chairman'] },
      { module_path: '/collections', module_label: 'Collections', allowed_roles: ['admin','finance','ceo','chairman'] },
      { module_path: '/payments', module_label: 'Contractor Payments', allowed_roles: ['admin','finance','ceo','chairman'] },
      { module_path: '/cash-flow', module_label: 'Cash Flow', allowed_roles: ['admin','finance','ceo','chairman'] },
      { module_path: '/executive', module_label: 'Executive Dashboard', allowed_roles: ['admin','ceo','chairman'] },
      { module_path: '/master-data', module_label: 'Master Data', allowed_roles: ['admin'] },
      { module_path: '/user-management', module_label: 'User Management', allowed_roles: ['admin'] }
    ];

    // Attempt to insert records (this will FAIL if the table doesn't exist)
    const { data: res, error: err } = await supabase.from('contract_module_access').insert(routes);
    
    if (err) {
      console.log('Error: Table does not exist. We MUST create it.');
      
      // Let's test if there is already an exec_sql RPC function available from prior chats
      const { error: rpcErr } = await supabase.rpc('exec_sql', { sql: 'SELECT 1' });
      if (!rpcErr) {
        console.log("Good news: RPC exec_sql exists. Running migration file...");
        const sql = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/20260315130000_contract_analysis_phase1.sql'), 'utf-8');
        const { error: migrationErr } = await supabase.rpc('exec_sql', { sql });
        if (migrationErr) {
            console.error("Migration failed via RPC:", migrationErr);
        } else {
            console.log("Migration SUCCESS via RPC!");
        }
      } else {
        console.error("RPC failed. Cannot execute RAW SQL without admin access:", rpcErr);
      }
    } else {
      console.log("Table exists! Inserted default routes.");
    }
  } catch (err) {
    console.error(err);
  }
}

runSQL();
