import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, ChevronDown, ChevronLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  projectId: string;
}

export default function ProjectWBSTab({ projectId }: Props) {
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data: wbsItems = [], isLoading } = useQuery({
    queryKey: ["project-wbs", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_wbs")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });

  const addItem = useMutation({
    mutationFn: async (parentId: string | null) => {
      const level = parentId ? (wbsItems.find((i) => i.id === parentId)?.level || 0) + 1 : 1;
      const { error } = await supabase.from("project_wbs").insert({
        project_id: projectId,
        parent_id: parentId,
        name: "بند جديد",
        level,
        weight_pct: 0,
        sort_order: wbsItems.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-wbs", projectId] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_wbs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-wbs", projectId] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleExpand = (id: string) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpanded(next);
  };

  const rootItems = wbsItems.filter((i) => !i.parent_id);
  const getChildren = (parentId: string) => wbsItems.filter((i) => i.parent_id === parentId);
  const totalWeight = wbsItems.filter((i) => !i.parent_id).reduce((s, i) => s + (i.weight_pct || 0), 0);

  const renderItem = (item: any, depth: number = 0) => {
    const children = getChildren(item.id);
    const hasChildren = children.length > 0;
    const isExpanded = expanded.has(item.id);

    return (
      <div key={item.id}>
        <div
          className="flex items-center gap-2 py-2 px-3 hover:bg-secondary/50 rounded transition-colors"
          style={{ paddingRight: `${depth * 24 + 12}px` }}
        >
          {hasChildren ? (
            <button onClick={() => toggleExpand(item.id)} className="p-0.5">
              {isExpanded ? <ChevronDown size={14} /> : <ChevronLeft size={14} />}
            </button>
          ) : (
            <span className="w-5" />
          )}

          <span className="font-mono text-xs text-muted-foreground w-16">{item.wbs_code || "—"}</span>
          <span className="flex-1 text-sm">{item.name}</span>
          <Badge variant="outline" className="text-xs">
            {item.weight_pct || 0}%
          </Badge>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => addItem.mutate(item.id)}
          >
            <Plus size={12} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => deleteItem.mutate(item.id)}
          >
            <Trash2 size={12} className="text-destructive" />
          </Button>
        </div>
        {isExpanded && children.map((child) => renderItem(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-foreground">هيكل تقسيم العمل (WBS)</h3>
          {totalWeight !== 100 && wbsItems.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              المجموع: {totalWeight}% — يجب أن يساوي 100%
            </Badge>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={() => addItem.mutate(null)} className="gap-1">
          <Plus size={14} />
          إضافة مرحلة
        </Button>
      </div>

      <Card>
        <CardContent className="p-2">
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">جاري التحميل...</p>
          ) : rootItems.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              لم يتم إنشاء هيكل تقسيم العمل بعد
            </p>
          ) : (
            rootItems.map((item) => renderItem(item))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
