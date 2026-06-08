import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/* ═══════════════════════════════════════════════════════════════════
   PZONE Contract AI — Full Backend Analysis Edge Function
   ═══════════════════════════════════════════════════════════════════
   Single endpoint that runs the COMPLETE analysis pipeline server-side:
   1. Auto-detect contract type/language
   2. Risk Register (El-Osily 8-column format)
   3. 19-Item FIDIC Checklist
   All 3 run in parallel using Gemini 2.5 Pro → returns unified JSON
   ═════════════════════════════════════════════════════════════════ */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── Model Configuration ──────────────────────────────────────────
const PRIMARY_MODEL = "gemini-2.5-pro";
const FALLBACK_MODEL = "gemini-2.5-flash";
const THIRD_FALLBACK = "gemini-2.0-flash";
const MODEL_CASCADE = [PRIMARY_MODEL, FALLBACK_MODEL, THIRD_FALLBACK];

// Models the user can explicitly select from the UI
const ALLOWED_MODELS = [
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-pro",
  "gemini-1.5-flash",
];

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Prompt Templates ─────────────────────────────────────────────

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

// ── Gemini API Call Helper ───────────────────────────────────────

interface GeminiCallOptions {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  model?: string;
  apiKey: string;
}

async function callGemini(opts: GeminiCallOptions): Promise<string> {
  // Use model cascade: try each model in order until one succeeds
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

    if (opts.jsonMode) {
      generationConfig.responseMimeType = "application/json";
    }

    const payload: Record<string, unknown> = {
      contents: [{ parts: [{ text: opts.prompt }] }],
      generationConfig,
    };

    if (opts.systemPrompt) {
      payload.systemInstruction = { parts: [{ text: opts.systemPrompt }] };
    }

    try {
      console.log(`[Gemini] Trying model: ${model}`);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // Rate-limited or model not found → try next model in cascade
      if ((res.status === 429 || res.status === 404) && i < modelsToTry.length - 1) {
        const nextModel = modelsToTry[i + 1];
        console.warn(`⚠️ ${model} returned ${res.status}, cascading to ${nextModel} (waiting 2s)...`);
        await sleep(2000); // Delay to avoid burst limits
        continue;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        lastError = (err as { error?: { message?: string } }).error?.message || `Google API error: ${res.status}`;
        console.error(`Gemini API Error (${model}):`, lastError);
        // If there are more models to try, continue cascade
        if (i < modelsToTry.length - 1) {
          console.warn(`⚠️ ${model} failed, cascading to ${modelsToTry[i + 1]}...`);
          await sleep(1000);
          continue;
        }
        throw new Error(lastError);
      }

      const data = await res.json();
      const text = (
        data as {
          candidates?: { content?: { parts?: { text?: string }[] } }[];
        }
      ).candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        lastError = `No response content from ${model}`;
        if (i < modelsToTry.length - 1) {
          console.warn(`⚠️ ${model} returned empty, cascading...`);
          continue;
        }
        throw new Error(lastError);
      }

      console.log(`✅ [Gemini] Success with model: ${model}`);
      return text;
    } catch (fetchErr) {
      lastError = (fetchErr as Error).message;
      if (i < modelsToTry.length - 1) {
        console.warn(`⚠️ ${model} error: ${lastError}, cascading to ${modelsToTry[i + 1]}...`);
        await sleep(1000);
        continue;
      }
      throw fetchErr;
    }
  }

  throw new Error(`All models exhausted. Last error: ${lastError}`);
}

