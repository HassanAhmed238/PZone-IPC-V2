import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dwpdrclupradpnsminvi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cGRyY2x1cHJhZHBuc21pbnZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNDIwNzYsImV4cCI6MjA4ODYxODA3Nn0.yOp2fT_V5q42nHiAp3qP505Ax1MmKKuX2844LVwHrH4'
);

await supabase.auth.signInWithPassword({ email: 'admin@pzone.com', password: '010055' });

// Fetch all unique Arabic client names and project names to see what's broken
const { data: invoices } = await supabase
  .from('invoices')
  .select('id, project_code, client, project_name');

const arabicPattern = /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const presentationFormPattern = /[\uFB50-\uFDFF\uFE70-\uFEFF]/;

// Check which fields have Arabic presentation forms (garbled text)
const uniqueClients = new Set();
const uniqueProjects = new Set();
let garbledClients = 0;
let garbledProjects = 0;

for (const inv of invoices || []) {
  if (inv.client && arabicPattern.test(inv.client)) {
    uniqueClients.add(inv.client);
    if (presentationFormPattern.test(inv.client)) {
      garbledClients++;
    }
  }
  if (inv.project_name && arabicPattern.test(inv.project_name)) {
    uniqueProjects.add(inv.project_name);
    if (presentationFormPattern.test(inv.project_name)) {
      garbledProjects++;
    }
  }
}

console.log(`Total invoices: ${invoices?.length}`);
console.log(`\nArabic client names: ${uniqueClients.size}`);
console.log(`Garbled (presentation form) clients: ${garbledClients}`);
for (const c of uniqueClients) {
  const isPF = presentationFormPattern.test(c);
  console.log(`  ${isPF ? '❌ GARBLED' : '✅ OK'}: "${c}" (codepoints: ${[...c].slice(0,5).map(ch => 'U+' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4,'0')).join(',')}...)`);
}

console.log(`\nArabic project names: ${uniqueProjects.size}`);
console.log(`Garbled (presentation form) projects: ${garbledProjects}`);
for (const p of uniqueProjects) {
  const isPF = presentationFormPattern.test(p);
  const name = String(p).substring(0, 60);
  console.log(`  ${isPF ? '❌ GARBLED' : '✅ OK'}: "${name}..."`);
}

await supabase.auth.signOut();
