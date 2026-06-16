-- Proof image for care completions — safe to re-run

SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'resource_care_completions' AND COLUMN_NAME = 'proof_image_url'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE resource_care_completions ADD COLUMN proof_image_url TEXT DEFAULT NULL AFTER notes',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
