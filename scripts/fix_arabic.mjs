import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dwpdrclupradpnsminvi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cGRyY2x1cHJhZHBuc21pbnZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNDIwNzYsImV4cCI6MjA4ODYxODA3Nn0.yOp2fT_V5q42nHiAp3qP505Ax1MmKKuX2844LVwHrH4'
);

await supabase.auth.signInWithPassword({ email: 'admin@pzone.com', password: '010055' });

// =====================================================================
// Arabic Presentation Form → Regular Arabic mapping
// Maps Unicode Presentation Forms-A (FB50–FDFF) and
// Presentation Forms-B (FE70–FEFF) to standard Arabic (0600–06FF)
// =====================================================================
const PRES_TO_ARABIC = {
  // Presentation Forms-B (FE70–FEFF) — contextual forms
  0xFE80: 0x0621, // HAMZA
  0xFE81: 0x0622, 0xFE82: 0x0622, // ALEF WITH MADDA
  0xFE83: 0x0623, 0xFE84: 0x0623, // ALEF WITH HAMZA ABOVE
  0xFE85: 0x0624, 0xFE86: 0x0624, // WAW WITH HAMZA
  0xFE87: 0x0625, 0xFE88: 0x0625, // ALEF WITH HAMZA BELOW
  0xFE89: 0x0626, 0xFE8A: 0x0626, 0xFE8B: 0x0626, 0xFE8C: 0x0626, // YEH WITH HAMZA
  0xFE8D: 0x0627, 0xFE8E: 0x0627, // ALEF
  0xFE8F: 0x0628, 0xFE90: 0x0628, 0xFE91: 0x0628, 0xFE92: 0x0628, // BEH
  0xFE93: 0x0629, 0xFE94: 0x0629, // TEH MARBUTA
  0xFE95: 0x062A, 0xFE96: 0x062A, 0xFE97: 0x062A, 0xFE98: 0x062A, // TEH
  0xFE99: 0x062B, 0xFE9A: 0x062B, 0xFE9B: 0x062B, 0xFE9C: 0x062B, // THEH
  0xFE9D: 0x062C, 0xFE9E: 0x062C, 0xFE9F: 0x062C, 0xFEA0: 0x062C, // JEEM
  0xFEA1: 0x062D, 0xFEA2: 0x062D, 0xFEA3: 0x062D, 0xFEA4: 0x062D, // HAH
  0xFEA5: 0x062E, 0xFEA6: 0x062E, 0xFEA7: 0x062E, 0xFEA8: 0x062E, // KHAH
  0xFEA9: 0x062F, 0xFEAA: 0x062F, // DAL
  0xFEAB: 0x0630, 0xFEAC: 0x0630, // THAL
  0xFEAD: 0x0631, 0xFEAE: 0x0631, // REH
  0xFEAF: 0x0632, 0xFEB0: 0x0632, // ZAIN
  0xFEB1: 0x0633, 0xFEB2: 0x0633, 0xFEB3: 0x0633, 0xFEB4: 0x0633, // SEEN
  0xFEB5: 0x0634, 0xFEB6: 0x0634, 0xFEB7: 0x0634, 0xFEB8: 0x0634, // SHEEN
  0xFEB9: 0x0635, 0xFEBA: 0x0635, 0xFEBB: 0x0635, 0xFEBC: 0x0635, // SAD
  0xFEBD: 0x0636, 0xFEBE: 0x0636, 0xFEBF: 0x0636, 0xFEC0: 0x0636, // DAD
  0xFEC1: 0x0637, 0xFEC2: 0x0637, 0xFEC3: 0x0637, 0xFEC4: 0x0637, // TAH
  0xFEC5: 0x0638, 0xFEC6: 0x0638, 0xFEC7: 0x0638, 0xFEC8: 0x0638, // ZAH
  0xFEC9: 0x0639, 0xFECA: 0x0639, 0xFECB: 0x0639, 0xFECC: 0x0639, // AIN
  0xFECD: 0x063A, 0xFECE: 0x063A, 0xFECF: 0x063A, 0xFED0: 0x063A, // GHAIN
  0xFED1: 0x0641, 0xFED2: 0x0641, 0xFED3: 0x0641, 0xFED4: 0x0641, // FEH
  0xFED5: 0x0642, 0xFED6: 0x0642, 0xFED7: 0x0642, 0xFED8: 0x0642, // QAF
  0xFED9: 0x0643, 0xFEDA: 0x0643, 0xFEDB: 0x0643, 0xFEDC: 0x0643, // KAF
  0xFEDD: 0x0644, 0xFEDE: 0x0644, 0xFEDF: 0x0644, 0xFEE0: 0x0644, // LAM
  0xFEE1: 0x0645, 0xFEE2: 0x0645, 0xFEE3: 0x0645, 0xFEE4: 0x0645, // MEEM
  0xFEE5: 0x0646, 0xFEE6: 0x0646, 0xFEE7: 0x0646, 0xFEE8: 0x0646, // NOON
  0xFEE9: 0x0647, 0xFEEA: 0x0647, 0xFEEB: 0x0647, 0xFEEC: 0x0647, // HEH
  0xFEED: 0x0648, 0xFEEE: 0x0648, // WAW
  0xFEEF: 0x0649, 0xFEF0: 0x0649, // ALEF MAKSURA
  0xFEF1: 0x064A, 0xFEF2: 0x064A, 0xFEF3: 0x064A, 0xFEF4: 0x064A, // YEH
  // LAM-ALEF ligatures
  0xFEF5: null, 0xFEF6: null, // LAM-ALEF MADDA → skip, handled separately
  0xFEF7: null, 0xFEF8: null, // LAM-ALEF HAMZA ABOVE
  0xFEF9: null, 0xFEFA: null, // LAM-ALEF HAMZA BELOW
  0xFEFB: null, 0xFEFC: null, // LAM-ALEF
  // Presentation Forms-A (FB50-FDFF) 
  0xFB50: 0x0671, 0xFB51: 0x0671, // ALEF WASLA
  0xFB56: 0x067E, 0xFB57: 0x067E, 0xFB58: 0x067E, 0xFB59: 0x067E, // PEH
  0xFB7A: 0x0686, 0xFB7B: 0x0686, 0xFB7C: 0x0686, 0xFB7D: 0x0686, // TCHEH
  0xFB8A: 0x0698, 0xFB8B: 0x0698, // JEH
  0xFB92: 0x06AF, 0xFB93: 0x06AF, 0xFB94: 0x06AF, 0xFB95: 0x06AF, // GAF
};

