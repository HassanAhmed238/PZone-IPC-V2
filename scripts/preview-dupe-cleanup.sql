-- Targeted cleanup: when same (project_code, collection_month, amount) exists 
-- from multiple sources, keep the Excel import entry (dedupe_key starts with 'excel:')
-- and remove the duplicate from the other source.

-- Step 1: Preview what will be deleted
SELECT 
  d.id,
  d.project_code,
  d.collection_month,
  d.amount,
  d.collection_date,
  d.dedupe_key,
  d.source_file_name
FROM collection_transactions d
WHERE EXISTS (
  SELECT 1 FROM collection_transactions keeper
  WHERE keeper.project_code   = d.project_code
    AND keeper.collection_month = d.collection_month
    AND keeper.amount           = d.amount
    AND keeper.id              != d.id
    AND keeper.status          != 'reversed'
    AND keeper.dedupe_key LIKE 'excel:%'   -- there is an Excel copy
)
AND d.dedupe_key NOT LIKE 'excel:%'        -- this row is NOT the Excel copy
AND d.status != 'reversed'
ORDER BY d.collection_month, d.project_code, d.amount DESC;
