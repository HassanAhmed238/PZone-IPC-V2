/**
 * ═══════════════════════════════════════════════════════════════
 *  Executive Contract Analysis — Professional PDF Report
 *  English-only (jsPDF does not support Arabic glyphs)
 *  Dark-themed, data-driven, compact
 * ═══════════════════════════════════════════════════════════════
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { AnalysisResult, ContractRisk, StakeholderInsight, ChecklistItem } from "./gemini-analyzer";

/* ── Color palette matching the dashboard ── */
const C = {
  bg: "#0F172A",
  bgCard: "#1E293B",
  accent: "#C9A84C",
  red: "#EF4444",
  amber: "#F59E0B",
  green: "#22C55E",
  blue: "#3B82F6",
  purple: "#8B5CF6",
  text: "#F1F5F9",
  textDim: "#94A3B8",
  border: "#334155",
  white: "#FFFFFF",
};

const ratingColor = (r: string) =>
  r === "RED" ? C.red : r === "AMBER" ? C.amber : C.green;

const severityColor = (s: string) => {
  if (s === "CRITICAL") return C.red;
  if (s === "HIGH") return "#F97316";
  if (s === "MEDIUM") return C.amber;
  return C.green;
};

const verdictColor = (v: string) =>
  v === "GO" ? C.green : v === "CONDITIONAL" ? C.amber : C.red;

/* ── Helpers ── */
function hexToRGB(hex: string): [number, number, number] {
  const clean = hex.replace("#", "").slice(0, 6);
  return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16)];
}

function trunc(text: string | undefined, max: number): string {
  if (!text) return "—";
  return text.length > max ? text.substring(0, max) + "..." : text;
}

