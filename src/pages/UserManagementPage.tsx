import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle2, Shield, UserPlus, Trash2, Search, Users, Database, ShieldCheck, FileText, Anchor, Activity, Calculator, FileSignature, Coins } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useModuleAccess } from "@/hooks/useModuleAccess";
import { useUserRoles } from "@/hooks/useUserRoles";
import { Navigate } from "react-router-dom";

const ROLE_LABELS: Record<string, string> = {
  chairman: "Chairman",
  ceo: "CEO",
  finance: "Finance",
  project_manager: "Project Manager",
  estimator: "Estimator",
  cost_control: "Cost Control",
  procurement: "Procurement",
  inventory: "Inventory",
  site_engineer: "Site Engineer",
  admin: "Admin",
  contract_admin: "Contract Admin",
  ipc_clerk: "IPC Clerk",
  scheduler: "Scheduler",
  board_member: "Board Member",
};

const ROLE_COLORS: Record<string, string> = {
  chairman: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  ceo: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  finance: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  project_manager: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  estimator: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  cost_control: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  procurement: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  inventory: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  site_engineer: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  admin: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  contract_admin: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
  ipc_clerk: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  scheduler: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  board_member: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
};

const ALL_ROLES = Object.keys(ROLE_LABELS);

const IS_DEV_LOCALHOST =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

const APP_MODULES = [
  { path: "/tenders", label: "Tender & Estimation" },
  { path: "/budget", label: "Budget" },
  { path: "/projects", label: "Project Setup" },
  { path: "/ipc-management", label: "IPC Management" },
  { path: "/collections", label: "Collections" },
  { path: "/stakeholders", label: "Stakeholders" },
  { path: "/payments", label: "Contractor Payments" },
  { path: "/cash-flow", label: "Cash Flow" },
  { path: "/executive", label: "Executive Dashboard" },
  { path: "/ocr-workspace", label: "Folio OCR" },
];

const RACI_COLUMNS = [
  { key: "responsible", label: "R - Responsible" },
  { key: "accountable", label: "A - Accountable" },
  { key: "consulted", label: "C - Consulted" },
  { key: "informed", label: "I - Informed" },
] as const;

const RACI_MATRIX = [
  {
    process: "Project setup and master data",
    responsible: ["project_manager"],
    accountable: ["admin"],
    consulted: ["cost_control", "finance", "contract_admin"],
    informed: ["ceo", "chairman"],
  },
  {
    process: "IPC preparation and submission",
    responsible: ["ipc_clerk", "contract_admin"],
    accountable: ["project_manager"],
    consulted: ["site_engineer", "cost_control"],
    informed: ["finance"],
  },
  {
    process: "IPC approval and certification",
    responsible: ["contract_admin"],
    accountable: ["finance"],
    consulted: ["project_manager", "cost_control"],
    informed: ["ceo", "chairman"],
  },
  {
    process: "Collections and aging follow-up",
    responsible: ["finance"],
    accountable: ["ceo"],
    consulted: ["project_manager", "contract_admin"],
    informed: ["chairman", "board_member"],
  },
  {
    process: "VO and deduction review",
    responsible: ["contract_admin", "cost_control"],
    accountable: ["project_manager"],
    consulted: ["finance", "site_engineer"],
    informed: ["ceo"],
  },
  {
    process: "Dashboard publishing for board view",
    responsible: ["finance", "cost_control"],
    accountable: ["ceo"],
    consulted: ["admin", "project_manager"],
    informed: ["chairman", "board_member"],
  },
  {
    process: "User access and role administration",
    responsible: ["admin"],
    accountable: ["admin"],
    consulted: ["ceo"],
    informed: ["chairman"],
  },
];

function RolePills({ roles }: { roles: string[] }) {
  return (
    <div className="flex flex-wrap justify-center gap-1.5">
      {roles.map((role) => (
        <span key={role} className={`inline-flex px-2 py-1 rounded-full text-[11px] font-medium ${ROLE_COLORS[role] || "bg-muted text-muted-foreground"}`}>
          {ROLE_LABELS[role] || role}
        </span>
      ))}
    </div>
  );
}


