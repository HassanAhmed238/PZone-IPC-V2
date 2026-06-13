/**
 * audit-full-export.cjs — Export ALL source data issues to JSON (no truncation)
 */
const { createClient } = require("@supabase/supabase-js");

const PUBLISHED_ID = "2PACX-1vQ09udoM2gx4dmfXeCbEJ4eytTv0cePRvILMACMyRXEycSmeh8SiZivfvmhnXLQPNnB2BvkEVlG5R-V";
const SPREADSHEET_ID = "1fRZO0vNpkwn6Dowv_6tXiof-3LXp0uE5NmhzUmmyOiY";

const MONTH_CONFIGS = [
  { key: "2026-01", label: "January 2026", gid: "710892751" },
  { key: "2026-02", label: "February 2026", gid: "436039118" },
  { key: "2026-03", label: "March 2026", gid: "393117100" },
  { key: "2026-04", label: "April 2026", gid: "801847961" },
  { key: "2026-05", label: "May 2026", gid: "381875970" },
  { key: "2026-06", label: "June 2026", gid: "331791800" },
];

function parseCSV(text) {
  const rows = []; let row = []; let field = ""; let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], nx = text[i+1];
    if (inQ) { if (ch==='"'&&nx==='"'){field+='"';i++} else if(ch==='"'){inQ=false} else{field+=ch} continue; }
    if (ch==='"'){inQ=true} else if(ch===','){row.push(field.trim());field=""} else if(ch==='\n'||(ch==='\r'&&nx==='\n')){row.push(field.trim());if(row.some(v=>v!==""))rows.push(row);row=[];field="";if(ch==='\r')i++} else{field+=ch}
  }
  if(field||row.length>0){row.push(field.trim());if(row.some(v=>v!==""))rows.push(row)}
  return rows;
}
function toNum(v){if(!v)return 0;const c=String(v).replace(/[,\s%$]/g,"").trim();if(!c||c==="-"||c.toUpperCase()==="N/A")return 0;const n=Number(c);return Number.isFinite(n)?n:0}
function toDate(v){if(!v||v.trim()===""||v.trim()==="-")return null;const r=v.trim().replace(/-$/,"").trim();if(!r)return null;if(/^\d{4}-\d{2}-\d{2}/.test(r))return r.slice(0,10);const d=r.match(/^(\d{1,2})-([A-Za-z]+)-(\d{2,4})$/);if(d){const ms={jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12"};const m=ms[d[2].toLowerCase().slice(0,3)];if(m)return`${d[3].length===2?`20${d[3]}`:d[3]}-${m}-${d[1].padStart(2,"0")}`}return null}
const SM={'معتمد':'approved','تحت الاعتماد':'pending','تحت الإعتماد':'pending','مرفوض':'rejected','في انتظار النسخة المعتمدة':'pending','لم يتم اعتماد السابق':'draft'};
function mapStatus(s){return(!s?'draft':SM[s.trim()]||'draft')}

function rowToInvoice(cells) {
  const pc=(cells[0]||"").trim();if(!pc)return null;if(!/^(PZ-|\d)/.test(pc))return null;if(/^total|^الإجمالي|^اجمالي|^اجمالى/i.test(pc))return null;if(!cells[3]?.trim()&&!cells[4]?.trim())return null;
  const has28=cells.length>=28;const pi=has28?24:23;const mi=has28?25:24;const ti=has28?26:25;const ei=has28?27:26;
  return{project_code:pc,sector:(cells[1]||"").trim(),submitted_date:toDate(cells[2]),project_name:(cells[3]||"").trim(),client:(cells[4]||"").trim(),contract_value:toNum(cells[5]),invoice_number:cells[6]?.trim()||null,work_previous:toNum(cells[7]),work_current:toNum(cells[8]),work_total:toNum(cells[9]),total_deductions:toNum(cells[10]),net_previous:toNum(cells[11]),net_current:toNum(cells[12]),net_total:toNum(cells[13]),approved_previous:toNum(cells[14]),approved_current:toNum(cells[15]),approved_total:toNum(cells[16]),approved_deductions:toNum(cells[17]),approved_net_previous:toNum(cells[18]),approved_net_current:toNum(cells[19]),approved_net_total:toNum(cells[20]),status:mapStatus((cells[21]||"").trim()),approval_date:toDate(cells[22]),contract_percentage:toNum(cells[pi]),collection_current:toNum(cells[mi]),total_collections:toNum(cells[ti]),expected_collection:toNum(cells[ei])};
}

function cmp(a,b,t=0.01){return Math.abs((Number(a)||0)-(Number(b)||0))<=t}

async function fetchCSV(gid) {
  const url=`https://docs.google.com/spreadsheets/d/e/${PUBLISHED_ID}/pub?gid=${gid}&single=true&output=csv`;
  let resp=await fetch(url);
  if(!resp.ok){const u2=`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&gid=${gid}`;resp=await fetch(u2);if(!resp.ok)throw new Error(`Fail ${gid}`);}
  const t=await resp.text();if(t.trim().startsWith("<"))throw new Error("HTML");return t;
}

async function main() {
  const allInv = [];
  const byMonth = {};

  for (const c of MONTH_CONFIGS) {
    try {
      const csv = await fetchCSV(c.gid);
      const rows = parseCSV(csv);
      const isIpc = rows.some(r => {const n=r.map(x=>String(x||"").trim().toLowerCase());return n[0]==="project id"&&n.some(x=>x==="project name")&&n.some(x=>x==="client")});
      const invs = isIpc ? rows.map(rowToInvoice).filter(Boolean) : [];
      byMonth[c.key] = invs;
      allInv.push(...invs.map(i=>({...i,_month:c.key,_label:c.label})));
      process.stderr.write(`${c.label}: ${invs.length} rows\n`);
    } catch(e) { byMonth[c.key]=[]; process.stderr.write(`${c.label}: ERROR ${e.message}\n`); }
  }

  const issues = [];
  let id = 1;

  // Per-row checks
  for (const inv of allInv) {
    const loc = `${inv._label} | ${inv.project_code} | IPC ${inv.invoice_number||"N/A"}`;
    const base = { month: inv._label, project: inv.project_code, ipc: inv.invoice_number||"N/A" };

    if (!inv.project_name) issues.push({id:id++,severity:"high",type:"missing_field",...base,issue:"Missing project_name",fix:"Open the sheet tab for this month. Find the row for this project. Fill in the Project Name column."});
    if (!inv.client) issues.push({id:id++,severity:"high",type:"missing_field",...base,issue:"Missing client name",fix:"Open the sheet tab for this month. Find the row for this project. Fill in the Client column with the correct client/employer name."});
    if (inv.contract_value<=0) issues.push({id:id++,severity:"medium",type:"zero_contract",...base,issue:`Contract value is ${inv.contract_value}`,fix:"Enter the correct contract value in the Contract Value column. If this project has no contract yet, add a note or placeholder."});

    const ewt=inv.work_previous+inv.work_current;
    if (!cmp(ewt,inv.work_total,1)) issues.push({id:id++,severity:"high",type:"formula_error",...base,issue:`Work total mismatch: prev(${inv.work_previous.toLocaleString()}) + current(${inv.work_current.toLocaleString()}) = ${ewt.toLocaleString()} ≠ sheet(${inv.work_total.toLocaleString()})`,fix:"Check the Work Total formula in this row. It should equal Work Previous + Work Current. If Work Total is correct, then the Previous or Current values may be wrong."});

    const eat=inv.approved_previous+inv.approved_current;
    if (!cmp(eat,inv.approved_total,1)) issues.push({id:id++,severity:"medium",type:"formula_error",...base,issue:`Approved total mismatch: prev(${inv.approved_previous.toLocaleString()}) + current(${inv.approved_current.toLocaleString()}) = ${eat.toLocaleString()} ≠ sheet(${inv.approved_total.toLocaleString()})`,fix:"Check the Approved Total formula. For ختامي (final) IPCs, if the current is 0 and total is 0, verify whether the approved values should carry forward from the previous IPC."});

    const eant=inv.approved_net_previous+inv.approved_net_current;
    if (!cmp(eant,inv.approved_net_total,1)) issues.push({id:id++,severity:"medium",type:"formula_error",...base,issue:`Approved net total mismatch: prev(${inv.approved_net_previous.toLocaleString()}) + current(${inv.approved_net_current.toLocaleString()}) = ${eant.toLocaleString()} ≠ sheet(${inv.approved_net_total.toLocaleString()})`,fix:"Check the Approved Net Total formula. It should equal Approved Net Previous + Approved Net Current."});

    if (inv.work_total>inv.contract_value*1.1&&inv.contract_value>0) issues.push({id:id++,severity:"warning",type:"over_submission",...base,issue:`Submitted(${inv.work_total.toLocaleString()}) exceeds contract(${inv.contract_value.toLocaleString()}) by ${((inv.work_total/inv.contract_value-1)*100).toFixed(1)}%`,fix:"Verify: (1) Is the contract value correct? Maybe there's a variation order (VO) not reflected. (2) Is the submitted amount on the right row? (3) If legitimate, update contract value to include VOs."});

    if (inv.work_current<0) issues.push({id:id++,severity:"warning",type:"negative_amount",...base,issue:`Negative work_current: ${inv.work_current.toLocaleString()}`,fix:"Check if this is a correction/reversal. If not, fix the sign."});
    if (inv.approved_current<0) issues.push({id:id++,severity:"warning",type:"negative_amount",...base,issue:`Negative approved_current: ${inv.approved_current.toLocaleString()}`,fix:"Check if this is a deduction or correction. If not, fix the sign."});
    if (inv.collection_current<0) issues.push({id:id++,severity:"high",type:"negative_amount",...base,issue:`Negative collection_current: ${inv.collection_current.toLocaleString()}`,fix:"Collections should never be negative. If this is a refund, it should be in a separate reversal row, not a negative collection."});

    if (inv.total_collections>0&&inv.approved_net_total>0&&inv.total_collections>inv.approved_net_total*1.05) issues.push({id:id++,severity:"warning",type:"over_collection",...base,issue:`Over-collection: collected(${inv.total_collections.toLocaleString()}) > approved_net(${inv.approved_net_total.toLocaleString()})`,fix:"Verify: (1) Are total collections correct? (2) Is there an approved amount update pending? (3) Is collection being counted from a different project?"});

    if (inv.approved_total>0&&inv.work_total<=0) issues.push({id:id++,severity:"high",type:"logic_error",...base,issue:`Approved(${inv.approved_total.toLocaleString()}) but no submitted work`,fix:"A project cannot have approved amounts without submitted work. Either add the submitted work value or correct the approved amount."});

    if (!inv.invoice_number) issues.push({id:id++,severity:"low",type:"missing_field",...base,issue:"Missing invoice_number",fix:"Add the IPC number (e.g., '3', 'ختامي'). The system will use a fallback key but explicit numbers are better for tracking."});

    if (inv.submitted_date===null&&inv.status!=="draft") issues.push({id:id++,severity:"low",type:"missing_field",...base,issue:`Status is '${inv.status}' but submitted_date is null`,fix:"Add the submission date for this IPC in the Submitted Date column."});

    if (inv.total_deductions<0) issues.push({id:id++,severity:"warning",type:"negative_amount",...base,issue:`Negative deductions: ${inv.total_deductions.toLocaleString()}`,fix:"Deductions should be positive (they are subtracted). Check if the sign is wrong."});

    const en=inv.work_total-inv.total_deductions;
    if (inv.net_total>0&&!cmp(en,inv.net_total,100)) issues.push({id:id++,severity:"low",type:"formula_deviation",...base,issue:`Net total(${inv.net_total.toLocaleString()}) ≠ work_total(${inv.work_total.toLocaleString()}) - deductions(${inv.total_deductions.toLocaleString()}) = ${en.toLocaleString()}`,fix:"This may be normal if there are additional items (tax, retention, fluctuation). Verify the net formula in the sheet includes all relevant adjustments."});
  }

  // Cross-row within same month
  for (const c of MONTH_CONFIGS) {
    const invs = byMonth[c.key];
    const pm = new Map();
    for (const i of invs) { if(!pm.has(i.project_code))pm.set(i.project_code,[]); pm.get(i.project_code).push(i); }
    for (const [code,arr] of pm) {
      const nums=arr.filter(i=>i.invoice_number).map(i=>i.invoice_number);
      const dupes=nums.filter((n,i)=>nums.indexOf(n)!==i);
      if (dupes.length>0) issues.push({id:id++,severity:"high",type:"duplicate",...{month:c.label,project:code,ipc:"multiple"},issue:`Duplicate invoice numbers in same month: ${[...new Set(dupes)].join(", ")}`,fix:"Each IPC number should appear only once per month tab. Remove the duplicate row or assign a different IPC number."});

      const cvs=[...new Set(arr.map(i=>i.contract_value))];
      if (cvs.length>1) issues.push({id:id++,severity:"medium",type:"inconsistent_value",...{month:c.label,project:code,ipc:"all"},issue:`Inconsistent contract values across IPCs in same month: ${cvs.map(v=>v.toLocaleString()).join(", ")}`,fix:"All IPCs for the same project in the same month should have the same contract value. Update the Contract Value column to be consistent."});

      const clients=[...new Set(arr.map(i=>i.client).filter(Boolean))];
      if (clients.length>1) issues.push({id:id++,severity:"low",type:"inconsistent_value",...{month:c.label,project:code,ipc:"all"},issue:`Multiple client names: ${clients.join(" | ")}`,fix:"If this is the same project, use the same client name. If these are sub-projects, consider using different project codes."});
    }
  }

  // Cross-month checks
  const projMonth = new Map();
  for (const i of allInv) { if(!projMonth.has(i.project_code))projMonth.set(i.project_code,[]); projMonth.get(i.project_code).push(i); }
  for (const [code,invs] of projMonth) {
    const cvs=[...new Set(invs.map(i=>i.contract_value).filter(v=>v>0))];
    if (cvs.length>1) issues.push({id:id++,severity:"medium",type:"contract_changed",...{month:"Cross-month",project:code,ipc:"all"},issue:`Contract value changed across months: ${cvs.map(v=>v.toLocaleString()).join(" → ")}`,fix:"If this is due to a Variation Order (VO), document it. If it's a data entry error, correct the contract value in all months to the correct amount. The latest month's value should be the most accurate."});

    const sorted=invs.sort((a,b)=>a._month.localeCompare(b._month));
    for (let i=1;i<sorted.length;i++) {
      if (sorted[i].work_total<sorted[i-1].work_total-1&&sorted[i].work_total>0) {
        issues.push({id:id++,severity:"warning",type:"cumulative_decrease",...{month:sorted[i]._label,project:code,ipc:sorted[i].invoice_number||"N/A"},
          issue:`Cumulative work_total decreased: ${sorted[i-1].work_total.toLocaleString()} (${sorted[i-1]._label}) → ${sorted[i].work_total.toLocaleString()} (${sorted[i]._label})`,
          fix:`Cumulative submitted work should not decrease month-to-month. Check: (1) Is this a different IPC number with lower scope? (2) Was there a correction in ${sorted[i]._label}? (3) Was the ${sorted[i-1]._label} value wrong?`});
      }
    }
  }

  // Output as JSON
  console.log(JSON.stringify(issues, null, 2));
  process.stderr.write(`\nTotal issues: ${issues.length}\n`);
}

main().catch(e=>{console.error("Fatal:",e);process.exit(1)});
