import { AnalysisResult } from "./gemini-analyzer";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import * as xlsx from "xlsx";
import pptxgen from "pptxgenjs";

export async function downloadDashboardPDF(elementId: string | HTMLElement, filename: string) {
  let element: HTMLElement | null = null;
  if (typeof elementId === "string") {
    element = document.getElementById(elementId);
  } else {
    element = elementId;
  }
  if (!element) throw new Error("Dashboard element not found");

  const canvas = await html2canvas(element, { scale: 2, useCORS: true });
  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
  pdf.save(`${filename}.pdf`);
}

export function downloadRiskExcel(analysis: AnalysisResult) {
  // Primary Sheet: Risks
  const risksData = analysis.risks.map(r => ({
    "Severity": r.severity,
    "Clause (EN)": r.clause,
    "Clause (AR)": r.clauseAr,
    "Description (EN)": r.description,
    "Description (AR)": r.descriptionAr,
    "Recommendation (EN)": r.recommendation,
    "Recommendation (AR)": r.recommendationAr,
    "FIDIC Reference": r.fidic
  }));

  // Secondary Sheet: Stakeholders
  const stakeholdersData = analysis.stakeholders.map(s => ({
    "Role": s.role,
    "Role (AR)": s.roleAr,
    "Verdict": s.verdict,
    "Top Risk (EN)": s.topRisk,
    "Action Required": s.actionRequired
  }));

  const wb = xlsx.utils.book_new();
  const wsRisks = xlsx.utils.json_to_sheet(risksData);
  const wsStakeholders = xlsx.utils.json_to_sheet(stakeholdersData);

  xlsx.utils.book_append_sheet(wb, wsRisks, "Contract Risks");
  xlsx.utils.book_append_sheet(wb, wsStakeholders, "Stakeholder Analysis");

  xlsx.writeFile(wb, `${analysis.projectName.replace(/\s+/g, '_')}_Risk_Matrix.xlsx`);
}

export async function downloadExecutivePPTX(analysis: AnalysisResult) {
  const pptx = new pptxgen();
  
  // Slide 1: Title
  const slide1 = pptx.addSlide();
  slide1.addText("Contract Intelligence Report", { x: 1, y: 1.5, w: 8, fontSize: 36, bold: true, color: "363636" });
  slide1.addText(analysis.projectName, { x: 1, y: 2.5, w: 8, fontSize: 24, color: "1f497d" });
  slide1.addText(`Type: ${analysis.contractType} | Value: ${analysis.contractValue} ${analysis.currency}`, { x: 1, y: 3.2, w: 8, fontSize: 16, color: "595959" });
  slide1.addText(`Generated: ${new Date().toLocaleDateString()}`, { x: 1, y: 3.7, w: 8, fontSize: 14, color: "595959" });
  slide1.addText(`Prepared by Hassan Ahmed Soliman`, { x: 1, y: 4.8, w: 8, fontSize: 12, bold: true, color: "C9A84C" });

  // Slide 2: Exec Summary
  const slide2 = pptx.addSlide();
  slide2.addText("Executive Summary", { x: 0.5, y: 0.5, w: 9, fontSize: 24, bold: true, color: "363636" });
  
  slide2.addText("English Summary", { x: 0.5, y: 1.2, w: 4.2, fontSize: 14, bold: true, color: "1f497d" });
  slide2.addText(analysis.executiveSummaryEn, { x: 0.5, y: 1.6, w: 4.2, h: 3, fontSize: 12, color: "363636", align: "left" });
  
  slide2.addText("الخلاصة التنفيذية", { x: 5, y: 1.2, w: 4.5, fontSize: 14, bold: true, color: "1f497d", align: "right" });
  slide2.addText(analysis.executiveSummaryAr, { x: 5, y: 1.6, w: 4.5, h: 3, fontSize: 12, color: "363636", align: "right", rtlMode: true });

  const ratingColor = analysis.overallRating === "RED" ? "FF0000" : analysis.overallRating === "AMBER" ? "FFC000" : "00B050";
  slide2.addText(`RATING: ${analysis.overallRating}`, { x: 0.5, y: 4.8, w: 4, fontSize: 16, bold: true, color: ratingColor });
  slide2.addText(`RISK SCORE: ${analysis.riskScore}/100`, { x: 0.5, y: 5.2, w: 4, fontSize: 16, bold: true, color: "363636" });

  // Slide 3: Top Risks
  const criticalAndHigh = analysis.risks.filter(r => r.severity === "CRITICAL" || r.severity === "HIGH").slice(0, 5);
  const slide3 = pptx.addSlide();
  slide3.addText("Critical & High Risks", { x: 0.5, y: 0.5, w: 9, fontSize: 24, bold: true, color: "363636" });
  
  criticalAndHigh.forEach((risk, i) => {
    const yPos = 1.2 + (i * 0.8);
    const color = risk.severity === "CRITICAL" ? "FF0000" : "FFC000";
    slide3.addText(`[${risk.severity}] ${risk.clause} - ${risk.description}`, { x: 0.5, y: yPos, w: 9, fontSize: 12, color: "363636", bullet: true });
  });

  await pptx.writeFile({ fileName: `${analysis.projectName.replace(/\s+/g, '_')}_Deck.pptx` });
}
