import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Calculator,
  ArrowLeft,
  FileText,
  Wallet,
  Target,
  TrendingUp,
  Lock,
  Send,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Import,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GitCompare } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  useBudgetHeader,
  useBudgetLines,
  useSubmitBudget,
  useApproveBudget,
  useRejectBudget,
} from "@/hooks/useBudget";
import { useUserRoles } from "@/hooks/useUserRoles";
import { useAvailableTenders, useImportFromTender } from "@/hooks/useImportFromTender";
import BudgetSourceComparison from "@/components/budget/BudgetSourceComparison";
import BudgetWorksheet from "@/components/budget/BudgetWorksheet";
import TenderBudgetComparison from "@/components/budget/TenderBudgetComparison";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_CONFIG = {
  draft: { label: "مسودة", color: "bg-muted text-muted-foreground", icon: FileText },
  submitted: { label: "قيد الاعتماد", color: "bg-blue-100 text-blue-800", icon: Send },
  approved: { label: "معتمدة", color: "bg-green-100 text-green-800", icon: CheckCircle },
  locked: { label: "مقفلة", color: "bg-emerald-100 text-emerald-800", icon: Lock },
};

export default function BudgetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasRole, isAdmin } = useUserRoles();

  const { data: budget, isLoading } = useBudgetHeader(id);
  const { data: lines } = useBudgetLines(id);

  const submitBudget = useSubmitBudget();
  const approveBudget = useApproveBudget();
  const rejectBudget = useRejectBudget();

  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectComment, setRejectComment] = useState("");
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedTenderId, setSelectedTenderId] = useState("");

  const { data: availableTenders } = useAvailableTenders(budget?.project_id);
  const importFromTender = useImportFromTender();

  const canEdit = budget?.status === "draft" && (isAdmin || hasRole("cost_control") || hasRole("estimator"));
  const canSubmit = budget?.status === "draft" && (isAdmin || hasRole("cost_control"));
  const canApprove = budget?.status === "submitted" && (isAdmin || hasRole("finance") || hasRole("ceo"));
  const isLocked = budget?.status === "locked";

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-EG", {
      style: "currency",
      currency: "EGP",
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  const handleSubmit = async () => {
    if (!id) return;
    await submitBudget.mutateAsync(id);
  };

  const handleApprove = async () => {
    if (!id) return;
    await approveBudget.mutateAsync(id);
  };

  const handleReject = async () => {
    if (!id || !rejectComment.trim()) return;
    await rejectBudget.mutateAsync({ id, comment: rejectComment });
    setShowRejectDialog(false);
    setRejectComment("");
  };

  const handleImport = async () => {
    if (!selectedTenderId || !id || !budget?.project_id) return;
    await importFromTender.mutateAsync({
      tenderId: selectedTenderId,
      budgetHeaderId: id,
      projectId: budget.project_id,
    });
    setShowImportDialog(false);
    setSelectedTenderId("");
  };

  const hasLines = (lines?.length || 0) > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!budget) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">الميزانية غير موجودة</p>
        <Button onClick={() => navigate("/budget")} className="mt-4">
          العودة للقائمة
        </Button>
      </div>
    );
  }

  const cVal = budget.project?.contract_value || budget.contract_value || 0;
  const margin = cVal > 0
    ? ((cVal - budget.total_budget) / cVal) * 100
    : 0;
  const StatusIcon = STATUS_CONFIG[budget.status]?.icon || FileText;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/budget")}>
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
              <Calculator className="text-primary" size={28} />
              {budget.project?.project_name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {budget.project?.project_code} • الإصدار {budget.version}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {canEdit && !hasLines && (
            <Button variant="outline" onClick={() => setShowImportDialog(true)}>
              <Import size={16} className="mr-2" />
              استيراد من المناقصة
            </Button>
          )}

          <Badge className={`${STATUS_CONFIG[budget.status]?.color} gap-1`}>
            <StatusIcon size={14} />
            {STATUS_CONFIG[budget.status]?.label}
          </Badge>

          {canSubmit && (
            <Button onClick={handleSubmit} disabled={submitBudget.isPending}>
              <Send size={16} className="mr-2" />
              تقديم للاعتماد
            </Button>
          )}

          {canApprove && (
            <>
              <Button
                variant="outline"
                onClick={() => setShowRejectDialog(true)}
                className="text-destructive border-destructive hover:bg-destructive/10"
              >
                <XCircle size={16} className="mr-2" />
                رفض
              </Button>
              <Button onClick={handleApprove} disabled={approveBudget.isPending}>
                <CheckCircle size={16} className="mr-2" />
                اعتماد
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status Banners */}
      {budget.status === "submitted" && canApprove && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="text-amber-600" size={20} />
          <span className="text-amber-800 dark:text-amber-200">
            ⏳ هذه الميزانية تنتظر اعتمادك
          </span>
        </div>
      )}

      {isLocked && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 flex items-center gap-3">
          <Lock className="text-emerald-600" size={20} />
          <span className="text-emerald-800 dark:text-emerald-200">
            🔒 الميزانية معتمدة ومقفلة — هذا هو الـ Baseline لمراقبة التكاليف
          </span>
        </div>
      )}

      {budget.rejection_comment && budget.status === "draft" && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200 font-medium">سبب الرفض:</p>
          <p className="text-red-700 dark:text-red-300 mt-1">{budget.rejection_comment}</p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-5 border border-border shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">قيمة العقد</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {formatCurrency(cVal)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="text-primary" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-5 border border-border shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">إجمالي الميزانية</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {formatCurrency(budget.total_budget)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Calculator className="text-blue-500" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-5 border border-border shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">الربح المتوقع</p>
              <p className={`text-2xl font-bold mt-1 ${
                cVal - budget.total_budget >= 0 ? "text-emerald-600" : "text-red-600"
              }`}>
                {formatCurrency(cVal - budget.total_budget)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Wallet className="text-emerald-500" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-5 border border-border shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">هامش الربح</p>
              <p className={`text-2xl font-bold mt-1 ${
                margin >= 15 ? "text-emerald-600" : margin >= 5 ? "text-amber-600" : "text-red-600"
              }`}>
                {margin.toFixed(1)}%
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Target className="text-amber-500" size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Warning if budget exceeds contract */}
      {budget.total_budget > cVal && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="text-red-600" size={20} />
          <span className="text-red-800 dark:text-red-200">
            ⚠️ الميزانية تتجاوز قيمة العقد — الربح سلبي!
          </span>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="worksheet" className="space-y-4">
        <TabsList>
          <TabsTrigger value="worksheet">ورقة العمل</TabsTrigger>
          <TabsTrigger value="sources">مقارنة المصادر</TabsTrigger>
          <TabsTrigger value="tender-comparison" className="gap-1">
            <GitCompare size={14} />
            vs المناقصة
          </TabsTrigger>
        </TabsList>

        <TabsContent value="worksheet">
          <BudgetWorksheet
            budgetHeaderId={id!}
            lines={lines || []}
            canEdit={canEdit}
            projectId={budget.project_id}
          />
        </TabsContent>

        <TabsContent value="sources">
          <BudgetSourceComparison
            budgetHeaderId={id!}
            lines={lines || []}
            canEdit={canEdit}
          />
        </TabsContent>

        <TabsContent value="tender-comparison">
          <TenderBudgetComparison
            budgetHeader={budget}
            budgetLines={lines || []}
          />
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>رفض الميزانية</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">سبب الرفض</label>
            <Textarea
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
              placeholder="اكتب سبب الرفض..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectComment.trim() || rejectBudget.isPending}
            >
              رفض الميزانية
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import from Tender Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>استيراد بنود من المناقصة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground">
              سيتم نسخ جميع بنود المناقصة المختارة إلى الميزانية مع تفاصيل التكلفة المباشرة
            </p>
            <div>
              <label className="text-sm font-medium mb-2 block">اختر المناقصة</label>
              <Select value={selectedTenderId} onValueChange={setSelectedTenderId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر مناقصة..." />
                </SelectTrigger>
                <SelectContent>
                  {availableTenders?.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.tender_number} - {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(!availableTenders || availableTenders.length === 0) && (
                <p className="text-xs text-muted-foreground mt-2">
                  لا توجد مناقصات فائزة — يجب تغيير حالة المناقصة إلى "فوز" أولاً
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              إلغاء
            </Button>
            <Button
              onClick={handleImport}
              disabled={!selectedTenderId || importFromTender.isPending}
            >
              {importFromTender.isPending ? "جاري الاستيراد..." : "استيراد البنود"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