/** Robust JSON parser — repairs truncated Gemini output */
function parseJSON<T>(raw: string): T {
  let cleaned = raw
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  // First attempt — parse directly
  try {
    return JSON.parse(cleaned) as T;
  } catch (_firstErr) {
    console.warn("JSON parse failed, attempting repair...");
  }

  // ── Repair Pass ──
  // Step 1: Close any unterminated string
  let inString = false;
  let escape = false;
  for (const ch of cleaned) {
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; }
  }
  if (inString) cleaned += '"';

  // Step 2: Remove trailing partial entries (key without value, etc.)
  // Remove trailing comma + partial key:value pairs
  cleaned = cleaned.replace(/,\s*"[^"]*"\s*:\s*"[^"]*"?\s*$/, "");
  cleaned = cleaned.replace(/,\s*"[^"]*"\s*:\s*$/, "");
  cleaned = cleaned.replace(/,\s*"[^"]*"?\s*$/, "");
  cleaned = cleaned.replace(/,\s*$/, "");
  // Remove orphan colon at end
  cleaned = cleaned.replace(/:\s*$/, ": null");

  // Step 3: Re-count braces/brackets after repair
  inString = false;
  escape = false;
  let braces = 0;
  let brackets = 0;
  for (const ch of cleaned) {
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") braces++;
    if (ch === "}") braces--;
    if (ch === "[") brackets++;
    if (ch === "]") brackets--;
  }


  for (let i = 0; i < brackets; i++) cleaned += "]";
  for (let i = 0; i < braces; i++) cleaned += "}";

  try {
    return JSON.parse(cleaned) as T;
  } catch (_repairErr) {
    // Step 5: Aggressive repair — try to find the last valid JSON boundary
    console.warn("Standard repair failed, trying aggressive truncation...");
    
    // Find the last complete object/array closing bracket
    let lastGoodIdx = cleaned.length - 1;
    for (let i = cleaned.length - 1; i > 0; i--) {
      if (cleaned[i] === "}" || cleaned[i] === "]") {
        lastGoodIdx = i;
        break;
      }
    }
    
    let aggressive = cleaned.substring(0, lastGoodIdx + 1);
    // Remove any trailing comma before the closing bracket
    aggressive = aggressive.replace(/,(\s*[}\]])$/, "$1");
    
    // Recount and close
    inString = false;
    escape = false;
    braces = 0;
    brackets = 0;
    for (const ch of aggressive) {
      if (escape) { escape = false; continue; }
      if (ch === "\\") { escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === "{") braces++;
      if (ch === "}") braces--;
      if (ch === "[") brackets++;
      if (ch === "]") brackets--;
    }
    for (let i = 0; i < brackets; i++) aggressive += "]";
    for (let i = 0; i < braces; i++) aggressive += "}";
    
    try {
      return JSON.parse(aggressive) as T;
    } catch (finalErr) {
      console.error("All JSON repair attempts failed:", (finalErr as Error).message);
      console.error("First 500 chars:", cleaned.substring(0, 500));
      console.error("Last 200 chars:", cleaned.substring(cleaned.length - 200));
      throw new Error(`JSON parse failed after repair: ${(finalErr as Error).message}`);
    }
  }
}

