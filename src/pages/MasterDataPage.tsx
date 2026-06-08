import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronRight, Database, Edit2, Plus, Search, Trash2, X } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ColumnType = "text" | "number";

interface TableColumn {
  key: string;
  label: string;
  type?: ColumnType;
  required?: boolean;
}

interface TableConfig {
  key: string;
  label: string;
  table: string;
  category: string;
  description: string;
  columns: TableColumn[];
  sortBy?: string;
}

const masterTables: TableConfig[] = [
  {
    key: "clients",
    label: "Clients",
    table: "clients",
    category: "Core",
    description: "Client directory used by tenders and projects.",
    sortBy: "name",
    columns: [
      { key: "name", label: "Client Name", required: true },
      { key: "contact_person", label: "Contact Person" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
    ],
  },
  {
    key: "phases",
    label: "Project Phases",
    table: "phases",
    category: "Core",
    description: "Standard project phases.",
    sortBy: "sort_order",
    columns: [
      { key: "name", label: "Name", required: true },
      { key: "description", label: "Description" },
      { key: "sort_order", label: "Order", type: "number" },
    ],
  },
  {
    key: "boq_work_types",
    label: "BOQ Work Types",
    table: "boq_work_types",
    category: "Core",
    description: "BOQ work classification used in estimating.",
    sortBy: "name",
    columns: [
      { key: "name", label: "Name", required: true },
      { key: "description", label: "Description" },
    ],
  },
  {
    key: "contract_project_config",
    label: "Contract Project Config",
    table: "contract_project_config",
    category: "Core",
    description: "Project type presets used by contract analysis.",
    sortBy: "sort_order",
    columns: [
      { key: "project_type_code", label: "Type Code", required: true },
      { key: "project_type_label", label: "Type Label", required: true },
      { key: "typical_contract", label: "Typical Contract" },
      { key: "typical_pricing", label: "Typical Pricing" },
      { key: "sort_order", label: "Order", type: "number" },
    ],
  },
  {
    key: "countries",
    label: "Countries",
    table: "countries",
    category: "Geography",
    description: "Countries used across brands and location setup.",
    sortBy: "name",
    columns: [
      { key: "name", label: "Name", required: true },
      { key: "code", label: "Code" },
    ],
  },
  {
    key: "regions",
    label: "Regions",
    table: "regions",
    category: "Geography",
    description: "Regional lookup for project geography.",
    sortBy: "name",
    columns: [{ key: "name", label: "Name", required: true }],
  },
  {
    key: "governorates",
    label: "Governorates",
    table: "governorates",
    category: "Geography",
    description: "Governorates for address and project location mapping.",
    sortBy: "name",
    columns: [{ key: "name", label: "Name", required: true }],
  },
  {
    key: "districts",
    label: "Districts",
    table: "districts",
    category: "Geography",
    description: "District master list.",
    sortBy: "name",
    columns: [{ key: "name", label: "Name", required: true }],
  },
  {
    key: "brands",
    label: "Brands",
    table: "brands",
    category: "Materials",
    description: "Approved brand master list.",
    sortBy: "name",
    columns: [
      { key: "name", label: "Name", required: true },
      { key: "website", label: "Website" },
    ],
  },
  {
    key: "items_categories",
    label: "Item Categories",
    table: "items_categories",
    category: "Materials",
    description: "Top-level item categories.",
    sortBy: "name",
    columns: [
      { key: "name", label: "Name", required: true },
      { key: "description", label: "Description" },
    ],
  },
  {
    key: "items",
    label: "Items",
    table: "items",
    category: "Materials",
    description: "General item library.",
    sortBy: "name",
    columns: [
      { key: "name", label: "Name", required: true },
      { key: "unit", label: "Unit" },
      { key: "description", label: "Description" },
    ],
  },
  {
    key: "civil_materials_types",
    label: "Civil Material Types",
    table: "civil_materials_types",
    category: "Materials",
    description: "Civil material classification.",
    sortBy: "name",
    columns: [
      { key: "name", label: "Name", required: true },
      { key: "description", label: "Description" },
    ],
  },
  {
    key: "civil_qs_breakdown_items",
    label: "Civil QS Items",
    table: "civil_qs_breakdown_items",
    category: "Materials",
    description: "Quantity survey and breakdown item definitions.",
    sortBy: "name",
    columns: [
      { key: "name", label: "Name", required: true },
      { key: "unit", label: "Unit" },
      { key: "description", label: "Description" },
    ],
  },
  {
    key: "finishes_categories",
    label: "Finishes Categories",
    table: "finishes_categories",
    category: "Finishes",
    description: "Finish category lookup.",
    sortBy: "name",
    columns: [
      { key: "name", label: "Name", required: true },
      { key: "description", label: "Description" },
    ],
  },
  {
    key: "finishes_types",
    label: "Finishes Types",
    table: "finishes_types",
    category: "Finishes",
    description: "Finish type lookup.",
    sortBy: "name",
    columns: [
      { key: "name", label: "Name", required: true },
      { key: "description", label: "Description" },
    ],
  },
  {
    key: "cable_conduits_types",
    label: "Cable Conduit Types",
    table: "cable_conduits_types",
    category: "Electrical",
    description: "Cable conduit reference list.",
    sortBy: "name",
    columns: [
      { key: "name", label: "Name", required: true },
      { key: "description", label: "Description" },
    ],
  },
  {
    key: "cables_types_accessories",
    label: "Cable Accessories",
    table: "cables_types_accessories",
    category: "Electrical",
    description: "Cable and accessory types.",
    sortBy: "name",
    columns: [
      { key: "name", label: "Name", required: true },
      { key: "description", label: "Description" },
    ],
  },
  {
    key: "cable_glands",
    label: "Cable Glands",
    table: "cable_glands",
    category: "Electrical",
    description: "Cable gland catalog.",
    sortBy: "name",
    columns: [
      { key: "name", label: "Name", required: true },
      { key: "size", label: "Size" },
      { key: "material", label: "Material" },
    ],
  },
  {
    key: "conduits_accessories_types",
    label: "Conduit Accessories",
    table: "conduits_accessories_types",
    category: "Electrical",
    description: "Conduit accessory lookup.",
    sortBy: "name",
    columns: [
      { key: "name", label: "Name", required: true },
      { key: "description", label: "Description" },
    ],
  },
  {
    key: "disconnect_switch_types",
    label: "Disconnect Switch Types",
    table: "disconnect_switch_types",
    category: "Electrical",
    description: "Disconnect switch standards.",
    sortBy: "name",
    columns: [
      { key: "name", label: "Name", required: true },
      { key: "description", label: "Description" },
    ],
  },
  {
    key: "junction_box_types",
    label: "Junction Box Types",
    table: "junction_box_types",
    category: "Electrical",
    description: "Junction box types.",
    sortBy: "name",
    columns: [
      { key: "name", label: "Name", required: true },
      { key: "description", label: "Description" },
    ],
  },
  {
    key: "lighting_types",
    label: "Lighting Types",
    table: "lighting_types",
    category: "Electrical",
    description: "Lighting type catalog.",
    sortBy: "name",
    columns: [
      { key: "name", label: "Name", required: true },
      { key: "description", label: "Description" },
    ],
  },
  {
    key: "transformer_types",
    label: "Transformer Types",
    table: "transformer_types",
    category: "Electrical",
    description: "Transformer type master.",
    sortBy: "name",
    columns: [
      { key: "name", label: "Name", required: true },
      { key: "description", label: "Description" },
    ],
  },
  {
    key: "earthing_system_components",
    label: "Earthing Components",
    table: "earthing_system_components",
    category: "Electrical",
    description: "Earthing system components.",
    sortBy: "name",
    columns: [
      { key: "name", label: "Name", required: true },
      { key: "description", label: "Description" },
    ],
  },
  {
    key: "circulation_accessories",
    label: "Circulation Accessories",
    table: "circulation_accessories",
    category: "Mechanical",
    description: "Circulation accessory library.",
    sortBy: "name",
    columns: [
      { key: "name", label: "Name", required: true },
      { key: "description", label: "Description" },
    ],
  },
  {
    key: "filter_types",
    label: "Filter Types",
    table: "filter_types",
    category: "Mechanical",
    description: "Filter type master list.",
    sortBy: "name",
    columns: [
      { key: "name", label: "Name", required: true },
      { key: "description", label: "Description" },
    ],
  },
  {
    key: "filter_pump_types",
    label: "Filter Pump Types",
    table: "filter_pump_types",
    category: "Mechanical",
    description: "Filter pump reference data.",
    sortBy: "name",
    columns: [
      { key: "name", label: "Name", required: true },
      { key: "description", label: "Description" },
    ],
  },
  {
    key: "heaters",
    label: "Heaters",
    table: "heaters",
    category: "Mechanical",
    description: "Heater options.",
    sortBy: "name",
    columns: [
      { key: "name", label: "Name", required: true },
      { key: "type", label: "Type" },
      { key: "description", label: "Description" },
    ],
  },
  {
    key: "main_drains",
    label: "Main Drains",
    table: "main_drains",
    category: "Mechanical",
    description: "Main drain options.",
    sortBy: "name",
    columns: [
      { key: "name", label: "Name", required: true },
      { key: "description", label: "Description" },
    ],
  },
  {
    key: "tablet_chlorinators",
    label: "Tablet Chlorinators",
    table: "tablet_chlorinators",
    category: "Mechanical",
    description: "Tablet chlorinator list.",
    sortBy: "name",
    columns: [
      { key: "name", label: "Name", required: true },
      { key: "description", label: "Description" },
    ],
  },
  {
    key: "lambda_factors",
    label: "Lambda Factors",
    table: "lambda_factors",
    category: "Mechanical",
    description: "Lambda factor engineering constants.",
    sortBy: "name",
    columns: [
      { key: "name", label: "Name", required: true },
      { key: "value", label: "Value", type: "number" },
      { key: "description", label: "Description" },
    ],
  },
  {
    key: "water_feature_categories",
    label: "Water Feature Categories",
    table: "water_feature_categories",
    category: "Water Features",
    description: "Water feature category lookup.",
    sortBy: "name",
    columns: [
      { key: "name", label: "Name", required: true },
      { key: "description", label: "Description" },
    ],
  },
  {
    key: "water_feature_types",
    label: "Water Feature Types",
    table: "water_feature_types",
    category: "Water Features",
    description: "Water feature type lookup.",
    sortBy: "name",
    columns: [
      { key: "name", label: "Name", required: true },
      { key: "description", label: "Description" },
    ],
  },
  {
    key: "soil_sensitivity_types",
    label: "Soil Sensitivity",
    table: "soil_sensitivity_types",
    category: "Water Features",
    description: "Soil sensitivity master list.",
    sortBy: "level",
    columns: [
      { key: "name", label: "Name", required: true },
      { key: "level", label: "Level", type: "number" },
      { key: "description", label: "Description" },
    ],
  },
  {
    key: "erp_cost_codes",
    label: "ERP Cost Codes",
    table: "erp_cost_codes",
    category: "ERP",
    description: "Cost code reference used across cost control and procurement.",
    sortBy: "full_code",
    columns: [
      { key: "category", label: "Category", required: true },
      { key: "sub_code", label: "Sub Code", required: true },
      { key: "full_code", label: "Full Code" },
      { key: "description", label: "Description", required: true },
      { key: "accounting_code", label: "Accounting Code" },
      { key: "status", label: "Status" },
    ],
  },
  {
    key: "erp_suppliers",
    label: "ERP Suppliers",
    table: "erp_suppliers",
    category: "ERP",
    description: "Approved supplier master data.",
    sortBy: "code",
    columns: [
      { key: "code", label: "Supplier Code", required: true },
      { key: "name", label: "Supplier Name", required: true },
      { key: "category", label: "Category" },
      { key: "specialty", label: "Specialty" },
      { key: "phone", label: "Phone" },
      { key: "status", label: "Status" },
    ],
  },
  {
    key: "erp_subcontractors",
    label: "ERP Subcontractors",
    table: "erp_subcontractors",
    category: "ERP",
    description: "Subcontractor registry.",
    sortBy: "code",
    columns: [
      { key: "code", label: "Subcontractor Code", required: true },
      { key: "name", label: "Subcontractor Name", required: true },
      { key: "specialty", label: "Specialty", required: true },
      { key: "phone", label: "Phone" },
      { key: "rating", label: "Rating", type: "number" },
    ],
  },
  {
    key: "erp_warehouses",
    label: "ERP Warehouses",
    table: "erp_warehouses",
    category: "ERP",
    description: "Warehouse reference for inventory and logistics.",
    sortBy: "code",
    columns: [
      { key: "code", label: "Warehouse Code", required: true },
      { key: "name", label: "Warehouse Name", required: true },
      { key: "location", label: "Location", required: true },
      { key: "type", label: "Type", required: true },
    ],
  },
  {
    key: "erp_approval_rules",
    label: "ERP Approval Rules",
    table: "erp_approval_rules",
    category: "ERP",
    description: "Approval matrix rules by amount and workflow type.",
    sortBy: "level",
    columns: [
      { key: "type", label: "Type", required: true },
      { key: "level", label: "Level", type: "number", required: true },
      { key: "label", label: "Label", required: true },
      { key: "min_amount", label: "Min Amount", type: "number", required: true },
      { key: "max_amount", label: "Max Amount", type: "number" },
      { key: "approver_role", label: "Approver Role", required: true },
    ],
  },
];

const categories = [...new Set(masterTables.map((table) => table.category))];

function useMasterData(config: TableConfig) {
  return useQuery({
    queryKey: ["master", config.table],
    queryFn: async () => {
      const orderBy = config.sortBy || config.columns[0]?.key || "created_at";
      const { data, error } = await supabase.from(config.table as any).select("*").order(orderBy as any);
      if (error) throw error;
      return data as any[];
    },
  });
}

function useCreateMasterItem(table: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (item: Record<string, any>) => {
      const { data, error } = await supabase.from(table as any).insert(item as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["master", table] }),
  });
}

