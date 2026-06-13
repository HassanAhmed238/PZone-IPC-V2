import React, { useState, useCallback } from "react";
import { Plus, Trash2, ChevronRight, ChevronDown, Edit2, Check, X, FolderOpen, Layers, Package, Upload, Download, Wrench, HardHat, Truck, Users } from "lucide-react";
import { CostBreakdownItem, useCreateCBSItem, useDeleteCBSItem, useUpdateCBSItem } from "@/hooks/useTenders";
import { toast } from "sonner";
import BOQImporter from "./BOQImporter";
import { exportBOQToExcel } from "./BOQExporter";

const levelLabels = ["القسم", "بند BOQ", "تفاصيل التكلفة"];
const levelIcons = [FolderOpen, Layers, Package];

const itemTypeColors: Record<string, string> = {
  material: "bg-brand-blue/15 text-brand-blue",
  labor: "bg-primary/15 text-primary",
  equipment: "bg-brand-purple/15 text-brand-purple",
  subcontract: "bg-brand-orange/15 text-brand-orange",
};

const itemTypeLabels: Record<string, string> = {
  material: "مواد",
  labor: "عمالة",
  equipment: "معدات",
  subcontract: "مقاول باطن",
};

const itemTypeIcons: Record<string, React.ElementType> = {
  material: Package,
  labor: Users,
  equipment: Truck,
  subcontract: HardHat,
};

interface CBSTreeProps {
  tenderId: string;
  items: CostBreakdownItem[];
  tenderTitle?: string;
  tenderNumber?: string;
}

