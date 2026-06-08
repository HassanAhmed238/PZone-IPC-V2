import { useParams, useNavigate } from "react-router-dom";
import { ArrowRight, Building2, Calendar, User, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProject } from "@/hooks/useProjects";
import ProjectOverviewTab from "@/components/projects/tabs/ProjectOverviewTab";
import ProjectWBSTab from "@/components/projects/tabs/ProjectWBSTab";
import ProjectMilestonesTab from "@/components/projects/tabs/ProjectMilestonesTab";
import ProjectTeamTab from "@/components/projects/tabs/ProjectTeamTab";
import ProjectDocumentsTab from "@/components/projects/tabs/ProjectDocumentsTab";
import ProjectSettingsTab from "@/components/projects/tabs/ProjectSettingsTab";
import ProjectVOsTab from "@/components/projects/tabs/ProjectVOsTab";
import ProjectIPCsTab from "@/components/projects/tabs/ProjectIPCsTab";

const getStatusBadge = (status: string | null) => {
  switch (status) {
    case "يعمل":
    case "active":
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">نشط</Badge>;
    case "setup":
      return <Badge className="bg-muted text-muted-foreground border-border">إعداد</Badge>;
    case "on_hold":
    case "متوقف":
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">متوقف</Badge>;
    case "completed":
    case "مكتمل":
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">مكتمل</Badge>;
    default:
      return <Badge variant="outline">{status || "—"}</Badge>;
  }
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: project, isLoading } = useProject(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        جاري التحميل...
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">المشروع غير موجود</p>
        <Button variant="outline" onClick={() => navigate("/projects")}>
          العودة للقائمة
        </Button>
      </div>
    );
  }

  const endDate = project.end_date ? new Date(project.end_date) : null;
  const daysRemaining = endDate
    ? Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button onClick={() => navigate("/projects")} className="hover:text-foreground transition">
          المشاريع
        </button>
        <ArrowRight size={14} />
        <span className="text-foreground">{project.project_name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{project.project_name}</h1>
            {getStatusBadge(project.project_status)}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="font-mono">{project.project_code}</span>
            {project.client && (
              <span className="flex items-center gap-1">
                <Building2 size={14} />
                {(project.client as any)?.name}
              </span>
            )}
            {project.project_manager && (
              <span className="flex items-center gap-1">
                <User size={14} />
                {project.project_manager}
              </span>
            )}
            {project.contract_value && (
              <span>
                {Number(project.contract_value).toLocaleString()} {project.currency || "EGP"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Progress value={project.completion_pct || 0} className="w-48 h-2" />
            <span className="text-sm text-muted-foreground">
              {(project.completion_pct || 0).toFixed(0)}% مكتمل
            </span>
            {daysRemaining !== null && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar size={12} />
                {daysRemaining > 0 ? `${daysRemaining} يوم متبقي` : "متأخر"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" dir="rtl">
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
          <TabsTrigger value="overview">📊 نظرة عامة</TabsTrigger>
          <TabsTrigger value="wbs">📋 هيكل العمل</TabsTrigger>
          <TabsTrigger value="milestones">🎯 محطات الدفع</TabsTrigger>
          <TabsTrigger value="team">👥 الفريق</TabsTrigger>
          <TabsTrigger value="documents">📁 الوثائق</TabsTrigger>
          <TabsTrigger value="settings">⚙️ الإعدادات</TabsTrigger>
          <TabsTrigger value="vos">📋 أوامر التغيير</TabsTrigger>
          <TabsTrigger value="ipcs">💰 المستخلصات</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ProjectOverviewTab project={project} />
        </TabsContent>
        <TabsContent value="wbs">
          <ProjectWBSTab projectId={project.id} />
        </TabsContent>
        <TabsContent value="milestones">
          <ProjectMilestonesTab projectId={project.id} retentionPct={project.retention_pct || 10} />
        </TabsContent>
        <TabsContent value="team">
          <ProjectTeamTab projectId={project.id} />
        </TabsContent>
        <TabsContent value="documents">
          <ProjectDocumentsTab projectId={project.id} />
        </TabsContent>
        <TabsContent value="settings">
          <ProjectSettingsTab project={project} />
        </TabsContent>
        <TabsContent value="vos">
          <ProjectVOsTab projectCode={project.project_code} />
        </TabsContent>
        <TabsContent value="ipcs">
          <ProjectIPCsTab projectCode={project.project_code} projectName={project.project_name} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
