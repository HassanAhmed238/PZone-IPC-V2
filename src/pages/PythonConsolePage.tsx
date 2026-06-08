import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Terminal,
  Send,
  Loader2,
  CheckCircle2,
  Database,
  RefreshCw,
  Info,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProjects } from "@/hooks/useProjects";
import { useInvoices } from "@/hooks/useIPC";

// ─── Types ───────────────────────────────────────────────────────────────────

type KernelStatus = "loading" | "initializing" | "ready" | "error";

interface DataBridgeMessage {
  source: "pzone-erp";
  key: string;
  payload: Record<string, unknown>[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const JUPYTERLITE_ORIGIN =
  import.meta.env.VITE_JUPYTERLITE_ORIGIN || "http://localhost:8000";
const ERP_ORIGIN =
  import.meta.env.VITE_APP_ORIGIN || "http://localhost:8080"; // Must match ALLOWED_ORIGIN in startup.py config.json
const JUPYTERLITE_URL = `${JUPYTERLITE_ORIGIN}/repl/index.html?toolbar=1&kernel=python`;

const LOADING_STEPS = [
  { label: "Loading WebAssembly runtime", duration: 3000 },
  { label: "Downloading Python packages", duration: 5000 },
  { label: "Initializing kernel", duration: 2000 },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function PythonConsolePage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [kernelStatus, setKernelStatus] = useState<KernelStatus>("loading");
  const [loadingStep, setLoadingStep] = useState(0);
  const [selectedProjectId, setSelectedProjectId] = useState<string>();
  const [sentDatasets, setSentDatasets] = useState<string[]>([]);

  // Fetch ERP data
  const { data: projects } = useProjects();
  const selectedProjectCode = selectedProjectId 
    ? projects?.find(p => p.id === selectedProjectId)?.project_code 
    : undefined;
  const { data: invoices } = useInvoices(selectedProjectCode);

  // ─── Loading animation stepper ───────────────────────────────────────────

  useEffect(() => {
    if (kernelStatus !== "loading" && kernelStatus !== "initializing") return;

    const timer = setTimeout(() => {
      if (loadingStep < LOADING_STEPS.length - 1) {
        setLoadingStep((s) => s + 1);
        if (loadingStep === 0) setKernelStatus("initializing");
      }
    }, LOADING_STEPS[loadingStep].duration);

    return () => clearTimeout(timer);
  }, [loadingStep, kernelStatus]);

  // ─── Listen for kernel-ready message from JupyterLite ────────────────────

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      // SECURITY: Only accept messages from the JupyterLite origin
      if (event.origin !== JUPYTERLITE_ORIGIN) return;

      try {
        const data = event.data;
        if (
          typeof data === "object" &&
          data !== null &&
          data.source === "jupyterlite" &&
          data.type === "kernel-ready"
        ) {
          setKernelStatus("ready");
        }
      } catch {
        // Ignore malformed messages
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // ─── Auto-mark ready after timeout (fallback) ───────────────────────────

  useEffect(() => {
    const fallback = setTimeout(() => {
      if (kernelStatus !== "ready") {
        setKernelStatus("ready");
      }
    }, 15000); // 15s fallback

    return () => clearTimeout(fallback);
  }, [kernelStatus]);

  // ─── Send data to JupyterLite via postMessage ────────────────────────────

  const sendDataToJupyter = useCallback(
    (key: string, payload: Record<string, unknown>[]) => {
      if (!iframeRef.current?.contentWindow) return;

      const message: DataBridgeMessage = {
        source: "pzone-erp",
        key,
        payload,
      };

      iframeRef.current.contentWindow.postMessage(message, JUPYTERLITE_ORIGIN);

      setSentDatasets((prev) =>
        prev.includes(key) ? prev : [...prev, key]
      );
    },
    []
  );

  // ─── Send IPC records ──────────────────────────────────────────────────

  const sendIPCRecords = useCallback(() => {
    if (!invoices) return;

    const records = invoices.map((inv) => ({
      id: inv.id,
      project_code: inv.project_code,
      project_name: inv.project_name,
      invoice_number: inv.invoice_number,
      submitted_date: inv.submitted_date,
      contract_value: inv.contract_value,
      work_total: inv.work_total,
      net_total: inv.net_total,
      approved_total: inv.approved_total,
      approved_net_total: inv.approved_net_total,
      total_collections: inv.total_collections,
      status: inv.status,
    }));

    sendDataToJupyter("ipc_records", records);
  }, [invoices, sendDataToJupyter]);

  const sendProjectsList = useCallback(() => {
    if (!projects) return;
    sendDataToJupyter(
      "projects",
      projects.map((p) => ({
        id: p.id,
        project_name: p.project_name,
        project_code: p.project_code,
        contract_value: p.contract_value,
        project_status: p.project_status,
      }))
    );
  }, [projects, sendDataToJupyter]);

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-yellow-400/20 to-blue-500/20 ring-1 ring-yellow-500/20">
            <Terminal className="h-6 w-6 text-yellow-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Python Console
            </h1>
            <p className="text-sm text-muted-foreground">
              Interactive Python environment · pandas & numpy · ERP data bridge
            </p>
          </div>
        </div>

        {/* Status badge */}
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={`gap-1.5 px-3 py-1 text-xs font-medium transition-colors ${
              kernelStatus === "ready"
                ? "border-green-500/50 text-green-600 bg-green-50 dark:bg-green-950/30"
                : kernelStatus === "error"
                ? "border-red-500/50 text-red-600 bg-red-50 dark:bg-red-950/30"
                : "border-yellow-500/50 text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30"
            }`}
          >
            {kernelStatus === "ready" ? (
              <CheckCircle2 className="h-3.5 w-3.5" />
            ) : kernelStatus === "error" ? (
              <Info className="h-3.5 w-3.5" />
            ) : (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            )}
            {kernelStatus === "ready"
              ? "Kernel Ready"
              : kernelStatus === "error"
              ? "Connection Error"
              : "Loading..."}
          </Badge>
        </div>
      </div>

      {/* Data Bridge Toolbar */}
      <Card className="border-dashed">
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Database className="h-4 w-4" />
              <span className="font-medium">Data Bridge</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 flex-1">
              {/* Project selector */}
              <Select
                value={selectedProjectId || "all"}
                onValueChange={(v) =>
                  setSelectedProjectId(v === "all" ? undefined : v)
                }
              >
                <SelectTrigger className="w-[220px] h-8 text-xs">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.project_code} - {p.project_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Send buttons */}
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5"
                onClick={sendIPCRecords}
                disabled={kernelStatus !== "ready" || !invoices}
              >
                <Send className="h-3 w-3" />
                IPC Records
                {sentDatasets.includes("ipc_records") && (
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                )}
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5"
                onClick={sendProjectsList}
                disabled={kernelStatus !== "ready" || !projects}
              >
                <Send className="h-3 w-3" />
                Projects List
                {sentDatasets.includes("projects") && (
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                )}
              </Button>

              {sentDatasets.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs gap-1"
                  onClick={() => setSentDatasets([])}
                >
                  <RefreshCw className="h-3 w-3" />
                  Reset
                </Button>
              )}
            </div>

            {sentDatasets.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Use <code className="bg-muted px-1 rounded">df = erp('{sentDatasets[sentDatasets.length - 1]}')</code> in Python
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* JupyterLite iframe container */}
      <div className="relative rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Loading overlay */}
        <AnimatePresence>
          {kernelStatus !== "ready" && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm"
            >
              {/* Animated Python logo */}
              <div className="relative mb-8">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    repeat: Infinity,
                    duration: 3,
                    ease: "linear",
                  }}
                  className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-400 to-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20"
                >
                  <Terminal className="h-10 w-10 text-white" />
                </motion.div>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center"
                >
                  <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
                </motion.div>
              </div>

