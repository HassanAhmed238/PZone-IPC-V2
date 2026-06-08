import { createClient } from '@supabase/supabase-js'
const supabase = createClient('https://phgudzzeylgoqxvbhjye.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoZ3VkenpleWxnb3F4dmJoanllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NTYyNzUsImV4cCI6MjA4ODUzMjI3NX0.dowrdi3CfpQiIh9DbqltzY4GyN_yOlgUiEwFaVm3SlQ')
async function run() { 
  const tables = ['tenders', 'clients'];
  for (const table of tables) {
    const {data} = await supabase.from(table).select('*').limit(5);
    console.log(`Table ${table}:`, data);
  }
}
run();
