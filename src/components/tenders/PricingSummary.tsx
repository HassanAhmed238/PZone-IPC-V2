interface PricingSummaryProps {
  directCost: number;
  sellingTotal: number;
  overheadPct: number;
  riskPct: number;
  contingencyPct: number;
  profitPct: number;
  commissionPct?: number;
  taxesPct?: number;
  insurancePct?: number;
  adminExpensesPct?: number;
}

function fmt(n: number) {
  if (n >= 1_000_000) return `EGP ${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `EGP ${(n / 1_000).toFixed(1)}K`;
  return `EGP ${n.toFixed(2)}`;
}

export default function PricingSummary({
  directCost, sellingTotal, overheadPct, riskPct, contingencyPct, profitPct,
  commissionPct = 0, taxesPct = 0, insurancePct = 0, adminExpensesPct = 0,
}: PricingSummaryProps) {
  const itemMarkup = sellingTotal - directCost;
  const overhead = directCost * (overheadPct / 100);
  const risk = directCost * (riskPct / 100);
  const contingency = directCost * (contingencyPct / 100);

  // Indirect costs
  const commission = directCost * (commissionPct / 100);
  const taxes = directCost * (taxesPct / 100);
  const insurance = directCost * (insurancePct / 100);
  const adminExpenses = directCost * (adminExpensesPct / 100);
  const totalIndirect = commission + taxes + insurance + adminExpenses;

  const estimatedCost = directCost + overhead + risk + contingency + totalIndirect;
  const globalProfit = estimatedCost * (profitPct / 100);
  const tenderPrice = sellingTotal + overhead + risk + contingency + totalIndirect + globalProfit;
  const totalProfit = tenderPrice - estimatedCost;
  const profitMargin = tenderPrice > 0 ? (totalProfit / tenderPrice * 100) : 0;

  return (
    <div className="bg-card rounded-xl p-6 shadow-card border border-border space-y-4">
      <h3 className="text-sm font-heading font-semibold text-foreground">ملخص التسعير</h3>
      <div className="space-y-2 text-sm">
        <Row label="التكلفة المباشرة (BOQ)" value={fmt(directCost)} />
        <Row label="هامش البنود" value={fmt(itemMarkup)} muted accent={itemMarkup > 0} />
        <Row label="إجمالي البيع (BOQ)" value={fmt(sellingTotal)} bold />
        <div className="border-t border-border pt-2 mt-2">
          <Row label={`أعباء عامة (${overheadPct}%)`} value={fmt(overhead)} muted />
          <Row label={`مخاطر (${riskPct}%)`} value={fmt(risk)} muted />
          <Row label={`احتياطي (${contingencyPct}%)`} value={fmt(contingency)} muted />
        </div>
        {(commissionPct > 0 || taxesPct > 0 || insurancePct > 0 || adminExpensesPct > 0) && (
          <div className="border-t border-border pt-2">
            <p className="text-xs font-medium text-muted-foreground mb-1">تكاليف غير مباشرة</p>
            {commissionPct > 0 && <Row label={`عمولات (${commissionPct}%)`} value={fmt(commission)} muted />}
            {taxesPct > 0 && <Row label={`ضرائب (${taxesPct}%)`} value={fmt(taxes)} muted />}
            {insurancePct > 0 && <Row label={`تأمينات (${insurancePct}%)`} value={fmt(insurance)} muted />}
            {adminExpensesPct > 0 && <Row label={`مصاريف إدارية (${adminExpensesPct}%)`} value={fmt(adminExpenses)} muted />}
            <Row label="إجمالي غير مباشرة" value={fmt(totalIndirect)} bold />
          </div>
        )}
        <div className="border-t border-border pt-2">
          <Row label="التكلفة التقديرية" value={fmt(estimatedCost)} bold />
        </div>
        <Row label={`ربح عام (${profitPct}%)`} value={fmt(globalProfit)} muted />
        <div className="border-t-2 border-primary/30 pt-2">
          <Row label="سعر المناقصة" value={fmt(tenderPrice)} bold highlight />
        </div>
        <div className="bg-primary/5 rounded-lg p-3 mt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">إجمالي الربح</span>
            <span className="text-sm font-mono font-bold text-primary">{fmt(totalProfit)}</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs font-medium text-muted-foreground">هامش الربح</span>
            <span className="text-sm font-mono font-bold text-primary">{profitMargin.toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, muted, bold, highlight, accent }: {
  label: string; value: string; muted?: boolean; bold?: boolean; highlight?: boolean; accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className={muted ? "text-muted-foreground" : "text-foreground"}>{label}</span>
      <span className={`font-mono ${bold ? "font-bold" : "font-medium"} ${highlight ? "text-primary text-base" : accent ? "text-primary" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}
