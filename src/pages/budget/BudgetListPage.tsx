import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Calculator,
  Plus,
  FileText,
  TrendingUp,
  Wallet,
  Target,
  Search,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useBudgetHeaders, useCreateBudget } from "@/hooks/useBudget";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const STATUS_CONFIG = {
  draft: { label: "مسودة", color: "bg-muted text-muted-foreground" },
  submitted: { label: "قيد الاعتماد", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  approved: { label: "معتمدة", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
  locked: { label: "مقفلة", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" },
};

export default function BudgetListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState("");

  const { data: budgets, isLoading } = useBudgetHeaders();
  const createBudget = useCreateBudget();

  // Get projects without budget
  const { data: projects } = useQuery({
    queryKey: ["projects-without-budget"],
    queryFn: async () => {
      const { data: allProjects } = await supabase
        .from("ongoing_projects")
        .select("id, project_code, project_name, contract_value");
      
      const { data: budgetedProjects } = await supabase
        .from("budget_headers")
        .select("project_id");

      const budgetedIds = new Set(budgetedProjects?.map((b) => b.project_id) || []);
      return allProjects?.filter((p) => !budgetedIds.has(p.id)) || [];
    },
  });

  const filteredBudgets = budgets?.filter((b) => {
    const matchesSearch =
      !search ||
      b.project?.project_name?.toLowerCase().includes(search.toLowerCase()) ||
      b.project?.project_code?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateBudget = async () => {
    if (!selectedProject) return;
    await createBudget.mutateAsync(selectedProject);
    setShowNewDialog(false);
    setSelectedProject("");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-EG", {
      style: "currency",
      currency: "EGP",
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  // Calculate totals
  const totalContractValue = budgets?.reduce((sum, b) => sum + (b.project?.contract_value || b.contract_value || 0), 0) || 0;
  const totalBudget = budgets?.reduce((sum, b) => sum + (b.total_budget || 0), 0) || 0;
  const totalProfit = totalContractValue - totalBudget;
  const avgMargin = totalContractValue > 0 ? (totalProfit / totalContractValue) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <Calculator className="text-primary" size={28} />
            Budget Module
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            إدارة الميزانيات التنفيذية للمشاريع بعد الفوز بالمناقصة
          </p>
        </div>

        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus size={16} />
              ميزانية جديدة
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إنشاء ميزانية جديدة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium mb-2 block">اختر المشروع</label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر مشروع..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projects?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.project_code} - {p.project_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleCreateBudget}
                disabled={!selectedProject || createBudget.isPending}
                className="w-full"
              >
                إنشاء الميزانية
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-xl p-5 border border-border shadow-card"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                إجمالي قيمة العقود
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {formatCurrency(totalContractValue)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="text-primary" size={20} />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card rounded-xl p-5 border border-border shadow-card"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                إجمالي الميزانيات
              </p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {formatCurrency(totalBudget)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Calculator className="text-blue-500" size={20} />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-xl p-5 border border-border shadow-card"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                الربح المتوقع
              </p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {formatCurrency(totalProfit)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Wallet className="text-emerald-500" size={20} />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-card rounded-xl p-5 border border-border shadow-card"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                متوسط هامش الربح
              </p>
              <p className={`text-2xl font-bold mt-1 ${
                avgMargin >= 15 ? "text-emerald-600" : avgMargin >= 5 ? "text-amber-600" : "text-red-600"
              }`}>
                {avgMargin.toFixed(1)}%
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Target className="text-amber-500" size={20} />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="بحث بالمشروع..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <Filter size={14} className="mr-2" />
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الحالات</SelectItem>
            <SelectItem value="draft">مسودة</SelectItem>
            <SelectItem value="submitted">قيد الاعتماد</SelectItem>
            <SelectItem value="approved">معتمدة</SelectItem>
            <SelectItem value="locked">مقفلة</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Budget List */}
      <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                المشروع
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                قيمة العقد
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                الميزانية
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                الربح المتوقع
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                هامش الربح
              </th>
              <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                الحالة
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-muted-foreground">
                  جاري التحميل...
                </td>
              </tr>
            ) : filteredBudgets?.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-muted-foreground">
                  لا توجد ميزانيات
                </td>
              </tr>
            ) : (
              filteredBudgets?.map((budget) => {
                const cVal = budget.project?.contract_value || budget.contract_value || 0;
                const margin = cVal > 0
                  ? ((cVal - budget.total_budget) / cVal) * 100
                  : 0;
                return (
                  <tr
                    key={budget.id}
                    onClick={() => navigate(`/budget/${budget.id}`)}
                    className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-foreground">
                          {budget.project?.project_name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {budget.project?.project_code}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {formatCurrency(cVal)}
                    </td>
                    <td className="px-4 py-3">
                      {formatCurrency(budget.total_budget)}
                    </td>
                    <td className="px-4 py-3 text-emerald-600 font-medium">
                      {formatCurrency(cVal - budget.total_budget)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-medium ${
                        margin >= 15 ? "text-emerald-600" : margin >= 5 ? "text-amber-600" : "text-red-600"
                      }`}>
                        {margin.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={STATUS_CONFIG[budget.status]?.color}>
                        {STATUS_CONFIG[budget.status]?.label}
                      </Badge>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