/** Strip emoji/non-latin chars that jsPDF can't render */
function safeText(s: string | undefined): string {
  if (!s) return "—";
  // Keep basic latin, numbers, punctuation — strip emoji/arabic/etc.
  return s.replace(/[^\x20-\x7E\n\t.,;:!?@#$%^&*()_+=\-[\]{}|/\\<>'"`~]/g, "").trim() || "—";
}

/* ──────────────────────────────────────────────────────────────── */
/*  MAIN EXPORT FUNCTION                                          */
/* ──────────────────────────────────────────────────────────────── */
export async function downloadExecutivePDFReport(analysis: AnalysisResult) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();   // 210
  const H = doc.internal.pageSize.getHeight();  // 297
  const M = 14; // margin
  const CW = W - 2 * M; // content width (182mm)
  const FOOTER_H = 16;

  let y = 0;
  let currentPage = 1;

  /* ── Paint dark background on current page ── */
  const paintDarkBg = () => {
    doc.setFillColor(...hexToRGB(C.bg));
    doc.rect(0, 0, W, H, "F");
  };

  /* ── Add a new page with dark background ── */
  const newPage = () => {
    doc.addPage();
    currentPage++;
    paintDarkBg();
    // Accent strip at top of continuation pages
    doc.setFillColor(...hexToRGB(C.accent));
    doc.rect(0, 0, W, 1.5, "F");
    y = 12;
  };

  /* ── Check if we need a new page ── */
  const ensureSpace = (needed: number) => {
    if (y + needed > H - FOOTER_H - 4) {
      newPage();
    }
  };

  /* ── Branded Footer on every page ── */
  const addFooters = () => {
    const pg = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pg; i++) {
      doc.setPage(i);
      doc.setDrawColor(...hexToRGB(C.border));
      doc.line(M, H - FOOTER_H, W - M, H - FOOTER_H);
      doc.setFontSize(7);
      doc.setTextColor(...hexToRGB(C.textDim));
      doc.text("Contract Intelligence Report", M, H - 10);
      doc.text(`Confidential  |  ${new Date().toLocaleDateString("en-GB")}`, M, H - 6);
      doc.text(`Page ${i} / ${pg}`, W - M, H - 10, { align: "right" });
      doc.text("Prepared by Hassan Ahmed Soliman", W - M, H - 6, { align: "right" });
    }
  };

  /* ── Section Header (no emoji — jsPDF can't render them) ── */
  const sectionHeader = (title: string) => {
    ensureSpace(14);
    y += 3;
    // Accent bar
    doc.setFillColor(...hexToRGB(C.accent));
    doc.rect(M, y, 3, 8, "F");
    // Background strip
    doc.setFillColor(...hexToRGB(C.bgCard));
    doc.roundedRect(M + 3, y, CW - 3, 8, 1, 1, "F");
    // Title text
    doc.setFontSize(9);
    doc.setTextColor(...hexToRGB(C.accent));
    doc.setFont("helvetica", "bold");
    doc.text(title.toUpperCase(), M + 7, y + 5.5);
    y += 12;
  };

  /* ═══════════════════════════════════════════════════════ */
  /*  PAGE 1: Cover / Header                                */
  /* ═══════════════════════════════════════════════════════ */
  paintDarkBg();

  // Accent top bar
  doc.setFillColor(...hexToRGB(C.accent));
  doc.rect(0, 0, W, 3, "F");

  // Title
  y = 28;
  doc.setFontSize(28);
  doc.setTextColor(...hexToRGB(C.white));
  doc.setFont("helvetica", "bold");
  doc.text("Contract Analysis", M, y);
  y += 10;
  doc.setFontSize(18);
  doc.setTextColor(...hexToRGB(C.accent));
  doc.text("Executive Report", M, y);

  // Divider line
  y += 6;
  doc.setDrawColor(...hexToRGB(C.accent));
  doc.setLineWidth(0.4);
  doc.line(M, y, M + 50, y);
  doc.setLineWidth(0.2);

  // Project Name
  y += 10;
  doc.setFontSize(14);
  doc.setTextColor(...hexToRGB(C.text));
  doc.setFont("helvetica", "bold");
  const projLines = doc.splitTextToSize(safeText(analysis.projectName), CW);
  doc.text(projLines.slice(0, 2), M, y);
  y += projLines.slice(0, 2).length * 6 + 2;

  // Metadata line 1
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...hexToRGB(C.textDim));
  const meta1 = safeText(`${analysis.contractType}  |  ${analysis.contractValue} ${analysis.currency}  |  ${analysis.dashboardFile || ""}`);
  doc.text(trunc(meta1, 100), M, y);

  // Metadata line 2
  y += 5;
  const dateStr = new Date(analysis.analyzedAt).toLocaleDateString("en-GB") + " " +
    new Date(analysis.analyzedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  doc.text(`Analyzed: ${dateStr}  |  Prepared by Hassan Ahmed Soliman`, M, y);

  // ── three rating boxes ──
  y += 12;
  const boxW = (CW - 8) / 3;
  const boxH = 26;

  // Box 1: Overall Rating
  const rc = hexToRGB(ratingColor(analysis.overallRating));
  doc.setFillColor(rc[0], rc[1], rc[2]);
  doc.roundedRect(M, y, boxW, boxH, 3, 3, "F");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "normal");
  doc.text("OVERALL RATING", M + boxW / 2, y + 5, { align: "center" });
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(analysis.overallRating, M + boxW / 2, y + 16, { align: "center" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  const riskLabel = analysis.overallRating === "RED" ? "HIGH RISK" : analysis.overallRating === "AMBER" ? "MODERATE RISK" : "LOW RISK";
  doc.text(riskLabel, M + boxW / 2, y + 22, { align: "center" });

  // Box 2: Risk Score
  const bx2 = M + boxW + 4;
  doc.setFillColor(...hexToRGB(C.bgCard));
  doc.roundedRect(bx2, y, boxW, boxH, 3, 3, "F");
  doc.setDrawColor(...hexToRGB(C.border));
  doc.roundedRect(bx2, y, boxW, boxH, 3, 3, "S");
  doc.setFontSize(7);
  doc.setTextColor(...hexToRGB(C.textDim));
  doc.text("RISK SCORE", bx2 + boxW / 2, y + 5, { align: "center" });
  doc.setFontSize(20);
  doc.setTextColor(...hexToRGB(C.white));
  doc.setFont("helvetica", "bold");
  doc.text(`${analysis.riskScore}`, bx2 + boxW / 2, y + 16, { align: "center" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...hexToRGB(C.textDim));
  doc.text("/ 100", bx2 + boxW / 2, y + 22, { align: "center" });

  // Box 3: Signing Verdict
  const bx3 = M + (boxW + 4) * 2;
  const vc = hexToRGB(verdictColor(analysis.goNoGo));
  doc.setFillColor(...hexToRGB(C.bgCard));
  doc.roundedRect(bx3, y, boxW, boxH, 3, 3, "F");
  doc.setDrawColor(vc[0], vc[1], vc[2]);
  doc.setLineWidth(0.8);
  doc.roundedRect(bx3, y, boxW, boxH, 3, 3, "S");
  doc.setLineWidth(0.2);
  doc.setFontSize(7);
  doc.setTextColor(...hexToRGB(C.textDim));
  doc.text("SIGNING VERDICT", bx3 + boxW / 2, y + 5, { align: "center" });
  doc.setFontSize(14);
  doc.setTextColor(vc[0], vc[1], vc[2]);
  doc.setFont("helvetica", "bold");
  doc.text(analysis.goNoGo, bx3 + boxW / 2, y + 16, { align: "center" });

  y += boxH + 8;

  /* ═══════════════════════════════════════════════════════ */
  /*  EXECUTIVE SUMMARY (English only)                      */
  /* ═══════════════════════════════════════════════════════ */
  sectionHeader("EXECUTIVE SUMMARY");
  doc.setFontSize(8.5);
  doc.setTextColor(...hexToRGB(C.text));
  doc.setFont("helvetica", "normal");
  const summaryText = safeText(analysis.executiveSummaryEn) || "No summary available.";
  const summaryLines = doc.splitTextToSize(summaryText, CW - 6);
  // Print lines with page-break awareness
  for (const line of summaryLines) {
    ensureSpace(5);
    doc.setFontSize(8.5);
    doc.setTextColor(...hexToRGB(C.text));
    doc.setFont("helvetica", "normal");
    doc.text(line, M + 3, y);
    y += 4;
  }
  y += 2;

  // Go/No-Go Rationale box
  if (analysis.goNoGoReason) {
    const reason = safeText(analysis.goNoGoReason);
    const reasonLines = doc.splitTextToSize(`Verdict Rationale: ${reason}`, CW - 10);
    const reasonH = Math.min(reasonLines.length * 4 + 6, 28);
    ensureSpace(reasonH + 4);
    const vColor = verdictColor(analysis.goNoGo);
    doc.setDrawColor(...hexToRGB(vColor));
    doc.setLineWidth(0.6);
    doc.setFillColor(...hexToRGB(C.bgCard));
    doc.roundedRect(M, y, CW, reasonH, 2, 2, "FD");
    doc.setLineWidth(0.2);
    // Left accent bar
    doc.setFillColor(...hexToRGB(vColor));
    doc.rect(M, y, 3, reasonH, "F");
    doc.setFontSize(7.5);
    doc.setTextColor(...hexToRGB(C.text));
    doc.text(reasonLines.slice(0, 6), M + 6, y + 5);
    y += reasonH + 4;
  }

  /* ═══════════════════════════════════════════════════════ */
  /*  FINANCIAL HIGHLIGHTS                                  */
  /* ═══════════════════════════════════════════════════════ */
  if (analysis.financialHighlights?.length) {
    sectionHeader("FINANCIAL HIGHLIGHTS");
    const finData = analysis.financialHighlights.map(f => [
      safeText(f.label),
      safeText(f.value),
      f.trend === "up" ? "^" : f.trend === "down" ? "v" : "-",
    ]);
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [["Item", "Value", ""]],
      body: finData,
      theme: "plain",
      styles: { fontSize: 8, textColor: hexToRGB(C.text), fillColor: hexToRGB(C.bg), cellPadding: 2.5 },
      headStyles: { fillColor: hexToRGB(C.bgCard), textColor: hexToRGB(C.accent), fontStyle: "bold", fontSize: 7.5 },
      columnStyles: {
        0: { cellWidth: 80 },
        2: { cellWidth: 12, halign: "center" },
      },
      alternateRowStyles: { fillColor: hexToRGB(C.bgCard) },
      didDrawPage: () => { paintDarkBg(); },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  /* ═══════════════════════════════════════════════════════ */
  /*  SMART DETECTION + KEY DATES                           */
  /* ═══════════════════════════════════════════════════════ */
  if (analysis.autoDetect) {
    sectionHeader("SMART DETECTION");
    const det = analysis.autoDetect;
    const detData = [
      ["Language", safeText(det.contractLanguage)],
      ["Contract Type", safeText(det.contractType)],
      ["FIDIC Version", safeText(det.fidicVersion)],
      ["Project Type", safeText(det.projectType)],
      ["Employer", safeText(det.parties?.employer)],
      ["Contractor", safeText(det.parties?.contractor)],
    ].filter(([_, v]) => v !== "—");
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      body: detData,
      theme: "plain",
      styles: { fontSize: 8, textColor: hexToRGB(C.text), fillColor: hexToRGB(C.bg), cellPadding: 2.5 },
      columnStyles: { 0: { cellWidth: 40, textColor: hexToRGB(C.textDim), fontStyle: "bold" } },
      alternateRowStyles: { fillColor: hexToRGB(C.bgCard) },
      didDrawPage: () => { paintDarkBg(); },
    });
    y = (doc as any).lastAutoTable.finalY + 4;
  }

  if (analysis.keyDates?.length) {
    sectionHeader("KEY DATES");
    const dateData = analysis.keyDates.map(d => [safeText(d.label), safeText(d.value)]);
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      body: dateData,
      theme: "plain",
      styles: { fontSize: 8, textColor: hexToRGB(C.text), fillColor: hexToRGB(C.bg), cellPadding: 2.5 },
      columnStyles: { 0: { cellWidth: 60, textColor: hexToRGB(C.accent), fontStyle: "bold" } },
      alternateRowStyles: { fillColor: hexToRGB(C.bgCard) },
      didDrawPage: () => { paintDarkBg(); },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  /* ═══════════════════════════════════════════════════════ */
  /*  RISK REGISTER — Full Table                            */
  /* ═══════════════════════════════════════════════════════ */
  sectionHeader("RISK REGISTER");

  // Risk summary counts
  const riskCounts = {
    critical: analysis.risks.filter(r => r.severity === "CRITICAL").length,
    high: analysis.risks.filter(r => r.severity === "HIGH").length,
    medium: analysis.risks.filter(r => r.severity === "MEDIUM").length,
    low: analysis.risks.filter(r => r.severity === "LOW").length,
  };

  ensureSpace(10);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  let cx = M + 2;
  doc.setTextColor(...hexToRGB(C.textDim));
  doc.text(`Total: ${analysis.risks.length}`, cx, y); cx += 25;
  doc.setTextColor(...hexToRGB(C.red));
  doc.text(`Critical: ${riskCounts.critical}`, cx, y); cx += 24;
  doc.setTextColor(249, 115, 22);
  doc.text(`High: ${riskCounts.high}`, cx, y); cx += 18;
  doc.setTextColor(...hexToRGB(C.amber));
  doc.text(`Medium: ${riskCounts.medium}`, cx, y); cx += 22;
  doc.setTextColor(...hexToRGB(C.green));
  doc.text(`Low: ${riskCounts.low}`, cx, y);
  y += 5;

  // Sort: CRITICAL first
  const sortOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const sortedRisks = [...analysis.risks].sort((a, b) => (sortOrder[a.severity] ?? 4) - (sortOrder[b.severity] ?? 4));

  const riskRows = sortedRisks.map((r: ContractRisk) => [
    r.severity,
    safeText(trunc(r.clause, 40)),
    safeText(trunc(r.description, 75)),
    safeText(trunc(r.recommendation, 65)),
    safeText(trunc(r.fidic, 20)),
  ]);

  autoTable(doc, {
    startY: y,
    margin: { left: M, right: M },
    head: [["Severity", "Clause", "Description", "Recommendation", "FIDIC Ref"]],
    body: riskRows,
    theme: "plain",
    styles: {
      fontSize: 6.5,
      textColor: hexToRGB(C.text),
      fillColor: hexToRGB(C.bg),
      cellPadding: 2,
      lineWidth: 0.1,
      lineColor: hexToRGB(C.border),
      overflow: "linebreak",
    },
    headStyles: {
      fillColor: hexToRGB(C.bgCard),
      textColor: hexToRGB(C.accent),
      fontStyle: "bold",
      fontSize: 7,
    },
    columnStyles: {
      0: { cellWidth: 16, halign: "center", fontStyle: "bold" },
      1: { cellWidth: 32 },
      2: { cellWidth: 54 },
      3: { cellWidth: 54 },
      4: { cellWidth: 22 },
    },
    alternateRowStyles: { fillColor: hexToRGB(C.bgCard) },
    didDrawPage: () => { paintDarkBg(); },
    didParseCell: (data: any) => {
      if (data.section === "body" && data.column.index === 0) {
        const sev = data.cell.raw as string;
        data.cell.styles.textColor = hexToRGB(severityColor(sev));
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  /* ═══════════════════════════════════════════════════════ */
  /*  FIDIC COMPLIANCE                                      */
  /* ═══════════════════════════════════════════════════════ */
  if (analysis.clauseCompliance?.length) {
    sectionHeader("FIDIC COMPLIANCE");
    const compData = analysis.clauseCompliance.map(c => {
      const total = c.compliant + c.nonCompliant + c.missing;
      const pct = total > 0 ? Math.round((c.compliant / total) * 100) : 0;
      return [safeText(c.standard), `${pct}%`, `${c.compliant}`, `${c.nonCompliant}`, `${c.missing}`];
    });
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [["Standard", "Compliance", "Compliant", "Non-Compliant", "Missing"]],
      body: compData,
      theme: "plain",
      styles: { fontSize: 7.5, textColor: hexToRGB(C.text), fillColor: hexToRGB(C.bg), cellPadding: 2.5 },
      headStyles: { fillColor: hexToRGB(C.bgCard), textColor: hexToRGB(C.accent), fontStyle: "bold", fontSize: 7 },
      columnStyles: {
        1: { halign: "center", fontStyle: "bold" },
        2: { halign: "center", textColor: hexToRGB(C.green) },
        3: { halign: "center", textColor: hexToRGB(C.red) },
        4: { halign: "center", textColor: hexToRGB(C.amber) },
      },
      alternateRowStyles: { fillColor: hexToRGB(C.bgCard) },
      didDrawPage: () => { paintDarkBg(); },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  /* ═══════════════════════════════════════════════════════ */
  /*  STAKEHOLDER VERDICTS                                  */
  /* ═══════════════════════════════════════════════════════ */
  if (analysis.stakeholders?.length) {
    sectionHeader("STAKEHOLDER VERDICTS");
    const stakRows = analysis.stakeholders.map((s: StakeholderInsight) => [
      safeText(s.role),
      s.verdict,
      safeText(trunc(s.topRisk, 55)),
      safeText(trunc(s.actionRequired, 55)),
    ]);
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [["Stakeholder", "Verdict", "Top Risk", "Action Required"]],
      body: stakRows,
      theme: "plain",
      styles: {
        fontSize: 7,
        textColor: hexToRGB(C.text),
        fillColor: hexToRGB(C.bg),
        cellPadding: 2.5,
        overflow: "linebreak",
      },
      headStyles: { fillColor: hexToRGB(C.bgCard), textColor: hexToRGB(C.accent), fontStyle: "bold", fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 36, fontStyle: "bold" },
        1: { cellWidth: 22, halign: "center", fontStyle: "bold" },
        2: { cellWidth: 58 },
        3: { cellWidth: 58 },
      },
      alternateRowStyles: { fillColor: hexToRGB(C.bgCard) },
      didDrawPage: () => { paintDarkBg(); },
      didParseCell: (data: any) => {
        if (data.section === "body" && data.column.index === 1) {
          const v = data.cell.raw as string;
          data.cell.styles.textColor = hexToRGB(verdictColor(v));
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  /* ═══════════════════════════════════════════════════════ */
  /*  19-ITEM REVIEW CHECKLIST                              */
  /* ═══════════════════════════════════════════════════════ */
  if (analysis.checklist?.length) {
    sectionHeader("19-ITEM REVIEW CHECKLIST");
    const statusLabel = (s: string) => {
      if (s === "pass") return "PASS";
      if (s === "fail") return "FAIL";
      if (s === "warning") return "WARN";
      return "N/A";
    };
    const checkRows = analysis.checklist.map((c: ChecklistItem) => [
      `${c.itemNumber}`,
      safeText(trunc(c.item, 50)),
      statusLabel(c.status),
      safeText(trunc(c.notes, 55)),
    ]);
    autoTable(doc, {
      startY: y,
      margin: { left: M, right: M },
      head: [["#", "Item", "Status", "Notes"]],
      body: checkRows,
      theme: "plain",
      styles: {
        fontSize: 6.5,
        textColor: hexToRGB(C.text),
        fillColor: hexToRGB(C.bg),
        cellPadding: 2,
        overflow: "linebreak",
      },
      headStyles: { fillColor: hexToRGB(C.bgCard), textColor: hexToRGB(C.accent), fontStyle: "bold", fontSize: 6.5 },
      columnStyles: {
        0: { cellWidth: 8, halign: "center" },
        1: { cellWidth: 55 },
        2: { cellWidth: 16, halign: "center", fontStyle: "bold" },
        3: { cellWidth: 97 },
      },
      alternateRowStyles: { fillColor: hexToRGB(C.bgCard) },
      didDrawPage: () => { paintDarkBg(); },
      didParseCell: (data: any) => {
        if (data.section === "body" && data.column.index === 2) {
          const raw = (data.cell.raw as string) || "";
          if (raw === "PASS") data.cell.styles.textColor = hexToRGB(C.green);
          else if (raw === "FAIL") data.cell.styles.textColor = hexToRGB(C.red);
          else if (raw === "WARN") data.cell.styles.textColor = hexToRGB(C.amber);
          else data.cell.styles.textColor = hexToRGB(C.textDim);
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  /* ═══════════════════════════════════════════════════════ */
  /*  CRITICAL & HIGH RISK DETAILS                          */
  /* ═══════════════════════════════════════════════════════ */
  const critAndHigh = sortedRisks.filter(r => r.severity === "CRITICAL" || r.severity === "HIGH");
  if (critAndHigh.length > 0) {
    sectionHeader("CRITICAL & HIGH RISK DETAILS");
    for (const risk of critAndHigh) {
      const desc = safeText(risk.description);
      const rec = safeText(risk.recommendation);
      const descLines = doc.splitTextToSize(`Description: ${desc}`, CW - 10);
      const recLines = doc.splitTextToSize(`Recommendation: ${rec}`, CW - 10);
      const blockH = 8 + Math.min(descLines.length, 3) * 3.5 + Math.min(recLines.length, 3) * 3.5 + 4;

      ensureSpace(blockH + 4);

      // Card background
      doc.setFillColor(...hexToRGB(C.bgCard));
      doc.roundedRect(M, y, CW, blockH, 2, 2, "F");
      // Left severity accent bar
      doc.setFillColor(...hexToRGB(severityColor(risk.severity)));
      doc.rect(M, y, 3, blockH, "F");

      // Severity + clause header
      let ly = y + 5;
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...hexToRGB(severityColor(risk.severity)));
      doc.text(`[${risk.severity}]`, M + 6, ly);
      doc.setTextColor(...hexToRGB(C.white));
      doc.text(safeText(trunc(risk.clause, 60)), M + 24, ly);

      // Description
      ly += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...hexToRGB(C.text));
      doc.text(descLines.slice(0, 3), M + 6, ly);
      ly += Math.min(descLines.length, 3) * 3.5;

      // Recommendation in green
      doc.setTextColor(...hexToRGB(C.green));
      doc.text(recLines.slice(0, 3), M + 6, ly);

      y += blockH + 3;
    }
  }

  /* ═══════════════════════════════════════════════════════ */
  /*  FINAL — Add footers to all pages and save             */
  /* ═══════════════════════════════════════════════════════ */
  addFooters();

  const filename = `${(analysis.projectName || "Contract").replace(/[^a-zA-Z0-9]/g, "_")}_Executive_Report.pdf`;
  doc.save(filename);
}
