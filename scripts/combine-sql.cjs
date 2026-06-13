const fs = require('fs');

const sql = fs.readFileSync('D:\\Hassan\\ERP\\PZone IPC V2\\scripts\\import-collections.sql', 'utf8');

const withPolicy = [
  '-- STEP 1: Temporary anon insert policy',
  'CREATE POLICY "temp_anon_import" ON public.collection_transactions FOR INSERT TO anon WITH CHECK (source_type = \'import\');',
  '',
  sql,
  '',
  '-- STEP 3: Remove temporary policy',
  'DROP POLICY IF EXISTS "temp_anon_import" ON public.collection_transactions;',
].join('\n');

fs.writeFileSync('D:\\Hassan\\ERP\\PZone IPC V2\\scripts\\import-collections-full.sql', withPolicy, 'utf8');
console.log('Written full SQL with policy (' + withPolicy.split('\n').length + ' lines)');
