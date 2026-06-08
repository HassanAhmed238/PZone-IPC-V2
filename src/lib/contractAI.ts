import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Type defined inline — not in the auto-generated Supabase types
export interface ContractClause {
  id: string;
  contract_id: string;
  clause_number: string | null;
  clause_title: string;
  clause_body: string;
  clause_type: string;
  is_flagged: boolean;
  flag_note: string | null;
  page_reference: string | null;
  source?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Extracts clauses from a contract document stored in Supabase Storage using Gemini
 * via secure Edge Function (API key stays server-side).
 */
export async function extractClausesFromPdf(
  fileUrl: string,
  contractType: string,
  governingLaw: string
): Promise<Partial<ContractClause>[]> {
  try {
    // 1. Download the file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("contracts")
      .download(fileUrl);

    if (downloadError) throw downloadError;

    // 2. Convert Blob to Base64
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Strip the data URL prefix (e.g. data:application/pdf;base64,)
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(fileData);
    });

    const mimeType = fileUrl.toLowerCase().endsWith(".docx")
      ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      : "application/pdf";

    // 3. Construct Prompt (Commercial Manager Persona)
    const prompt = `You are a highly experienced and meticulous Senior Commercial Manager and Contracts Director. You have decades of experience protecting companies from unfair risk, hidden liabilities, and poorly drafted terms.
You are reviewing a new contract.

Contract Type hint: ${contractType}
Governing Law hint: ${governingLaw}

**YOUR TASK:**
Act as the ultimate Commercial Manager. Do not just summarize; aggressively analyze the contract for commercial, financial, and legal risks. Extract the absolute most critical clauses that affect our money, obligations, and risk exposure.

If this is a FIDIC contract, specifically hunt for and extract clauses regarding:
- general_conditions, employer_obligations, contractor_obligations, contract_price, payment_terms, advance_payment, retention, variations, claims, liquidated_damages, force_majeure, termination, defects_liability, dispute_resolution.
If it involves Egyptian Law, hunt for:
- commercial_registry, tax_compliance, performance_bond, arbitration_egypt.

Return the result ONLY as a JSON array of objects with this EXACT structure (no markdown wrapper, no backticks, strictly valid JSON array):
[
  {
    "clause_number": "number or section like '14.1' or null",
    "clause_title": "Title of the clause",
    "clause_body": "Provide a highly detailed, professional commercial summary of what this clause actually means for the business.",
    "clause_type": "ONE of the exact string types listed above (e.g. 'liquidated_damages' or 'other')",
    "is_flagged": boolean (MUST BE true if this clause contains ANY commercial risk, aggressive penalties, unfavourable payment terms, unfair termination rights, or unbalanced liability),
    "flag_note": "If is_flagged is true, write a sharp, critical Commercial Manager's note explaining exactly what the risk is and how it hurts us. If false, leave empty.",
    "page_reference": "Estimate page number if possible, else leave empty"
  }
]
Extract at least 5 to 10 of the most severe or important commercial clauses. Be thorough.
`;

    // 4. Call Gemini via secure Edge Function (API key stays server-side)
    const { data, error } = await supabase.functions.invoke('analyze-contract', {
      body: {
        prompt,
        model: "gemini-2.5-pro",
        temperature: 0.2,
        inlineData: {
          mimeType,
          data: base64Data,
        },
      }
    });

    if (error) {
      console.error("Edge Function Error:", error);
      throw new Error(error.message || "Analysis server error");
    }

    // 5. Parse JSON Output
    let textOut = data?.text || "";
    console.log("Gemini Raw Output:", textOut);

    if (textOut.includes("```json")) {
      textOut = textOut.replace(/```json\n|\\n```/g, "");
    } else if (textOut.includes("```")) {
      textOut = textOut.replace(/```\n|\\n```/g, "");
    }

    console.log("Cleaned JSON string:", textOut);
    const clauses = JSON.parse(textOut.trim());
    console.log("Parsed Clauses Array:", clauses);
    return clauses;

  } catch (error: any) {
    console.error("Extraction error:", error);
    toast.error(`خطأ في استخراج الذكاء الاصطناعي: ${error.message}`);
    throw error;
  }
}

/**
 * Triggers an external automation webhook (e.g. Make.com / Zapier) with the prompt and a signed URL to the contract document.
 */
export async function triggerContractAutomationWebhook(
  webhookUrl: string,
  filePath: string,
  prompt: string,
  metadata: any
): Promise<boolean> {
  try {
    // 1. Generate a generic signed URL valid for a few hours so the automation can download the PDF
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from("contracts")
      .createSignedUrl(filePath, 60 * 60 * 24); // 24 hours

    if (signedUrlError) throw signedUrlError;

    // 2. Send the payload to the provided webhook
    const payload = {
      action: "analyze_contract",
      file_url: signedUrlData.signedUrl,
      original_file_path: filePath,
      prompt: prompt,
      metadata: metadata,
      timestamp: new Date().toISOString()
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook responded with status: ${response.status}`);
    }

    return true; // Sent successfully
  } catch (error: any) {
    console.error("Webhook trigger error:", error);
    toast.error(`فشل إرسال البيانات للأتمتة: ${error.message}`);
    throw error;
  }
}

