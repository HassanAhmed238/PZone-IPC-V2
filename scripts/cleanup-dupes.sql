-- CLEANUP: Remove duplicate collection_transactions, keeping only the first inserted copy
-- This deletes rows where the same (project_code, collection_month, collection_date, amount) 
-- appears more than once, keeping the one with the earliest created_at.

DELETE FROM collection_transactions 
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY project_code, collection_month, collection_date, amount 
        ORDER BY created_at ASC
      ) as rn
    FROM collection_transactions
  ) ranked
  WHERE rn > 1
);

-- Verify results
SELECT collection_month, count(*) as entries, sum(amount)::numeric(15,2) as total 
FROM collection_transactions 
GROUP BY collection_month 
ORDER BY collection_month;
