/**
 * ═══════════════════════════════════════════════════════════════════════
 *  Executive Contract Intelligence — Premium Interactive HTML Report
 *  Board-room grade • Animated • Fully offline • Zero dependencies
 * ═══════════════════════════════════════════════════════════════════════
 */
import type { AnalysisResult } from "./gemini-analyzer";

export function downloadInteractiveHTMLReport(analysis: AnalysisResult) {
  const esc = (s: string | undefined) =>
    (s || "—").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const sevColor = (s: string) =>
    s === "CRITICAL" ? "#ef4444" : s === "HIGH" ? "#f97316" : s === "MEDIUM" ? "#eab308" : "#22c55e";
  const ratingColor = (r: string) =>
    r === "RED" ? "#ef4444" : r === "AMBER" ? "#f59e0b" : "#22c55e";
  const verdictColor = (v: string) =>
    v === "GO" ? "#22c55e" : v === "CONDITIONAL" ? "#f59e0b" : "#ef4444";

  const dateStr = new Date(analysis.analyzedAt).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
  const timeStr = new Date(analysis.analyzedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const rc = { critical: 0, high: 0, medium: 0, low: 0 };
  analysis.risks.forEach(r => {
    if (r.severity === "CRITICAL") rc.critical++;
    else if (r.severity === "HIGH") rc.high++;
    else if (r.severity === "MEDIUM") rc.medium++;
    else rc.low++;
  });
  const totalRisks = analysis.risks.length;

  const sortedRisks = [...analysis.risks].sort((a, b) => {
    const o: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return (o[a.severity] ?? 4) - (o[b.severity] ?? 4);
  });

  const ckPass = analysis.checklist?.filter(c => c.status === "pass").length || 0;
  const ckFail = analysis.checklist?.filter(c => c.status === "fail").length || 0;
  const ckWarn = analysis.checklist?.filter(c => c.status === "warning").length || 0;
  const ckTotal = analysis.checklist?.length || 1;
  const ckPct = Math.round((ckPass / ckTotal) * 100);

  // SVG donut chart for risk distribution
  const donutSegments = () => {
    const data = [
      { count: rc.critical, color: "#ef4444", label: "Critical" },
      { count: rc.high, color: "#f97316", label: "High" },
      { count: rc.medium, color: "#eab308", label: "Medium" },
      { count: rc.low, color: "#22c55e", label: "Low" },
    ].filter(d => d.count > 0);
    if (!data.length) return "";
    const total = data.reduce((s, d) => s + d.count, 0);
    let offset = 0;
    const R = 38, C = 2 * Math.PI * R;
    return data.map(d => {
      const pct = d.count / total;
      const dash = pct * C;
      const gap = C - dash;
      const seg = `<circle cx="50" cy="50" r="${R}" fill="none" stroke="${d.color}" stroke-width="12" stroke-dasharray="${dash} ${gap}" stroke-dashoffset="${-offset}" stroke-linecap="round" class="donut-seg" style="--delay:${offset / C}"/>`;
      offset += dash;
      return seg;
    }).join("");
  };

  // Compliance data
  const complianceRows = (analysis.clauseCompliance || []).map(c => {
    const total = c.compliant + c.nonCompliant + c.missing;
    const pct = total > 0 ? Math.round((c.compliant / total) * 100) : 0;
    return { ...c, pct, total };
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(analysis.projectName)} — Executive Report</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
:root{
  --bg:#050a18;--bg2:#0c1529;--bg3:#111d35;--bg4:#172345;
  --glass:rgba(15,25,50,0.7);--glass2:rgba(20,35,65,0.6);
  --accent:#c9a84c;--accent2:#e8c85a;--gold:linear-gradient(135deg,#c9a84c,#e8c85a,#dbb94e);
  --text:#e8ecf4;--text2:#94a3b8;--text3:#64748b;
  --border:#1e3050;--border2:#253d5f;
  --red:#ef4444;--orange:#f97316;--amber:#eab308;--green:#22c55e;--blue:#3b82f6;--purple:#8b5cf6;--cyan:#06b6d4;
  --shadow:0 8px 32px rgba(0,0,0,0.4);--shadow-lg:0 20px 60px rgba(0,0,0,0.5);
}
html{scroll-behavior:smooth;overflow-x:hidden}
body{background:var(--bg);color:var(--text);font-family:'Inter',system-ui,-apple-system,sans-serif;line-height:1.6;-webkit-font-smoothing:antialiased;overflow-x:hidden;word-break:break-word;-webkit-text-size-adjust:100%}
img{max-width:100%;height:auto}

/* Animated background */
body::before{content:'';position:fixed;inset:0;background:radial-gradient(ellipse at 20% 0%,rgba(99,102,241,0.08) 0%,transparent 60%),radial-gradient(ellipse at 80% 100%,rgba(201,168,76,0.06) 0%,transparent 60%);pointer-events:none;z-index:0}

/* Layout */
.page{position:relative;z-index:1;max-width:1100px;margin:0 auto;padding:0 28px 80px}

/* Nav */
.nav{position:sticky;top:0;z-index:100;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);background:rgba(5,10,24,0.85);border-bottom:1px solid var(--border);padding:10px 28px;margin:0 -28px;display:flex;align-items:center;gap:16px;overflow-x:auto;scrollbar-width:none}
.nav::-webkit-scrollbar{display:none}
.nav-brand{font-weight:800;font-size:13px;background:var(--gold);-webkit-background-clip:text;-webkit-text-fill-color:transparent;white-space:nowrap;letter-spacing:-0.3px}
.nav-sep{width:1px;height:20px;background:var(--border);flex-shrink:0}
.nav-link{color:var(--text3);font-size:11px;font-weight:600;text-decoration:none;white-space:nowrap;padding:4px 10px;border-radius:6px;transition:all .25s}
.nav-link:hover{color:var(--text);background:var(--bg3)}

/* Hero */
.hero{padding:56px 0 40px;text-align:center;position:relative}
.hero::after{content:'';position:absolute;bottom:0;left:10%;right:10%;height:1px;background:linear-gradient(90deg,transparent,var(--border2),transparent)}
.hero-badge{display:inline-block;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:var(--accent);background:rgba(201,168,76,0.1);border:1px solid rgba(201,168,76,0.25);padding:5px 18px;border-radius:99px;margin-bottom:20px}
.hero h1{font-size:42px;font-weight:900;letter-spacing:-1.5px;line-height:1.1;margin-bottom:6px}
.hero h1 span{background:var(--gold);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.hero-sub{font-size:15px;color:var(--text2);font-weight:400;margin-bottom:24px}
.hero-project{font-size:20px;font-weight:700;color:var(--text);margin-bottom:8px}
.hero-meta{font-size:12px;color:var(--text3);line-height:2}
.hero-meta b{color:var(--text2);font-weight:600}

/* KPI Strip */
.kpi-strip{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin:32px 0 40px}
.kpi{background:var(--bg2);border:1px solid var(--border);border-radius:14px;padding:18px 16px;text-align:center;position:relative;overflow:hidden;transition:transform .3s,box-shadow .3s}
.kpi:hover{transform:translateY(-3px);box-shadow:var(--shadow)}
.kpi::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;border-radius:14px 14px 0 0}
.kpi.rating::before{background:${ratingColor(analysis.overallRating)}}
.kpi.score::before{background:var(--blue)}
.kpi.verdict::before{background:${verdictColor(analysis.goNoGo)}}
.kpi.risks::before{background:var(--orange)}
.kpi.checklist::before{background:var(--purple)}
.kpi-label{font-size:9px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--text3);margin-bottom:8px}
.kpi-value{font-size:28px;font-weight:900;letter-spacing:-1px;line-height:1}
.kpi-sub{font-size:10px;color:var(--text3);margin-top:4px;font-weight:500}

/* Score ring */
.ring-wrap{display:inline-block;position:relative;width:56px;height:56px}
.ring-wrap svg{transform:rotate(-90deg)}
.ring-num{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900}

/* Section */
.section{margin-bottom:28px;animation:fadeUp .5s ease both}
.section:nth-child(odd){animation-delay:.1s}
.section:nth-child(even){animation-delay:.15s}
.sec-head{display:flex;align-items:center;gap:10px;margin-bottom:16px;cursor:pointer;user-select:none;padding:0 2px}
.sec-icon{width:32px;height:32px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0}
.sec-title{font-size:15px;font-weight:800;letter-spacing:-0.3px;flex:1}
.sec-count{font-size:10px;font-weight:800;background:var(--bg4);color:var(--text2);padding:3px 10px;border-radius:99px}
.sec-chev{color:var(--text3);transition:transform .3s;font-size:11px;margin-left:4px}
.sec-chev.closed{transform:rotate(-90deg)}
.sec-body{transition:max-height .4s ease,opacity .3s ease;overflow:hidden}
.sec-body.hide{max-height:0!important;opacity:0;pointer-events:none}

/* Card */
.card{background:var(--bg2);border:1px solid var(--border);border-radius:14px;overflow:hidden;transition:box-shadow .3s}
.card:hover{box-shadow:0 4px 20px rgba(0,0,0,0.25)}
.card-inner{padding:20px 22px}

/* Two column */
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px}

