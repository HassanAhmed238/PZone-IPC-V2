import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { fmtNum } from "@/lib/utils";
import { RotateCcw } from "lucide-react";

export type EditableField = "collection" | "submitted" | "approved";

const FIELD_META: Record<
  EditableField,
  { label: string; labelAr: string; color: string; accentBtn: string; accentText: string }
> = {
  collection: {
    label: "Edit Collection",
    labelAr: "تعديل المحصل",
    color: "#f59e0b",
    accentBtn: "bg-[#f59e0b] hover:bg-[#f59e0b]/90 text-black",
    accentText: "text-[#f59e0b]",
  },
  submitted: {
    label: "Edit Submitted",
    labelAr: "تعديل المقدم",
    color: "#3b82f6",
    accentBtn: "bg-[#3b82f6] hover:bg-[#3b82f6]/90 text-white",
    accentText: "text-[#3b82f6]",
  },
  approved: {
    label: "Edit Approved",
    labelAr: "تعديل المعتمد",
    color: "#22c55e",
    accentBtn: "bg-[#22c55e] hover:bg-[#22c55e]/90 text-black",
    accentText: "text-[#22c55e]",
  },
};

interface Props {
  x: number;
  y: number;
  monthLabel: string;
  monthKey: string;
  currentValue: number;
  field: EditableField;
  /** True when a manual override exists — shows the Reset button */
  isOverridden: boolean;
  /** Called with (monthKey, newTotal, currentTotal) to save a new value */
  onSave: (monthKey: string, newTotal: number, currentTotal: number) => void;
  /** Called to reset back to the original Google Sheet value */
  onReset: (monthKey: string) => void;
  onClose: () => void;
  isSaving?: boolean;
}

export function CollectionEditPopover({
  x,
  y,
  monthLabel,
  monthKey,
  currentValue,
  field,
  isOverridden,
  onSave,
  onReset,
  onClose,
  isSaving,
}: Props) {
  const meta = FIELD_META[field];
  const [value, setValue] = useState(String(Math.round(currentValue)));
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => { inputRef.current?.select(); }, []);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number(value.replace(/,/g, "").replace(/\s/g, ""));
    if (Number.isNaN(parsed) || parsed < 0) return;
    onSave(monthKey, parsed, currentValue);
  }

  function handleReset() {
    onReset(monthKey);
    onClose();
  }

  const popoverWidth = 280;
  const popoverHeight = isOverridden ? 215 : 195;
  const left = Math.max(8, Math.min(x - popoverWidth / 2, window.innerWidth - popoverWidth - 8));
  const top = Math.max(8, y - popoverHeight - 16);

  return createPortal(
    <div
      ref={popoverRef}
      className="fixed z-[9999] animate-in fade-in-0 zoom-in-95"
      style={{ left, top, width: popoverWidth }}
    >
      <div
        className="rounded-xl border bg-card p-4 shadow-2xl backdrop-blur-sm"
        style={{ borderColor: `${meta.color}40` }}
      >
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className={`text-[10px] font-black uppercase tracking-wider ${meta.accentText}`}>
              {meta.label}
            </div>
            <div className="text-[10px] text-muted-foreground">{meta.labelAr} · {monthLabel}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Current value + override indicator */}
        <div className="mb-2 flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground">
            {isOverridden ? "Overridden:" : "Current:"}
            {" "}
            <span className="font-mono font-bold">{fmtNum(currentValue, 0)}</span>
          </span>
          {isOverridden && (
            <span
              className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider"
              style={{ background: `${meta.color}20`, color: meta.color }}
            >
              Manual Override
            </span>
          )}
        </div>

        {/* Edit form */}
        <form onSubmit={handleSubmit} className="space-y-2.5">
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={isSaving}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 font-mono text-sm font-bold outline-none disabled:opacity-50"
            style={{ borderColor: `${meta.color}60` }}
            onFocus={(e) => (e.target.style.borderColor = meta.color)}
            onBlur={(e) => (e.target.style.borderColor = `${meta.color}60`)}
            placeholder="New amount"
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 rounded-lg border border-border px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-muted disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className={`flex-1 rounded-lg px-3 py-2 text-xs font-black disabled:opacity-50 ${meta.accentBtn}`}
            >
              {isSaving ? "Saving…" : "Save"}
            </button>
          </div>

          {/* Reset row — only shown when an override exists */}
          {isOverridden && (
            <button
              type="button"
              onClick={handleReset}
              disabled={isSaving}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-[10px] font-bold text-muted-foreground hover:border-red-500/50 hover:text-red-400 disabled:opacity-50"
            >
              <RotateCcw size={11} />
              Reset to Google Sheet value
            </button>
          )}
        </form>
      </div>

      {/* Arrow */}
      <div className="absolute left-1/2 -translate-x-1/2" style={{ top: "100%" }}>
        <div
          className="h-0 w-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent"
          style={{ borderTopColor: `${meta.color}40` }}
        />
      </div>
    </div>,
    document.body
  );
}
