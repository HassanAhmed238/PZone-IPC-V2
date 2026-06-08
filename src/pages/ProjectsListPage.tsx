import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Building2, Search, Plus, TrendingUp, AlertTriangle, AlertCircle,
  ChevronRight, Calendar, User, Edit3, Trash2, Save, X, MoreHorizontal,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useProjects, useProjectsKPIs, useUpdateProject, useDeleteProject } from "@/hooks/useProjects";
import { useProjectManagers, useStakeholderCompanies } from "@/hooks/useStakeholders";

const formatCurrency = (value: number | null) => {
  if (value === null || value === undefined) return "—";
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toLocaleString();
};

const getStatusBadge = (status: string | null) => {
  switch (status) {
    case "يعمل":
    case "active":
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">نشط</Badge>;
    case "setup":
      return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">إعداد</Badge>;
    case "on_hold":
    case "متوقف":
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">متوقف</Badge>;
    case "completed":
    case "مكتمل":
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">مكتمل</Badge>;
    case "cancelled":
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">ملغي</Badge>;
    case "لا يعمل":
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">لا يعمل</Badge>;
    default:
      return <Badge variant="outline">{status || "—"}</Badge>;
  }
};

export default function ProjectsListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: projects = [], isLoading } = useProjects({ search, status: statusFilter });
  const { data: kpis } = useProjectsKPIs();
  const { data: pmList = [] } = useProjectManagers();
  const { data: companies = [] } = useStakeholderCompanies();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  /* ─── Edit handlers ─── */
  const startEdit = (project: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(project.id);
    setEditForm({
      project_code: project.project_code || "",
      project_name: project.project_name || "",
      contract_value: project.contract_value || "",
      project_manager: project.project_manager || "",
      project_status: project.project_status || "setup",
      phone: project.phone || "",
      notes: project.notes || "",
    });
  };

  const cancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editingId) return;
    updateProject.mutate(
      {
        id: editingId,
        project_code: editForm.project_code,
        project_name: editForm.project_name,
        contract_value: editForm.contract_value ? parseFloat(editForm.contract_value) : null,
        project_manager: editForm.project_manager || null,
        project_status: editForm.project_status || null,
        phone: editForm.phone || null,
        notes: editForm.notes || null,
      } as any,
      { onSuccess: () => setEditingId(null) }
    );
  };

  const confirmDelete = () => {
    if (!deleteId) return;
    deleteProject.mutate(deleteId, { onSuccess: () => setDeleteId(null) });
  };

  const updateField = (field: string, value: any) => {
    setEditForm((prev: any) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">المشاريع</h1>
          <p className="text-muted-foreground text-sm">إدارة ومتابعة جميع مشاريع الشركة</p>
        </div>
        <Button onClick={() => navigate("/projects/new")} className="gap-2">
          <Plus size={16} />
          مشروع جديد
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي المشاريع</p>
                  <p className="text-3xl font-bold text-foreground">{kpis?.totalProjects || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Building2 className="text-primary" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">قيمة العقود</p>
                  <p className="text-3xl font-bold text-foreground">
                    {formatCurrency(kpis?.totalContractValue || 0)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <TrendingUp className="text-blue-400" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">مشاريع معرضة للخطر</p>
                  <p className="text-3xl font-bold text-foreground">{kpis?.atRiskCount || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                  <AlertTriangle className="text-yellow-400" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">مشاريع حرجة</p>
                  <p className="text-3xl font-bold text-foreground">{kpis?.criticalCount || 0}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <AlertCircle className="text-red-400" size={24} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                placeholder="بحث بالاسم أو الكود..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="setup">إعداد</SelectItem>
                <SelectItem value="يعمل">نشط</SelectItem>
                <SelectItem value="on_hold">متوقف</SelectItem>
                <SelectItem value="completed">مكتمل</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Projects Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-right">كود</TableHead>
                <TableHead className="text-right">اسم المشروع</TableHead>
                <TableHead className="text-right">قيمة العقد</TableHead>
                <TableHead className="text-right">مدير المشروع</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">ملاحظات</TableHead>
                <TableHead className="text-center w-[100px]">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    جاري التحميل...
                  </TableCell>
                </TableRow>
              ) : projects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    لا توجد مشاريع
                  </TableCell>
                </TableRow>
              ) : (
                projects.map((project) => {
                  const isEditing = editingId === project.id;

                  if (isEditing) {
                    return (
                      <TableRow key={project.id} className="bg-primary/5">
                        <TableCell>
                          <Input
                            value={editForm.project_code}
                            onChange={(e) => updateField("project_code", e.target.value)}
                            className="h-8 w-28 font-mono text-xs"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editForm.project_name}
                            onChange={(e) => updateField("project_name", e.target.value)}
                            className="h-8 min-w-[200px]"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={editForm.contract_value}
                            onChange={(e) => updateField("contract_value", e.target.value)}
                            className="h-8 w-32 font-mono"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                        <TableCell>
                          <Select value={editForm.project_manager} onValueChange={(v) => updateField("project_manager", v)}>
                            <SelectTrigger className="h-8 w-40" onClick={(e) => e.stopPropagation()}>
                              <SelectValue placeholder="اختر..." />
                            </SelectTrigger>
                            <SelectContent>
                              {pmList.map((pm) => (
                                <SelectItem key={pm.id} value={pm.name}>{pm.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select value={editForm.project_status} onValueChange={(v) => updateField("project_status", v)}>
                            <SelectTrigger className="h-8 w-28" onClick={(e) => e.stopPropagation()}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="setup">إعداد</SelectItem>
                              <SelectItem value="يعمل">نشط</SelectItem>
                              <SelectItem value="on_hold">متوقف</SelectItem>
                              <SelectItem value="completed">مكتمل</SelectItem>
                              <SelectItem value="لا يعمل">لا يعمل</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editForm.notes}
                            onChange={(e) => updateField("notes", e.target.value)}
                            className="h-8 min-w-[120px] text-xs"
                            placeholder="ملاحظات..."
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEdit}
                              disabled={updateProject.isPending}>
                              <Save size={14} className="text-green-400" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEdit}>
                              <X size={14} className="text-red-400" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  }

                  return (
                    <TableRow
                      key={project.id}
                      className="cursor-pointer hover:bg-secondary/50"
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      <TableCell className="font-mono text-xs">{project.project_code}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{project.project_name}</p>
                          {project.project_manager && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <User size={10} />
                              {project.project_manager}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatCurrency(project.contract_value)} {project.currency || "EGP"}
                      </TableCell>
                      <TableCell className="text-sm">{project.project_manager || "—"}</TableCell>
                      <TableCell>{getStatusBadge(project.project_status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                        {project.notes || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal size={14} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => startEdit(project, e as any)} className="gap-2">
                                <Edit3 size={14} /> تعديل
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeleteId(project.id)}
                                className="gap-2 text-red-400 focus:text-red-400"
                              >
                                <Trash2 size={14} /> حذف
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا المشروع؟ هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
