import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { CheckCircle, FileText } from "lucide-react";
import { toast } from "sonner";

interface Props {
  projectId: string;
  retentionPct: number;
}

const statusMap: Record<string, { label: string; className: string }> = {
  pending: { label: "⏳ معلق", className: "bg-muted text-muted-foreground" },
  triggered: { label: "🔔 محقق", className: "bg-yellow-500/20 text-yellow-400" },
  invoiced: { label: "📄 مفوتر", className: "bg-blue-500/20 text-blue-400" },
  paid: { label: "✅ مدفوع", className: "bg-green-500/20 text-green-400" },
  overdue: { label: "⚠️ متأخر", className: "bg-red-500/20 text-red-400" },
};

export default function ProjectMilestonesTab({ projectId, retentionPct }: Props) {
  const queryClient = useQueryClient();

  const { data: milestones = [], isLoading } = useQuery({
    queryKey: ["project-milestones", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_milestones")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });

  const triggerMilestone = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("project_milestones")
        .update({ status: "triggered", actual_date: new Date().toISOString().split("T")[0] })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-milestones", projectId] });
      toast.success("تم تحقيق المحطة");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const totalInvoice = milestones.reduce((s, m: any) => s + (m.invoice_amount || 0), 0);
  const totalRetention = milestones.reduce((s, m: any) => s + (m.retention_amount || 0), 0);
  const totalNet = milestones.reduce((s, m: any) => s + (m.net_payable || 0), 0);

  return (
    <div className="space-y-4 mt-4">
      <h3 className="font-semibold text-foreground">محطات الدفع</h3>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">جاري التحميل...</p>
          ) : milestones.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">لا توجد محطات دفع</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الكود</TableHead>
                  <TableHead className="text-right">المحطة</TableHead>
                  <TableHead className="text-right">الشرط</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">الاستقطاع</TableHead>
                  <TableHead className="text-right">الصافي</TableHead>
                  <TableHead className="text-right">التاريخ المخطط</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {milestones.map((ms: any) => {
                  const st = statusMap[ms.status] || statusMap.pending;
                  return (
                    <TableRow key={ms.id}>
                      <TableCell className="font-mono text-xs">{ms.milestone_code}</TableCell>
                      <TableCell className="text-sm">{ms.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {ms.milestone_type === "progress_based"
                          ? `${ms.trigger_progress}%`
                          : ms.milestone_type === "date_based"
                          ? ms.trigger_date
                          : ms.trigger_deliverable || "—"}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {ms.invoice_amount ? Number(ms.invoice_amount).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {ms.retention_amount ? Number(ms.retention_amount).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="font-mono text-sm font-medium">
                        {ms.net_payable ? Number(ms.net_payable).toLocaleString() : "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {ms.planned_date
                          ? new Date(ms.planned_date).toLocaleDateString("ar-SA")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={st.className}>{st.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {ms.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 h-7 text-xs"
                            onClick={() => triggerMilestone.mutate(ms.id)}
                          >
                            <CheckCircle size={12} />
                            تحقيق
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {/* Totals */}
                <TableRow className="font-semibold bg-muted/50">
                  <TableCell colSpan={3} className="text-right">المجموع</TableCell>
                  <TableCell className="font-mono">{totalInvoice.toLocaleString()}</TableCell>
                  <TableCell className="font-mono">{totalRetention.toLocaleString()}</TableCell>
                  <TableCell className="font-mono">{totalNet.toLocaleString()}</TableCell>
                  <TableCell colSpan={3}></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
