interface TenderDetailsFormProps {
  editing: boolean;
  form: Record<string, any>;
  set: (key: string, value: any) => void;
  tender: any;
}

export default function TenderDetailsForm({ editing, form, set, tender }: TenderDetailsFormProps) {
  return (
    <div className="bg-card rounded-xl p-6 shadow-card border border-border space-y-4">
      <h3 className="text-sm font-heading font-semibold text-foreground">تفاصيل المناقصة</h3>
      {editing ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">العنوان</label>
            <input value={form.title} onChange={(e) => set("title", e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">العميل</label>
            <input value={form.client_name} onChange={(e) => set("client_name", e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">تاريخ التقديم</label>
            <input type="date" value={form.submission_date} onChange={(e) => set("submission_date", e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">النطاق</label>
            <textarea value={form.scope} onChange={(e) => set("scope", e.target.value)} rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-ring resize-none" />
          </div>

          {/* Direct Cost Percentages */}
          <div className="md:col-span-2">
            <p className="text-xs font-semibold text-foreground mb-2">نسب التكلفة المباشرة</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { key: "overhead_pct", label: "أعباء عامة %" },
                { key: "risk_pct", label: "مخاطر %" },
                { key: "contingency_pct", label: "احتياطي %" },
                { key: "profit_margin_pct", label: "ربح %" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">{f.label}</label>
                  <input type="number" step="0.01" min="0" max="100" value={form[f.key]}
                    onChange={(e) => set(f.key, parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-ring" />
                </div>
              ))}
            </div>
          </div>

          {/* Indirect Cost Percentages */}
          <div className="md:col-span-2">
            <p className="text-xs font-semibold text-foreground mb-2">التكاليف غير المباشرة</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { key: "commission_pct", label: "عمولات %" },
                { key: "taxes_pct", label: "ضرائب %" },
                { key: "insurance_pct", label: "تأمينات %" },
                { key: "admin_expenses_pct", label: "مصاريف إدارية %" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">{f.label}</label>
                  <input type="number" step="0.01" min="0" max="100" value={form[f.key]}
                    onChange={(e) => set(f.key, parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-ring" />
                </div>
              ))}
            </div>
          </div>

          {/* Exchange Rates & Fees */}
          <div className="md:col-span-2">
            <p className="text-xs font-semibold text-foreground mb-2">أسعار الصرف والرسوم</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { key: "exchange_rate_usd", label: "سعر الدولار" },
                { key: "exchange_rate_eur", label: "سعر اليورو" },
                { key: "shipping_fees_pct", label: "شحن %" },
                { key: "customs_fees_pct", label: "جمارك %" },
                { key: "vat_pct", label: "ض.ق.م %" },
              ].map((f) => (
                <div key={f.key}>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">{f.label}</label>
                  <input type="number" step="0.01" min="0" value={form[f.key]}
                    onChange={(e) => set(f.key, parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-ring" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div><span className="text-muted-foreground">العميل:</span> <span className="text-foreground mr-2">{tender.client_name || "—"}</span></div>
            <div><span className="text-muted-foreground">التقديم:</span> <span className="text-foreground mr-2">{tender.submission_date || "—"}</span></div>
          </div>
          {tender.scope && <div><span className="text-muted-foreground">النطاق:</span><p className="text-foreground mt-1">{tender.scope}</p></div>}
          
          <div className="grid grid-cols-4 gap-3 pt-2 border-t border-border">
            <InfoPill label="أعباء" value={`${tender.overhead_pct || 0}%`} />
            <InfoPill label="مخاطر" value={`${tender.risk_pct || 0}%`} />
            <InfoPill label="احتياطي" value={`${tender.contingency_pct || 0}%`} />
            <InfoPill label="ربح" value={`${tender.profit_margin_pct || 0}%`} />
          </div>

          {((tender as any).commission_pct > 0 || (tender as any).taxes_pct > 0 || (tender as any).insurance_pct > 0 || (tender as any).admin_expenses_pct > 0) && (
            <div className="grid grid-cols-4 gap-3 pt-2 border-t border-border">
              <InfoPill label="عمولات" value={`${(tender as any).commission_pct || 0}%`} />
              <InfoPill label="ضرائب" value={`${(tender as any).taxes_pct || 0}%`} />
              <InfoPill label="تأمينات" value={`${(tender as any).insurance_pct || 0}%`} />
              <InfoPill label="م. إدارية" value={`${(tender as any).admin_expenses_pct || 0}%`} />
            </div>
          )}

          {((tender as any).exchange_rate_usd > 0 || (tender as any).exchange_rate_eur > 0) && (
            <div className="grid grid-cols-5 gap-3 pt-2 border-t border-border">
              <InfoPill label="دولار" value={(tender as any).exchange_rate_usd || "—"} />
              <InfoPill label="يورو" value={(tender as any).exchange_rate_eur || "—"} />
              <InfoPill label="شحن" value={`${(tender as any).shipping_fees_pct || 0}%`} />
              <InfoPill label="جمارك" value={`${(tender as any).customs_fees_pct || 0}%`} />
              <InfoPill label="ض.ق.م" value={`${(tender as any).vat_pct || 14}%`} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-secondary/50 rounded-lg px-3 py-2 text-center">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-mono font-semibold text-foreground">{value}</p>
    </div>
  );
}
