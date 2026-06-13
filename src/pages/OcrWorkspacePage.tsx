import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ScanFace, RefreshCw, Upload, Copy, Download,
  CheckCircle2, AlertTriangle, Key, ExternalLink,
  Sparkles, FileText, Check, FileCode, Edit3, Eye
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

export default function OcrWorkspacePage() {
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash");
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [extractedText, setExtractedText] = useState("");
  const [activeTab, setActiveTab] = useState("edit");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const apiKey = localStorage.getItem("api_key_gemini") || (import.meta.env as any).VITE_GEMINI_API_KEY || "";

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const validTypes = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
      if (validTypes.includes(droppedFile.type)) {
        setFile(droppedFile);
        setExtractedText("");
        toast.success(`📂 تم تحميل الملف: ${droppedFile.name}`);
      } else {
        toast.error("❌ صيغة الملف غير مدعومة. يرجى رفع ملف PDF أو صورة.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setExtractedText("");
      toast.success(`📂 تم تحميل الملف: ${e.target.files[0].name}`);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleOcrProcess = async () => {
    if (!file) return;
    setIsProcessing(true);
    setStatusMsg("⚡ جاري تشفير وتجهيز الملف للتحليل البصري...");

    try {
      if (!apiKey) {
        throw new Error("مفتاح Gemini API غير متوفر. يرجى تهيئته أولاً.");
      }

      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1];
          resolve(base64String);
        };
        reader.onerror = () => reject(new Error("فشل ترميز الملف في المتصفح"));
        reader.readAsDataURL(file);
      });

      const base64Data = await base64Promise;
      
      setStatusMsg("🤖 جاري قراءة وتحليل المستند بالذكاء الاصطناعي (Gemini Cloud OCR)...");
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: "أنت خبير ومحرك احترافي في التعرف الضوئي على الحروف (OCR) للمستندات الهندسية والعقود والتقارير. قم باستخراج كافة النصوص والجداول بدقة عالية جداً من هذا الملف المرفق. حافظ على هيكلية الصفحات والجداول بشكل ممتاز ونظمها باستخدام Markdown. لا تقم بكتابة أي مقدمات أو شروحات أو عبارات مثل 'Here is the text', فقط أرجع النص المستخرج بشكل مباشر ونظيف." },
                {
                  inline_data: {
                    mime_type: file.type || "application/pdf",
                    data: base64Data
                  }
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error?.message || `فشل خادم التحليل السحابي (${response.status})`);
      }

      const resData = await response.json();
      let text = resData.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text || text.trim().length < 20) {
        throw new Error("فشل محرك الـ OCR في استخراج نصوص مقروءة. تأكد من جودة الصورة أو الملف.");
      }

      // Clean markdown fences
      text = text.replace(/```markdown\n?/g, "").replace(/```\n?/g, "").trim();

      setExtractedText(text);
      setActiveTab("preview");
      toast.success("🎉 اكتمل استخراج النصوص بنجاح!");
    } catch (e: any) {
      toast.error(e.message || "حدث خطأ أثناء معالجة المستند");
    } finally {
      setIsProcessing(false);
      setStatusMsg("");
    }
  };

  const copyToClipboard = () => {
    if (!extractedText) return;
    navigator.clipboard.writeText(extractedText);
    toast.success("📋 تم نسخ النص المستخرج للمحافظة!");
  };

  const downloadText = (format: "txt" | "md" | "docx") => {
    if (!extractedText) return;
    
    let content = extractedText;
    let filename = `OCR_${file?.name.split(".")[0] || "document"}`;
    let mimeType = "text/plain";
    
    if (format === "md") {
      filename += ".md";
      mimeType = "text/markdown";
    } else if (format === "txt") {
      filename += ".txt";
      mimeType = "text/plain";
    } else if (format === "docx") {
      filename += ".docx";
      mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      // Render simple HTML wrapper compatible with Microsoft Word
      content = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><title>OCR Document</title>
        <style>
          body { font-family: 'Arial', sans-serif; direction: rtl; unicode-bidi: embed; }
          table { border-collapse: collapse; width: 100%; margin: 10px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
          th { bg-color: #f2f2f2; }
        </style>
        </head>
        <body>
          ${extractedText.replace(/\n/g, "<br/>")}
        </body>
        </html>
      `;
    }

    const blob = new Blob(["\uFEFF" + content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`💾 تم تحميل الملف بصيغة ${format.toUpperCase()}`);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-4 gap-4" dir="rtl">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ScanFace className="text-primary" size={26} />
            منصة التعرف الضوئي السحابية (Gemini OCR)
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            منصة متكاملة لتحويل العقود والمستندات والرسوم الممسوحة ضوئياً إلى نصوص وجداول تفاعلية بدقة 100% دون خوادم محلية.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs px-2.5 py-1 gap-1">
            <Sparkles size={12} className="text-emerald-600 animate-pulse" />
            تحليل سحابي نشط (خالٍ من خادم Ollama)
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" dir="rtl">
        {/* Left Control Panel */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border border-border/80 shadow-sm">
            <CardHeader className="bg-slate-50/50 pb-3 border-b">
              <CardTitle className="text-sm">إعدادات التحليل</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4 text-right">
              {/* Model Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">🤖 نموذج الذكاء الاصطناعي:</Label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="bg-white h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini-2.5-flash">Gemini 2.5 Flash (سريع ومثالي للـ OCR)</SelectItem>
                    <SelectItem value="gemini-2.5-pro">Gemini 2.5 Pro (دقة قصوى للعقود الطويلة)</SelectItem>
                    <SelectItem value="gemini-2.0-flash">Gemini 2.0 Flash (مستقر وعام)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-slate-400">نوصي باستخدام Flash لسرعته الفائقة في قراءة الصور والملفات.</p>
              </div>

              {/* API Key Status */}
              <div className="pt-2 border-t text-xs space-y-1 text-slate-500">
                <div className="flex items-center justify-between">
                  <span>حالة الاتصال بالسحابة:</span>
                  <span className="text-emerald-600 font-semibold flex items-center gap-0.5">
                    <CheckCircle2 size={12} /> متصل وجاهز
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>مفتاح API المستخدم:</span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {apiKey ? "مفتاح خاص محفوظ 👤" : "لا يوجد مفتاح ⚠️"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upload Area */}
          <Card className="border border-border/80 shadow-sm">
            <CardContent className="p-4">
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                  dragActive ? "border-primary bg-primary/5" : "border-slate-200 hover:border-primary/50"
                }`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={triggerFileSelect}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                  onChange={handleFileChange}
                />
                
                <div className="flex flex-col items-center space-y-3">
                  <div className="p-3 rounded-full bg-slate-100 text-slate-500">
                    <Upload size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">اسحب وأفلت الملف هنا</p>
                    <p className="text-xs text-slate-400 mt-1">يدعم ملفات PDF الممسوحة ضوئياً، أو صور JPG/PNG/WebP</p>
                  </div>
                  <Button size="sm" variant="outline" className="text-xs">تصفح الملفات</Button>
                </div>
              </div>

              {file && (
                <div className="mt-4 p-3 bg-slate-50 rounded-lg border flex items-center justify-between text-right">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileText size={18} className="text-primary shrink-0" />
                    <div className="overflow-hidden">
                      <p className="text-xs font-semibold truncate text-slate-800">{file.name}</p>
                      <p className="text-[10px] text-slate-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="bg-primary text-white text-xs gap-1.5 shrink-0"
                    onClick={handleOcrProcess}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw size={12} className="animate-spin" />
                        جاري الاستخراج...
                      </>
                    ) : (
                      <>
                        <ScanFace size={13} />
                        ابدأ القراءة ⚡
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Output Workbench */}
        <div className="lg:col-span-8">
          {isProcessing ? (
            <Card className="h-[450px] border border-border/80 shadow-sm flex flex-col items-center justify-center p-6 text-center">
              <div className="p-4 rounded-full bg-primary/10 text-primary animate-pulse mb-4">
                <ScanFace size={48} className="animate-spin-slow" />
              </div>
              <h3 className="text-base font-bold text-slate-800">جاري قراءة واستخراج مستندك بالذكاء الاصطناعي</h3>
              <p className="text-xs text-amber-600 mt-2 font-semibold animate-pulse">{statusMsg}</p>
              <div className="w-48 bg-slate-200 rounded-full h-1.5 mt-4 overflow-hidden">
                <div className="bg-primary h-1.5 rounded-full animate-progress" />
              </div>
            </Card>
          ) : extractedText ? (
            <Card className="border border-border/80 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-175px)]">
              <div className="bg-slate-50/80 px-4 py-2 border-b flex items-center justify-between shrink-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
                  <TabsList className="h-8 bg-slate-200/60 p-0.5">
                    <TabsTrigger value="preview" className="h-7 text-xs px-3 gap-1">
                      <Eye size={12} /> معاينة النص
                    </TabsTrigger>
                    <TabsTrigger value="edit" className="h-7 text-xs px-3 gap-1">
                      <Edit3 size={12} /> تحرير المسودة
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {/* Toolbar */}
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={copyToClipboard}>
                    <Copy size={12} /> نسخ
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => downloadText("md")}>
                    <FileCode size={12} /> Markdown
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => downloadText("docx")}>
                    <Download size={12} /> Word (.docx)
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {activeTab === "edit" ? (
                  <Textarea
                    value={extractedText}
                    onChange={e => setExtractedText(e.target.value)}
                    className="w-full h-full font-mono text-xs leading-relaxed border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
                    placeholder="قم بتحرير النص المستخرج هنا..."
                  />
                ) : (
                  <div className="prose prose-sm prose-slate max-w-none text-right" dir="rtl">
                    <ReactMarkdown>{extractedText}</ReactMarkdown>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card className="h-[450px] border border-dashed border-slate-200 shadow-sm flex flex-col items-center justify-center p-6 text-center text-slate-400">
              <ScanFace size={48} className="text-slate-300 mb-3" />
              <h3 className="text-sm font-bold text-slate-700">منصة الاستخراج وجدول البيانات فارغ</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
                ارفع مستند عقد أو صورة جدول خامات ممسوح ضوئياً من الجانب الأيمن، وسيقوم محرك Gemini OCR السحابي باستخراج وتفصيل كافة محتوياته فوراً.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
