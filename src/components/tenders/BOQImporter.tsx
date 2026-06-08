import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, X, Check, AlertCircle, Pencil, Sparkles, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import { useCreateCBSItem } from "@/hooks/useTenders";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import BOQPreviewTable from "./BOQPreviewTable";

export interface ParsedBOQItem {
  item_no: string;
  name: string;
  description: string;
  unit: string;
  quantity: number;
  unit_rate: number;
  total: number;
  section: string;
  level: number;
  children: ParsedBOQItem[];
}

interface BOQImporterProps {
  tenderId: string;
  onClose: () => void;
  onImported: () => void;
}

export default function BOQImporter({ tenderId, onClose, onImported }: BOQImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedItems, setParsedItems] = useState<ParsedBOQItem[]>([]);
  const [importing, setImporting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseMethod, setParseMethod] = useState<"ai" | "basic" | null>(null);
  const [isLumpsum, setIsLumpsum] = useState(false);
  const [lumpsumTotal, setLumpsumTotal] = useState<number>(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const createItem = useCreateCBSItem();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setParseError(null);
    setParseMethod(null);
    parseWithAI(f);
  };

  const readExcelSheets = async (file: File) => {
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type: "array" });
    const sheetsData: { name: string; rows: any[][] }[] = [];

    for (const sheetName of wb.SheetNames) {
      const ws = wb.Sheets[sheetName];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      // Filter out completely empty rows
      const filteredRows = rows.filter(row => row.some((cell: any) => cell !== ""));
      if (filteredRows.length > 0) {
        sheetsData.push({ name: sheetName, rows: filteredRows });
      }
    }
    return sheetsData;
  };

  const parseWithAI = async (file: File) => {
    setParsing(true);
    setParseError(null);

    try {
      const sheetsData = await readExcelSheets(file);

      if (sheetsData.length === 0) {
        setParseError("الملف فارغ أو لا يحتوي على بيانات.");
        setParsing(false);
        return;
      }

      // Call AI edge function
      const { data, error } = await supabase.functions.invoke("parse-boq", {
        body: { sheetsData },
      });

      if (error) {
        console.error("AI parse error:", error);
        // Fallback to basic parsing
        toast.info("تعذرت المعالجة الذكية، جاري التحليل الأساسي...");
        await parseBasic(file);
        return;
      }

      if (data?.error) {
        console.error("AI parse returned error:", data.error);
        toast.info("تعذرت المعالجة الذكية، جاري التحليل الأساسي...");
        await parseBasic(file);
        return;
      }

      const items: ParsedBOQItem[] = (data.items || []).map((item: any) => ({
        item_no: item.item_no || "",
        name: item.name || "",
        description: item.description || "",
        unit: item.unit || "",
        quantity: item.quantity || 0,
        unit_rate: item.unit_rate || 0,
        total: item.total || 0,
        section: item.section || "General",
        level: 2,
        children: [],
      }));

      if (items.length === 0) {
        toast.info("الذكاء الاصطناعي لم يجد بنود، جاري التحليل الأساسي...");
        await parseBasic(file);
        return;
      }

      setParsedItems(items);
      setLumpsumTotal(items.reduce((s, i) => s + i.total, 0));
      setParseMethod("ai");
      toast.success(`تم تحليل ${items.length} بند بالذكاء الاصطناعي`);
    } catch (err: any) {
      console.error("AI parsing failed:", err);
      toast.info("تعذرت المعالجة الذكية، جاري التحليل الأساسي...");
      await parseBasic(file);
    } finally {
      setParsing(false);
    }
  };

  const parseBasic = async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array" });
      const items: ParsedBOQItem[] = [];

      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        let sectionName = sheetName;

        for (let r = 0; r < rows.length; r++) {
          const row = rows[r];
          if (!row || row.length < 3) continue;

          const firstCell = String(row[0] || "").trim();
          const secondCell = String(row[1] || "").trim();
          const thirdCell = String(row[2] || "").trim();

          if (firstCell.toUpperCase().includes("ITEM NO") || firstCell.toUpperCase().includes("SER")) continue;
          if (!firstCell && !secondCell) continue;

          if ((firstCell.match(/^\d+(st|nd|rd|th)\s/i) || firstCell.toUpperCase().includes("WORKS") || firstCell.toUpperCase().includes("DIVISION")) && !thirdCell) {
            sectionName = firstCell;
            continue;
          }

          if (!firstCell && secondCell && !thirdCell && secondCell.length > 3 && !secondCell.match(/^Supply|^Install/i)) {
            continue;
          }

          const itemNo = firstCell.match(/^\d+(\.\d+)?$/) ? firstCell : "";
          if (!itemNo) continue;

          let itemName = secondCell;
          let unit = "";
          let qty = 0;
          let unitRate = 0;
          let total = 0;

          if (row.length >= 4) {
            unit = String(row[2] || "").trim();
            const possibleQty = parseFloat(String(row[3] || "0").replace(/,/g, ""));
            const possibleRate = parseFloat(String(row[4] || "0").replace(/,/g, ""));
            const possibleTotal = parseFloat(String(row[3] || row[4] || "0").replace(/,/g, ""));

            if (!isNaN(possibleQty) && possibleQty > 0) qty = possibleQty;
            if (!isNaN(possibleRate) && possibleRate > 0) unitRate = possibleRate;
            if (!isNaN(possibleTotal) && possibleTotal > 0 && !qty) total = possibleTotal;
          }

          for (let j = r + 1; j < Math.min(r + 5, rows.length); j++) {
            const nextRow = rows[j];
            if (!nextRow) continue;
            const nextSecond = String(nextRow[1] || "").trim();
            if (nextSecond.match(/^Supply|^Install/i)) {
              itemName = `${itemName} - ${nextSecond}`;
              const nUnit = String(nextRow[2] || "").trim();
              const nQty = parseFloat(String(nextRow[3] || "0").replace(/,/g, ""));
              const nRate = parseFloat(String(nextRow[4] || "0").replace(/,/g, ""));
              const nTotal = parseFloat(String(nextRow[5] || nextRow[4] || nextRow[3] || "0").replace(/,/g, ""));

              if (nUnit && nUnit !== "0") unit = nUnit;
              if (!isNaN(nQty) && nQty > 0) qty = nQty;
              if (!isNaN(nRate) && nRate > 0) unitRate = nRate;
              if (!isNaN(nTotal) && nTotal > 0) total = nTotal;
              r = j;
              break;
            }
          }

          if (!total && qty && unitRate) total = qty * unitRate;

          items.push({
            item_no: itemNo,
            name: itemName,
            description: secondCell,
            unit,
            quantity: qty,
            unit_rate: unitRate,
            total,
            section: sectionName,
            level: 2,
            children: [],
          });
        }
      }

      if (items.length === 0) {
        setParseError("لم يتم العثور على بنود BOQ في الملف. تأكد من أن الملف يحتوي على بنود مرقمة.");
      }

      setParsedItems(items);
      setLumpsumTotal(items.reduce((s, i) => s + i.total, 0));
      setParseMethod("basic");
    } catch (err: any) {
      setParseError(`خطأ في قراءة الملف: ${err.message}`);
    }
  };

  const handleRetryAI = () => {
    if (file) {
      setParsedItems([]);
      parseWithAI(file);
    }
  };

  const handleUpdateItem = (index: number, updates: Partial<ParsedBOQItem>) => {
    setParsedItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      if ('quantity' in updates || 'unit_rate' in updates) {
        const q = updates.quantity ?? next[index].quantity;
        const r = updates.unit_rate ?? next[index].unit_rate;
        next[index].total = q * r;
      }
      return next;
    });
  };

  const handleDeleteItem = (index: number) => {
    setParsedItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleDistributeLumpsum = () => {
    if (lumpsumTotal <= 0 || parsedItems.length === 0) return;
    const perItem = lumpsumTotal / parsedItems.length;
    setParsedItems(prev => prev.map(item => ({
      ...item,
      quantity: 1,
      unit: item.unit || "LS",
      unit_rate: perItem,
      total: perItem,
    })));
  };

  const handleImport = async () => {
    if (parsedItems.length === 0) return;
    setImporting(true);

    try {
      const sections = new Map<string, ParsedBOQItem[]>();
      for (const item of parsedItems) {
        const key = item.section || "General";
        if (!sections.has(key)) sections.set(key, []);
        sections.get(key)!.push(item);
      }

      let sortOrder = 0;

      for (const [sectionName, sectionItems] of sections) {
        const sectionResult = await createItem.mutateAsync({
          tender_id: tenderId,
          parent_id: null,
          name: sectionName,
          level: 0,
          sort_order: sortOrder++,
          section: sectionName,
        });

        for (const item of sectionItems) {
          await createItem.mutateAsync({
            tender_id: tenderId,
            parent_id: sectionResult.id,
            name: item.name,
            item_no: item.item_no,
            unit: item.unit || null,
            quantity: item.quantity,
            unit_rate: item.unit_rate,
            level: 1,
            sort_order: sortOrder++,
            section: sectionName,
          });
        }
      }

      toast.success(`تم استيراد ${parsedItems.length} بند بنجاح`);
      onImported();
      onClose();
    } catch (err: any) {
      toast.error(`خطأ في الاستيراد: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl shadow-xl border border-border w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-heading font-bold text-foreground">استيراد BOQ من Excel</h2>
            <p className="text-xs text-muted-foreground mt-0.5">ارفع ملف BOQ — يتم تحليله بالذكاء الاصطناعي لقراءة كل البنود</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-4">
          {/* File Upload */}
          {!file ? (
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-12 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
              <Upload size={40} className="text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-foreground">اختر ملف Excel (.xlsx, .xls)</p>
              <p className="text-xs text-muted-foreground mt-1">أو اسحب الملف هنا</p>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} className="hidden" />
            </label>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border">
              <FileSpreadsheet size={20} className="text-primary" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(0)} KB • {parsedItems.length} بند
                  {parseMethod && (
                    <span className={`mr-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      parseMethod === "ai" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                      {parseMethod === "ai" ? <><Sparkles size={10} /> AI</> : "Basic"}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {parseMethod === "basic" && (
                  <button onClick={handleRetryAI}
                    className="flex items-center gap-1 text-xs text-primary hover:underline">
                    <Sparkles size={12} /> إعادة بالذكاء الاصطناعي
                  </button>
                )}
                <button onClick={() => { setFile(null); setParsedItems([]); setParseError(null); setParseMethod(null); }}
                  className="text-xs text-muted-foreground hover:text-foreground">تغيير</button>
              </div>
            </div>
          )}

          {/* AI Processing indicator */}
          {parsing && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20 animate-pulse">
              <Loader2 size={20} className="text-primary animate-spin" />
              <div>
                <p className="text-sm font-medium text-foreground">جاري التحليل بالذكاء الاصطناعي...</p>
                <p className="text-xs text-muted-foreground mt-0.5">يتم قراءة الملف وتحليل جميع البنود والأقسام — قد يستغرق بضع ثوانٍ</p>
              </div>
            </div>
          )}

          {parseError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircle size={16} className="text-destructive mt-0.5" />
              <p className="text-sm text-destructive">{parseError}</p>
            </div>
          )}

          {/* Lumpsum Mode */}
          {parsedItems.length > 0 && (
            <div className="flex flex-col gap-3 p-4 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Switch id="lumpsum-mode" checked={isLumpsum} onCheckedChange={setIsLumpsum} />
                  <Label htmlFor="lumpsum-mode" className="text-sm font-medium text-foreground cursor-pointer">
                    عقد Lumpsum (سعر إجمالي شامل)
                  </Label>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Pencil size={12} />
                  انقر على أي خلية للتعديل
                </div>
              </div>
              {isLumpsum && (
                <div className="flex items-center gap-3">
                  <Label className="text-sm text-muted-foreground whitespace-nowrap">السعر الإجمالي للعقد:</Label>
                  <Input
                    type="number"
                    value={lumpsumTotal || ""}
                    onChange={(e) => setLumpsumTotal(parseFloat(e.target.value) || 0)}
                    className="w-48 h-8 text-sm font-mono"
                    placeholder="0"
                  />
                  <button
                    onClick={handleDistributeLumpsum}
                    className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
                  >
                    توزيع على البنود
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Editable Preview Table */}
          {parsedItems.length > 0 && (
            <BOQPreviewTable
              items={parsedItems}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border">
          <p className="text-xs text-muted-foreground">
            {parsing
              ? "جاري التحليل..."
              : parsedItems.length > 0
                ? `${parsedItems.length} بند • الإجمالي: ${parsedItems.reduce((s, i) => s + i.total, 0).toLocaleString()} ج.م`
                : "اختر ملف للبدء"}
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-secondary transition-colors">
              إلغاء
            </button>
            <button
              onClick={handleImport}
              disabled={parsedItems.length === 0 || importing || parsing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              <Check size={14} />
              {importing ? "جاري الاستيراد..." : "استيراد"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
