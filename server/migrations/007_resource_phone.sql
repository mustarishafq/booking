-- Contact phone on resources (+ snapshot on bookings) — safe to re-run

SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'resources' AND COLUMN_NAME = 'phone'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE resources ADD COLUMN phone VARCHAR(50) DEFAULT NULL AFTER location',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'resource_phone'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE bookings ADD COLUMN resource_phone VARCHAR(50) DEFAULT NULL AFTER resource_type',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
