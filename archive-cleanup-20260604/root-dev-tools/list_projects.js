import { createClient } from '@supabase/supabase-js'
const supabase = createClient('https://phgudzzeylgoqxvbhjye.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoZ3VkenpleWxnb3F4dmJoanllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NTYyNzUsImV4cCI6MjA4ODUzMjI3NX0.dowrdi3CfpQiIh9DbqltzY4GyN_yOlgUiEwFaVm3SlQ')
async function run() { 
  const {data, error} = await supabase.from('ongoing_projects').select('id, project_name, name_ar');
  console.log(data, error);
}
run();
