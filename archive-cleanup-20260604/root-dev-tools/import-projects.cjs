const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dwpdrclupradpnsminvi.supabase.co';
const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR3cGRyY2x1cHJhZHBuc21pbnZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzA0MjA3NiwiZXhwIjoyMDg4NjE4MDc2fQ.-FYBGUwcv5VQ-3CP8RKQT00rCiLYyS9eBT5_eZBYUlY';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const rawText = `North Coast	25-06	25-06 - بحيرات العلمين - أبراج الداون تاون - الشركة الصينية -الساحل	 133,250,234.00 	 5,911,606.50 	Mostafa Selim		يعمل	20-Mar-2026	-4.00									TRUE				
North Coast	24-01	24-01 - SOUL Project -  Parcel 1&2	 300,000,000.00 	 77,857,140.66 	Ahmed Wageh	+201060464641	يعمل	15-Mar-2026	1.00		تم التقديم	March 16, 2026			تحت الاعتماد			TRUE				
North Coast	24-02	24-02 - SOUL Project -  Parcel 3&4	 316,575,156.03 	 31,657,515.00 	Ahmed Wageh	+201060464641	يعمل	15-Mar-2026	1.00		تم التقديم	March 16, 2026			تحت الاعتماد			FALSE				
North Coast	24-03	24-03 - SOUL Project - Phase 1C	 112,692,555.08 	 33,807,766.42 	Ahmed Wageh	+201060464641	يعمل	15-Mar-2026	1.00		تم التقديم	March 16, 2026			تحت الاعتماد			FALSE				
North Coast	24-05	24-05 - Ramla lobby pool	 11,975,197.00 	 4,790,078.80 	Ahmed Wageh	+201060464641	يعمل	15-Mar-2026	1.00									FALSE				
cairo	24-13	24-13 - ساراي كافانا - بحيرة - مدينة مصر - طريق السويس	 81,132,855.58 	 -   	Ahmed Shehata	+201022855665	يعمل	10-Mar-2026	6.00									FALSE				
cairo	24-18	24-18- فيلا(73) سوان ليك  - حمام سباحة - زد سى سى - التجمع الأول	 5,391,579.84 	 1,000,000.00 	Ahmed Shehata	+201022855665	يعمل	10-Mar-2026	6.00									FALSE				
North Coast	25-11	25-11- رأس الحكمة - عدد 6 حمام سباحة و 2 نافورة - Orascom - الساحل	 $2,508,332.21 	 $660,087.42 	Ahmed Maher	+201273890528	يعمل	10-Mar-2026	6.00		تم التقديم							FALSE				
cairo	23-08	23-08 -  Crescent tower swimming pool	 $1,013,987.37 	 $249,636.25 	Ibrahem Gomaa	+201027366286	يعمل	8-Mar-2026	8.00									FALSE				
North Coast	25-12	25-12- زويا (PH 01 PART 3) - بحيرة - LMD - الساحل	 59,851,494.00 	 35,910,893.40 	Mostafa Selim		يعمل	8-Mar-2026	8.00		لم يتم التقديم							FALSE				
cairo	22-69	22-69 -  Capital Way - Waterway	 6,659,440.00 	 4,550,056.00 	Ibrahem Gomaa	+201027366286	يعمل	5-Mar-2026	11.00									FALSE				
cairo	23-33	23-33 - Mansora 7 - Aqua tonic - Inspire	 15,218,744.71 	 3,500,000.00 	Ibrahem Gomaa	+201027366286	يعمل	5-Mar-2026	11.00									FALSE				
cairo	24-14	24-14 - اي سيتي - حمامات سباحة - كيرف - الاوسطي	 39,435,242.00 	 1,999,366.77 	Ibrahem Gomaa	+201027366286	يعمل	5-Mar-2026	11.00									FALSE				
North Coast	24-04	24-04 - Zoya –  (Phase 01)	 50,976,703.35 	 16,349,240.00 	Osama Shahen	+201066605687	يعمل	1-Mar-2026	15.00									FALSE				
North Coast	24-21	24-21- R8 - حمام سباحة 20 - HAC - الساحل	 70,024,956.00 	 9,715,505.25 	Osama Shahen		يعمل	1-Mar-2026	15.00		لم يتم التقديم							FALSE				
cairo	24-15	24-15 - الهضبة - حمام سباحة - مشارق - اكتوبر	 11,307,039.00 	 4,151,115.00 	Mina Samir	+201201922127	يعمل	28-Feb-2026	16.00									FALSE			 2,478,814.54 	
cairo	25-04	25-04 - سوان ليك - تجديد بحيرات - حسن علام - أكتوبر (60%)	 9,708,128.14 	 1,488,720.14 	Mina Samir	+201201922127	يعمل	28-Feb-2026	16.00									FALSE			 2,481,200.34 	 2,385.80 
cairo	25-04-1	25-04 -1 سوان ليك - تجديد بحيرات - حسن علام - أكتوبر (40%)	 4,950,472.00 	 992,480.20 	Mina Samir	+201201922127	يعمل	28-Feb-2026	16.00									FALSE				 992,480.20 
North Coast	24-22	24-22- R8 - حمام سباحة 10 - ORASCOM - الساحل			Osama Shahen		يعمل	25-Feb-2026	19.00									FALSE				
North Coast	25-01	25-01- R8  kids & Adult Pool  Orascom			Osama Shahen		يعمل	25-Feb-2026	19.00									FALSE				
cairo	22-72	22-72 - Water way - A6	 20,785,532.00 	 9,599,229.50 	Mohamed Shahban	+201009577796	يعمل	24-Feb-2026	20.00		تم التقديم	January 13, 2026					في انتظار اعتماد المستخلصات السابقة	FALSE				
North Coast	24-12	24-12 - سيلفر ساند - 8 حمامات سباحة - اوراسكوم - الساحل	 46,664,622.00 	 6,810,460.52 	Mina Nabil	+201284440448	يعمل	23-Feb-2026	21.00								Eng Mostafa omar 	FALSE				
cairo	23-32	23-32 - Akam - Aroma -Phase 4			Mohamed Hamdy	+201022934340	يعمل	22-Feb-2026	22.00									FALSE				
North Coast	24-19	24-19- رملة - 48 حمام سباحة - مراكز العقارية - الساحل	 45,518,212.54 	 3,799,214.25 	Ahmed Wageh		يعمل	20-Feb-2026	24.00									FALSE				`;

const lines = rawText.split('\n').map(l => l.trim()).filter(l => l);

function parseNumber(str) {
    if (!str || typeof str !== 'string') return null;
    const clean = str.replace(/[$, ]/g, '').trim();
    if (clean === '-' || clean === '') return null;
    const val = parseFloat(clean);
    return isNaN(val) ? null : val;
}

function parseDate(str) {
    if (!str || typeof str !== 'string' || !str.trim()) return null;
    const date = new Date(str.trim());
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
}

async function run() {
    const adminUserUUID = "a49e2832-214d-4821-8c72-45b33d5410c1";
    let inserts = [];

    for (const line of lines) {
        const parts = line.split('\t').map(p => p.trim());
        if (parts.length < 5) continue;

        const zone = parts[0] || null;
        const projectCode = parts[1] || "";
        const projectName = parts[2] || "";
        const contractValRaw = parts[3];
        const advanceValRaw = parts[4];
        
        let currency = "SAR"; // Default, but if '$' is present, use 'USD'
        if ((contractValRaw && contractValRaw.includes('$')) || (advanceValRaw && advanceValRaw.includes('$'))) {
            currency = "USD";
        }

        const contractVal = parseNumber(contractValRaw);
        const advanceVal = parseNumber(advanceValRaw);
        const pm = parts[5] || null;
        const phone = parts[6] || null;
        const status = parts[7] === 'يعمل' ? 'يعمل' : (parts[7] ? parts[7] : 'يعمل');
        const estSentDate = parseDate(parts[8]);
        const delayDays = parseNumber(parts[9]);
        const actualSentDate = parseDate(parts[10]);
        const progStatement = parts[11] || null;
        let progDateRaw = parts[12];
        if (!progDateRaw && parts[13] && parts[13].includes('202')) {
            progDateRaw = parts[13]; // Account for duplicate/empty columns shift in the TSV
        }
        const progDate = parseDate(progDateRaw);
        
        let invoiceStatus = parts[14] || null;
        let approvalDateRaw = parts[15];
        let notesRaw = parts[16] || parts[17];
        let progSheetRaw = parts[18] || parts[17] || parts[16];

        // Let's do a more robust search for progress sheet boolean 'TRUE'/'FALSE' traversing from end
        let progressSheet = false;
        for (let i = parts.length - 1; i >= 10; i--) {
            if (parts[i] === 'TRUE') { progressSheet = true; break; }
            if (parts[i] === 'FALSE') { progressSheet = false; break; }
        }

        // notes can be anywhere near the end if they are non-boolean text
        let notes = null;
        for (let i = parts.length - 1; i >= 14; i--) {
            if (parts[i] && parts[i] !== 'TRUE' && parts[i] !== 'FALSE' && !parts[i].match(/^\d/)) {
                if (parts[i].includes('تحت الاعتماد') || parts[i].includes('في انتظار')) {
                    invoiceStatus = parts[i];
                } else if (!parseDate(parts[i])) {
                    notes = parts[i];
                }
            }
        }

        inserts.push({
            zone: zone,
            project_code: projectCode,
            project_name: projectName,
            contract_value: contractVal,
            advanced_payment: advanceVal,
            currency: currency,
            project_manager: pm,
            phone: phone,
            project_status: status,
            est_sent_date: estSentDate,
            delay_days: delayDays,
            actual_sent_date: actualSentDate,
            progress_statement: progStatement,
            progress_date: progDate,
            invoice_status: invoiceStatus,
            approval_date: parseDate(approvalDateRaw),
            notes: notes,
            progress_sheet: progressSheet,
            created_by: adminUserUUID
        });
    }

    console.log(`Parsed ${inserts.length} projects. Checking for duplicates...`);
    
    // Check existing projects to prevent dups
    const { data: existing } = await supabaseAdmin.from('ongoing_projects').select('project_code');
    const existingCodes = new Set((existing || []).map(e => e.project_code));

    let toInsert = inserts.filter(i => !existingCodes.has(i.project_code));
    
    console.log(`Inserting ${toInsert.length} new projects...`);
    if (toInsert.length > 0) {
        const { data, error } = await supabaseAdmin.from('ongoing_projects').insert(toInsert);
        if (error) {
            console.error('Error inserting:', error);
        } else {
            console.log('Successfully inserted data.');
        }
    } else {
        console.log('No new projects to insert.');
    }
}

run();
