import { supabase } from "@/integrations/supabase/client";

/* ──────────────────────── TYPES ──────────────────────── */
export interface ContractRisk {
  clause: string;
  clauseAr: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  description: string;
  descriptionAr: string;
  recommendation: string;
  recommendationAr: string;
  fidic: string;
  currentWording?: string;
  requiredWording?: string;
  responsibility?: string;
}

export interface StakeholderInsight {
  role: string;
  roleAr: string;
  icon: string;
  verdict: "GO" | "CONDITIONAL" | "NO-GO";
  topRisk: string;
  topRiskAr: string;
  actionRequired: string;
  actionRequiredAr: string;
}

export interface AutoDetectResult {
  contractLanguage: "Arabic" | "English" | "Bilingual";
  contractType: string;
  projectType: string;
  fidicVersion: string;
  estimatedPages: number;
  parties: { employer: string; contractor: string };
}

export interface ChecklistItem {
  itemNumber: number;
  item: string;
  itemAr: string;
  status: "pass" | "fail" | "warning" | "not_applicable";
  notes: string;
  notesAr: string;
}

export interface AnalysisResult {
  projectName: string;
  contractType: string;
  contractValue: string;
  currency: string;
  overallRating: "RED" | "AMBER" | "GREEN";
  riskScore: number;
  executiveSummaryAr: string;
  executiveSummaryEn: string;
  goNoGo: "GO" | "CONDITIONAL" | "NO-GO";
  goNoGoReason: string;
  goNoGoReasonAr: string;
  risks: ContractRisk[];
  stakeholders: StakeholderInsight[];
  keyDates: { label: string; value: string }[];
  financialHighlights: { label: string; value: string; trend: "up" | "down" | "neutral" }[];
  clauseCompliance: { standard: string; compliant: number; nonCompliant: number; missing: number }[];
  checklist?: ChecklistItem[];
  autoDetect?: AutoDetectResult;
  analyzedAt: string;
  model?: string;
  // UI-only fields
  dashboardFile?: string;
  dashboardUrl?: string;
  id?: string;
}

/* ═══════════════════════════════════════════════════════════════════
   BACKEND-FIRST ANALYSIS — Single call to Edge Function
   ═══════════════════════════════════════════════════════════════════
   All analysis logic (auto-detect, risk register, checklist) now runs
   server-side in the Edge Function. The client just sends contract text
   and receives a complete AnalysisResult.
   ═════════════════════════════════════════════════════════════════ */

export type ProgressCallback = (message: string) => void;

