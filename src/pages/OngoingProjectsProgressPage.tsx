import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Search, Save, Plus } from "lucide-react";
import { useAuth } from "@/stores/useAuthStore";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCreateProject } from "@/hooks/useProjects";
import { useProjectManagers } from "@/hooks/useStakeholders";

export default function OngoingProjectsProgressPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false);
  const [newProjectData, setNewProjectData] = useState<any>({});
  
  const { user } = useAuth();
  const { isAdmin } = useUserRoles();
  const createProject = useCreateProject();
  const { data: pmList = [] } = useProjectManagers();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["ongoing-projects-progress"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ongoing_projects")
        .select("*")
        .order("project_code", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const updateProject = useMutation({
    mutationFn: async (payload: { id: string; updates: any }) => {
      const { error } = await supabase
        .from("ongoing_projects")
        .update(payload.updates)
        .eq("id", payload.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم التحديث بنجاح");
      queryClient.invalidateQueries({ queryKey: ["ongoing-projects-progress"] });
      setEditingRowId(null);
    },
    onError: (error) => {
      toast.error("حدث خطأ أثناء التحديث: " + error.message);
    },
  });

  const filteredProjects = projects.filter((p) => 
    p.project_name?.toLowerCase().includes(search.toLowerCase()) || 
    p.project_code?.toLowerCase().includes(search.toLowerCase())
  );

  const formatCurrency = (val: number | null) => {
    if (val == null) return "-";
    return val.toLocaleString();
  };

  const handleEditClick = (project: any) => {
    setEditingRowId(project.id);
    setEditFormData({ ...project });
  };

  const handleCancelEdit = () => {
    setEditingRowId(null);
    setEditFormData({});
  };

  const handleSaveEdit = (id: string) => {
    updateProject.mutate({ id, updates: editFormData });
  };

  const handleFieldChange = (field: string, value: any) => {
    setEditFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleCreateProject = () => {
    if (!newProjectData.project_code || !newProjectData.project_name) {
      toast.error("Please provide both code and name for the new project.");
      return;
    }
    
    createProject.mutate(
      { ...newProjectData, created_by: user?.id || "" },
      {
        onSuccess: () => {
          setIsNewProjectDialogOpen(false);
          setNewProjectData({});
        }
      }
    );
  };

  const totalContractValue = filteredProjects.reduce((sum, p) => sum + (p.contract_value || 0), 0);
  const totalAdvancedPayment = filteredProjects.reduce((sum, p) => sum + (p.advanced_payment || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">بيان المشاريع الجارية (Progress Sheet)</h1>
          <p className="text-muted-foreground text-sm">متابعة المستخلصات وبيانات الأعمال للمشاريع الحالية</p>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input 
              placeholder="بحث بالكود أو الاسم..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>
          
          {isAdmin && (
            <Dialog open={isNewProjectDialogOpen} onOpenChange={setIsNewProjectDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus size={16} /> إضافة مشروع
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>إضافة مشروع جاري جديد</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <label>كود المشروع</label>
                    <Input 
                      value={newProjectData.project_code || ''} 
                      onChange={(e) => setNewProjectData({...newProjectData, project_code: e.target.value})} 
                    />
                  </div>
                  <div className="grid gap-2">
                    <label>اسم المشروع</label>
                    <Input 
                      value={newProjectData.project_name || ''} 
                      onChange={(e) => setNewProjectData({...newProjectData, project_name: e.target.value})} 
                    />
                  </div>
                  <div className="grid gap-2">
                    <label>قيمة العقد</label>
                    <Input 
                      type="number"
                      value={newProjectData.contract_value || ''} 
                      onChange={(e) => setNewProjectData({...newProjectData, contract_value: parseFloat(e.target.value) || 0})} 
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button variant="outline" onClick={() => setIsNewProjectDialogOpen(false)}>إلغاء</Button>
                  <Button onClick={handleCreateProject} disabled={createProject.isPending}>
                    {createProject.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    حفظ المشروع
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[1800px] border-collapse">
            <TableHeader className="bg-secondary/50">
              <TableRow>
                <TableHead className="w-12 text-center border-border">Sr</TableHead>
                <TableHead className="min-w-[100px] border-border text-center">Code</TableHead>
                <TableHead className="min-w-[250px] border-border text-right">Project Name</TableHead>
                <TableHead className="min-w-[150px] border-border text-right">Contract Value</TableHead>
                <TableHead className="min-w-[150px] border-border text-right">Advanced Payment</TableHead>
                <TableHead className="min-w-[150px] border-border text-center">Project Manager</TableHead>
                <TableHead className="min-w-[120px] border-border text-center">Phone No.</TableHead>
                <TableHead className="min-w-[120px] border-border text-center">موقف المشروع</TableHead>
                <TableHead className="min-w-[120px] border-border text-center">Est. Sent Date</TableHead>
                <TableHead className="min-w-[100px] border-border text-center">Delay Days</TableHead>
                <TableHead className="min-w-[150px] border-border text-center">بيان الاعمال</TableHead>
                <TableHead className="min-w-[150px] border-border text-center">تاريخ تقديم المستخلص</TableHead>
                <TableHead className="min-w-[200px] border-border text-center">موقف المستخلص</TableHead>
                <TableHead className="min-w-[150px] border-border text-center">تاريخ اعتماد المستخلص</TableHead>
                <TableHead className="min-w-[150px] border-border text-right">Notes</TableHead>
                <TableHead className="min-w-[100px] border-border text-center">Progress Sheet</TableHead>
                {isAdmin && (
                  <TableHead className="min-w-[120px] border-border text-center sticky left-0 bg-background/95 shadow-[1px_0_0_0_var(--border)] z-10">إجراءات</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={17} className="h-48 text-center border-border">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Loader2 className="h-8 w-8 animate-spin mb-2 text-primary" />
                      جاري تحميل البيانات...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredProjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={17} className="h-48 text-center text-muted-foreground border-border">
                    لا توجد مشاريع جارية مطابقة للبحث
                  </TableCell>
                </TableRow>
              ) : (
                filteredProjects.map((project, index) => {
                  const isEditing = editingRowId === project.id;
                  
                  return (
                    <TableRow key={project.id} className="hover:bg-secondary/20 h-14">
                      <TableCell className="text-center font-mono border-border">{index + 1}</TableCell>
                      <TableCell className="font-mono text-center border-border">{project.project_code}</TableCell>
                      <TableCell className="font-medium text-right border-border truncate max-w-[250px]" title={project.project_name}>
                        {project.project_name}
                      </TableCell>
                      <TableCell className="text-right font-mono border-border text-sidebar-primary">
                        {formatCurrency(project.contract_value)}
                      </TableCell>
                      
                      <TableCell className="border-border">
                        {isEditing ? (
                          <Input 
                            type="number" 
                            className="h-8 text-right p-1" 
                            value={editFormData.advanced_payment || ''} 
                            onChange={(e) => handleFieldChange("advanced_payment", parseFloat(e.target.value) || 0)}
                          />
                        ) : (
                          <div className="text-right font-mono">{formatCurrency(project.advanced_payment)}</div>
                        )}
                      </TableCell>

                      <TableCell className="border-border text-center">
                        {isEditing ? (
                          <Select value={editFormData.project_manager || ''} onValueChange={(val) => handleFieldChange("project_manager", val)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="اختر..." /></SelectTrigger>
                            <SelectContent>
                              {pmList.map((pm) => (
                                <SelectItem key={pm.id} value={pm.name}>{pm.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="text-sm truncate" title={project.project_manager || ""}>{project.project_manager || "-"}</div>
                        )}
                      </TableCell>

                      <TableCell className="border-border text-center">
                        {isEditing ? (
                          <Input className="h-8 p-1 text-center font-mono text-xs" value={editFormData.phone || ''} onChange={(e) => handleFieldChange("phone", e.target.value)} />
                        ) : (
                          <div className="font-mono text-xs text-muted-foreground">{project.phone || "-"}</div>
                        )}
                      </TableCell>

                      <TableCell className="border-border text-center">
                        {isEditing ? (
                          <Select value={editFormData.project_status || 'يعمل'} onValueChange={(val) => handleFieldChange("project_status", val)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="يعمل">يعمل</SelectItem>
                              <SelectItem value="لا يعمل">لا يعمل</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className={`text-xs px-2 py-1 rounded-full inline-block ${project.project_status === 'لا يعمل' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                            {project.project_status || "يعمل"}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="border-border text-center">
                        {isEditing ? (
                          <Input type="date" className="h-8 p-1 text-xs" value={editFormData.est_sent_date || ''} onChange={(e) => handleFieldChange("est_sent_date", e.target.value)} />
                        ) : (
                          <div className="text-sm font-mono">{project.est_sent_date ? new Date(project.est_sent_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric'}) : "-"}</div>
                        )}
                      </TableCell>

                      <TableCell className="border-border text-center">
                        {isEditing ? (
                          <Input type="number" className="h-8 p-1 text-center" value={editFormData.delay_days || ''} onChange={(e) => handleFieldChange("delay_days", parseFloat(e.target.value) || 0)} />
                        ) : (
                          <div className={`font-mono font-medium ${project.delay_days && project.delay_days > 0 ? "text-red-500" : project.delay_days && project.delay_days < 0 ? "text-green-500" : ""}`}>
                            {project.delay_days != null ? project.delay_days.toFixed(2) : "-"}
                          </div>
                        )}
                      </TableCell>

                      <TableCell className="border-border text-center">
                        {isEditing ? (
                          <Select value={editFormData.progress_statement || 'لم يتم التقديم'} onValueChange={(val) => handleFieldChange("progress_statement", val)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="تم التقديم">تم التقديم</SelectItem>
                              <SelectItem value="لم يتم التقديم">لم يتم التقديم</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="text-sm">{project.progress_statement || "-"}</div>
                        )}
                      </TableCell>

                      <TableCell className="border-border text-center">
                        {isEditing ? (
                          <Input type="date" className="h-8 p-1 text-xs" value={editFormData.progress_date || ''} onChange={(e) => handleFieldChange("progress_date", e.target.value)} />
                        ) : (
                          <div className="text-sm font-mono">{project.progress_date ? new Date(project.progress_date).toLocaleDateString('en-GB') : "-"}</div>
                        )}
                      </TableCell>

                      <TableCell className="border-border text-center">
                        {isEditing ? (
                          <Select value={editFormData.invoice_status || ''} onValueChange={(val) => handleFieldChange("invoice_status", val)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="الاختيار..." /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="تحت الاعتماد">تحت الاعتماد</SelectItem>
                              <SelectItem value="في انتظار اعتماد المستخلصات السابقة">في انتظار اعتماد المستخلصات السابقة</SelectItem>
                              <SelectItem value="تم الاعتماد">تم الاعتماد</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="text-xs truncate" title={project.invoice_status || ""}>{project.invoice_status || "-"}</div>
                        )}
                      </TableCell>

                      <TableCell className="border-border text-center">
                        {isEditing ? (
                          <Input type="date" className="h-8 p-1 text-xs" value={editFormData.approval_date || ''} onChange={(e) => handleFieldChange("approval_date", e.target.value)} />
                        ) : (
                          <div className="text-sm font-mono">{project.approval_date ? new Date(project.approval_date).toLocaleDateString('en-GB') : "-"}</div>
                        )}
                      </TableCell>

                      <TableCell className="border-border">
                        {isEditing ? (
                          <Input className="h-8 p-1 text-xs" value={editFormData.notes || ''} onChange={(e) => handleFieldChange("notes", e.target.value)} />
                        ) : (
                          <div className="text-xs text-muted-foreground truncate max-w-[150px]" title={project.notes || ""}>{project.notes || "-"}</div>
                        )}
                      </TableCell>

                      <TableCell className="border-border text-center">
                        {isEditing ? (
                          <div className="flex justify-center">
                            <Checkbox 
                              checked={!!editFormData.progress_sheet} 
                              onCheckedChange={(checked) => handleFieldChange("progress_sheet", !!checked)} 
                            />
                          </div>
                        ) : (
                          <div className="flex justify-center">
                            <Checkbox checked={!!project.progress_sheet} disabled />
                          </div>
                        )}
                      </TableCell>

                      {isAdmin && (
                        <TableCell className="border-border text-center sticky left-0 bg-background/95 shadow-[1px_0_0_0_var(--border)] z-10">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-2">
                              <Button size="sm" onClick={() => handleSaveEdit(project.id)} className="h-7 px-2">
                                <Save size={14} className="mr-1" /> حفظ
                              </Button>
                              <Button size="sm" variant="outline" onClick={handleCancelEdit} className="h-7 px-2">
                                إلغاء
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="ghost" className="h-7 px-3 text-xs" onClick={() => handleEditClick(project)}>
                              تعديل
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
            <tfoot className="bg-secondary/50 font-medium">
              <TableRow>
                <TableCell colSpan={3} className="text-left border-border">الإجمالي</TableCell>
                <TableCell className="text-right font-mono border-border text-sidebar-primary">
                  {formatCurrency(totalContractValue)}
                </TableCell>
                <TableCell className="text-right font-mono border-border text-sidebar-primary">
                  {formatCurrency(totalAdvancedPayment)}
                </TableCell>
                <TableCell colSpan={12} className="border-border"></TableCell>
              </TableRow>
            </tfoot>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