// ── Main Server ──────────────────────────────────────────────────

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    if (!geminiApiKey) {
      console.error("GEMINI_API_KEY is not set in Edge Function secrets");
      return new Response(
        JSON.stringify({
          error: "Server configuration error: API key not set",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ══════════════════════════════════════════════════════════
    // MODE 1: Full Analysis Pipeline (new backend-first mode)
    // ══════════════════════════════════════════════════════════
    if (body.fullAnalysis && (body.contractText || body.inlineFileData)) {
      const contractText = (body.contractText as string) || "";
      const inlineFileData = body.inlineFileData as string | undefined;
      const inlineFileMime = (body.inlineFileMime as string) || "application/pdf";
      const hasInlineFile = !!inlineFileData;

      const truncated =
        contractText.length > 30000
          ? contractText.substring(0, 30000) + "\n...[truncated]"
          : contractText;
      const sample = contractText.substring(0, 5000);

      // User-selected model — validate and default to PRIMARY_MODEL
      const requestedModel = (body.model as string) || PRIMARY_MODEL;
      const selectedModel = ALLOWED_MODELS.includes(requestedModel)
        ? requestedModel
        : PRIMARY_MODEL;

      // Self-learning feedback context (injected into risk register prompt)
      const feedbackContext = (body.feedbackContext as string) || "";
      const riskPromptWithLearning = feedbackContext
        ? `${feedbackContext}\n\n${RISK_REGISTER_PROMPT}`
        : RISK_REGISTER_PROMPT;

      console.log(
        `[Full Analysis] Starting pipeline for ${contractText.length} chars${hasInlineFile ? " + inline file" : ""}${feedbackContext ? " + feedback learning" : ""} using model: ${selectedModel}...`
      );

      // Helper: build content parts with optional inline file
      const buildParts = (promptText: string, includeFile: boolean = false) => {
        const parts: Record<string, unknown>[] = [{ text: promptText }];
        if (includeFile && hasInlineFile) {
          parts.push({
            inline_data: {
              mime_type: inlineFileMime,
              data: inlineFileData,
            },
          });
        }
        return parts;
      };

      // For inline file (scanned docs), we need to use a special version of callGemini that supports parts
      const callGeminiWithParts = async (
        parts: Record<string, unknown>[],
        opts: Omit<GeminiCallOptions, "prompt"> & { prompt?: string }
      ): Promise<string> => {
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

          const payload: Record<string, unknown> = {
            contents: [{ parts }],
            generationConfig,
          };
          if (opts.systemPrompt) {
            payload.systemInstruction = { parts: [{ text: opts.systemPrompt }] };
          }

          try {
            console.log(`[Gemini+Parts] Trying model: ${model}`);
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
              lastError = (err as { error?: { message?: string } }).error?.message || `API error: ${res.status}`;
              if (i < modelsToTry.length - 1) { await sleep(1000); continue; }
              throw new Error(lastError);
            }

            const data = await res.json();
            const text = (data as any).candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) {
              if (i < modelsToTry.length - 1) continue;
              throw new Error("No response content");
            }
            console.log(`✅ [Gemini+Parts] Success with model: ${model}`);
            return text;
          } catch (fetchErr) {
            lastError = (fetchErr as Error).message;
            if (i < modelsToTry.length - 1) { await sleep(1000); continue; }
            throw fetchErr;
          }
        }
        throw new Error(`All models exhausted. Last error: ${lastError}`);
      };

      // ── Run ALL 3 prompts in parallel ──
      const [autoDetectRaw, riskRegisterRaw, checklistRaw] =
        await Promise.all([
          // Task 1: Auto-detect (fast, small prompt)
          (hasInlineFile
            ? callGeminiWithParts(
                buildParts(`${AUTO_DETECT_PROMPT}\n\n--- CONTRACT (see attached file) ---\n${sample}`, true),
                { systemPrompt: "You are an expert contract classifier. Return valid JSON only.", jsonMode: true, temperature: 0.1, maxTokens: 1024, model: selectedModel, apiKey: geminiApiKey }
              )
            : callGemini({
                prompt: `${AUTO_DETECT_PROMPT}\n\n--- CONTRACT TEXT (first pages) ---\n${sample}`,
                systemPrompt: "You are an expert contract classifier. Return valid JSON only.",
                jsonMode: true, temperature: 0.1, maxTokens: 1024, model: selectedModel, apiKey: geminiApiKey,
              })
          ).catch((e) => {
            console.warn("Auto-detect failed:", e.message);
            return JSON.stringify({
              contractLanguage: "Bilingual", contractType: "Unknown", projectType: "buildings",
              fidicVersion: "N/A", estimatedPages: 0, parties: { employer: "Unknown", contractor: "Unknown" },
            });
          }),

          // Task 2: Risk Register + Stakeholders (main analysis — with learning context)
          (hasInlineFile
            ? callGeminiWithParts(
                buildParts(`${riskPromptWithLearning}\n\n--- CONTRACT (see attached file) ---`, true),
                { systemPrompt: "You are a senior FIDIC contract advisor. Return valid JSON only.", jsonMode: true, temperature: 0.2, maxTokens: 32768, model: selectedModel, apiKey: geminiApiKey }
              )
            : callGemini({
                prompt: `${riskPromptWithLearning}\n\n--- CONTRACT TEXT ---\n${truncated}`,
                systemPrompt: "You are a senior FIDIC contract advisor. Return valid JSON only.",
                jsonMode: true, temperature: 0.2, maxTokens: 32768, model: selectedModel, apiKey: geminiApiKey,
              })
          ).catch((e) => {
            console.error("Risk Register analysis failed:", e.message);
            return JSON.stringify({
              projectName: "Unknown Project", contractType: "Unknown", contractValue: "N/A", currency: "SAR",
              overallRating: "RED", riskScore: 0, executiveSummaryAr: "فشل تحليل المخاطر - يرجى المحاولة مرة أخرى",
              executiveSummaryEn: "Risk analysis failed - please retry", goNoGo: "NO-GO",
              goNoGoReason: "Analysis failed: " + e.message, goNoGoReasonAr: "فشل التحليل",
              risks: [], stakeholders: [], keyDates: [], financialHighlights: [], clauseCompliance: [],
            });
          }),

          // Task 3: 19-Item Checklist
          (hasInlineFile
            ? callGeminiWithParts(
                buildParts(`${CHECKLIST_PROMPT}\n\n--- CONTRACT (see attached file) ---`, true),
                { systemPrompt: "You are Dr. El-Osily, a meticulous FIDIC contract auditor. Return valid JSON arrays only.", jsonMode: true, temperature: 0.2, maxTokens: 16384, model: selectedModel, apiKey: geminiApiKey }
              )
            : callGemini({
                prompt: `${CHECKLIST_PROMPT}\n\n--- CONTRACT TEXT ---\n${truncated}`,
                systemPrompt: "You are Dr. El-Osily, a meticulous FIDIC contract auditor. Return valid JSON arrays only.",
                jsonMode: true, temperature: 0.2, maxTokens: 16384, model: selectedModel, apiKey: geminiApiKey,
              })
          ).catch((e) => {
            console.error("Checklist analysis failed:", e.message);
            return JSON.stringify([]);
          }),
        ]);

      console.log("[Full Analysis] All 3 prompts completed. Assembling result...");

      // ── Parse results (with fallbacks) ──
      let autoDetect: Record<string, unknown>;
      try {
        autoDetect = parseJSON<Record<string, unknown>>(autoDetectRaw);
      } catch (e) {
        console.error("Auto-detect parse failed:", (e as Error).message);
        autoDetect = { contractLanguage: "Bilingual", contractType: "Unknown", projectType: "buildings", fidicVersion: "N/A", estimatedPages: 0, parties: { employer: "Unknown", contractor: "Unknown" } };
      }

      let riskResult: Record<string, unknown>;
      try {
        riskResult = parseJSON<Record<string, unknown>>(riskRegisterRaw);
      } catch (e) {
        console.error("Risk register parse failed:", (e as Error).message);
        riskResult = { projectName: "Unknown", contractType: "Unknown", contractValue: "N/A", currency: "SAR", overallRating: "RED", riskScore: 0, executiveSummaryEn: "Analysis parse error", executiveSummaryAr: "خطأ في التحليل", goNoGo: "NO-GO", goNoGoReason: "Parse error", goNoGoReasonAr: "خطأ", risks: [], stakeholders: [], keyDates: [], financialHighlights: [], clauseCompliance: [] };
      }

      let checklist: unknown[];
      try {
        const parsed = parseJSON<unknown>(checklistRaw);
        // Handle both array and object-wrapped array
        if (Array.isArray(parsed)) {
          checklist = parsed;
        } else if (parsed && typeof parsed === "object" && "checklist" in (parsed as Record<string, unknown>)) {
          checklist = (parsed as Record<string, unknown>).checklist as unknown[];
        } else if (parsed && typeof parsed === "object" && "items" in (parsed as Record<string, unknown>)) {
          checklist = (parsed as Record<string, unknown>).items as unknown[];
        } else {
          checklist = [];
        }
      } catch (e) {
        console.error("Checklist parse failed:", (e as Error).message);
        checklist = [];
      }

      // ── Assemble unified AnalysisResult ──
      const analysisResult = {
        ...riskResult,
        checklist,
        autoDetect,
        analyzedAt: new Date().toISOString(),
        id: crypto.randomUUID(),
        model: selectedModel,
      };

      console.log(
        `[Full Analysis] ✅ Complete. Risk Score: ${
          (riskResult as { riskScore?: number }).riskScore
        }, Rating: ${(riskResult as { overallRating?: string }).overallRating}`
      );

      return new Response(JSON.stringify(analysisResult), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ══════════════════════════════════════════════════════════
    // MODE 2: Legacy single-prompt mode (backward compatible)
    // ══════════════════════════════════════════════════════════
    const { prompt, jsonMode, temperature, maxTokens, systemPrompt, model, inlineData } = body;

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Missing required field: prompt or contractText" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build content parts — supports text + optional inline file (PDF/DOCX)
    const parts: Record<string, unknown>[] = [{ text: prompt }];
    if (inlineData?.data && inlineData?.mimeType) {
      parts.push({
        inline_data: {
          mime_type: inlineData.mimeType,
          data: inlineData.data,
        },
      });
    }

    const selectedModel = model || PRIMARY_MODEL;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${geminiApiKey}`;

    const generationConfig: Record<string, unknown> = {
      temperature: temperature ?? 0.3,
      maxOutputTokens: maxTokens ?? 8192,
    };

    if (jsonMode) {
      generationConfig.responseMimeType = "application/json";
    }

    const payload: Record<string, unknown> = {
      contents: [{ parts }],
      generationConfig,
    };

    if (systemPrompt) {
      payload.systemInstruction = { parts: [{ text: systemPrompt }] };
    } else {
      payload.systemInstruction = {
        parts: [
          {
            text: "أنت خبير في تحليل العقود الإنشائية بخبرة 35+ عام في عقود FIDIC والعقود الإنشائية في الشرق الأوسط. أجب بدقة وتنظيم.",
          },
        ],
      };
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.status === 429) {
      // Try fallback model
      if (selectedModel === PRIMARY_MODEL) {
        console.warn("Rate limited, trying fallback model...");
        const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/${FALLBACK_MODEL}:generateContent?key=${geminiApiKey}`;
        const fallbackRes = await fetch(fallbackUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          const text = (fallbackData as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
            .candidates?.[0]?.content?.parts?.[0]?.text;
          return new Response(JSON.stringify({ text }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      return new Response(
        JSON.stringify({
          error:
            "تم تجاوز حد الطلبات المسموحة. يرجى الانتظار دقيقة ثم المحاولة مرة أخرى.",
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("Gemini API Error:", JSON.stringify(err));
      
      // Try fallback on any error with primary model
      if (selectedModel === PRIMARY_MODEL) {
        console.warn("Primary model failed, trying fallback...");
        const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/${FALLBACK_MODEL}:generateContent?key=${geminiApiKey}`;
        const fallbackRes = await fetch(fallbackUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          const text = (fallbackData as { candidates?: { content?: { parts?: { text?: string }[] } }[] })
            .candidates?.[0]?.content?.parts?.[0]?.text;
          return new Response(JSON.stringify({ text }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      
      throw new Error(
        (err as { error?: { message?: string } }).error?.message ||
          `Google API error: ${res.status}`
      );
    }

    const data = await res.json();
    const text = (
      data as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      }
    ).candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("No response content generated by Gemini");
    }

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Edge Function Exception:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