export default function UserManagementPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const { isAdmin, hasRole, isLoading: loadingViewerRoles, user } = useUserRoles();
  const canViewAdmin = IS_DEV_LOCALHOST || isAdmin || hasRole("ceo") || hasRole("chairman");

  // Fetch all profiles
  const { data: profiles, isLoading: loadingProfiles } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch all user_roles
  const { data: userRoles, isLoading: loadingRoles } = useQuery({
    queryKey: ["admin-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data;
    },
  });

  const addRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role: role as any });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
      toast.success("تم إضافة الصلاحية بنجاح");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const removeRole = useMutation({
    mutationFn: async (roleId: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
      toast.success("تم حذف الصلاحية");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const approveProfileName = useMutation({
    mutationFn: async (profile: any) => {
      if (!profile.pending_full_name) throw new Error("No pending name to approve.");
      const { error } = await (supabase as any)
        .from("profiles")
        .update({
          full_name: profile.pending_full_name,
          pending_full_name: null,
          profile_change_status: "approved",
          profile_change_reviewed_by: user?.id || null,
          profile_change_reviewed_at: new Date().toISOString(),
          profile_change_rejection_reason: null,
        })
        .eq("id", profile.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
      toast.success("Profile name approved.");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const { data: moduleAccessList, isLoading: loadingModuleAccess } = useModuleAccess();

  const toggleModuleAccess = useMutation({
    mutationFn: async ({ moduleId, role, modulePath, currentlyHas, moduleLabel, allowedRoles }: { moduleId?: string, role: string, modulePath: string, currentlyHas: boolean, moduleLabel: string, allowedRoles: string[] }) => {
      if (moduleId) {
        // Row exists, update allowed_roles array
        const newRoles = currentlyHas
          ? allowedRoles.filter(r => r !== role)
          : [...allowedRoles, role];
        const { error } = await supabase
          .from("contract_module_access")
          .update({ allowed_roles: newRoles })
          .eq("id", moduleId);
        if (error) throw error;
      } else {
        // Row does not exist, insert
        const { error } = await supabase
          .from("contract_module_access")
          .insert({ 
            module_path: modulePath, 
            module_label: moduleLabel,
            allowed_roles: [role]
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract_module_access"] });
      toast.success("تم تحديث صلاحية الوحدة بنجاح");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const isLoading = loadingProfiles || loadingRoles || loadingModuleAccess;

  // Redirect if not admin — AFTER all hooks
  if (loadingViewerRoles) {
    return <div className="text-center py-12 text-muted-foreground text-sm">Loading access...</div>;
  }

  if (!canViewAdmin) {
    return <Navigate to="/" replace />;
  }

  const getRolesForUser = (userId: string) =>
    userRoles?.filter((r) => r.user_id === userId) || [];

  const getAvailableRoles = (userId: string) => {
    const assigned = getRolesForUser(userId).map((r) => r.role);
    return ALL_ROLES.filter((r) => !assigned.includes(r));
  };

  const filteredProfiles = profiles?.filter(
    (p) =>
      p.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <Shield size={24} className="text-primary" />
            إدارة المستخدمين والصلاحيات
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            تعيين وإدارة أدوار المستخدمين في النظام
          </p>
          {!isAdmin && (
            <p className="text-xs text-brand-orange mt-1">
              Read-only leadership view. Only Admin users can change roles, permissions, and module access.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-white/50 px-3 py-1.5 rounded-full border border-slate-200">
          <Users size={16} />
          <span>{profiles?.length || 0} مستخدم مُسجل</span>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="bg-card/80 border text-foreground h-auto border-border w-full sm:w-auto p-1 shadow-sm flex flex-wrap justify-start">
          <TabsTrigger value="users" className="px-6 data-[state=active]:bg-brand-blue data-[state=active]:text-white">إدارة المستخدمين</TabsTrigger>
          <TabsTrigger value="permissions" className="px-6 data-[state=active]:bg-brand-blue data-[state=active]:text-white gap-2">
            <ShieldCheck size={16} />
            صلاحيات الوحدات (Matrix)
          </TabsTrigger>
          <TabsTrigger value="raci" className="px-6 data-[state=active]:bg-brand-blue data-[state=active]:text-white gap-2">
            <Shield size={16} />
            RACI Matrix
          </TabsTrigger>
          <TabsTrigger value="account" className="px-6 data-[state=active]:bg-brand-blue data-[state=active]:text-white">تغيير كلمة المرور</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6 focus-visible:outline-none focus-visible:ring-0">
          {/* Search */}
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث بالاسم..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-card text-foreground text-sm outline-none focus:ring-2 focus:ring-ring focus:border-brand-blue shadow-sm"
            />
          </div>

      {/* Users Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">جاري التحميل...</div>
      ) : (
        <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">المستخدم</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">القسم</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">الصلاحيات</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">إضافة صلاحية</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Profile Approval</th>
              </tr>
            </thead>
            <tbody>
              {filteredProfiles?.map((profile) => {
                const roles = getRolesForUser(profile.user_id);
                const available = getAvailableRoles(profile.user_id);
                return (
                  <tr key={profile.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                          {(profile.full_name || "U")[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{profile.full_name || "بدون اسم"}</div>
                          <div className="text-xs text-muted-foreground">{profile.phone || "—"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{profile.department || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {roles.length === 0 && (
                          <span className="text-xs text-muted-foreground">بدون صلاحيات</span>
                        )}
                        {roles.map((r) => (
                          <span
                            key={r.id}
                            className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${ROLE_COLORS[r.role] || "bg-muted text-muted-foreground"}`}
                          >
                            {ROLE_LABELS[r.role] || r.role}
                            <button
                              onClick={() => removeRole.mutate(r.id)}
                              disabled={!isAdmin}
                              className="hover:opacity-70 transition-opacity"
                              title="حذف الصلاحية"
                            >
                              <Trash2 size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {available.length > 0 ? (
                        <select
                          defaultValue=""
                          disabled={!isAdmin}
                          onChange={(e) => {
                            if (e.target.value) {
                              addRole.mutate({ userId: profile.user_id, role: e.target.value });
                              e.target.value = "";
                            }
                          }}
                          className="px-2 py-1.5 rounded-lg border border-input bg-background text-foreground text-xs outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="">اختر صلاحية...</option>
                          {available.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r] || r}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-muted-foreground">كل الصلاحيات مُعيّنة</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {(profile as any).profile_change_status === "pending" ? (
                        <div className="space-y-2">
                          <div className="text-xs text-muted-foreground">
                            New name: <span className="font-semibold text-foreground">{(profile as any).pending_full_name}</span>
                          </div>
                          <button
                            type="button"
                            disabled={!isAdmin || approveProfileName.isPending}
                            onClick={() => approveProfileName.mutate(profile)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:text-emerald-300"
                          >
                            <CheckCircle2 size={13} />
                            Approve
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No pending request</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredProfiles?.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">لا يوجد مستخدمين</div>
          )}
        </div>
      )}
        </TabsContent>

        <TabsContent value="permissions" className="focus-visible:outline-none focus-visible:ring-0">
          <div className="bg-card rounded-xl shadow-card border border-border p-6 overflow-x-auto">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-foreground">مصفوفة الصلاحيات (Role-Module Matrix)</h2>
              <p className="text-sm text-muted-foreground">حدد أي الأدوار (Roles) يحق لها الوصول إلى أي الوحدات (Modules). التغييرات تُحفظ فوراً في قاعدة البيانات وتُطبق على من يمتلك الدور المعني.</p>
              <div className="bg-blue-50 text-blue-800 p-3 rounded-md mt-4 text-sm flex gap-2 w-max border border-blue-100 items-start">
                <Shield className="h-4 w-4 shrink-0 mt-0.5" />
                <span>حسابك (solimane@pzone) وكل من يملك صلاحية Admin لديه وصول كامل لجميع الوحدات المذكورة أدناه بشكل افتراضي (حتى وإن لم تُحدد المربعات).</span>
              </div>
            </div>

            <table className="w-full text-sm border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-slate-800 border-r border-border min-w-[200px] sticky left-0 bg-muted/80 backdrop-blur-md">الوحدة (Module)</th>
                  {ALL_ROLES.filter(r => r !== 'admin').map((role) => (
                    <th key={role} className="text-center px-4 py-3 font-medium text-slate-600 border-r border-border last:border-r-0 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded-md text-xs ${ROLE_COLORS[role] || "bg-slate-100 text-slate-700"}`}>
                        {ROLE_LABELS[role] || role}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Assume APP_MODULES is available in scope, e.g. from a helper file */}
                {APP_MODULES.map((module) => (
                  <tr key={module.path} className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3 border-r border-border font-medium text-foreground sticky left-0 bg-card group-hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-2">
                        <Database className="h-3.5 w-3.5 text-slate-400" />
                        {module.label}
                        <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1 rounded ml-1">{module.path}</span>
                      </div>
                    </td>
                    {ALL_ROLES.filter(r => r !== 'admin').map((role) => {
                      const accessRecord = moduleAccessList?.find(m => m.module_path === module.path);
                      const hasAccess = accessRecord?.allowed_roles?.includes(role) || false;
                      
                      return (
                        <td key={`${module.path}-${role}`} className="px-4 py-3 text-center border-r border-border last:border-r-0">
                          <input 
                            type="checkbox" 
                            checked={hasAccess}
                            disabled={!isAdmin || toggleModuleAccess.isPending}
                            onChange={() => toggleModuleAccess.mutate({ 
                              moduleId: accessRecord?.id, 
                              role: role, 
                              modulePath: module.path, 
                              currentlyHas: hasAccess,
                              moduleLabel: module.label,
                              allowedRoles: accessRecord?.allowed_roles || []
                            })}
                            className="h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue cursor-pointer"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
        <TabsContent value="raci" className="focus-visible:outline-none focus-visible:ring-0">
          <div className="bg-card rounded-xl shadow-card border border-border p-6 overflow-x-auto">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-foreground">Admin RACI Matrix</h2>
              <p className="text-sm text-muted-foreground">
                Deployment-ready responsibility map for multi-user IPC operations. Use this with the role/module matrix so each user has both access and clear accountability.
              </p>
            </div>

            <table className="w-full text-sm border-collapse min-w-[960px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-slate-800 border-r border-border min-w-[240px] sticky left-0 bg-muted/80 backdrop-blur-md">
                    Process
                  </th>
                  {RACI_COLUMNS.map((column) => (
                    <th key={column.key} className="text-center px-4 py-3 font-medium text-slate-700 border-r border-border last:border-r-0 min-w-[170px]">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RACI_MATRIX.map((row) => (
                  <tr key={row.process} className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors">
                    <td className="px-4 py-3 border-r border-border font-medium text-foreground sticky left-0 bg-card">
                      {row.process}
                    </td>
                    {RACI_COLUMNS.map((column) => (
                      <td key={`${row.process}-${column.key}`} className="px-4 py-3 text-center border-r border-border last:border-r-0 align-top">
                        <RolePills roles={row[column.key]} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mt-5 grid gap-3 md:grid-cols-4">
              {RACI_COLUMNS.map((column) => (
                <div key={column.key} className="rounded-lg border border-border bg-muted/20 p-3">
                  <div className="text-xs font-semibold text-foreground">{column.label}</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {column.key === "responsible" && "Does the work and updates the ERP record."}
                    {column.key === "accountable" && "Owns the final decision and audit outcome."}
                    {column.key === "consulted" && "Gives input before approval or submission."}
                    {column.key === "informed" && "Receives dashboard/report visibility."}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="account" className="focus-visible:outline-none focus-visible:ring-0">
          <div className="bg-card rounded-xl shadow-card border border-border p-6 max-w-xl">
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <ShieldCheck size={20} className="text-primary" />
              تغيير كلمة المرور الخاصة بحسابك
            </h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const newPassword = formData.get('newPassword') as string;
              
              if (newPassword.length < 6) {
                toast.error("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
                return;
              }
              
              const { error } = await supabase.auth.updateUser({ password: newPassword });
              if (error) {
                toast.error(error.message);
              } else {
                toast.success("تم تغيير كلمة المرور بنجاح!");
                (e.target as HTMLFormElement).reset();
              }
            }} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1.5">كلمة المرور الجديدة</label>
                <input 
                  type="password" 
                  name="newPassword" 
                  required 
                  minLength={6}
                  placeholder="••••••••" 
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background/50 text-sm focus:ring-2 focus:ring-brand-blue outline-none" 
                />
              </div>
              <button type="submit" className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
                تحديث كلمة المرور
              </button>
            </form>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
