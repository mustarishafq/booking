-- Pair with resource type (replaces vehicle/driver pairing_role in the UI) — safe to re-run

SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'resources' AND COLUMN_NAME = 'pair_with_type'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE resources ADD COLUMN pair_with_type VARCHAR(255) DEFAULT NULL AFTER pairing_role',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Best-effort migrate old roles using derived tables (MySQL-safe)
UPDATE resources r
INNER JOIN (
  SELECT resource_type
  FROM resources
  WHERE LOWER(resource_type) IN ('driver', 'drivers')
  LIMIT 1
) d ON 1 = 1
SET r.pair_with_type = d.resource_type
WHERE r.pairing_role = 'vehicle'
  AND (r.pair_with_type IS NULL OR r.pair_with_type = '');

UPDATE resources r
INNER JOIN (
  SELECT resource_type
  FROM resources
  WHERE LOWER(resource_type) IN ('car', 'vehicle', 'van', 'lorry')
  LIMIT 1
) v ON 1 = 1
SET r.pair_with_type = v.resource_type
WHERE r.pairing_role = 'driver'
  AND (r.pair_with_type IS NULL OR r.pair_with_type = '');
