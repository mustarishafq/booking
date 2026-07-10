-- Multi-select pair-with types (JSON array) — safe to re-run

SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'resources' AND COLUMN_NAME = 'pair_with_types'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE resources ADD COLUMN pair_with_types JSON DEFAULT NULL AFTER pair_with_type',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Migrate single pair_with_type → JSON array when pair_with_types is empty
UPDATE resources
SET pair_with_types = JSON_ARRAY(pair_with_type)
WHERE pair_with_type IS NOT NULL
  AND pair_with_type != ''
  AND (
    pair_with_types IS NULL
    OR CAST(pair_with_types AS CHAR) = 'null'
    OR JSON_LENGTH(pair_with_types) = 0
  );
