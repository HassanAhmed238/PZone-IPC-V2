import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useCreateTender } from "@/hooks/useTenders";
import { toast } from "sonner";

export default function TenderCreatePage() {
  const navigate = useNavigate();
  const createTender = useCreateTender();

  const [form, setForm] = useState({
    title: "",
    client_name: "",
    scope: "",
    submission_date: "",
    overhead_pct: 10,
    risk_pct: 5,
    contingency_pct: 3,
    profit_margin_pct: 15,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const tender = await createTender.mutateAsync({
        title: form.title,
        client_name: form.client_name || null,
        scope: form.scope || null,
        submission_date: form.submission_date || null,
        overhead_pct: form.overhead_pct,
        risk_pct: form.risk_pct,
        contingency_pct: form.contingency_pct,
        profit_margin_pct: form.profit_margin_pct,
      });
      toast.success("Tender created!");
      navigate(`/tenders/${tender.id}`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const set = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/tenders")} className="p-2 rounded-lg hover:bg-secondary transition-colors">
          <ArrowLeft size={18} className="text-muted-foreground" />
        </button>
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">New Tender</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Create a new tender estimate</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card rounded-xl p-6 shadow-card border border-border space-y-4">
          <h3 className="text-sm font-heading font-semibold text-foreground">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Project Title *</label>
              <input
                required
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g. Cairo Business Park Phase 3"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Client Name</label>
              <input
                value={form.client_name}
                onChange={(e) => set("client_name", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-ring"
                placeholder="Client company name"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Submission Date</label>
              <input
                type="date"
                value={form.submission_date}
                onChange={(e) => set("submission_date", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Scope of Work</label>
              <textarea
                value={form.scope}
                onChange={(e) => set("scope", e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-ring resize-none"
                placeholder="Describe scope of work..."
              />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-6 shadow-card border border-border space-y-4">
          <h3 className="text-sm font-heading font-semibold text-foreground">Indirect Costs & Margin</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { key: "overhead_pct", label: "Overhead %" },
              { key: "risk_pct", label: "Risk %" },
              { key: "contingency_pct", label: "Contingency %" },
              { key: "profit_margin_pct", label: "Profit Margin %" },
            ].map((field) => (
              <div key={field.key}>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">{field.label}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={(form as any)[field.key]}
                  onChange={(e) => set(field.key, parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={createTender.isPending}
            className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {createTender.isPending ? "Creating..." : "Create Tender"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/tenders")}
            className="px-6 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </motion.div>
  );
}