/**
 * Convert Arabic Presentation Forms to standard Arabic Unicode,
 * then reverse the word order (pdfplumber gives LTR order for RTL text).
 */
function fixArabicText(text) {
  if (!text) return text;
  const hasPresentationForms = /[\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
  if (!hasPresentationForms) return text;
  
  // Step 1: Convert presentation forms to standard Arabic
  let converted = '';
  for (let i = 0; i < text.length; i++) {
    const cp = text.codePointAt(i);
    if (PRES_TO_ARABIC[cp] !== undefined) {
      if (PRES_TO_ARABIC[cp] !== null) {
        converted += String.fromCodePoint(PRES_TO_ARABIC[cp]);
      }
      // null means skip (ligature component)
    } else {
      converted += text[i];
    }
  }
  
  // Step 2: Reverse word order — pdfplumber outputs Arabic words LTR
  // Split by segments: groups of Arabic+spaces and groups of non-Arabic 
  const arabicRange = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
  const segments = [];
  let current = '';
  let currentIsArabic = null;
  
  for (const ch of converted) {
    const isAr = arabicRange.test(ch);
    const isSpace = ch === ' ';
    
    if (isSpace) {
      current += ch;
    } else if (currentIsArabic === null || currentIsArabic === isAr) {
      current += ch;
      currentIsArabic = isAr;
    } else {
      if (current) segments.push({ text: current, arabic: currentIsArabic });
      current = ch;
      currentIsArabic = isAr;
    }
  }
  if (current) segments.push({ text: current, arabic: currentIsArabic });
  
  // If it's mixed Arabic+English, reverse only the Arabic parts
  // For fully Arabic text, reverse the whole string's words
  const allArabic = segments.every(s => s.arabic !== false);
  
  if (allArabic) {
    // Reverse word order for fully-Arabic text
    const words = converted.split(/(\s+)/);
    return words.reverse().join('');
  }
  
  // Mixed: reverse each Arabic segment's words internally
  return segments.map(seg => {
    if (seg.arabic) {
      const words = seg.text.split(/(\s+)/);
      return words.reverse().join('');
    }
    return seg.text;
  }).join('');
}

// =====================================================================
// Apply fixes to all invoices
// =====================================================================
const { data: invoices } = await supabase
  .from('invoices')
  .select('id, client, project_name');

const presentationFormPattern = /[\uFB50-\uFDFF\uFE70-\uFEFF]/;
const updates = [];

for (const inv of invoices || []) {
  const patch = {};
  let needsUpdate = false;
  
  if (inv.client && presentationFormPattern.test(inv.client)) {
    patch.client = fixArabicText(inv.client);
    needsUpdate = true;
  }
  if (inv.project_name && presentationFormPattern.test(inv.project_name)) {
    patch.project_name = fixArabicText(inv.project_name);
    needsUpdate = true;
  }
  
  if (needsUpdate) {
    updates.push({ id: inv.id, ...patch, _old_client: inv.client, _old_project: inv.project_name });
  }
}

console.log(`Found ${updates.length} invoices to fix\n`);
console.log('Preview of fixes:');
for (const u of updates.slice(0, 15)) {
  if (u.client) {
    console.log(`  Client: "${u._old_client}" → "${u.client}"`);
  }
  if (u.project_name) {
    console.log(`  Project: "${(u._old_project || '').substring(0,50)}" → "${(u.project_name || '').substring(0,50)}"`);
  }
  console.log('');
}

// Apply the updates
let fixed = 0;
for (const u of updates) {
  const patch = {};
  if (u.client) patch.client = u.client;
  if (u.project_name) patch.project_name = u.project_name;
  
  const { error } = await supabase
    .from('invoices')
    .update(patch)
    .eq('id', u.id);
  
  if (error) {
    console.error(`  ❌ Failed to update invoice ${u.id}: ${error.message}`);
  } else {
    fixed++;
  }
}

console.log(`\n✅ Fixed ${fixed}/${updates.length} invoices`);
await supabase.auth.signOut();