export const AVAILABLE_MODELS = [
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", tier: "Premium", desc: "Best quality, slower" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", tier: "Fast", desc: "Good quality, fast" },
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", tier: "Stable", desc: "Most reliable quota" },
  { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro", tier: "Legacy", desc: "Reliable, separate quota" },
  { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash", tier: "Legacy Fast", desc: "Fastest, separate quota" },
] as const;

export type GeminiModelId = typeof AVAILABLE_MODELS[number]["id"];

/* ═══════════════════════════════════════════════════════════════════
   ANALYSIS MODE — User can choose "edge" (Edge Function) or "direct" (API)
   ═════════════════════════════════════════════════════════════════ */
export type AnalysisMode = "edge" | "direct";
export const ANALYSIS_MODE_KEY = "pzone_analysis_mode";

export function getAnalysisMode(): AnalysisMode {
  return (localStorage.getItem(ANALYSIS_MODE_KEY) as AnalysisMode) || "direct";
}
export function setAnalysisMode(mode: AnalysisMode) {
  localStorage.setItem(ANALYSIS_MODE_KEY, mode);
}

/* ── Prompt Templates (mirrored from Edge Function) ──────────── */

const AUTO_DETECT_PROMPT = `Analyze the first pages of this contract and return ONLY a valid JSON object with these exact fields:
{
  "contractLanguage": "Arabic" or "English" or "Bilingual",
  "contractType": "specific type like FIDIC Red Book, FIDIC Yellow Book, EPC Turnkey, NEC4, Bespoke, etc.",
  "projectType": "one of: buildings, infrastructure, oil_gas, water_treatment, power_energy, industrial, marine_coastal, renovation",
  "fidicVersion": "1999 or 2017 or N/A",
  "estimatedPages": number,
  "parties": { "employer": "Name of employer/owner", "contractor": "Name of contractor" }
}
Return ONLY the JSON. No markdown. No explanation.`;

const CHECKLIST_PROMPT = `You are Dr. El-Osily, a senior FIDIC contract advisor. Review this contract against the standard 19-item review checklist. Return ONLY a valid JSON array matching this structure:
[
  {
    "itemNumber": 1,
    "item": "English checklist item name",
    "itemAr": "Arabic checklist item name",
    "status": "pass | fail | warning | not_applicable",
    "notes": "English explanation of finding",
    "notesAr": "Arabic explanation"
  }
]

The 19 standard items are:
1. Scope of Work Definition
2. Contract Price & Payment Terms
3. Advance Payment Guarantee
4. Performance Bond
5. Retention & Release Terms
6. Variation Order Procedure
7. Claims & Notice Periods
8. Extension of Time
9. Liquidated Damages Cap
10. Defects Liability Period
11. Insurance Requirements
12. Force Majeure Provisions
13. Termination Rights (Balance)
14. Dispute Resolution Mechanism
15. Governing Law
16. Assignment & Subcontracting
17. Intellectual Property Rights
18. Health Safety & Environment
19. Indemnification & Liability Cap

Return ONLY the JSON array. Maximum rigor.`;

const RISK_REGISTER_PROMPT = `You are Dr. El-Osily, a senior FIDIC contract advisor with 35+ years experience. Analyze this contract and produce a comprehensive Corrective Wording Register. Return ONLY a valid JSON object:

{
  "projectName": "string - project name from contract",
  "contractType": "string - e.g. FIDIC Red Book, Yellow Book, EPC, etc",
  "contractValue": "string - numeric value",
  "currency": "string - EGP, SAR, USD, etc",
  "overallRating": "RED | AMBER | GREEN",
  "riskScore": "number 0-100 (100 = extreme risk)",
  "executiveSummaryAr": "string - 3-4 sentence Arabic executive summary for GM",
  "executiveSummaryEn": "string - 3-4 sentence English executive summary for GM",
  "goNoGo": "GO | CONDITIONAL | NO-GO",
  "goNoGoReason": "string - English reason for the verdict",
  "goNoGoReasonAr": "string - Arabic reason for the verdict",
  "risks": [
    {
      "clause": "string - clause reference",
      "clauseAr": "string - Arabic clause name",
      "severity": "CRITICAL | HIGH | MEDIUM | LOW",
      "description": "string - English risk description",
      "descriptionAr": "string - Arabic risk description",
      "recommendation": "string - English mitigation",
      "recommendationAr": "string - Arabic mitigation",
      "fidic": "string - FIDIC standard reference",
      "currentWording": "string - current contract wording summary",
      "requiredWording": "string - required/corrected wording",
      "responsibility": "string - who should act: PM, Commercial, Legal, etc."
    }
  ],
  "stakeholders": [
    {
      "role": "string - e.g. Commercial Manager",
      "roleAr": "string - Arabic role name",
      "icon": "string - emoji",
      "verdict": "GO | CONDITIONAL | NO-GO",
      "topRisk": "string - English top concern",
      "topRiskAr": "string - Arabic top concern",
      "actionRequired": "string - English action",
      "actionRequiredAr": "string - Arabic action"
    }
  ],
  "keyDates": [{"label": "string", "value": "string"}],
  "financialHighlights": [{"label": "string", "value": "string", "trend": "up | down | neutral"}],
  "clauseCompliance": [{"standard": "string", "compliant": "number", "nonCompliant": "number", "missing": "number"}]
}

IMPORTANT RULES:
- Include at least 8 stakeholder perspectives: Project Manager, Commercial Manager, Legal, Planning, Procurement, HSE, Risk Manager, General Manager
- Include at least 10 risks sorted by severity (CRITICAL first)
- Include currentWording and requiredWording for each risk (El-Osily format)
- Include at least 5 financial highlights
- Include at least 3 key dates
- Include compliance check against FIDIC 1999, FIDIC 2017, and local law
- The Arabic text must be professional and suitable for board presentations
- Risk score formula: (CRITICAL×25 + HIGH×15 + MEDIUM×8 + LOW×3) capped at 100
- Return ONLY the JSON object`;

/* ── Direct Gemini API helper (client-side) ──────────────────── */

const PRIMARY_MODEL = "gemini-2.5-pro";
const FALLBACK_MODEL = "gemini-2.5-flash";
const THIRD_FALLBACK = "gemini-2.0-flash";
const MODEL_CASCADE = [PRIMARY_MODEL, FALLBACK_MODEL, THIRD_FALLBACK];

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

/** Robust JSON parser — repairs truncated Gemini output */
function parseJSON<T>(raw: string): T {
  let cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  try { return JSON.parse(cleaned) as T; } catch { /* continue repair */ }

  // Repair: close unterminated strings
  let inString = false, escape = false;
  for (const ch of cleaned) {
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') inString = !inString;
  }
  if (inString) cleaned += '"';
  cleaned = cleaned.replace(/,\s*"[^"]*"\s*:\s*"[^"]*"?\s*$/, "");
  cleaned = cleaned.replace(/,\s*"[^"]*"\s*:\s*$/, "");
  cleaned = cleaned.replace(/,\s*"[^"]*"?\s*$/, "");
  cleaned = cleaned.replace(/,\s*$/, "");
  cleaned = cleaned.replace(/:\s*$/, ": null");

  // Re-count braces/brackets
  inString = false; escape = false;
  let braces = 0, brackets = 0;
  for (const ch of cleaned) {
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") braces++; if (ch === "}") braces--;
    if (ch === "[") brackets++; if (ch === "]") brackets--;
  }
  for (let i = 0; i < brackets; i++) cleaned += "]";
  for (let i = 0; i < braces; i++) cleaned += "}";

  try { return JSON.parse(cleaned) as T; } catch {
    // Aggressive: find last valid closing brace
    let lastGoodIdx = cleaned.length - 1;
    for (let i = cleaned.length - 1; i > 0; i--) {
      if (cleaned[i] === "}" || cleaned[i] === "]") { lastGoodIdx = i; break; }
    }
    let aggressive = cleaned.substring(0, lastGoodIdx + 1).replace(/,(\s*[}\]])$/, "$1");
    inString = false; escape = false; braces = 0; brackets = 0;
    for (const ch of aggressive) {
      if (escape) { escape = false; continue; }
      if (ch === "\\") { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === "{") braces++; if (ch === "}") braces--;
      if (ch === "[") brackets++; if (ch === "]") brackets--;
    }
    for (let i = 0; i < brackets; i++) aggressive += "]";
    for (let i = 0; i < braces; i++) aggressive += "}";
    try { return JSON.parse(aggressive) as T; } catch (e) {
      throw new Error(`JSON parse failed after repair: ${(e as Error).message}`);
    }
  }
}

