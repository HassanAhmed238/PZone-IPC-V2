import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://phgudzzeylgoqxvbhjye.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBoZ3VkenpleWxnb3F4dmJoanllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NTYyNzUsImV4cCI6MjA4ODUzMjI3NX0.dowrdi3CfpQiIh9DbqltzY4GyN_yOlgUiEwFaVm3SlQ'
const supabase = createClient(supabaseUrl, supabaseKey)

async function deleteProject() {
  console.log("Searching for project الاسكندرية...");
  
  // First search to confirm exact name
  const { data: searchData } = await supabase
    .from('ongoing_projects')
    .select('*')
    .or('project_name.ilike.%الاسكندريه%,project_name.ilike.%الاسكندرية%,name_ar.ilike.%الاسكندرية%');
    
  console.log("Found matches:", searchData);
  
  if (searchData && searchData.length > 0) {
    for (const proj of searchData) {
      console.log("Deleting project id:", proj.id);
      const { data, error } = await supabase
        .from('ongoing_projects')
        .delete()
        .eq('id', proj.id)
        .select();
        
      if (error) {
        console.error("Error deleting:", error);
      } else {
        console.log("Successfully deleted:", data);
      }
    }
  } else {
    console.log("No projects found matching 'الاسكندرية'.");
  }
}

deleteProject();