export default function CBSTree({ tenderId, items, tenderTitle = "", tenderNumber = "" }: CBSTreeProps) {
  const createItem = useCreateCBSItem();
  const deleteItem = useDeleteCBSItem();
  const updateItem = useUpdateCBSItem();
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(items.filter(i => !i.parent_id).map(i => i.id)));
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, any>>({});
  const [showImporter, setShowImporter] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", item_type: "material", unit: "", quantity: 0, supply_rate: 0, install_rate: 0, markup_pct: 0 });

  const childrenOf = useCallback((parentId: string | null) => 
    items.filter((i) => i.parent_id === parentId).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
    [items]
  );

  const rootItems = childrenOf(null);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const expandAll = () => setExpanded(new Set(items.map(i => i.id)));
  const collapseAll = () => setExpanded(new Set());

  const getSubtotalCost = (parentId: string): number => {
    const children = childrenOf(parentId);
    return children.reduce((sum, c) => {
      if (childrenOf(c.id).length > 0) return sum + getSubtotalCost(c.id);
      return sum + (c.total_cost || 0);
    }, 0);
  };

  const getSubtotalSelling = (parentId: string): number => {
    const children = childrenOf(parentId);
    return children.reduce((sum, c) => {
      if (childrenOf(c.id).length > 0) return sum + getSubtotalSelling(c.id);
      return sum + (c.selling_total || c.total_cost || 0);
    }, 0);
  };

  const handleAdd = async (parentId: string | null, level: number) => {
    if (!newItem.name.trim()) return;
    try {
      const isCostItem = level > 0;
      const supplyRate = newItem.supply_rate || 0;
      const installRate = newItem.install_rate || 0;
      const totalUnitRate = supplyRate + installRate;

      await createItem.mutateAsync({
        tender_id: tenderId,
        parent_id: parentId,
        name: newItem.name,
        item_type: isCostItem ? (newItem.item_type as any) : null,
        unit: isCostItem ? (newItem.unit || null) : null,
        quantity: isCostItem ? newItem.quantity : 0,
        unit_rate: isCostItem ? totalUnitRate : 0,
        supply_rate: isCostItem ? supplyRate : 0,
        install_rate: isCostItem ? installRate : 0,
        markup_pct: isCostItem ? newItem.markup_pct : 0,
        level,
        sort_order: items.length,
      });
      setNewItem({ name: "", item_type: "material", unit: "", quantity: 0, supply_rate: 0, install_rate: 0, markup_pct: 0 });
      setAddingTo(null);
      if (parentId) setExpanded((prev) => new Set(prev).add(parentId));
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleQuickAddSubItem = async (parentId: string, itemType: string) => {
    setNewItem({ name: "", item_type: itemType, unit: "", quantity: 0, supply_rate: 0, install_rate: 0, markup_pct: 0 });
    setAddingTo(parentId);
    setExpanded((prev) => new Set(prev).add(parentId));
  };

  const startEdit = (item: CostBreakdownItem) => {
    setEditingId(item.id);
    setEditValues({
      name: item.name,
      item_type: item.item_type || "material",
      unit: item.unit || "",
      quantity: item.quantity || 0,
      supply_rate: (item as any).supply_rate || 0,
      install_rate: (item as any).install_rate || 0,
      markup_pct: item.markup_pct || 0,
    });
  };

  const saveEdit = async (item: CostBreakdownItem) => {
    try {
      const hasKids = childrenOf(item.id).length > 0;
      const supplyRate = editValues.supply_rate || 0;
      const installRate = editValues.install_rate || 0;
      const totalUnitRate = supplyRate + installRate;

      await updateItem.mutateAsync({
        id: item.id,
        name: editValues.name,
        ...(!hasKids ? {
          item_type: editValues.item_type,
          unit: editValues.unit || null,
          quantity: editValues.quantity,
          unit_rate: totalUnitRate,
          supply_rate: supplyRate,
          install_rate: installRate,
          markup_pct: editValues.markup_pct,
        } : {}),
      });
      setEditingId(null);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteItem.mutateAsync({ id, tenderId });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const renderAddForm = (parentId: string | null, level: number) => {
    const isCostItem = level > 0;
    const totalRate = (newItem.supply_rate || 0) + (newItem.install_rate || 0);
    const totalCost = newItem.quantity * totalRate;
    const sellingTotal = totalCost * (1 + (newItem.markup_pct || 0) / 100);

    return (
      <tr className={`${level === 2 ? "bg-primary/5" : "bg-secondary/20"}`}>
        <td colSpan={isCostItem ? 1 : 11} style={{ paddingLeft: level * 28 + 16 }}>
          <div className="flex items-center gap-2 py-2">
            {level === 2 && (
              <Wrench size={12} className="text-primary/60" />
            )}
            <input
              autoFocus
              value={newItem.name}
              onChange={(e) => setNewItem((n) => ({ ...n, name: e.target.value }))}
              placeholder={`اسم ${levelLabels[level] || "البند"}`}
              className="flex-1 px-2.5 py-1.5 rounded border border-input bg-background text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
              onKeyDown={(e) => e.key === "Enter" && handleAdd(parentId, level)}
            />
            {!isCostItem && (
              <>
                <button onClick={() => handleAdd(parentId, level)} disabled={!newItem.name.trim()} className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-xs font-medium disabled:opacity-50">إضافة</button>
                <button onClick={() => setAddingTo(null)} className="text-xs text-muted-foreground hover:text-foreground">إلغاء</button>
              </>
            )}
          </div>
        </td>
        {isCostItem && (
          <>
            <td className="py-2 px-2">
              <select value={newItem.item_type} onChange={(e) => setNewItem((n) => ({ ...n, item_type: e.target.value }))}
                className="w-full px-2 py-1.5 rounded border border-input bg-background text-xs text-foreground outline-none">
                {["material", "labor", "equipment", "subcontract"].map((t) => <option key={t} value={t}>{itemTypeLabels[t]}</option>)}
              </select>
            </td>
            <td className="py-2 px-2">
              <input value={newItem.unit} onChange={(e) => setNewItem((n) => ({ ...n, unit: e.target.value }))} placeholder="م²"
                className="w-full px-2 py-1.5 rounded border border-input bg-background text-xs text-foreground outline-none" />
            </td>
            <td className="py-2 px-2">
              <input type="number" value={newItem.quantity || ""} onChange={(e) => setNewItem((n) => ({ ...n, quantity: parseFloat(e.target.value) || 0 }))}
                className="w-full px-2 py-1.5 rounded border border-input bg-background text-xs text-foreground outline-none text-right" />
            </td>
            <td className="py-2 px-2">
              <input type="number" value={newItem.supply_rate || ""} onChange={(e) => setNewItem((n) => ({ ...n, supply_rate: parseFloat(e.target.value) || 0 }))}
                className="w-full px-2 py-1.5 rounded border border-input bg-background text-xs text-foreground outline-none text-right" placeholder="توريد" />
            </td>
            <td className="py-2 px-2">
              <input type="number" value={newItem.install_rate || ""} onChange={(e) => setNewItem((n) => ({ ...n, install_rate: parseFloat(e.target.value) || 0 }))}
                className="w-full px-2 py-1.5 rounded border border-input bg-background text-xs text-foreground outline-none text-right" placeholder="تركيب" />
            </td>
            <td className="py-2 px-2 text-right text-xs font-mono text-muted-foreground">
              {totalRate.toLocaleString()}
            </td>
            <td className="py-2 px-2 text-right text-xs font-mono text-muted-foreground">
              {totalCost.toLocaleString()}
            </td>
            <td className="py-2 px-2">
              <input type="number" value={newItem.markup_pct || ""} onChange={(e) => setNewItem((n) => ({ ...n, markup_pct: parseFloat(e.target.value) || 0 }))}
                className="w-full px-2 py-1.5 rounded border border-input bg-background text-xs text-foreground outline-none text-right" placeholder="%" />
            </td>
            <td className="py-2 px-2 text-right text-xs font-mono font-semibold text-primary">
              {sellingTotal.toLocaleString()}
            </td>
            <td className="py-2 px-2">
              <div className="flex gap-1">
                <button onClick={() => handleAdd(parentId, level)} disabled={!newItem.name.trim()} className="p-1 rounded bg-primary text-primary-foreground disabled:opacity-50"><Check size={12} /></button>
                <button onClick={() => setAddingTo(null)} className="p-1 text-muted-foreground hover:text-foreground"><X size={12} /></button>
              </div>
            </td>
          </>
        )}
      </tr>
    );
  };

  const renderItem = (item: CostBreakdownItem): React.ReactNode => {
    const children = childrenOf(item.id);
    const isExpanded = expanded.has(item.id);
    const isLeaf = children.length === 0;
    const canAddChildren = item.level < 2;
    const isEditing = editingId === item.id;
    const maxChildLevel = item.level + 1;
    const LevelIcon = levelIcons[item.level] || Package;
    const isSubItem = item.level === 2;
    const isBOQItem = item.level === 1;
    const hasSubItems = isBOQItem && !isLeaf;

    const costSubtotal = isLeaf ? (item.total_cost || 0) : getSubtotalCost(item.id);
    const sellingSubtotal = isLeaf ? (item.selling_total || item.total_cost || 0) : getSubtotalSelling(item.id);
    const impliedMarkup = costSubtotal > 0 ? ((sellingSubtotal - costSubtotal) / costSubtotal * 100) : 0;
    const supplyRate = (item as any).supply_rate || 0;
    const installRate = (item as any).install_rate || 0;

    const TypeIcon = item.item_type ? (itemTypeIcons[item.item_type] || Package) : Package;

    // Row styling based on level
    const rowClass = item.level === 0
      ? "bg-secondary/20 font-semibold"
      : item.level === 1
        ? hasSubItems ? "bg-secondary/10 font-medium" : "bg-secondary/5"
        : "bg-primary/[0.02]";

    return (
      <React.Fragment key={item.id}>
        <tr className={`group hover:bg-muted/20 transition-colors ${rowClass}`}>
          {/* Name */}
          <td className="py-2 px-2" style={{ paddingLeft: item.level * 28 + 16 }}>
            <div className="flex items-center gap-2">
              {!isLeaf ? (
                <button onClick={() => toggle(item.id)} className="p-0.5 rounded hover:bg-muted transition-colors">
                  {isExpanded ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronRight size={14} className="text-muted-foreground" />}
                </button>
              ) : <span className="w-5" />}
              
              {isSubItem && item.item_type ? (
                <TypeIcon size={13} className={itemTypeColors[item.item_type]?.split(" ")[1] || "text-muted-foreground"} />
              ) : (
                <LevelIcon size={14} className={item.level === 0 ? "text-primary" : "text-muted-foreground"} />
              )}
              
              {isEditing ? (
                <input value={editValues.name} onChange={(e) => setEditValues(v => ({ ...v, name: e.target.value }))}
                  className="flex-1 px-2 py-1 rounded border border-input bg-background text-sm outline-none"
                  onKeyDown={(e) => e.key === "Enter" && saveEdit(item)} />
              ) : (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className={`text-sm truncate ${item.level === 0 ? "text-foreground font-semibold" : isSubItem ? "text-muted-foreground" : "text-foreground"}`}>
                    {(item as any).item_no ? `${(item as any).item_no}. ` : ""}{item.name}
                  </span>
                  {hasSubItems && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium whitespace-nowrap">
                      {children.length} عنصر
                    </span>
                  )}
                  {/* Show "add details" prompt for leaf BOQ items */}
                  {isBOQItem && isLeaf && !isEditing && addingTo !== item.id && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleQuickAddSubItem(item.id, "material"); }}
                      className="opacity-0 group-hover:opacity-100 text-[10px] px-2 py-0.5 rounded-full border border-dashed border-primary/30 text-primary/70 hover:bg-primary/5 hover:text-primary transition-all whitespace-nowrap"
                    >
                      + تفاصيل التكلفة
                    </button>
                  )}
                </div>
              )}
            </div>
          </td>

          {/* Type */}
          <td className="py-2 px-2">
            {isLeaf && (isEditing ? (
              <select value={editValues.item_type} onChange={(e) => setEditValues(v => ({ ...v, item_type: e.target.value }))}
                className="w-full px-1.5 py-1 rounded border border-input bg-background text-xs outline-none">
                {["material", "labor", "equipment", "subcontract"].map((t) => <option key={t} value={t}>{itemTypeLabels[t]}</option>)}
              </select>
            ) : item.item_type ? (
              <span className={`text-xs px-1.5 py-0.5 rounded ${itemTypeColors[item.item_type] || "bg-muted text-muted-foreground"}`}>
                {itemTypeLabels[item.item_type] || item.item_type}
              </span>
            ) : null)}
          </td>

          {/* Unit */}
          <td className="py-2 px-2 text-xs text-muted-foreground text-center">
            {isLeaf && (isEditing ? (
              <input value={editValues.unit} onChange={(e) => setEditValues(v => ({ ...v, unit: e.target.value }))}
                className="w-full px-1.5 py-1 rounded border border-input bg-background text-xs outline-none text-center" />
            ) : item.unit)}
          </td>

          {/* Qty */}
          <td className="py-2 px-2 text-xs text-right text-muted-foreground">
            {isLeaf && (isEditing ? (
              <input type="number" value={editValues.quantity || ""} onChange={(e) => setEditValues(v => ({ ...v, quantity: parseFloat(e.target.value) || 0 }))}
                className="w-full px-1.5 py-1 rounded border border-input bg-background text-xs outline-none text-right" />
            ) : item.quantity?.toLocaleString())}
          </td>

          {/* Supply Rate */}
          <td className="py-2 px-2 text-xs text-right">
            {isLeaf && (isEditing ? (
              <input type="number" value={editValues.supply_rate || ""} onChange={(e) => setEditValues(v => ({ ...v, supply_rate: parseFloat(e.target.value) || 0 }))}
                className="w-full px-1.5 py-1 rounded border border-input bg-background text-xs outline-none text-right" />
            ) : supplyRate > 0 ? <span className="text-muted-foreground">{supplyRate.toLocaleString()}</span> : null)}
          </td>

          {/* Install Rate */}
          <td className="py-2 px-2 text-xs text-right">
            {isLeaf && (isEditing ? (
              <input type="number" value={editValues.install_rate || ""} onChange={(e) => setEditValues(v => ({ ...v, install_rate: parseFloat(e.target.value) || 0 }))}
                className="w-full px-1.5 py-1 rounded border border-input bg-background text-xs outline-none text-right" />
            ) : installRate > 0 ? <span className="text-muted-foreground">{installRate.toLocaleString()}</span> : null)}
          </td>

          {/* Total Unit Rate */}
          <td className="py-2 px-2 text-xs text-right">
            {isLeaf && <span className="text-muted-foreground">{(item.unit_rate || 0).toLocaleString()}</span>}
          </td>

          {/* Cost Total */}
          <td className="py-2 px-2 text-right">
            <span className={`text-xs font-mono ${
              item.level === 0 ? "font-bold text-foreground" : 
              hasSubItems ? "font-semibold text-foreground" : 
              "text-muted-foreground"
            }`}>
              {costSubtotal.toLocaleString()}
            </span>
          </td>

          {/* Markup % */}
          <td className="py-2 px-2 text-xs text-right">
            {isLeaf ? (isEditing ? (
              <input type="number" step="0.1" value={editValues.markup_pct || ""} onChange={(e) => setEditValues(v => ({ ...v, markup_pct: parseFloat(e.target.value) || 0 }))}
                className="w-full px-1.5 py-1 rounded border border-input bg-background text-xs outline-none text-right" />
            ) : (
              <span className={(item.markup_pct || 0) > 0 ? "text-primary font-medium" : "text-muted-foreground"}>
                {item.markup_pct || 0}%
              </span>
            )) : (
              costSubtotal > 0 && <span className="text-primary/70 font-medium">{impliedMarkup.toFixed(1)}%</span>
            )}
          </td>

          {/* Selling Total */}
          <td className="py-2 px-2 text-right">
            <span className={`text-xs font-mono font-semibold ${
              item.level === 0 ? "text-primary text-sm" : 
              hasSubItems ? "text-primary" :
              isSubItem ? "text-primary/80" :
              "text-primary"
            }`}>
              {sellingSubtotal.toLocaleString()}
            </span>
          </td>

          {/* Actions */}
          <td className="py-2 px-2">
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {isEditing ? (
                <>
                  <button onClick={() => saveEdit(item)} className="p-1 rounded text-primary hover:bg-primary/10"><Check size={13} /></button>
                  <button onClick={() => setEditingId(null)} className="p-1 rounded text-muted-foreground hover:text-foreground"><X size={13} /></button>
                </>
              ) : (
                <>
                  <button onClick={() => startEdit(item)} className="p-1 rounded text-muted-foreground hover:text-foreground" title="تعديل"><Edit2 size={13} /></button>
                  {canAddChildren && (
                    <button onClick={() => { setAddingTo(item.id); setExpanded(p => new Set(p).add(item.id)); }}
                      className="p-1 rounded text-muted-foreground hover:text-primary" title={`إضافة ${levelLabels[item.level + 1] || "بند"}`}><Plus size={13} /></button>
                  )}
                  <button onClick={() => handleDelete(item.id)} className="p-1 rounded text-muted-foreground hover:text-destructive" title="حذف"><Trash2 size={13} /></button>
                </>
              )}
            </div>
          </td>
        </tr>

        {/* Quick-add sub-item type buttons for expanded BOQ items with children */}
        {isExpanded && hasSubItems && addingTo !== item.id && (
          <>
            {children.map(renderItem)}
            <tr className="bg-primary/[0.03]">
              <td colSpan={11} style={{ paddingLeft: (item.level + 1) * 28 + 16 }}>
                <div className="flex items-center gap-1.5 py-1.5">
                  <span className="text-[10px] text-muted-foreground ml-1">أضف:</span>
                  {(["material", "labor", "equipment", "subcontract"] as const).map((type) => {
                    const Icon = itemTypeIcons[type];
                    return (
                      <button
                        key={type}
                        onClick={() => handleQuickAddSubItem(item.id, type)}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium border border-dashed transition-colors hover:border-solid ${itemTypeColors[type]} border-current/20 hover:opacity-80`}
                      >
                        <Icon size={10} />
                        {itemTypeLabels[type]}
                      </button>
                    );
                  })}
                </div>
              </td>
            </tr>
          </>
        )}

        {/* Render children normally for sections (level 0) or items without the quick-add bar */}
        {isExpanded && !hasSubItems && children.map(renderItem)}
        {isExpanded && addingTo === item.id && renderAddForm(item.id, maxChildLevel)}
      </React.Fragment>
    );
  };

  const totalCost = rootItems.reduce((sum, r) => sum + getSubtotalCost(r.id), 0);
  const totalSelling = rootItems.reduce((sum, r) => sum + getSubtotalSelling(r.id), 0);
  const totalMarkup = totalCost > 0 ? ((totalSelling - totalCost) / totalCost * 100) : 0;

  return (
    <>
      <div className="bg-card rounded-xl shadow-card border border-border overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h3 className="text-sm font-heading font-semibold text-foreground">جدول الكميات (BOQ)</h3>
            <p className="text-xs text-muted-foreground mt-0.5">قسم ← بند BOQ ← تفاصيل التكلفة (مواد • عمالة • معدات)</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={expandAll} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-secondary transition-colors">توسيع الكل</button>
            <button onClick={collapseAll} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-secondary transition-colors">طي</button>
            <button
              onClick={() => exportBOQToExcel({ tenderTitle, tenderNumber, items })}
              disabled={items.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-secondary transition-colors disabled:opacity-50"
            >
              <Download size={14} /> تصدير Excel
            </button>
            <button
              onClick={() => setShowImporter(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-secondary transition-colors"
            >
              <Upload size={14} /> استيراد Excel
            </button>
            <button
              onClick={() => setAddingTo("root")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity"
            >
              <Plus size={14} /> إضافة قسم
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-right py-2.5 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider pr-4 min-w-[280px]">البند / الوصف</th>
                <th className="text-right py-2.5 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider w-24">النوع</th>
                <th className="text-center py-2.5 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider w-16">الوحدة</th>
                <th className="text-right py-2.5 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider w-16">الكمية</th>
                <th className="text-right py-2.5 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider w-20">توريد</th>
                <th className="text-right py-2.5 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider w-20">تركيب</th>
                <th className="text-right py-2.5 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider w-24">سعر الوحدة</th>
                <th className="text-right py-2.5 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider w-28">إجمالي التكلفة</th>
                <th className="text-right py-2.5 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider w-16">هامش %</th>
                <th className="text-right py-2.5 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider w-28">سعر البيع</th>
                <th className="w-20 py-2.5 px-2"></th>
              </tr>
            </thead>

            <tbody>
              {rootItems.map(renderItem)}
              {addingTo === "root" && renderAddForm(null, 0)}
            </tbody>

            {items.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-border bg-secondary/30 font-bold">
                  <td colSpan={7} className="py-3 px-4 text-sm text-foreground">الإجمالي الكلي</td>
                  <td className="py-3 px-2 text-right text-sm font-mono text-foreground">{totalCost.toLocaleString()}</td>
                  <td className="py-3 px-2 text-right text-sm font-mono text-primary">{totalMarkup.toFixed(1)}%</td>
                  <td className="py-3 px-2 text-right text-sm font-mono font-bold text-primary">{totalSelling.toLocaleString()}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {items.length === 0 && addingTo !== "root" && (
          <div className="text-center py-12">
            <Package size={40} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">لا توجد بنود BOQ بعد</p>
            <p className="text-xs text-muted-foreground mt-1">أضف قسم أو استورد من ملف Excel لبدء جدول الكميات</p>
            <button
              onClick={() => setShowImporter(true)}
              className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm hover:bg-secondary transition-colors mx-auto"
            >
              <Upload size={14} /> استيراد من Excel
            </button>
          </div>
        )}
      </div>

      {showImporter && (
        <BOQImporter
          tenderId={tenderId}
          onClose={() => setShowImporter(false)}
          onImported={() => {}}
        />
      )}
    </>
  );
}
