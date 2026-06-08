import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env file manually
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    value = value.replace(/^['"](.*)['"]$/, '$1'); // Remove quotes
    env[match[1]] = value;
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching invoices:', error);
    return;
  }

  if (data && data.length > 0) {
    const columns = Object.keys(data[0]);
    console.log('Columns in invoices table:', columns);
    const missing = [
      'tax_type', 'tax_amount', 'tax_direction', 
      'approved_tax_type', 'approved_tax_amount', 'approved_tax_direction'
    ].filter(col => !columns.includes(col));
    
    if (missing.length > 0) {
      console.log('MISSING COLUMNS:', missing);
    } else {
      console.log('ALL TAX COLUMNS ARE PRESENT!');
    }
  } else {
    console.log('No data found in invoices table, so cannot infer columns from a select * unless we query schema information.');
    // Let's try to query PostgREST OpenAPI spec or just insert a dummy record to see the error
    const { error: insertError } = await supabase.from('invoices').insert({
       tax_type: 'none',
       approved_tax_amount: 0
    });
    console.log('Insert attempt error:', insertError);
  }
}

checkColumns();
