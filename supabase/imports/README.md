# PZone Invoice Log Import

Generated import:

- `pzone_invoice_log_apr_jun_2026.sql`

Run order in Supabase SQL Editor:

1. `supabase/migrations/20260604_add_goudam_cost_control_user.sql`
2. `supabase/migrations/20260605_financial_ledgers.sql`
3. `supabase/imports/pzone_invoice_log_apr_jun_2026.sql`

The generated SQL imports April, May, and June 2026 invoice log rows from the workbook and posts April monthly collections into `collection_transactions`.

The SQL is rerunnable:

- Invoice rows update by `approval_notes` import key.
- Collection rows skip duplicates by `dedupe_key`.

The direct CLI import requires a confirmed authenticated user:

```powershell
$env:PZONE_IMPORT_EMAIL='goudam@pzoneinternational.com'
$env:PZONE_IMPORT_PASSWORD='123456'
npm run import:invoice-log -- "C:\Users\0255\Downloads\Pzone Invoices 2026 (1).xlsx"
```

