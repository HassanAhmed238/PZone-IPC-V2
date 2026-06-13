-- Show full detail of duplicates to find root cause
SELECT project_code, collection_month, collection_date, amount, 
       source_file_name, source_row_key, dedupe_key
FROM collection_transactions 
WHERE project_code = 'PZ-033' AND collection_month = '2026-04-01'
ORDER BY amount DESC, collection_date;
