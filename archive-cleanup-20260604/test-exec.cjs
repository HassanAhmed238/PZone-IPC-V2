const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dwpdrclupradpnsminvi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cGRyY2x1cHJhZHBuc21pbnZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNDIwNzYsImV4cCI6MjA4ODYxODA3Nn0.2YyWixb000y0WjH6B-5wWJm1iM7wO-0sC9pT1j2f8yM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Testing exec_sql...");
  
  const sql = `
    SELECT 1 as test;
  `;
  
  const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql });
  // Wait, let's look at run-sql.js line 50: supabase.rpc('exec_sql', { sql: 'SELECT 1' });
  const { data: data2, error: error2 } = await supabase.rpc('exec_sql', { sql: 'SELECT 1' });
  
  console.log("SQL Results (param: sql_string):", data, error);
  console.log("SQL Results (param: sql):", data2, error2);
}

run();