async function callGeminiDirect(opts: {
  prompt: string;
  apiKey: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  model?: string;
  inlineParts?: Record<string, unknown>[];
}): Promise<string> {
  const startModel = opts.model || PRIMARY_MODEL;
  const startIdx = MODEL_CASCADE.indexOf(startModel);
  const modelsToTry = startIdx >= 0 ? MODEL_CASCADE.slice(startIdx) : MODEL_CASCADE;
  let lastError = "";

  for (let i = 0; i < modelsToTry.length; i++) {
    const model = modelsToTry[i];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${opts.apiKey}`;
    const generationConfig: Record<string, unknown> = {
      temperature: opts.temperature ?? 0.2,
      maxOutputTokens: opts.maxTokens ?? 8192,
    };
    if (opts.jsonMode) generationConfig.responseMimeType = "application/json";

    const parts: Record<string, unknown>[] = [{ text: opts.prompt }];
    if (opts.inlineParts) parts.push(...opts.inlineParts);

    const payload: Record<string, unknown> = { contents: [{ parts }], generationConfig };
    if (opts.systemPrompt) payload.systemInstruction = { parts: [{ text: opts.systemPrompt }] };

    try {
      console.log(`[Direct API] Trying model: ${model}`);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if ((res.status === 429 || res.status === 404) && i < modelsToTry.length - 1) {
        console.warn(`⚠️ ${model} returned ${res.status}, cascading...`);
        await sleep(2000);
        continue;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        lastError = (err as any)?.error?.message || `API error: ${res.status}`;
        if (i < modelsToTry.length - 1) { await sleep(1000); continue; }
        throw new Error(lastError);
      }

      const data = await res.json();
      const text = (data as any).candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        if (i < modelsToTry.length - 1) continue;
        throw new Error("No response content");
      }
      console.log(`✅ [Direct API] Success with model: ${model}`);
      return text;
    } catch (fetchErr) {
      lastError = (fetchErr as Error).message;
      if (i < modelsToTry.length - 1) { await sleep(1000); continue; }
      throw fetchErr;
    }
  }
  throw new Error(`All models exhausted. Last error: ${lastError}`);
}

/* ── Direct API full analysis (3 parallel prompts like Edge Function) ── */

async function analyzeContractDirect(
  text: string,
  onProgress?: ProgressCallback,
  model?: GeminiModelId
): Promise<AnalysisResult> {
  const apiKey = localStorage.getItem("api_key_gemini") || import.meta.env.VITE_GEMINI_API_KEY || "";
  if (!apiKey) {
    throw new Error(
      "No Gemini API key found. Go to AI Model Settings → API Keys tab and add your Gemini API key, or set the VITE_GEMINI_API_KEY environment variable, or switch to Edge Function mode."
    );
  }

  const selectedModel = model || "gemini-2.5-pro";
  const modelLabel = AVAILABLE_MODELS.find(m => m.id === selectedModel)?.label || selectedModel;
  onProgress?.("🔑 Using Direct API mode (client-side)...");
  onProgress?.(`⚡ ${modelLabel}: Running 3 parallel analyses...`);

  const isInlineFile = text.startsWith("__INLINE_FILE__:");
  const feedbackContext = compileLearningContext();
  if (feedbackContext) onProgress?.("🧠 Applying learned patterns from your previous feedback...");

  const riskPromptWithLearning = feedbackContext
    ? `${feedbackContext}\n\n${RISK_REGISTER_PROMPT}`
    : RISK_REGISTER_PROMPT;

  let contractText = text;
  let inlineParts: Record<string, unknown>[] | undefined;

  if (isInlineFile) {
    const parts = text.split(":");
    const mimeType = parts[1];
    const base64Data = parts.slice(2).join(":");
    onProgress?.("📤 Sending scanned document for AI vision analysis...");
    contractText = "[Scanned document — see attached file]";
    inlineParts = [{ inline_data: { mime_type: mimeType, data: base64Data } }];
  }

  const truncated = contractText.length > 30000
    ? contractText.substring(0, 30000) + "\n...[truncated]"
    : contractText;
  const sample = contractText.substring(0, 5000);

  onProgress?.("📊 Running auto-detect + risk register + checklist in parallel...");

  // ── Run ALL 3 prompts in parallel ──
  const [autoDetectRaw, riskRegisterRaw, checklistRaw] = await Promise.all([
    // Task 1: Auto-detect
    callGeminiDirect({
      prompt: `${AUTO_DETECT_PROMPT}\n\n--- CONTRACT TEXT (first pages) ---\n${sample}`,
      apiKey, systemPrompt: "You are an expert contract classifier. Return valid JSON only.",
      jsonMode: true, temperature: 0.1, maxTokens: 1024, model: selectedModel,
      inlineParts,
    }).catch(e => {
      console.warn("Auto-detect failed:", e.message);
      return JSON.stringify({
        contractLanguage: "Bilingual", contractType: "Unknown", projectType: "buildings",
        fidicVersion: "N/A", estimatedPages: 0, parties: { employer: "Unknown", contractor: "Unknown" },
      });
    }),

    // Task 2: Risk Register + Stakeholders
    callGeminiDirect({
      prompt: `${riskPromptWithLearning}\n\n--- CONTRACT TEXT ---\n${truncated}`,
      apiKey, systemPrompt: "You are a senior FIDIC contract advisor. Return valid JSON only.",
      jsonMode: true, temperature: 0.2, maxTokens: 32768, model: selectedModel,
      inlineParts,
    }).catch(e => {
      console.error("Risk Register failed:", e.message);
      return JSON.stringify({
        projectName: "Unknown Project", contractType: "Unknown", contractValue: "N/A", currency: "SAR",
        overallRating: "RED", riskScore: 0, executiveSummaryAr: "فشل تحليل المخاطر",
        executiveSummaryEn: "Risk analysis failed - please retry", goNoGo: "NO-GO",
        goNoGoReason: "Analysis failed: " + e.message, goNoGoReasonAr: "فشل التحليل",
        risks: [], stakeholders: [], keyDates: [], financialHighlights: [], clauseCompliance: [],
      });
    }),

    // Task 3: 19-Item Checklist
    callGeminiDirect({
      prompt: `${CHECKLIST_PROMPT}\n\n--- CONTRACT TEXT ---\n${truncated}`,
      apiKey, systemPrompt: "You are Dr. El-Osily, a meticulous FIDIC contract auditor. Return valid JSON arrays only.",
      jsonMode: true, temperature: 0.2, maxTokens: 16384, model: selectedModel,
      inlineParts,
    }).catch(e => {
      console.error("Checklist failed:", e.message);
      return JSON.stringify([]);
    }),
  ]);

  onProgress?.("🔧 Assembling analysis results...");

  // Parse results with fallbacks
  let autoDetect: Record<string, unknown>;
  try { autoDetect = parseJSON<Record<string, unknown>>(autoDetectRaw); } catch {
    autoDetect = { contractLanguage: "Bilingual", contractType: "Unknown", projectType: "buildings", fidicVersion: "N/A", estimatedPages: 0, parties: { employer: "Unknown", contractor: "Unknown" } };
  }

  let riskResult: Record<string, unknown>;
  try { riskResult = parseJSON<Record<string, unknown>>(riskRegisterRaw); } catch {
    riskResult = { projectName: "Unknown", contractType: "Unknown", contractValue: "N/A", currency: "SAR", overallRating: "RED", riskScore: 0, executiveSummaryEn: "Parse error", executiveSummaryAr: "خطأ في التحليل", goNoGo: "NO-GO", goNoGoReason: "Parse error", goNoGoReasonAr: "خطأ", risks: [], stakeholders: [], keyDates: [], financialHighlights: [], clauseCompliance: [] };
  }

  let checklist: unknown[];
  try {
    const parsed = parseJSON<unknown>(checklistRaw);
    if (Array.isArray(parsed)) checklist = parsed;
    else if (parsed && typeof parsed === "object" && "checklist" in (parsed as any)) checklist = (parsed as any).checklist;
    else if (parsed && typeof parsed === "object" && "items" in (parsed as any)) checklist = (parsed as any).items;
    else checklist = [];
  } catch { checklist = []; }

  const result = {
    ...riskResult,
    checklist,
    autoDetect,
    analyzedAt: new Date().toISOString(),
    id: crypto.randomUUID(),
    model: selectedModel,
  } as unknown as AnalysisResult;

  onProgress?.(`✅ Analysis complete! Rating: ${result.overallRating} | Score: ${result.riskScore}/100`);
  return result;
}

/* ── Edge Function analysis (original) ─────────────────────────── */

async function analyzeContractEdge(
  text: string,
  onProgress?: ProgressCallback,
  model?: GeminiModelId
): Promise<AnalysisResult> {
  const selectedModel = model || "gemini-2.5-pro";
  const modelLabel = AVAILABLE_MODELS.find(m => m.id === selectedModel)?.label || selectedModel;
  onProgress?.("🚀 Sending contract to backend analysis pipeline...");
  onProgress?.(`⚡ ${modelLabel}: Running 3 parallel analyses server-side...`);

  const isInlineFile = text.startsWith("__INLINE_FILE__:");
  let body: Record<string, unknown>;

  const feedbackContext = compileLearningContext();
  if (feedbackContext) onProgress?.("🧠 Applying learned patterns from your previous feedback...");

  if (isInlineFile) {
    const parts = text.split(":");
    const mimeType = parts[1];
    const base64Data = parts.slice(2).join(":");
    onProgress?.("📤 Uploading scanned document for AI vision analysis...");
    body = { fullAnalysis: true, contractText: "[Scanned document — see inline file data]", inlineFileData: base64Data, inlineFileMime: mimeType, model: selectedModel, feedbackContext };
  } else {
    body = { fullAnalysis: true, contractText: text, model: selectedModel, feedbackContext };
  }

  const { data, error } = await supabase.functions.invoke("analyze-contract", { body });

  if (error) {
    console.error("Edge Function Error:", error);
    throw new Error(error.message || "خطأ في خادم التحليل. يرجى المحاولة لاحقاً.");
  }

  if (!data || !data.projectName) {
    console.error("Invalid response from Edge Function:", data);
    throw new Error("Invalid response from analysis server — missing projectName");
  }

  onProgress?.(`✅ Analysis complete! Rating: ${data.overallRating} | Score: ${data.riskScore}/100`);
  return data as AnalysisResult;
}

/* ── Unified entry point — routes by analysis mode ─────────────── */

export async function analyzeContract(
  text: string,
  onProgress?: ProgressCallback,
  model?: GeminiModelId
): Promise<AnalysisResult> {
  const mode = getAnalysisMode();
  if (mode === "direct") {
    return analyzeContractDirect(text, onProgress, model);
  }
  return analyzeContractEdge(text, onProgress, model);
}

// Backward-compatible alias
export const analyzeContractParallel = analyzeContract;

/* ──────────────────────── PDF TEXT EXTRACTION ──────────────────────── */
export async function extractContractText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();

  if (file.name.endsWith(".txt")) {
    return new TextDecoder().decode(arrayBuffer);
  }

  if (file.name.endsWith(".docx") || file.name.endsWith(".doc")) {
    try {
      const { default: mammoth } = await import("mammoth");
      // Copy buffer — mammoth may detach it
      const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer.slice(0) });
      if (result.value && result.value.trim().length > 20) return result.value;
    } catch (e) {
      console.warn("DOCX extraction failed, will send raw file to AI:", e);
    }
  }

  // PDF — try text-layer extraction first
  if (file.name.endsWith(".pdf") || file.type === "application/pdf") {
    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
      // Copy buffer — PDF.js transfers/detaches the ArrayBuffer internally
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map((item: any) => item.str).join(" ") + "\n";
      }
      console.log(`📄 PDF text extraction: ${fullText.trim().length} chars from ${pdf.numPages} pages`);
      if (fullText.trim().length > 50) return fullText;
      // If too little text, fall through to base64 approach
      console.warn("⚠️ PDF has very little extractable text (may be scanned). Using file-upload approach.");
    } catch (e) {
      console.warn("PDF text extraction failed:", e);
    }
  }

  // Fallback: Convert file to base64 and embed as inline data for Gemini Vision
  // We encode it as a special marker so the dashboard can send it to the backend
  const uint8 = new Uint8Array(arrayBuffer);
  let binary = "";
  for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
  const base64 = btoa(binary);
  const mimeType = file.type || "application/pdf";
  console.log(`📦 Sending raw file as base64 (${(base64.length / 1024).toFixed(0)} KB, type: ${mimeType})`);
  // Return a special tagged string so the caller knows to send the file directly
  return `__INLINE_FILE__:${mimeType}:${base64}`;
}

/* ──────────────────────── DATABASE PERSISTENCE ──────────────────────── */
export async function persistAnalysisToDb(contractId: string, analysis: AnalysisResult): Promise<void> {
  try {
    // Check if this contractId actually exists in the contracts table
    const { data: existingContract } = await supabase
      .from("contracts")
      .select("id")
      .eq("id", contractId)
      .maybeSingle();

    const hasDbContract = !!existingContract;

    if (!hasDbContract) {
      console.log("ℹ️ Contract ID not in database — saving to localStorage only.");
    }

    // 1. Save risk items (only if contract exists in DB)
    if (hasDbContract && analysis.risks?.length) {
      await supabase
        .from("contract_risk_items")
        .delete()
        .eq("contract_id", contractId)
        .eq("ai_generated", true);

      const riskRows = analysis.risks.map((r, i) => ({
        contract_id: contractId,
        item_number: i + 1,
        category: r.clause,
        risk_description: r.description,
        current_wording: r.currentWording || "",
        required_wording: r.requiredWording || r.recommendation,
        severity: r.severity.toLowerCase(),
        responsibility: r.responsibility || "",
        status: "open",
        ai_generated: true,
      }));

      const { error: riskError } = await supabase
        .from("contract_risk_items")
        .insert(riskRows);

      if (riskError) console.error("Failed to save risk items:", riskError);
    }

    // 2. Save checklist (only if contract exists in DB)
    if (hasDbContract && analysis.checklist?.length) {
      await supabase
        .from("contract_review_checklist")
        .delete()
        .eq("contract_id", contractId);

      const checklistRows = analysis.checklist.map((c) => ({
        contract_id: contractId,
        item_number: c.itemNumber,
        checklist_item: c.item,
        status: c.status === "warning" ? "fail" : c.status,
        notes: c.notes,
        ai_assessment: c.notesAr,
      }));

      const { error: checklistError } = await supabase
        .from("contract_review_checklist")
        .insert(checklistRows);

      if (checklistError) console.error("Failed to save checklist:", checklistError);
    }

    // 3. Update contract metadata (only if contract exists in DB)
    if (hasDbContract) {
      const checklistCompletion = analysis.checklist
        ? Math.round((analysis.checklist.filter(c => c.status === "pass").length / analysis.checklist.length) * 100)
        : 0;

      const { error: updateError } = await supabase
        .from("contracts")
        .update({
          risk_score: analysis.riskScore,
          analysis_version: 1,
          checklist_completion: checklistCompletion,
        } as Record<string, unknown>)
        .eq("id", contractId);

      if (updateError) console.error("Failed to update contract metadata:", updateError);
    }

    console.log("✅ Analysis persisted successfully");
  } catch (e) {
    console.error("Database persistence error:", e);
  }
}

/* ══════════════════════════════════════════════════════════════════
   SELF-LEARNING FEEDBACK LOOP
   ══════════════════════════════════════════════════════════════════
   Users rate each risk after analysis. Feedback accumulates into a
   knowledge base that gets injected into future AI prompts, making
   the system progressively smarter.
   ══════════════════════════════════════════════════════════════════ */

export interface RiskFeedback {
  /** Clause reference the feedback is about */
  clause: string;
  /** Original severity from AI */
  originalSeverity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  /** User agreed or disagreed with this risk */
  approved: boolean;
  /** If disagreed, what severity does the user think it should be? */
  severityOverride?: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | null;
  /** Optional user note */
  notes?: string;
  /** Contract type this feedback came from */
  contractType: string;
  /** Project name context */
  projectName: string;
  /** When feedback was given */
  timestamp: string;
}

export interface VerdictFeedback {
  /** Original AI verdict */
  originalVerdict: "GO" | "CONDITIONAL" | "NO-GO";
  /** User override */
  userVerdict: "GO" | "CONDITIONAL" | "NO-GO";
  /** Optional reason */
  notes?: string;
  contractType: string;
  projectName: string;
  timestamp: string;
}

export interface FeedbackStore {
  risks: RiskFeedback[];
  verdicts: VerdictFeedback[];
  version: number;
}

const FEEDBACK_KEY = "pzone_contract_feedback";
const MAX_FEEDBACK_ITEMS = 200;

/** Save a single risk feedback item */
export function saveRiskFeedback(feedback: RiskFeedback) {
  try {
    const store = loadFeedbackStore();
    store.risks = [feedback, ...store.risks].slice(0, MAX_FEEDBACK_ITEMS);
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(store));
  } catch (e) {
    console.error("Failed to save feedback:", e);
  }
}

/** Save a verdict feedback item */
export function saveVerdictFeedback(feedback: VerdictFeedback) {
  try {
    const store = loadFeedbackStore();
    store.verdicts = [feedback, ...store.verdicts].slice(0, MAX_FEEDBACK_ITEMS);
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(store));
  } catch (e) {
    console.error("Failed to save verdict feedback:", e);
  }
}

/** Load the full feedback store */
export function loadFeedbackStore(): FeedbackStore {
  try {
    const raw = localStorage.getItem(FEEDBACK_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { risks: parsed.risks || [], verdicts: parsed.verdicts || [], version: parsed.version || 1 };
    }
  } catch (e) {
    console.error("Failed to load feedback store:", e);
  }
  return { risks: [], verdicts: [], version: 1 };
}

/** Get feedback stats for display */
export function getFeedbackStats() {
  const store = loadFeedbackStore();
  const total = store.risks.length + store.verdicts.length;
  const agreed = store.risks.filter(r => r.approved).length;
  const disagreed = store.risks.filter(r => !r.approved).length;
  const overrides = store.risks.filter(r => r.severityOverride).length;
  const falsePositives = store.risks.filter(r => !r.approved && !r.severityOverride).length;
  const withNotes = store.risks.filter(r => r.notes && r.notes.trim().length > 0).length;

  // Accuracy: how often the AI gets it right
  const accuracyPct = store.risks.length > 0 ? Math.round((agreed / store.risks.length) * 100) : 0;

  // Top clause pattern insights
  const clauseStats: Record<string, { agreed: number; rejected: number; total: number }> = {};
  for (const r of store.risks) {
    const c = r.clause;
    if (!clauseStats[c]) clauseStats[c] = { agreed: 0, rejected: 0, total: 0 };
    clauseStats[c].total++;
    if (r.approved) clauseStats[c].agreed++;
    else clauseStats[c].rejected++;
  }

  // Top 5 most-interacted clauses
  const topClauses = Object.entries(clauseStats)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5)
    .map(([clause, stats]) => ({
      clause,
      agreed: stats.agreed,
      rejected: stats.rejected,
      total: stats.total,
      accuracy: Math.round((stats.agreed / stats.total) * 100),
    }));

  // Severity distribution of overrides
  const sevDistribution: Record<string, Record<string, number>> = {};
  for (const r of store.risks.filter(r => r.severityOverride)) {
    const from = r.originalSeverity;
    const to = r.severityOverride!;
    if (!sevDistribution[from]) sevDistribution[from] = {};
    sevDistribution[from][to] = (sevDistribution[from][to] || 0) + 1;
  }

  // Contract type breakdown
  const contractTypes: Record<string, number> = {};
  for (const r of store.risks) {
    contractTypes[r.contractType] = (contractTypes[r.contractType] || 0) + 1;
  }

  // Recent timeline (last 8 feedback items)
  const recentTimeline = store.risks
    .slice(0, 8)
    .map(r => ({
      clause: r.clause,
      approved: r.approved,
      severity: r.originalSeverity,
      override: r.severityOverride || null,
      notes: r.notes || null,
      timestamp: r.timestamp,
      contractType: r.contractType,
    }));

  return {
    total, agreed, disagreed, overrides, falsePositives, withNotes,
    verdictCount: store.verdicts.length,
    accuracyPct,
    topClauses,
    sevDistribution,
    contractTypes,
    recentTimeline,
    totalRiskFeedback: store.risks.length,
    totalVerdictFeedback: store.verdicts.length,
  };
}

/** Clear all feedback / reset learning */
export function clearFeedbackStore() {
  localStorage.removeItem(FEEDBACK_KEY);
}

/** Export feedback store as JSON string (for cross-device sharing) */
export function exportFeedbackStore(): string {
  const store = loadFeedbackStore();
  return JSON.stringify(store, null, 2);
}

/** Import feedback store from JSON string (merge with existing) */
export function importFeedbackStore(json: string): { imported: number; errors: number } {
  try {
    const incoming = JSON.parse(json) as FeedbackStore;
    const current = loadFeedbackStore();

    // Merge without duplicates (by clause+severity+timestamp key)
    const existingKeys = new Set(current.risks.map(r => `${r.clause}|${r.originalSeverity}|${r.timestamp}`));
    let imported = 0;
    for (const r of incoming.risks || []) {
      const key = `${r.clause}|${r.originalSeverity}|${r.timestamp}`;
      if (!existingKeys.has(key)) {
        current.risks.push(r);
        imported++;
      }
    }

    const existingVKeys = new Set(current.verdicts.map(v => `${v.originalVerdict}|${v.userVerdict}|${v.timestamp}`));
    for (const v of incoming.verdicts || []) {
      const key = `${v.originalVerdict}|${v.userVerdict}|${v.timestamp}`;
      if (!existingVKeys.has(key)) {
        current.verdicts.push(v);
        imported++;
      }
    }

    // Trim to max
    current.risks = current.risks.slice(0, MAX_FEEDBACK_ITEMS);
    current.verdicts = current.verdicts.slice(0, MAX_FEEDBACK_ITEMS);
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(current));

    return { imported, errors: 0 };
  } catch (e) {
    console.error("Failed to import feedback:", e);
    return { imported: 0, errors: 1 };
  }
}

/**
 * Compile accumulated feedback into a text block for injection into the AI prompt.
 * This is the "brain" of the learning system — it aggregates patterns from the user's
 * feedback and formats them as calibration instructions for Gemini.
 */
export function compileLearningContext(): string {
  const store = loadFeedbackStore();
  if (store.risks.length === 0 && store.verdicts.length === 0) return "";

  const lines: string[] = [];
  lines.push("LEARNED LESSONS FROM PREVIOUS ANALYSES (apply these calibrations):");
  lines.push("");

  // 1. Severity calibration patterns — group by clause type
  const severityOverrides = store.risks.filter(r => r.severityOverride);
  if (severityOverrides.length > 0) {
    // Group by pattern: "clause keyword → user prefers X over Y"
    const patterns: Record<string, { from: string; to: string; count: number }> = {};
    for (const o of severityOverrides) {
      const key = `${o.clause}:${o.originalSeverity}->${o.severityOverride}`;
      if (!patterns[key]) patterns[key] = { from: o.originalSeverity, to: o.severityOverride!, count: 0 };
      patterns[key].count++;
    }
    lines.push("SEVERITY CALIBRATIONS:");
    for (const [key, p] of Object.entries(patterns)) {
      const clause = key.split(":")[0];
      lines.push(`- For "${clause}" risks: user corrected ${p.from} → ${p.to} (${p.count}x). Prefer ${p.to}.`);
    }
    lines.push("");
  }

  // 2. False positives — risks the user fully rejected
  const falsePositives = store.risks.filter(r => !r.approved && !r.severityOverride);
  if (falsePositives.length > 0) {
    const fpClauses: Record<string, number> = {};
    for (const fp of falsePositives) {
      fpClauses[fp.clause] = (fpClauses[fp.clause] || 0) + 1;
    }
    lines.push("FALSE POSITIVES (do NOT flag these unless clearly severe):");
    for (const [clause, count] of Object.entries(fpClauses)) {
      lines.push(`- "${clause}" was flagged ${count}x but user marked as false positive each time.`);
    }
    lines.push("");
  }

  // 3. User notes with corrections
  const withNotes = store.risks.filter(r => r.notes && r.notes.trim().length > 0);
  if (withNotes.length > 0) {
    lines.push("USER CORRECTIONS & NOTES:");
    for (const n of withNotes.slice(0, 10)) { // Limit to 10 to stay within token budget
      lines.push(`- ${n.clause}: "${n.notes}" (contract type: ${n.contractType})`);
    }
    lines.push("");
  }

  // 4. Verdict feedback
  const verdictOverrides = store.verdicts.filter(v => v.originalVerdict !== v.userVerdict);
  if (verdictOverrides.length > 0) {
    lines.push("VERDICT CALIBRATIONS:");
    for (const v of verdictOverrides) {
      lines.push(`- In "${v.contractType}" contracts, user changed ${v.originalVerdict} → ${v.userVerdict}${v.notes ? ` (reason: ${v.notes})` : ""}`);
    }
    lines.push("");
  }

  // 5. General agreement patterns — what the AI gets right
  const agreedCount = store.risks.filter(r => r.approved).length;
  if (agreedCount > 5) {
    lines.push(`POSITIVE PATTERN: User confirmed ${agreedCount} risks as correctly identified. Maintain similar analysis depth.`);
    lines.push("");
  }

  lines.push("Apply these patterns when determining severity ratings, risk identification, and the overall GO/NO-GO verdict.");

  return lines.join("\n");
}

/* ──────────────────────── HELPERS ──────────────────────── */
export function getGeminiApiKey(): string {
  return "edge-function-secured";
}

/**
 * Save analysis to both Supabase (cross-browser) and localStorage (fallback).
 */
export async function saveAnalysisHistory(analysis: AnalysisResult) {
  // 1. Always save to localStorage as fallback
  try {
    const existingStr = localStorage.getItem("pzone_contract_history");
    const existing: AnalysisResult[] = existingStr ? JSON.parse(existingStr) : [];
    const newHistory = [analysis, ...existing].slice(0, 50);
    localStorage.setItem("pzone_contract_history", JSON.stringify(newHistory));
  } catch (e) {
    console.error("Failed to save history to localStorage:", e);
  }

  // 2. Try to save to Supabase DB (cross-browser persistence)
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log("ℹ️ No authenticated user — analysis saved to localStorage only.");
      return;
    }
    const { error } = await supabase
      .from("contract_analysis_history" as any)
      .insert({
        user_id: user.id,
        project_name: analysis.projectName || "Unknown Project",
        contract_type: analysis.contractType || "Unknown",
        contract_value: analysis.contractValue || "0",
        currency: analysis.currency || "EGP",
        overall_rating: analysis.overallRating || "RED",
        risk_score: analysis.riskScore || 0,
        go_no_go: analysis.goNoGo || "NO-GO",
        risk_count: analysis.risks?.length || 0,
        filename: analysis.dashboardFile || null,
        analysis_json: analysis,
        analyzed_at: analysis.analyzedAt || new Date().toISOString(),
        model: analysis.model || null,
      });
    if (error) {
      // Table might not exist yet — that's fine, localStorage is the fallback
      console.warn("⚠️ DB save failed (table may not exist yet):", error.message);
    } else {
      console.log("✅ Analysis saved to Supabase DB (cross-browser persistence)");
    }
  } catch (e) {
    console.warn("DB persistence skipped:", e);
  }
}

/**
 * Load analysis history — tries Supabase first, falls back to localStorage.
 */
export async function getAnalysisHistory(): Promise<AnalysisResult[]> {
  // 1. Try Supabase DB first
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from("contract_analysis_history" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("analyzed_at", { ascending: false })
        .limit(50);

      if (!error && data && data.length > 0) {
        console.log(`📦 Loaded ${data.length} results from Supabase DB`);
        return data.map((row: any) => ({
          ...(row.analysis_json as AnalysisResult),
          // Ensure key fields are populated even if JSON is incomplete
          projectName: row.project_name || (row.analysis_json as any)?.projectName || "Unknown Project",
          id: row.id,
        }));
      }
      if (error) {
        console.warn("⚠️ DB load failed (table may not exist yet):", error.message);
      }
    }
  } catch (e) {
    console.warn("DB history load skipped:", e);
  }

  // 2. Fallback to localStorage
  try {
    const existingStr = localStorage.getItem("pzone_contract_history");
    return existingStr ? JSON.parse(existingStr) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Delete analysis history — clears both Supabase and localStorage.
 */
export async function clearAnalysisHistory() {
  // Clear localStorage
  localStorage.removeItem("pzone_contract_history");

  // Clear Supabase
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("contract_analysis_history" as any)
        .delete()
        .eq("user_id", user.id);
      console.log("🗑️ DB history cleared");
    }
  } catch (e) {
    console.warn("DB clear skipped:", e);
  }
}

/**
 * Delete a single analysis result by id
 */
export async function deleteAnalysisHistoryItem(itemId: string) {
  // Remove from localStorage
  try {
    const existingStr = localStorage.getItem("pzone_contract_history");
    const existing: AnalysisResult[] = existingStr ? JSON.parse(existingStr) : [];
    const filtered = existing.filter(a => a.id !== itemId);
    localStorage.setItem("pzone_contract_history", JSON.stringify(filtered));
  } catch (e) {
    console.error("Failed to delete from localStorage:", e);
  }

  // Remove from Supabase
  try {
    await supabase.from("contract_analysis_history" as any).delete().eq("id", itemId);
  } catch (e) {
    console.warn("DB delete skipped:", e);
  }
}

