// apply_migration.js
// Runs the Phase 1 migration SQL against Supabase using the anon key
// For DDL statements (CREATE TABLE, etc.) the anon key is not enough — 
// this script opens the migration in the Supabase dashboard SQL editor via URL
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sql = readFileSync(
  path.join(__dirname, 'supabase/migrations/20260315130000_contract_analysis_phase1.sql'),
  'utf-8'
)

console.log('\n========================================================')
console.log('PHASE 1 MIGRATION — APPLY INSTRUCTIONS')
console.log('========================================================')
console.log('\nTo apply the migration, go to:')
console.log('https://supabase.com/dashboard/project/phgudzzeylgoqxvbhjye/sql/new')
console.log('\nThen paste the following SQL and click "Run":')
console.log('========================================================\n')
console.log(sql)
console.log('\n========================================================')
console.log('After running the SQL, also create the storage bucket:')
console.log('Go to: Storage → New bucket → name: "contracts"')
console.log('  - Toggle OFF "Public bucket"')
console.log('  - File size limit: 50 MB')
console.log('  - Allowed MIME types: application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document')
console.log('========================================================\n')
