import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  projectId: string;
}

const categoryLabels: Record<string, string> = {
  contract: "العقود",
  drawing: "الرسومات",
  specification: "المواصفات",
  boq: "جداول الكميات",
  permit: "التصاريح",
  insurance: "التأمين",
  correspondence: "المراسلات",
  other: "أخرى",
};

export default function ProjectDocumentsTab({ projectId }: Props) {
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["project-documents", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_documents")
        .select("*")
        .eq("project_id", projectId)
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Group by category
  const grouped = documents.reduce((acc: Record<string, any[]>, doc: any) => {
    const cat = doc.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(doc);
    return acc;
  }, {});

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">وثائق المشروع</h3>
      </div>

      {isLoading ? (
        <p className="text-center py-8 text-muted-foreground">جاري التحميل...</p>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <FolderOpen size={32} className="mx-auto mb-2 opacity-50" />
            <p>لا توجد وثائق بعد</p>
            <p className="text-sm mt-1">يمكنك رفع الوثائق لاحقاً</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(grouped).map(([category, docs]) => (
            <Card key={category}>
              <CardContent className="p-4">
                <h4 className="font-medium text-sm text-foreground mb-3">
                  {categoryLabels[category] || category}
                  <Badge variant="outline" className="mr-2 text-xs">{(docs as any[]).length}</Badge>
                </h4>
                <div className="space-y-2">
                  {(docs as any[]).map((doc: any) => (
                    <div key={doc.id} className="flex items-center gap-2 text-sm">
                      <FileText size={14} className="text-muted-foreground" />
                      <span className="flex-1 truncate">{doc.title}</span>
                      {doc.revision && (
                        <Badge variant="outline" className="text-xs">{doc.revision}</Badge>
                      )}
                      {doc.file_url && (
                        <Button size="icon" variant="ghost" className="h-6 w-6" asChild>
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                            <Download size={12} />
                          </a>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
