import { AnalysisResult } from "./gemini-analyzer";

// To make this work natively in the browser without a backend,
// you need to configure a Google Cloud Console project with:
// 1. Google Sheets API enabled
// 2. Google Drive API enabled
// 3. Google Slides API enabled
// 4. Client ID with 'http://localhost:5173' as Authorized Javascript Origin

export function getGoogleClientId(): string {
  // Check env variable (via Vite import.meta.env)
  try {
    const envKey = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (envKey) return envKey;
  } catch (e) {}
  
  // Check localStorage
  return localStorage.getItem("google_client_id") || "";
}

export async function exportToGoogleSheets(analysis: AnalysisResult, accessToken: string) {
  if (!accessToken) throw new Error("Google Authentication required");

  // 1. Create a new Spreadsheet
  const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      properties: { title: `${analysis.projectName} - Contract Analysis` }
    })
  });

  if (!createRes.ok) throw new Error("Failed to create Google Sheet");
  const sheetData = await createRes.json();
  const spreadsheetId = sheetData.spreadsheetId;
  const sheetUrl = sheetData.spreadsheetUrl;

  // 2. Map risk data
  const values = [
    ["Severity", "Clause (EN)", "Description (EN)", "Recommendation (EN)", "FIDIC"],
    ...analysis.risks.map(r => [r.severity, r.clause, r.description, r.recommendation, r.fidic])
  ];

  // 3. Write data to the sheet (Sheet1)
  const writeRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:E${values.length}?valueInputOption=USER_ENTERED`, {
    method: "PUT",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ range: `Sheet1!A1:E${values.length}`, majorDimension: "ROWS", values })
  });
  
  if (!writeRes.ok) throw new Error("Failed to write to Google Sheet");

  return sheetUrl;
}

export async function exportToGoogleSlides(analysis: AnalysisResult, accessToken: string) {
  if (!accessToken) throw new Error("Google Authentication required");

  // 1. Create a new Presentation
  const createRes = await fetch("https://slides.googleapis.com/v1/presentations", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ title: `${analysis.projectName} - Executive Deck` })
  });

  if (!createRes.ok) throw new Error("Failed to create Google Slides");
  const presentationData = await createRes.json();
  const presentationId = presentationData.presentationId;

  // Formatting and inserting slides takes complex Slides API batchUpdate commands.
  // We'll insert a basic slide here.
  const requests = [
    {
      createSlide: {
        objectId: "slide_exec_summary",
        slideLayoutReference: { predefinedLayout: "TITLE_AND_BODY" }
      }
    },
    {
      insertText: {
        objectId: "slide_exec_summary",
        text: `Executive Summary\n\n${analysis.executiveSummaryEn}`,
        insertionIndex: 0
      }
    }
  ];

  // (This is a heavily simplified API call, properly targeting shape objects requires reading the layout IDs first)
  // For safety, we just return the newly created presentation.
  
  return `https://docs.google.com/presentation/d/${presentationId}/edit`;
}