              {/* Loading steps */}
              <div className="space-y-3 w-72">
                {LOADING_STEPS.map((step, i) => (
                  <motion.div
                    key={step.label}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{
                      opacity: i <= loadingStep ? 1 : 0.3,
                      x: 0,
                    }}
                    transition={{ delay: i * 0.2 }}
                    className="flex items-center gap-3"
                  >
                    {i < loadingStep ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    ) : i === loadingStep ? (
                      <Loader2 className="h-5 w-5 text-yellow-500 animate-spin shrink-0" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-muted shrink-0" />
                    )}
                    <span
                      className={`text-sm ${
                        i <= loadingStep
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {step.label}
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* Progress bar */}
              <div className="w-72 mt-6">
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-yellow-400 to-blue-500 rounded-full"
                    initial={{ width: "0%" }}
                    animate={{
                      width: `${((loadingStep + 1) / LOADING_STEPS.length) * 100}%`,
                    }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground mt-4">
                First load may take 10-15 seconds to download Wasm runtime
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* The actual iframe — always mounted so it starts loading immediately */}
        <iframe
          ref={iframeRef}
          src={JUPYTERLITE_URL}
          width="100%"
          height="600"
          style={{ border: "none", display: "block" }}
          title="JupyterLite Python Console"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-modals allow-downloads"
          allow="cross-origin-isolated"
        />
      </div>

      {/* Usage hints */}
      <Card className="border-dashed bg-muted/30">
        <CardContent className="pt-4 pb-3">
          <details className="group">
            <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors select-none">
              <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
              Quick Start Guide
            </summary>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-muted-foreground">
              <div className="space-y-1.5">
                <p className="font-medium text-foreground">1. Load data from ERP</p>
                <pre className="bg-muted rounded-md p-2 overflow-x-auto">
{`# First click "Send IPC Records" above
df = erp('ipc_records')
df.head()`}
                </pre>
              </div>
              <div className="space-y-1.5">
                <p className="font-medium text-foreground">2. Analyze with pandas</p>
                <pre className="bg-muted rounded-md p-2 overflow-x-auto">
{`df.describe()
df.groupby('status')['net_total'].sum()
df[df['net_total'] > 100000]`}
                </pre>
              </div>
              <div className="space-y-1.5">
                <p className="font-medium text-foreground">3. Run startup script</p>
                <pre className="bg-muted rounded-md p-2 overflow-x-auto">
{`# In JupyterLite console:
exec(open('startup.py').read())`}
                </pre>
              </div>
              <div className="space-y-1.5">
                <p className="font-medium text-foreground">4. Available datasets</p>
                <pre className="bg-muted rounded-md p-2 overflow-x-auto">
{`erp_keys()        # list all datasets
erp('projects')   # projects list
erp('ipc_records')  # ipc records list`}
                </pre>
              </div>
            </div>
          </details>
        </CardContent>
      </Card>
    </motion.div>
  );
}
