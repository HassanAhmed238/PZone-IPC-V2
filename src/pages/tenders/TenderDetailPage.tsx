import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Save } from "lucide-react";
import { useTender, useUpdateTender, useCBSItems } from "@/hooks/useTenders";
import { toast } from "sonner";
import { useState, useEffect, useMemo } from "react";
import CBSTree from "@/components/tenders/CBSTree";
import PricingSummary from "@/components/tenders/PricingSummary";
import TenderDetailsForm from "@/components/tenders/TenderDetailsForm";

const statusStyles: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-brand-blue/15 text-brand-blue",
  won: "bg-primary/15 text-primary",
  lost: "bg-destructive/15 text-destructive",
};

const statusFlow: Record<string, string[]> = {
  draft: ["submitted"],
  submitted: ["won", "lost"],
  won: [],
  lost: [],
};

export default function TenderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: tender, isLoading } = useTender(id);
  const { data: cbsItems } = useCBSItems(id);
  const updateTender = useUpdateTender();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    title: "", client_name: "", scope: "", submission_date: "",
    overhead_pct: 0, risk_pct: 0, contingency_pct: 0, profit_margin_pct: 0,
    commission_pct: 0, taxes_pct: 0, insurance_pct: 0, admin_expenses_pct: 0,
    exchange_rate_usd: 0, exchange_rate_eur: 0, shipping_fees_pct: 0, customs_fees_pct: 0, vat_pct: 14,
  });

  useEffect(() => {
    if (tender) {
      setForm({
        title: tender.title,
        client_name: tender.client_name || "",
        scope: tender.scope || "",
        submission_date: tender.submission_date || "",
        overhead_pct: tender.overhead_pct || 0,
        risk_pct: tender.risk_pct || 0,
        contingency_pct: tender.contingency_pct || 0,
        profit_margin_pct: tender.profit_margin_pct || 0,
        commission_pct: (tender as any).commission_pct || 0,
        taxes_pct: (tender as any).taxes_pct || 0,
        insurance_pct: (tender as any).insurance_pct || 0,
        admin_expenses_pct: (tender as any).admin_expenses_pct || 0,
        exchange_rate_usd: (tender as any).exchange_rate_usd || 0,
        exchange_rate_eur: (tender as any).exchange_rate_eur || 0,
        shipping_fees_pct: (tender as any).shipping_fees_pct || 0,
        customs_fees_pct: (tender as any).customs_fees_pct || 0,
        vat_pct: (tender as any).vat_pct || 14,
      });
    }
  }, [tender]);

  const leafItems = useMemo(() => {
    if (!cbsItems) return [];
    const parentIds = new Set(cbsItems.filter(i => i.parent_id).map(i => i.parent_id));
    return cbsItems.filter(i => !parentIds.has(i.id));
  }, [cbsItems]);

  const directCost = useMemo(() => leafItems.reduce((sum, i) => sum + (i.total_cost || 0), 0), [leafItems]);
  const sellingTotal = useMemo(() => leafItems.reduce((sum, i) => sum + (i.selling_total || i.total_cost || 0), 0), [leafItems]);

  const handleSave = async () => {
    if (!id) return;
    try {
      await updateTender.mutateAsync({ id, ...form });
      toast.success("تم تحديث المناقصة");
      setEditing(false);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!id || !tender) return;
    try {
      await updateTender.mutateAsync({ id, status: newStatus as any });
      toast.success(`تم تغيير الحالة إلى ${newStatus}`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">جاري التحميل...</div>;
  if (!tender) return <div className="text-center py-12 text-muted-foreground">المناقصة غير موجودة</div>;

  const set = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));
  const nextStatuses = statusFlow[tender.status] || [];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/tenders")} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <ArrowLeft size={18} className="text-muted-foreground" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-heading font-bold text-foreground">{tender.title}</h1>
              <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${statusStyles[tender.status]}`}>{tender.status}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{tender.tender_number} • {tender.client_name || "بدون عميل"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {nextStatuses.map((s) => (
            <button key={s} onClick={() => handleStatusChange(s)}
              className="px-3 py-2 rounded-lg border border-border text-xs font-medium capitalize hover:bg-secondary transition-colors">
              تحويل إلى {s}
            </button>
          ))}
          {!editing ? (
            <button onClick={() => setEditing(true)}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">تعديل</button>
          ) : (
            <button onClick={handleSave} disabled={updateTender.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
              <Save size={14} /> حفظ
            </button>
          )}
        </div>
      </div>

      {/* Details + Pricing */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <TenderDetailsForm editing={editing} form={form} set={set} tender={tender} />
        </div>
        <PricingSummary
          directCost={directCost}
          sellingTotal={sellingTotal}
          overheadPct={tender.overhead_pct || 0}
          riskPct={tender.risk_pct || 0}
          contingencyPct={tender.contingency_pct || 0}
          profitPct={tender.profit_margin_pct || 0}
          commissionPct={(tender as any).commission_pct || 0}
          taxesPct={(tender as any).taxes_pct || 0}
          insurancePct={(tender as any).insurance_pct || 0}
          adminExpensesPct={(tender as any).admin_expenses_pct || 0}
        />
      </div>

      {/* CBS Tree */}
      <CBSTree tenderId={id!} items={cbsItems || []} tenderTitle={tender.title} tenderNumber={tender.tender_number} />
    </motion.div>
  );
}