/* Tables */
table{width:100%;border-collapse:collapse}
th{text-align:left;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--accent);padding:10px 14px;border-bottom:2px solid var(--border);background:var(--bg3)}
td{padding:10px 14px;font-size:13px;border-bottom:1px solid rgba(30,48,80,0.5);transition:background .2s}
tr:hover td{background:rgba(255,255,255,0.02)}
.val{color:var(--accent2);font-weight:700}

/* Detection pills */
.det-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px}
.det-pill{background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:10px 14px;display:flex;flex-direction:column;gap:2px}
.det-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text3)}
.det-val{font-size:14px;font-weight:700;color:var(--text)}

/* Risk */
.risk-toolbar{display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;align-items:center}
.r-btn{background:var(--bg3);border:1px solid var(--border);color:var(--text3);padding:6px 14px;border-radius:8px;cursor:pointer;font-size:11px;font-weight:700;transition:all .25s;font-family:inherit}
.r-btn:hover,.r-btn.on{color:#fff;border-color:transparent}
.r-btn.on[data-s="ALL"]{background:var(--accent);color:#000}
.r-btn.on[data-s="CRITICAL"]{background:var(--red)}
.r-btn.on[data-s="HIGH"]{background:var(--orange)}
.r-btn.on[data-s="MEDIUM"]{background:var(--amber);color:#000}
.r-btn.on[data-s="LOW"]{background:var(--green)}
.risk-search{background:var(--bg3);border:1px solid var(--border);color:var(--text);padding:6px 14px;border-radius:8px;font-size:11px;font-family:inherit;outline:none;flex:1;min-width:160px;transition:border .25s}
.risk-search:focus{border-color:var(--accent)}
.risk-search::placeholder{color:var(--text3)}

.risk-card{background:var(--bg3);border:1px solid var(--border);border-radius:12px;padding:16px 18px;margin-bottom:10px;border-left:4px solid var(--border);transition:all .25s;cursor:pointer}
.risk-card:hover{transform:translateX(4px);box-shadow:0 4px 16px rgba(0,0,0,0.2)}
.risk-card[data-s="CRITICAL"]{border-left-color:var(--red)}
.risk-card[data-s="HIGH"]{border-left-color:var(--orange)}
.risk-card[data-s="MEDIUM"]{border-left-color:var(--amber)}
.risk-card[data-s="LOW"]{border-left-color:var(--green)}
.risk-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px}
.sev{font-size:9px;font-weight:800;padding:3px 8px;border-radius:4px;letter-spacing:.5px}
.risk-clause{font-weight:700;font-size:13px;flex:1}
.fidic-tag{font-size:9px;color:var(--blue);background:rgba(59,130,246,0.12);padding:2px 8px;border-radius:4px;font-weight:600}
.risk-desc{font-size:12px;color:var(--text2);line-height:1.6;margin-bottom:4px}
.risk-rec{font-size:11.5px;color:var(--green);font-weight:500;opacity:.85}
.risk-expand{max-height:0;overflow:hidden;transition:max-height .35s ease}
.risk-card.open .risk-expand{max-height:300px}
.risk-detail{padding-top:10px;border-top:1px solid var(--border);margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:12px}
.risk-detail dt{color:var(--text3);font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:.5px}
.risk-detail dd{color:var(--text2);margin:0 0 8px}

/* Donut */
.donut-wrap{display:flex;align-items:center;gap:24px;padding:16px 0}
.donut-svg{width:120px;height:120px;flex-shrink:0}
.donut-seg{transition:stroke-dasharray .8s ease;animation:donutIn 1s ease both;animation-delay:calc(var(--delay) * 1s)}
.donut-legend{display:flex;flex-direction:column;gap:8px}
.legend-row{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600}
.legend-dot{width:10px;height:10px;border-radius:3px;flex-shrink:0}
.legend-num{margin-left:auto;font-weight:800;font-size:14px}

/* Compliance */
.comp-row{margin-bottom:14px}
.comp-label{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.comp-name{font-size:13px;font-weight:700}
.comp-pct{font-size:14px;font-weight:900}
.comp-track{height:10px;background:var(--bg);border-radius:5px;overflow:hidden;position:relative}
.comp-fill{height:100%;border-radius:5px;transition:width 1.2s cubic-bezier(.4,0,.2,1);width:0}
.comp-counts{display:flex;gap:16px;font-size:11px;color:var(--text3);margin-top:4px}
.comp-counts span{font-weight:600}

/* Stakeholders */
.stak-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
.stak-card{background:var(--bg3);border:1px solid var(--border);border-radius:12px;padding:16px;transition:transform .25s}
.stak-card:hover{transform:translateY(-2px)}
.stak-head{display:flex;align-items:center;gap:8px;margin-bottom:10px}
.stak-emoji{font-size:22px}
.stak-role{font-size:14px;font-weight:800;flex:1}
.stak-v{font-size:11px;font-weight:800;padding:3px 10px;border-radius:6px}
.stak-row{font-size:12px;color:var(--text2);margin-top:6px;line-height:1.5}
.stak-row strong{color:var(--text);font-weight:600}

/* Checklist */
.ck-progress{display:flex;align-items:center;gap:16px;margin-bottom:16px;padding:14px 18px;background:var(--bg3);border-radius:10px}
.ck-ring{width:48px;height:48px;position:relative;flex-shrink:0}
.ck-ring svg{transform:rotate(-90deg)}
.ck-ring-num{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900}
.ck-stats{display:flex;gap:16px}
.ck-stat{text-align:center}
.ck-stat-num{font-size:20px;font-weight:900;display:block}
.ck-stat-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--text3)}
.ck-item{display:flex;align-items:center;gap:10px;padding:8px 14px;border-bottom:1px solid rgba(30,48,80,.4)}
.ck-item:last-child{border:none}
.ck-num{width:24px;text-align:center;font-size:11px;font-weight:700;color:var(--text3)}
.ck-name{flex:1;font-size:12.5px}
.ck-status{font-size:10px;font-weight:800;padding:3px 10px;border-radius:4px;white-space:nowrap}
.ck-status.pass{background:rgba(34,197,94,.15);color:var(--green)}
.ck-status.fail{background:rgba(239,68,68,.15);color:var(--red)}
.ck-status.warn{background:rgba(234,179,8,.15);color:var(--amber)}
.ck-status.na{background:rgba(100,116,139,.1);color:var(--text3)}
.ck-notes{font-size:11px;color:var(--text3);max-width:280px}

/* Summary */
.summary-text{font-size:14px;line-height:1.85;color:var(--text2)}
.summary-ar{direction:rtl;font-size:14px;line-height:2;color:var(--text2)}
.lang-switch{display:inline-flex;background:var(--bg3);border-radius:8px;overflow:hidden;border:1px solid var(--border);margin-bottom:14px}
.lang-btn{padding:6px 16px;border:none;cursor:pointer;font-size:11px;font-weight:700;color:var(--text3);background:transparent;font-family:inherit;transition:all .25s}
.lang-btn.on{background:var(--accent);color:#000}
.verdict-box{margin-top:14px;padding:14px 18px;border-radius:10px;background:var(--bg3);border-left:4px solid}
.verdict-title{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:4px}
.verdict-text{font-size:13px;color:var(--text2);line-height:1.6}

/* Timeline */
.timeline{position:relative;padding-left:20px}
.timeline::before{content:'';position:absolute;left:6px;top:4px;bottom:4px;width:2px;background:var(--border);border-radius:1px}
.tl-item{position:relative;padding:0 0 14px 16px}
.tl-item::before{content:'';position:absolute;left:-17px;top:6px;width:8px;height:8px;border-radius:50%;background:var(--accent);border:2px solid var(--bg2);z-index:1}
.tl-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--accent)}
.tl-value{font-size:14px;font-weight:600;color:var(--text)}

