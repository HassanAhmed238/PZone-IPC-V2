import { useState } from "react";
import { Trash2 } from "lucide-react";
import type { ParsedBOQItem } from "./BOQImporter";

interface BOQPreviewTableProps {
  items: ParsedBOQItem[];
  onUpdateItem: (index: number, updates: Partial<ParsedBOQItem>) => void;
  onDeleteItem: (index: number) => void;
}

function EditableCell({
  value,
  onChange,
  type = "text",
  className = "",
}: {
  value: string | number;
  onChange: (val: any) => void;
  type?: "text" | "number";
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  const commit = () => {
    setEditing(false);
    const parsed = type === "number" ? parseFloat(draft) || 0 : draft;
    if (parsed !== value) onChange(parsed);
  };

  if (editing) {
    return (
      <input
        autoFocus
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
        className={`w-full bg-background border border-primary/40 rounded px-1.5 py-0.5 text-xs outline-none focus:ring-1 focus:ring-primary/30 ${className}`}
      />
    );
  }

  return (
    <span
      onClick={() => { setDraft(String(value)); setEditing(true); }}
      className={`cursor-pointer hover:bg-primary/5 rounded px-1.5 py-0.5 block transition-colors ${className}`}
      title="انقر للتعديل"
    >
      {type === "number" ? Number(value).toLocaleString() : value || "—"}
    </span>
  );
}

export default function BOQPreviewTable({ items, onUpdateItem, onDeleteItem }: BOQPreviewTableProps) {
  return (
    <div className="overflow-x-auto border border-border rounded-lg">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/30 border-b border-border">
            <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground w-12">م</th>
            <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground min-w-[200px]">البند</th>
            <th className="text-center py-2 px-2 text-xs font-medium text-muted-foreground w-20">الوحدة</th>
            <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground w-24">الكمية</th>
            <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground w-28">سعر الوحدة</th>
            <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground w-28">الإجمالي</th>
            <th className="text-right py-2 px-2 text-xs font-medium text-muted-foreground w-24">القسم</th>
            <th className="w-10"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-b border-border/50 hover:bg-muted/10 group">
              <td className="py-1 px-2 text-xs text-muted-foreground">
                <EditableCell value={item.item_no} onChange={(v) => onUpdateItem(i, { item_no: v })} />
              </td>
              <td className="py-1 px-2 text-xs">
                <EditableCell value={item.name} onChange={(v) => onUpdateItem(i, { name: v })} />
              </td>
              <td className="py-1 px-2 text-xs text-center">
                <EditableCell value={item.unit} onChange={(v) => onUpdateItem(i, { unit: v })} />
              </td>
              <td className="py-1 px-2 text-xs font-mono">
                <EditableCell value={item.quantity} onChange={(v) => onUpdateItem(i, { quantity: v })} type="number" />
              </td>
              <td className="py-1 px-2 text-xs font-mono">
                <EditableCell value={item.unit_rate} onChange={(v) => onUpdateItem(i, { unit_rate: v })} type="number" />
              </td>
              <td className="py-1 px-2 text-xs font-mono font-medium text-foreground">
                {item.total.toLocaleString()}
              </td>
              <td className="py-1 px-2 text-xs text-muted-foreground truncate max-w-[100px]">
                {item.section.substring(0, 20)}
              </td>
              <td className="py-1 px-2">
                <button
                  onClick={() => onDeleteItem(i)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition-all"
                  title="حذف"
                >
                  <Trash2 size={13} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.length > 100 && (
        <div className="text-center py-2 text-xs text-muted-foreground bg-muted/20">
          يتم عرض جميع الـ {items.length} بند
        </div>
      )}
    </div>
  );
}
