import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

interface Props {
  projectId: string;
}

const roleLabels: Record<string, string> = {
  pm: "مدير المشروع",
  deputy_pm: "نائب مدير المشروع",
  site_engineer: "مهندس موقع",
  cost_controller: "مراقب تكاليف",
  procurement_officer: "مسؤول مشتريات",
  qc_engineer: "مهندس جودة",
  safety_officer: "مسؤول سلامة",
  document_controller: "مراقب وثائق",
};

export default function ProjectTeamTab({ projectId }: Props) {
  const queryClient = useQueryClient();

  const { data: teamMembers = [], isLoading } = useQuery({
    queryKey: ["project-team", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_team")
        .select(`
          *,
          profile:profiles!project_team_user_id_fkey(full_name, department)
        `)
        .eq("project_id", projectId)
        .order("created_at");
      if (error) {
        // Fallback without join if FK doesn't exist
        const { data: fallback, error: fallbackError } = await supabase
          .from("project_team")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at");
        if (fallbackError) throw fallbackError;
        return fallback || [];
      }
      return data || [];
    },
  });

  const removeMember = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_team").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-team", projectId] });
      toast.success("تم إزالة العضو");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">فريق العمل</h3>
      </div>

      {isLoading ? (
        <p className="text-center py-8 text-muted-foreground">جاري التحميل...</p>
      ) : teamMembers.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            لم يتم تعيين أعضاء فريق بعد
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teamMembers.map((member: any) => (
            <Card key={member.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-foreground">
                      {member.profile?.full_name || "مستخدم"}
                    </p>
                    <Badge variant="outline" className="mt-1">
                      {roleLabels[member.role_in_project] || member.role_in_project}
                    </Badge>
                    {member.profile?.department && (
                      <p className="text-xs text-muted-foreground mt-1">{member.profile.department}</p>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => removeMember.mutate(member.id)}
                  >
                    <Trash2 size={14} className="text-destructive" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                  <Badge
                    className={
                      member.access_level === "full"
                        ? "bg-green-500/20 text-green-400"
                        : member.access_level === "read_only"
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-yellow-500/20 text-yellow-400"
                    }
                  >
                    {member.access_level === "full"
                      ? "وصول كامل"
                      : member.access_level === "read_only"
                      ? "قراءة فقط"
                      : "محدود"}
                  </Badge>
                  {member.is_active && (
                    <Badge className="bg-green-500/20 text-green-400">نشط</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