/* Footer */
.footer{text-align:center;padding:40px 0 20px;border-top:1px solid var(--border);color:var(--text3);font-size:11px;margin-top:20px}
.footer-brand{font-weight:800;font-size:14px;background:var(--gold);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:6px;display:block}

/* Print */
@media print{
  body{background:#fff;color:#1a1a2e}
  body::before{display:none}
  .nav{display:none}
  .card,.kpi,.risk-card,.stak-card,.det-pill{border:1px solid #e2e8f0;background:#f8fafc;print-color-adjust:exact;-webkit-print-color-adjust:exact}
  .sec-body.hide{max-height:none!important;opacity:1!important;pointer-events:auto!important}
  .sec-chev{display:none}
  .risk-toolbar{display:none}
  .kpi::before{print-color-adjust:exact;-webkit-print-color-adjust:exact}
  th{background:#f1f5f9;color:#92400e}
  td{border-color:#e2e8f0}
}

/* Responsive — Tablet */
@media(max-width:768px){
  .page{padding:0 16px 60px}
  .nav{padding:8px 16px;margin:0 -16px;gap:10px}
  .nav-brand{font-size:11px}
  .nav-link{font-size:10px;padding:4px 8px}
  .hero{padding:36px 0 28px}
  .hero h1{font-size:28px}
  .hero-sub{font-size:13px}
  .hero-project{font-size:17px}
  .hero-meta{font-size:11px}
  .kpi-strip{grid-template-columns:repeat(2,1fr);gap:10px;margin:20px 0 28px}
  .kpi{padding:14px 12px}
  .kpi-value{font-size:22px}
  .kpi-label{font-size:8px}
  .two-col{grid-template-columns:1fr}
  .stak-grid{grid-template-columns:1fr}
  .risk-detail{grid-template-columns:1fr}
  .det-grid{grid-template-columns:repeat(2,1fr)}
  .donut-wrap{flex-direction:column;align-items:stretch;gap:16px}
  .donut-svg{width:100px;height:100px;margin:0 auto}
  .donut-legend{flex-direction:row;flex-wrap:wrap;gap:12px;justify-content:center}
  .sec-title{font-size:14px}
  .card-inner{padding:14px 16px}
  table{display:block;overflow-x:auto;-webkit-overflow-scrolling:touch;white-space:nowrap}
  th{font-size:9px;padding:8px 10px}
  td{font-size:12px;padding:8px 10px}
  .risk-card{padding:12px 14px}
  .risk-clause{font-size:12px}
  .risk-desc{font-size:11px}
  .risk-rec{font-size:11px}
  .risk-toolbar{gap:4px}
  .r-btn{padding:5px 10px;font-size:10px}
  .risk-search{font-size:10px;padding:5px 10px;min-width:120px}
  .ck-progress{padding:10px 14px;gap:12px}
  .ck-stats{gap:10px}
  .ck-item{padding:8px 10px;gap:8px}
  .ck-name{font-size:11.5px}
  .ck-notes{font-size:10px;max-width:200px}
  .comp-name{font-size:12px}
  .comp-pct{font-size:12px}
  .stak-card{padding:12px}
  .stak-role{font-size:12px}
  .stak-row{font-size:11px}
  .footer{padding:28px 0 16px;font-size:10px}
  .footer-brand{font-size:12px}
}

/* Responsive — Mobile */
@media(max-width:480px){
  .page{padding:0 10px 40px}
  .nav{padding:6px 10px;margin:0 -10px;gap:6px}
  .nav-brand{font-size:10px;letter-spacing:-0.5px}
  .nav-link{font-size:9px;padding:3px 6px}
  .nav-sep{height:16px}
  .hero{padding:24px 0 20px}
  .hero-badge{font-size:8px;padding:4px 12px;letter-spacing:2px}
  .hero h1{font-size:22px;letter-spacing:-1px}
  .hero-sub{font-size:12px;margin-bottom:16px}
  .hero-project{font-size:15px}
  .hero-meta{font-size:10px}
  .kpi-strip{grid-template-columns:1fr 1fr;gap:8px;margin:16px 0 20px}
  .kpi{padding:12px 10px;border-radius:10px}
  .kpi-label{font-size:7px;letter-spacing:1px;margin-bottom:4px}
  .kpi-value{font-size:20px}
  .kpi-sub{font-size:9px}
  .ring-wrap{width:44px;height:44px}
  .ring-num{font-size:14px}
  .section{margin-bottom:20px}
  .sec-head{gap:8px;margin-bottom:10px}
  .sec-icon{width:26px;height:26px;border-radius:8px;font-size:12px}
  .sec-title{font-size:13px}
  .sec-count{font-size:9px;padding:2px 8px}
  .card{border-radius:10px}
  .card-inner{padding:12px}
  .det-grid{grid-template-columns:1fr;gap:6px}
  .det-pill{padding:8px 10px;border-radius:8px}
  .det-label{font-size:9px}
  .det-val{font-size:12px}
  .donut-wrap{padding:12px 0}
  .donut-svg{width:90px;height:90px}
  .legend-row{font-size:11px}
  .legend-num{font-size:12px}
  .risk-toolbar{flex-wrap:nowrap;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:4px}
  .r-btn{padding:5px 8px;font-size:9px;white-space:nowrap;flex-shrink:0}
  .risk-search{min-width:100px;font-size:10px}
  .risk-card{padding:10px 12px;border-radius:10px;margin-bottom:8px;border-left-width:3px}
  .risk-top{gap:6px;margin-bottom:4px}
  .sev{font-size:8px;padding:2px 6px}
  .risk-clause{font-size:11px}
  .fidic-tag{font-size:8px;padding:2px 6px}
  .risk-desc{font-size:11px;line-height:1.5}
  .risk-rec{font-size:10px}
  .risk-expand .risk-detail{gap:8px;font-size:11px}
  .risk-detail dt{font-size:9px}
  .risk-detail dd{font-size:11px}
  .comp-row{margin-bottom:10px}
  .comp-label{margin-bottom:4px}
  .comp-name{font-size:11px}
  .comp-pct{font-size:11px}
  .comp-track{height:8px}
  .comp-counts{gap:8px;font-size:10px;margin-top:3px}
  .stak-grid{gap:8px}
  .stak-card{padding:10px;border-radius:10px}
  .stak-head{gap:6px;margin-bottom:6px}
  .stak-emoji{font-size:18px}
  .stak-role{font-size:11px}
  .stak-v{font-size:9px;padding:2px 8px}
  .stak-row{font-size:10px;margin-top:4px;line-height:1.4}
  .ck-progress{flex-direction:column;gap:8px;padding:10px}
  .ck-ring{width:40px;height:40px}
  .ck-ring-num{font-size:11px}
  .ck-stats{gap:14px}
  .ck-stat-num{font-size:16px}
  .ck-stat-label{font-size:8px}
  .ck-item{padding:6px 8px;gap:6px;flex-wrap:wrap}
  .ck-num{width:20px;font-size:10px}
  .ck-name{font-size:11px;min-width:0}
  .ck-status{font-size:9px;padding:2px 8px}
  .ck-notes{font-size:9px;max-width:none;width:100%;margin-top:2px}
  .summary-text{font-size:12px;line-height:1.7}
  .summary-ar{font-size:12px;line-height:1.8}
  .lang-switch{margin-bottom:10px}
  .lang-btn{padding:5px 12px;font-size:10px}
  .verdict-box{padding:10px 14px;margin-top:10px;border-radius:8px}
  .verdict-title{font-size:9px;letter-spacing:1px}
  .verdict-text{font-size:11px}
  .timeline{padding-left:16px}
  .tl-item{padding:0 0 10px 12px}
  .tl-item::before{left:-13px;width:6px;height:6px}
  .tl-label{font-size:9px}
  .tl-value{font-size:12px}
  .footer{padding:20px 0 12px;margin-top:16px}
  .footer-brand{font-size:11px}
  table{font-size:11px}
  th{padding:6px 8px;font-size:8px}
  td{padding:6px 8px;font-size:11px}
}

/* Animations */
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes donutIn{from{stroke-dasharray:0 300}to{}}
@keyframes countUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}
.anim-count{animation:countUp .6s ease both}
</style>
</head>
<body>

<!-- Sticky Nav -->
<nav class="nav">
  <span class="nav-brand">Contract Intelligence</span>
  <span class="nav-sep"></span>
  <a href="#summary" class="nav-link">Summary</a>
  <a href="#financials" class="nav-link">Financials</a>
  <a href="#detection" class="nav-link">Detection</a>
  <a href="#risks" class="nav-link">Risks</a>
  <a href="#compliance" class="nav-link">Compliance</a>
  <a href="#stakeholders" class="nav-link">Stakeholders</a>
  <a href="#checklist" class="nav-link">Checklist</a>
</nav>

<div class="page">

<!-- Hero -->
<section class="hero">
  <div class="hero-badge">Confidential &mdash; Executive Report</div>
  <h1>Contract <span>Intelligence</span></h1>
  <div class="hero-sub">Risk Analysis &amp; Compliance Assessment</div>
  <div class="hero-project">${esc(analysis.projectName)}</div>
  <div class="hero-meta">
    <b>${esc(analysis.contractType)}</b> &nbsp;&bull;&nbsp; 
    <b>${esc(`${analysis.contractValue} ${analysis.currency}`)}</b><br>
    Analyzed ${dateStr} at ${timeStr} &nbsp;&bull;&nbsp; Prepared by Hassan Ahmed Soliman
  </div>
</section>

<!-- KPI Strip -->
<div class="kpi-strip">
  <div class="kpi rating">
    <div class="kpi-label">Overall Rating</div>
    <div class="kpi-value anim-count" style="color:${ratingColor(analysis.overallRating)}">${analysis.overallRating}</div>
    <div class="kpi-sub">${analysis.overallRating === "RED" ? "High Risk" : analysis.overallRating === "AMBER" ? "Moderate" : "Low Risk"}</div>
  </div>
  <div class="kpi score">
    <div class="kpi-label">Risk Score</div>
    <div class="ring-wrap">
      <svg width="56" height="56"><circle cx="28" cy="28" r="23" fill="none" stroke="var(--border)" stroke-width="4"/><circle cx="28" cy="28" r="23" fill="none" stroke="${ratingColor(analysis.overallRating)}" stroke-width="4" stroke-dasharray="${(analysis.riskScore / 100) * 144.5} 144.5" stroke-linecap="round" class="donut-seg" style="--delay:0"/></svg>
      <div class="ring-num">${analysis.riskScore}</div>
    </div>
    <div class="kpi-sub">/ 100</div>
  </div>
  <div class="kpi verdict">
    <div class="kpi-label">Verdict</div>
    <div class="kpi-value anim-count" style="color:${verdictColor(analysis.goNoGo)};font-size:22px">${analysis.goNoGo}</div>
    <div class="kpi-sub">Signing Decision</div>
  </div>
  <div class="kpi risks">
    <div class="kpi-label">Total Risks</div>
    <div class="kpi-value anim-count" style="color:var(--orange)">${totalRisks}</div>
    <div class="kpi-sub">${rc.critical} critical, ${rc.high} high</div>
  </div>
  <div class="kpi checklist">
    <div class="kpi-label">Checklist</div>
    <div class="kpi-value anim-count" style="color:var(--purple)">${ckPct}%</div>
    <div class="kpi-sub">${ckPass}/${ckTotal} passed</div>
  </div>
</div>

<!-- Executive Summary -->
<section class="section" id="summary">
  <div class="sec-head" onclick="toggleSec(this)">
    <div class="sec-icon" style="background:rgba(99,102,241,.15);color:#818cf8">&#128203;</div>
    <div class="sec-title">Executive Summary</div>
    <span class="sec-chev">&#9660;</span>
  </div>
  <div class="sec-body card">
    <div class="card-inner">
      <div class="lang-switch">
        <button class="lang-btn on" onclick="switchLang('en',this)">English</button>
        <button class="lang-btn" onclick="switchLang('ar',this)">&#1593;&#1585;&#1576;&#1610;</button>
      </div>
      <div id="sum-en" class="summary-text">${esc(analysis.executiveSummaryEn)}</div>
      <div id="sum-ar" class="summary-ar" style="display:none">${esc(analysis.executiveSummaryAr)}</div>
      ${analysis.goNoGoReason ? `
        <div class="verdict-box" style="border-color:${verdictColor(analysis.goNoGo)}">
          <div class="verdict-title" style="color:${verdictColor(analysis.goNoGo)}">Verdict Rationale</div>
          <div class="verdict-text">${esc(analysis.goNoGoReason)}</div>
        </div>` : ""}
    </div>
  </div>
</section>

<!-- Financial Highlights -->
${analysis.financialHighlights?.length ? `
<section class="section" id="financials">
  <div class="sec-head" onclick="toggleSec(this)">
    <div class="sec-icon" style="background:rgba(201,168,76,.15);color:var(--accent)">&#128176;</div>
    <div class="sec-title">Financial Highlights</div>
    <span class="sec-count">${analysis.financialHighlights.length} items</span>
    <span class="sec-chev">&#9660;</span>
  </div>
  <div class="sec-body card">
    <table>
      <thead><tr><th>Item</th><th>Value</th><th style="text-align:center">Trend</th></tr></thead>
      <tbody>
        ${analysis.financialHighlights.map(f => `
          <tr>
            <td>${esc(f.label)}</td>
            <td class="val">${esc(f.value)}</td>
            <td style="text-align:center;font-size:16px">${f.trend === "up" ? '<span style="color:#22c55e">&#9650;</span>' : f.trend === "down" ? '<span style="color:#ef4444">&#9660;</span>' : '<span style="color:#64748b">&#8212;</span>'}</td>
          </tr>`).join("")}
      </tbody>
    </table>
  </div>
</section>` : ""}

<!-- Smart Detection + Key Dates -->
${analysis.autoDetect || analysis.keyDates?.length ? `
<section class="section" id="detection">
  <div class="sec-head" onclick="toggleSec(this)">
    <div class="sec-icon" style="background:rgba(6,182,212,.15);color:var(--cyan)">&#128269;</div>
    <div class="sec-title">Smart Detection & Key Dates</div>
    <span class="sec-chev">&#9660;</span>
  </div>
  <div class="sec-body">
    <div class="two-col">
      ${analysis.autoDetect ? `<div class="card"><div class="card-inner">
        <div style="font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">Contract Detection</div>
        <div class="det-grid">
          ${[
            ["Language", analysis.autoDetect.contractLanguage],
            ["Type", analysis.autoDetect.contractType],
            ["FIDIC", analysis.autoDetect.fidicVersion],
            ["Project", analysis.autoDetect.projectType],
            ["Employer", analysis.autoDetect.parties?.employer],
            ["Contractor", analysis.autoDetect.parties?.contractor],
          ].filter(([_, v]) => v).map(([l, v]) => `
            <div class="det-pill"><span class="det-label">${l}</span><span class="det-val">${esc(v as string)}</span></div>
          `).join("")}
        </div>
      </div></div>` : ""}
      ${analysis.keyDates?.length ? `<div class="card"><div class="card-inner">
        <div style="font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">Key Milestones</div>
        <div class="timeline">
          ${analysis.keyDates.map(d => `
            <div class="tl-item">
              <div class="tl-label">${esc(d.label)}</div>
              <div class="tl-value">${esc(d.value)}</div>
            </div>
          `).join("")}
        </div>
      </div></div>` : ""}
    </div>
  </div>
</section>` : ""}

<!-- Risk Register -->
<section class="section" id="risks">
  <div class="sec-head" onclick="toggleSec(this)">
    <div class="sec-icon" style="background:rgba(239,68,68,.15);color:var(--red)">&#9888;</div>
    <div class="sec-title">Risk Register</div>
    <span class="sec-count">${totalRisks} risks</span>
    <span class="sec-chev">&#9660;</span>
  </div>
  <div class="sec-body">
    <!-- Donut + Filters -->
    <div class="card" style="margin-bottom:12px">
      <div class="card-inner">
        <div class="donut-wrap">
          <svg class="donut-svg" viewBox="0 0 100 100">${donutSegments()}<text x="50" y="50" text-anchor="middle" dominant-baseline="central" fill="var(--text)" font-size="18" font-weight="900">${totalRisks}</text><text x="50" y="62" text-anchor="middle" fill="var(--text3)" font-size="7" font-weight="600">RISKS</text></svg>
          <div class="donut-legend">
            ${rc.critical ? `<div class="legend-row"><span class="legend-dot" style="background:#ef4444"></span>Critical<span class="legend-num">${rc.critical}</span></div>` : ""}
            ${rc.high ? `<div class="legend-row"><span class="legend-dot" style="background:#f97316"></span>High<span class="legend-num">${rc.high}</span></div>` : ""}
            ${rc.medium ? `<div class="legend-row"><span class="legend-dot" style="background:#eab308"></span>Medium<span class="legend-num">${rc.medium}</span></div>` : ""}
            ${rc.low ? `<div class="legend-row"><span class="legend-dot" style="background:#22c55e"></span>Low<span class="legend-num">${rc.low}</span></div>` : ""}
          </div>
        </div>
      </div>
    </div>
    <div class="risk-toolbar">
      <button class="r-btn on" data-s="ALL" onclick="filterR('ALL',this)">All</button>
      <button class="r-btn" data-s="CRITICAL" onclick="filterR('CRITICAL',this)">Critical</button>
      <button class="r-btn" data-s="HIGH" onclick="filterR('HIGH',this)">High</button>
      <button class="r-btn" data-s="MEDIUM" onclick="filterR('MEDIUM',this)">Medium</button>
      <button class="r-btn" data-s="LOW" onclick="filterR('LOW',this)">Low</button>
      <input type="text" class="risk-search" placeholder="Search risks..." oninput="searchR(this.value)">
    </div>
    <div id="risk-list">
      ${sortedRisks.map((r, i) => `
        <div class="risk-card" data-s="${r.severity}" onclick="this.classList.toggle('open')">
          <div class="risk-top">
            <span class="sev" style="background:${sevColor(r.severity)}18;color:${sevColor(r.severity)}">${r.severity}</span>
            <span class="risk-clause">${esc(r.clause)}</span>
            ${r.fidic ? `<span class="fidic-tag">${esc(r.fidic)}</span>` : ""}
          </div>
          <div class="risk-desc">${esc(r.description)}</div>
          <div class="risk-rec">&rarr; ${esc(r.recommendation)}</div>
          <div class="risk-expand">
            <div class="risk-detail">
              ${r.currentWording ? `<div><dt>Current Wording</dt><dd>${esc(r.currentWording)}</dd></div>` : ""}
              ${r.requiredWording ? `<div><dt>Required Wording</dt><dd>${esc(r.requiredWording)}</dd></div>` : ""}
              ${r.responsibility ? `<div><dt>Responsibility</dt><dd>${esc(r.responsibility)}</dd></div>` : ""}
              ${r.fidic ? `<div><dt>FIDIC Reference</dt><dd>${esc(r.fidic)}</dd></div>` : ""}
            </div>
          </div>
        </div>
      `).join("")}
    </div>
  </div>
</section>

<!-- FIDIC Compliance -->
${complianceRows.length ? `
<section class="section" id="compliance">
  <div class="sec-head" onclick="toggleSec(this)">
    <div class="sec-icon" style="background:rgba(139,92,246,.15);color:var(--purple)">&#128202;</div>
    <div class="sec-title">FIDIC Compliance</div>
    <span class="sec-chev">&#9660;</span>
  </div>
  <div class="sec-body card">
    <div class="card-inner">
      ${complianceRows.map(c => `
        <div class="comp-row">
          <div class="comp-label">
            <span class="comp-name">${esc(c.standard)}</span>
            <span class="comp-pct" style="color:${c.pct >= 80 ? 'var(--green)' : c.pct >= 50 ? 'var(--amber)' : 'var(--red)'}">${c.pct}%</span>
          </div>
          <div class="comp-track"><div class="comp-fill" data-w="${c.pct}" style="background:${c.pct >= 80 ? 'var(--green)' : c.pct >= 50 ? 'var(--amber)' : 'var(--red)'}"></div></div>
          <div class="comp-counts">
            <span style="color:var(--green)">${c.compliant} compliant</span>
            <span style="color:var(--red)">${c.nonCompliant} non-compliant</span>
            <span style="color:var(--amber)">${c.missing} missing</span>
          </div>
        </div>
      `).join("")}
    </div>
  </div>
</section>` : ""}

<!-- Stakeholders -->
${analysis.stakeholders?.length ? `
<section class="section" id="stakeholders">
  <div class="sec-head" onclick="toggleSec(this)">
    <div class="sec-icon" style="background:rgba(59,130,246,.15);color:var(--blue)">&#128101;</div>
    <div class="sec-title">Stakeholder Verdicts</div>
    <span class="sec-count">${analysis.stakeholders.length}</span>
    <span class="sec-chev">&#9660;</span>
  </div>
  <div class="sec-body">
    <div class="stak-grid">
      ${analysis.stakeholders.map(s => `
        <div class="stak-card">
          <div class="stak-head">
            <span class="stak-emoji">${s.icon || '&#9679;'}</span>
            <span class="stak-role">${esc(s.role)}</span>
            <span class="stak-v" style="background:${verdictColor(s.verdict)}18;color:${verdictColor(s.verdict)}">${s.verdict}</span>
          </div>
          <div class="stak-row"><strong>Top Risk:</strong> ${esc(s.topRisk)}</div>
          <div class="stak-row"><strong>Action:</strong> ${esc(s.actionRequired)}</div>
        </div>
      `).join("")}
    </div>
  </div>
</section>` : ""}

<!-- Checklist -->
${analysis.checklist?.length ? `
<section class="section" id="checklist">
  <div class="sec-head" onclick="toggleSec(this)">
    <div class="sec-icon" style="background:rgba(16,185,129,.15);color:var(--green)">&#9989;</div>
    <div class="sec-title">Review Checklist</div>
    <span class="sec-count">${ckPct}% pass rate</span>
    <span class="sec-chev">&#9660;</span>
  </div>
  <div class="sec-body">
    <div class="ck-progress">
      <div class="ck-ring">
        <svg width="48" height="48"><circle cx="24" cy="24" r="19" fill="none" stroke="var(--border)" stroke-width="4"/><circle cx="24" cy="24" r="19" fill="none" stroke="${ckPct >= 70 ? 'var(--green)' : ckPct >= 40 ? 'var(--amber)' : 'var(--red)'}" stroke-width="4" stroke-dasharray="${(ckPct / 100) * 119.4} 119.4" stroke-linecap="round" style="transform:rotate(-90deg);transform-origin:50% 50%"/></svg>
        <div class="ck-ring-num">${ckPct}%</div>
      </div>
      <div class="ck-stats">
        <div class="ck-stat"><span class="ck-stat-num" style="color:var(--green)">${ckPass}</span><span class="ck-stat-label">Pass</span></div>
        <div class="ck-stat"><span class="ck-stat-num" style="color:var(--red)">${ckFail}</span><span class="ck-stat-label">Fail</span></div>
        <div class="ck-stat"><span class="ck-stat-num" style="color:var(--amber)">${ckWarn}</span><span class="ck-stat-label">Warn</span></div>
      </div>
    </div>
    <div class="card">
      ${analysis.checklist.map(c => {
        const cls = c.status === "pass" ? "pass" : c.status === "fail" ? "fail" : c.status === "warning" ? "warn" : "na";
        const lbl = c.status === "pass" ? "PASS" : c.status === "fail" ? "FAIL" : c.status === "warning" ? "WARN" : "N/A";
        return `
          <div class="ck-item">
            <span class="ck-num">${c.itemNumber}</span>
            <span class="ck-name">${esc(c.item)}</span>
            <span class="ck-status ${cls}">${lbl}</span>
            <span class="ck-notes">${esc(c.notes)}</span>
          </div>`;
      }).join("")}
    </div>
  </div>
</section>` : ""}

<!-- Footer -->
<footer class="footer">
  <span class="footer-brand">Contract Intelligence Report</span>
  Prepared by Hassan Ahmed Soliman<br>
  Generated ${new Date().toLocaleDateString("en-GB")}
</footer>

</div>

<script>
// Section toggle
function toggleSec(head){
  var body=head.nextElementSibling;
  var chev=head.querySelector('.sec-chev');
  body.classList.toggle('hide');
  chev.classList.toggle('closed');
}

// Risk filter
function filterR(sev,btn){
  document.querySelectorAll('.r-btn').forEach(function(b){b.classList.remove('on')});
  btn.classList.add('on');
  document.querySelectorAll('.risk-card').forEach(function(c){
    c.style.display=(sev==='ALL'||c.dataset.s===sev)?'':'none';
  });
}

// Risk search
function searchR(q){
  q=q.toLowerCase();
  document.querySelectorAll('.risk-card').forEach(function(c){
    c.style.display=c.textContent.toLowerCase().indexOf(q)>-1?'':'none';
  });
}

// Language switch
function switchLang(lang,btn){
  document.getElementById('sum-en').style.display=lang==='en'?'':'none';
  document.getElementById('sum-ar').style.display=lang==='ar'?'':'none';
  btn.parentElement.querySelectorAll('.lang-btn').forEach(function(b){b.classList.remove('on')});
  btn.classList.add('on');
}

// Animate compliance bars on scroll
var observer=new IntersectionObserver(function(entries){
  entries.forEach(function(e){
    if(e.isIntersecting){
      var fills=e.target.querySelectorAll('.comp-fill');
      fills.forEach(function(f){f.style.width=f.dataset.w+'%'});
      observer.unobserve(e.target);
    }
  });
},{threshold:0.3});
var compSec=document.getElementById('compliance');
if(compSec)observer.observe(compSec);
</script>
</body>
</html>`;

  // Download — robust cross-browser approach
  const fileName = `${(analysis.projectName || "Contract").replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_")}_Executive_Report.html`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  // Try primary method: hidden anchor click
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.style.display = "none";
  document.body.appendChild(a);

  // Use setTimeout to ensure the element is in the DOM before clicking
  setTimeout(() => {
    a.click();

    // Fallback: if click-download didn't work (some Chrome builds block it),
    // open the blob URL in a new tab so the user can save manually
    const fallbackTimer = setTimeout(() => {
      try {
        const newWin = window.open(url, "_blank");
        if (!newWin || newWin.closed) {
          // If popup also blocked, create a data URI link the user can click
          console.warn("HTML report download may have been blocked. Trying data URI fallback.");
        }
      } catch {
        // ignore — primary download likely worked
      }
    }, 1500);

    // If the page gets a blur event quickly, the download dialog opened — cancel fallback
    const cancelFallback = () => {
      clearTimeout(fallbackTimer);
      window.removeEventListener("blur", cancelFallback);
    };
    window.addEventListener("blur", cancelFallback);

    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      window.removeEventListener("blur", cancelFallback);
    }, 5000);
  }, 100);
}
