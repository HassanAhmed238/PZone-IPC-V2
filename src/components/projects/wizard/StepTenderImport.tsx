import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Import, SkipForward } from "lucide-react";
import type { ProjectFormData } from "@/pages/projects/ProjectCreatePage";

interface Props {
  form: ProjectFormData;
  updateForm: (u: Partial<ProjectFormData>) => void;
}

export default function StepTenderImport({ form, updateForm }: Props) {
  const { data: tenders = [], isLoading } = useQuery({
    queryKey: ["won-tenders-for-project"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenders")
        .select("id, tender_number, title, status")
        .eq("status", "won")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const selectTender = (tender: any) => {
    updateForm({
      tender_id: tender.id,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">استيراد من مناقصة</h2>
        <Button
          variant="ghost"
          onClick={() => updateForm({ tender_id: null })}
          className="gap-2 text-muted-foreground"
        >
          <SkipForward size={16} />
          تخطي — بدء من الصفر
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-center py-8">جاري تحميل المناقصات...</p>
      ) : tenders.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>لا توجد مناقصات فائزة متاحة للربط</p>
          <p className="text-sm mt-1">يمكنك المتابعة بدون ربط مناقصة</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tenders.map((tender) => (
            <Card
              key={tender.id}
              className={`cursor-pointer transition-all ${
                form.tender_id === tender.id
                  ? "border-primary bg-primary/5"
                  : "hover:border-primary/50"
              }`}
              onClick={() => selectTender(tender)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-muted-foreground">
                      {tender.tender_number}
                    </span>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">فائزة</Badge>
                  </div>
                  <p className="font-medium mt-1">{tender.title}</p>
                </div>
                {form.tender_id === tender.id ? (
                  <Badge className="bg-primary text-primary-foreground">✓ محدد</Badge>
                ) : (
                  <Button size="sm" variant="outline" className="gap-1">
                    <Import size={14} />
                    ربط
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
