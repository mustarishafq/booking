-- Nexus SSO profile picture cache path / remote URL on users — safe to re-run

SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar_url'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN avatar_url VARCHAR(2048) NULL DEFAULT NULL AFTER nexus_sso_id',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