function useUpdateMasterItem(table: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Record<string, any>) => {
      const { data, error } = await supabase.from(table as any).update(updates as any).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["master", table] }),
  });
}

function useDeleteMasterItem(table: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["master", table] }),
  });
}

function MasterTableView({ config }: { config: TableConfig }) {
  const { data: items = [], isLoading } = useMasterData(config);
  const createItem = useCreateMasterItem(config.table);
  const updateItem = useUpdateMasterItem(config.table);
  const deleteItem = useDeleteMasterItem(config.table);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((item: any) =>
      config.columns.some((col) => String(item[col.key] ?? "").toLowerCase().includes(q))
    );
  }, [config.columns, items, search]);

  const startAdd = () => {
    const defaults: Record<string, any> = {};
    config.columns.forEach((col) => {
      defaults[col.key] = col.type === "number" ? 0 : "";
    });
    setFormValues(defaults);
    setAdding(true);
    setEditingId(null);
  };

  const startEdit = (item: any) => {
    const values: Record<string, any> = {};
    config.columns.forEach((col) => {
      values[col.key] = item[col.key] ?? (col.type === "number" ? 0 : "");
    });
    setFormValues(values);
    setEditingId(item.id);
    setAdding(false);
  };

  const resetEditor = () => {
    setAdding(false);
    setEditingId(null);
    setFormValues({});
  };

  const handleSave = async () => {
    for (const column of config.columns.filter((col) => col.required)) {
      if (!String(formValues[column.key] ?? "").trim()) {
        toast.error(`${column.label} is required`);
        return;
      }
    }

    try {
      if (editingId) {
        await updateItem.mutateAsync({ id: editingId, ...formValues });
        toast.success("Updated");
      } else {
        await createItem.mutateAsync(formValues);
        toast.success("Added");
      }
      resetEditor();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteItem.mutateAsync(id);
      toast.success("Deleted");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Database size={14} className="text-primary shrink-0" />
            <h3 className="text-sm font-heading font-semibold text-foreground">{config.label}</h3>
            <span className="text-xs text-muted-foreground">({items.length})</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">{config.description}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search..."
              className="pl-8 pr-3 py-1.5 rounded-lg border border-input bg-background text-xs text-foreground outline-none focus:ring-1 focus:ring-ring w-44"
            />
          </div>
          <button
            onClick={startAdd}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90"
          >
            <Plus size={13} />
            Add
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              {config.columns.map((column) => (
                <th
                  key={column.key}
                  className={`py-2 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider ${column.type === "number" ? "text-right" : "text-left"}`}
                >
                  {column.label}
                </th>
              ))}
              <th className="w-20 py-2 px-3" />
            </tr>
          </thead>
          <tbody>
            {adding && (
              <tr className="bg-secondary/20">
                {config.columns.map((column) => (
                  <td key={column.key} className="py-2 px-3">
                    <input
                      type={column.type === "number" ? "number" : "text"}
                      value={formValues[column.key] ?? ""}
                      onChange={(event) =>
                        setFormValues((current) => ({
                          ...current,
                          [column.key]:
                            column.type === "number" ? parseFloat(event.target.value) || 0 : event.target.value,
                        }))
                      }
                      placeholder={column.label}
                      className={`w-full px-2 py-1.5 rounded border border-input bg-background text-xs outline-none focus:ring-1 focus:ring-ring ${column.type === "number" ? "text-right" : ""}`}
                      onKeyDown={(event) => event.key === "Enter" && handleSave()}
                      autoFocus={column.key === config.columns[0]?.key}
                    />
                  </td>
                ))}
                <td className="py-2 px-3">
                  <div className="flex gap-1">
                    <button onClick={handleSave} className="p-1 rounded text-primary hover:bg-primary/10">
                      <Check size={13} />
                    </button>
                    <button onClick={resetEditor} className="p-1 rounded text-muted-foreground hover:text-foreground">
                      <X size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {isLoading ? (
              <tr>
                <td colSpan={config.columns.length + 1} className="py-8 text-center text-xs text-muted-foreground">
                  Loading...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={config.columns.length + 1} className="py-8 text-center text-xs text-muted-foreground">
                  No records
                </td>
              </tr>
            ) : (
              filtered.map((item: any) => (
                <tr key={item.id} className="group border-b border-border/50 hover:bg-muted/10 transition-colors">
                  {config.columns.map((column) => (
                    <td key={column.key} className={`py-2 px-3 text-xs ${column.type === "number" ? "text-right font-mono" : ""}`}>
                      {editingId === item.id ? (
                        <input
                          type={column.type === "number" ? "number" : "text"}
                          value={formValues[column.key] ?? ""}
                          onChange={(event) =>
                            setFormValues((current) => ({
                              ...current,
                              [column.key]:
                                column.type === "number" ? parseFloat(event.target.value) || 0 : event.target.value,
                            }))
                          }
                          onKeyDown={(event) => event.key === "Enter" && handleSave()}
                          className={`w-full px-2 py-1 rounded border border-input bg-background text-xs outline-none ${column.type === "number" ? "text-right" : ""}`}
                        />
                      ) : (
                        <span className="text-foreground">{item[column.key] ?? "-"}</span>
                      )}
                    </td>
                  ))}
                  <td className="py-2 px-3">
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {editingId === item.id ? (
                        <>
                          <button onClick={handleSave} className="p-1 rounded text-primary hover:bg-primary/10">
                            <Check size={13} />
                          </button>
                          <button onClick={resetEditor} className="p-1 rounded text-muted-foreground hover:text-foreground">
                            <X size={13} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(item)} className="p-1 rounded text-muted-foreground hover:text-foreground">
                            <Edit2 size={13} />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="p-1 rounded text-muted-foreground hover:text-destructive">
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function MasterDataPage() {
  const [activeCategory, setActiveCategory] = useState(categories[0]);
  const [activeTable, setActiveTable] = useState(masterTables[0].key);

  const tablesInCategory = masterTables.filter((table) => table.category === activeCategory);
  const currentConfig = masterTables.find((table) => table.key === activeTable);

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    const firstTable = masterTables.find((table) => table.category === category);
    if (firstTable) setActiveTable(firstTable.key);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">Master Data</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage the ERP reference tables that are suitable for master data: geography, catalogs, clients, and ERP setup lists.
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => handleCategoryChange(category)}
            className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              activeCategory === category
                ? "bg-primary text-primary-foreground"
                : "bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-1 space-y-1">
          {tablesInCategory.map((table) => (
            <button
              key={table.key}
              onClick={() => setActiveTable(table.key)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                activeTable === table.key
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              <span>{table.label}</span>
              <ChevronRight size={12} className={activeTable === table.key ? "text-primary" : "text-muted-foreground/50"} />
            </button>
          ))}
        </div>

        <div className="lg:col-span-4">
          <AnimatePresence mode="wait">
            {currentConfig && (
              <motion.div
                key={currentConfig.key}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
              >
                <MasterTableView config={currentConfig} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
