import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Plus, Search, FileText, Trash2, MoreHorizontal } from "lucide-react";
import { useTenders, useDeleteTender, useUpdateTender } from "@/hooks/useTenders";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const statusStyles: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-brand-blue/15 text-brand-blue",
  won: "bg-primary/15 text-primary",
  lost: "bg-destructive/15 text-destructive",
};

const statusLabels: Record<string, string> = {
  draft: "مسودة",
  submitted: "مُقدم",
  won: "فاز",
  lost: "خسر",
};

const allStatuses = ["draft", "submitted", "won", "lost"];

export default function TenderListPage() {
  const navigate = useNavigate();
  const { data: tenders, isLoading } = useTenders();
  const deleteTender = useDeleteTender();
  const updateTender = useUpdateTender();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = tenders?.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.tender_number.toLowerCase().includes(search.toLowerCase()) ||
      (t.client_name || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleDelete = async (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    if (!confirm(`هل أنت متأكد من حذف "${title}"؟ سيتم حذف جميع البنود المرتبطة.`)) return;
    try {
      await deleteTender.mutateAsync(id);
      toast.success("تم حذف المناقصة بنجاح");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleStatusChange = async (e: React.MouseEvent, id: string, newStatus: string) => {
    e.stopPropagation();
    try {
      await updateTender.mutateAsync({ id, status: newStatus as any });
      toast.success(`تم تغيير الحالة إلى ${statusLabels[newStatus] || newStatus}`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Tender & Estimation</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage tenders, cost breakdowns, and pricing</p>
        </div>
        <button
          onClick={() => navigate("/tenders/new")}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={16} /> New Tender
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 flex-1 max-w-sm">
          <Search size={16} className="text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tenders..."
            className="bg-transparent border-none outline-none text-sm text-foreground w-full"
          />
        </div>
        <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
          {["all", "draft", "submitted", "won", "lost"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
                statusFilter === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground text-sm">Loading tenders...</div>
        ) : !filtered?.length ? (
          <div className="p-12 text-center">
            <FileText size={40} className="mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No tenders found</p>
            <button
              onClick={() => navigate("/tenders/new")}
              className="mt-3 text-sm text-primary font-medium hover:underline"
            >
              Create your first tender
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Tender #</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Title</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Client</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Submission</th>
                <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="w-12 py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tender) => (
                <tr
                  key={tender.id}
                  onClick={() => navigate(`/tenders/${tender.id}`)}
                  className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors group"
                >
                  <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{tender.tender_number}</td>
                  <td className="py-3 px-4 font-medium text-foreground">{tender.title}</td>
                  <td className="py-3 px-4 text-muted-foreground">{tender.client_name || "—"}</td>
                  <td className="py-3 px-4 text-muted-foreground">
                    {tender.submission_date ? format(new Date(tender.submission_date), "dd MMM yyyy") : "—"}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${statusStyles[tender.status]}`}>
                      {tender.status}
                    </span>
                  </td>
                  <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1.5 rounded-lg hover:bg-secondary opacity-0 group-hover:opacity-100 transition-all">
                          <MoreHorizontal size={16} className="text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        {allStatuses
                          .filter((s) => s !== tender.status)
                          .map((s) => (
                            <DropdownMenuItem key={s} onClick={(e) => handleStatusChange(e, tender.id, s)}>
                              <span className={`w-2 h-2 rounded-full mr-2 ${statusStyles[s].split(" ")[0]}`} />
                              تحويل إلى {statusLabels[s]}
                            </DropdownMenuItem>
                          ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => handleDelete(e, tender.id, tender.title)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 size={14} className="mr-2" />
                          حذف المناقصة
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </motion.div>
  );
}
