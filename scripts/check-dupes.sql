-- Check for potential duplicates between Excel and Sheet sync sources
-- Same project + month + amount from different sources = likely duplicate

SELECT 
  a.project_code,
  a.collection_month,
  a.amount,
  a.source_type as source_a,
  a.dedupe_key as key_a,
  b.source_type as source_b,
  b.dedupe_key as key_b
FROM collection_transactions a
JOIN collection_transactions b 
  ON a.project_code = b.project_code 
  AND a.collection_month = b.collection_month 
  AND a.amount = b.amount
  AND a.id != b.id
  AND a.status != 'reversed'
  AND b.status != 'reversed'
ORDER BY a.collection_month, a.project_code;
