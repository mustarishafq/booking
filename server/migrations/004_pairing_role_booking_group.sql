-- Vehicle/driver pairing role on resources + linked booking groups — safe to re-run

SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'resources' AND COLUMN_NAME = 'pairing_role'
);
SET @sql = IF(@col_exists = 0,
  "ALTER TABLE resources ADD COLUMN pairing_role ENUM('none','vehicle','driver') NOT NULL DEFAULT 'none' AFTER resource_type",
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'booking_group_id'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE bookings ADD COLUMN booking_group_id CHAR(36) DEFAULT NULL AFTER recurrence_weeks',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND INDEX_NAME = 'idx_bookings_booking_group_id'
);
SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE bookings ADD INDEX idx_bookings_booking_group_id (booking_group_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
