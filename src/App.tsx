import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import {
  FolderKanban, Wallet, TrendingUp, BarChart3, ScanFace, Receipt,
} from "lucide-react";
import { lazy, Suspense, useEffect } from "react";
import { useAuthStore } from "@/stores/useAuthStore";
import ProtectedRoute from "./components/ProtectedRoute";
import DashboardLayout from "./components/DashboardLayout";
import ErrorBoundary from "./components/ErrorBoundary";

/* ─── Route-level loading spinner ──────────────────────────── */
function RouteSpinner() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-muted-foreground">Loading…</span>
      </div>
    </div>
  );
}

/* ─── Lazy page imports (code-split per route) ────────────── */
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const PlaceholderPage = lazy(() => import("./pages/PlaceholderPage"));
const MasterDataPage = lazy(() => import("./pages/MasterDataPage"));
const TenderListPage = lazy(() => import("./pages/tenders/TenderListPage"));
const TenderCreatePage = lazy(() => import("./pages/tenders/TenderCreatePage"));
const TenderDetailPage = lazy(() => import("./pages/tenders/TenderDetailPage"));
const BudgetListPage = lazy(() => import("./pages/budget/BudgetListPage"));
const BudgetDetailPage = lazy(() => import("./pages/budget/BudgetDetailPage"));
const UserManagementPage = lazy(() => import("./pages/UserManagementPage"));
const ProjectsListPage = lazy(() => import("./pages/ProjectsListPage"));
const ProjectCreatePage = lazy(() => import("./pages/projects/ProjectCreatePage"));
const ProjectDetailPage = lazy(() => import("./pages/projects/ProjectDetailPage"));
const OngoingProjectsProgressPage = lazy(() => import("./pages/OngoingProjectsProgressPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const AccessDeniedPage = lazy(() => import("./pages/AccessDeniedPage"));
const PythonConsolePage = lazy(() => import("./pages/PythonConsolePage"));
const OcrWorkspacePage = lazy(() => import("./pages/OcrWorkspacePage"));
const IPCManagementPage = lazy(() => import("./pages/IPCManagementPage"));
const IPCBoardPage = lazy(() => import("./pages/IPCBoardPage"));
const StakeholdersPage = lazy(() => import("./pages/StakeholdersPage"));
const CollectionsPage = lazy(() => import("./pages/CollectionsPage"));
const CashFlowPage = lazy(() => import("./pages/CashFlowPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

/* ─── Query Client ─────────────────────────────────────────── */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,   // 2 min — avoid refetching on every tab switch
      gcTime: 10 * 60 * 1000,     // 10 min — keep cached data in memory longer
      refetchOnWindowFocus: false, // ERP data doesn't need real-time refresh
      retry: (failureCount, error: any) => {
        // Don't retry auth errors
        if (error?.status === 401 || error?.status === 403) return false;
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    },
  },
});

const modules = [
  { path: "/projects", title: "Project Setup", desc: "Configure project details, WBS, and team assignments.", icon: FolderKanban },
  { path: "/ipc-management", title: "IPC Management", desc: "Manage IPC invoices, submitted values, approvals, deductions, and collections.", icon: Receipt },
  { path: "/collections", title: "Collections", desc: "Track client payments, aging reports, and collection status.", icon: Wallet },
  { path: "/cash-flow", title: "Cash Flow", desc: "Forecast and monitor project and company cash flow.", icon: TrendingUp },
  { path: "/executive", title: "Executive Dashboard", desc: "High-level KPIs and analytics for leadership.", icon: BarChart3 },
  { path: "/stakeholders", title: "Stakeholders", desc: "Manage project stakeholders and RACI matrix.", icon: FolderKanban },
  { path: "/board-dashboard", title: "Board Dashboard", desc: "Leadership dashboard for high-level project and IPC status.", icon: BarChart3 },
  { path: "/ocr-workspace", title: "Folio OCR", desc: "Batch OCR documents, contracts, and drawings using local AI.", icon: ScanFace },
];

function App() {
  // Initialize Zustand auth store on mount
  useEffect(() => {
    const cleanup = useAuthStore.getState().init();
    return cleanup;
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <ErrorBoundary>
          <Suspense fallback={<RouteSpinner />}>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/access-denied" element={<AccessDeniedPage />} />
              <Route path="/ipc-board/:token" element={<IPCBoardPage />} />
              
              {/* Protected routes */}
              <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                <Route path="/" element={<OngoingProjectsProgressPage />} />
                <Route path="/executive" element={<DashboardPage />} />
                <Route path="/tenders" element={<TenderListPage />} />
                <Route path="/tenders/new" element={<TenderCreatePage />} />
                <Route path="/tenders/:id" element={<TenderDetailPage />} />
                <Route path="/budget" element={<BudgetListPage />} />
                <Route path="/budget/:id" element={<BudgetDetailPage />} />
                <Route path="/master-data" element={<MasterDataPage />} />
                <Route path="/user-management" element={<UserManagementPage />} />
                <Route path="/invoices" element={<IPCManagementPage />} />
                <Route path="/projects" element={<ProjectsListPage />} />
                <Route path="/projects/new" element={<ProjectCreatePage />} />
                <Route path="/projects/:id" element={<ProjectDetailPage />} />
                <Route path="/ongoing-projects" element={<OngoingProjectsProgressPage />} />
                <Route path="/python-console" element={<PythonConsolePage />} />
                <Route path="/ocr-workspace" element={<OcrWorkspacePage />} />
                <Route path="/ipc-management" element={<IPCManagementPage />} />
                <Route path="/stakeholders" element={<StakeholdersPage />} />
                <Route path="/collections" element={<CollectionsPage />} />
                <Route path="/cash-flow" element={<CashFlowPage />} />
                {modules.filter(m => ![
                  "/projects",
                  "/invoices",
                  "/ipc-management",
                  "/executive",
                  "/ocr-workspace",
                  "/collections",
                  "/cash-flow",
                  "/stakeholders",
                ].includes(m.path)).map((m) => (
                  <Route key={m.path} path={m.path} element={<PlaceholderPage title={m.title} description={m.desc} icon={m.icon} />} />
                ))}
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
}

export default App;
