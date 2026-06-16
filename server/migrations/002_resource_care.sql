-- Resource care / upkeep (phases 1–4) — safe to re-run

-- Optional odometer on resources (cars)
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'resources' AND COLUMN_NAME = 'odometer_km'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE resources ADD COLUMN odometer_km DECIMAL(12,2) DEFAULT NULL AFTER location',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------------
-- Care templates by resource type (phase 2)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resource_type_care_templates (
  id            CHAR(36)     NOT NULL,
  resource_type VARCHAR(255) NOT NULL,
  description   TEXT,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_care_templates_resource_type (resource_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS resource_type_care_template_items (
  id                  CHAR(36)     NOT NULL,
  template_id         CHAR(36)     NOT NULL,
  label               VARCHAR(255) NOT NULL,
  category            ENUM('compliance','preventive','cleaning','inspection','other') NOT NULL DEFAULT 'preventive',
  interval_type       ENUM('manual','days','months','booking_hours','booking_count','odometer') NOT NULL DEFAULT 'manual',
  interval_value      INT          DEFAULT NULL,
  remind_days_before  INT          NOT NULL DEFAULT 7,
  block_when_overdue  TINYINT(1)   NOT NULL DEFAULT 0,
  sort_order          INT          NOT NULL DEFAULT 0,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_template_items_template_id (template_id),
  CONSTRAINT fk_template_items_template
    FOREIGN KEY (template_id) REFERENCES resource_type_care_templates(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------------
-- Per-resource care items (phase 1)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resource_care_items (
  id                  CHAR(36)     NOT NULL,
  resource_id         CHAR(36)     NOT NULL,
  template_item_id    CHAR(36)     DEFAULT NULL,
  label               VARCHAR(255) NOT NULL,
  category            ENUM('compliance','preventive','cleaning','inspection','other') NOT NULL DEFAULT 'preventive',
  interval_type       ENUM('manual','days','months','booking_hours','booking_count','odometer') NOT NULL DEFAULT 'manual',
  interval_value      INT          DEFAULT NULL,
  last_done_at        DATETIME     DEFAULT NULL,
  next_due_at         DATE         DEFAULT NULL,
  usage_at_last_done  DECIMAL(12,2) DEFAULT NULL,
  remind_days_before  INT          NOT NULL DEFAULT 7,
  block_when_overdue  TINYINT(1)   NOT NULL DEFAULT 0,
  notes               TEXT,
  is_active           TINYINT(1)   NOT NULL DEFAULT 1,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_care_items_resource_id (resource_id),
  INDEX idx_care_items_next_due_at (next_due_at),
  INDEX idx_care_items_template_item_id (template_item_id),
  UNIQUE KEY uq_care_items_resource_template (resource_id, template_item_id),
  CONSTRAINT fk_care_items_resource
    FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Completion history
CREATE TABLE IF NOT EXISTS resource_care_completions (
  id                  CHAR(36)     NOT NULL,
  care_item_id        CHAR(36)     NOT NULL,
  completed_at        DATETIME     NOT NULL,
  completed_by_user_id CHAR(36)    DEFAULT NULL,
  usage_reading       DECIMAL(12,2) DEFAULT NULL,
  notes               TEXT,
  next_due_at         DATE         DEFAULT NULL,
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_care_completions_item_id (care_item_id),
  INDEX idx_care_completions_completed_at (completed_at),
  CONSTRAINT fk_care_completions_item
    FOREIGN KEY (care_item_id) REFERENCES resource_care_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Reminder deduplication (one row per item/kind/due-date/recipient)
CREATE TABLE IF NOT EXISTS resource_care_reminders (
  id            CHAR(36)     NOT NULL,
  care_item_id  CHAR(36)     NOT NULL,
  reminder_kind ENUM('upcoming','due','overdue') NOT NULL,
  due_date      DATE         NOT NULL,
  user_email    VARCHAR(255) NOT NULL,
  sent_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_care_reminder (care_item_id, reminder_kind, due_date, user_email),
  INDEX idx_care_reminders_item_id (care_item_id),
  CONSTRAINT fk_care_reminders_item
    FOREIGN KEY (care_item_id) REFERENCES resource_care_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Templates for any resource_type already in the database (preserve existing types)
INSERT IGNORE INTO resource_type_care_templates (id, resource_type, description)
SELECT UUID(), rt.resource_type, CONCAT('Auto-created template for existing ', rt.resource_type, ' resources')
FROM (
  SELECT DISTINCT resource_type FROM resources
  WHERE resource_type IS NOT NULL AND TRIM(resource_type) != ''
) rt
LEFT JOIN resource_type_care_templates t ON t.resource_type = rt.resource_type
WHERE t.id IS NULL;

-- Starter templates with default care items (INSERT IGNORE on resource_type)
INSERT IGNORE INTO resource_type_care_templates (id, resource_type, description) VALUES
  ('tpl-car-0001-0001-0001-000000000001', 'Car', 'Default upkeep schedule for fleet vehicles'),
  ('tpl-room-0001-0001-0001-000000000001', 'Room', 'Default upkeep for bookable rooms'),
  ('tpl-meet-0001-0001-0001-000000000001', 'Meeting Room', 'Default upkeep for meeting rooms'),
  ('tpl-hall-0001-0001-0001-000000000001', 'Hall', 'Default upkeep for halls and event spaces'),
  ('tpl-eq-00001-0001-0001-000000000001', 'Equipment', 'Default upkeep for equipment');

INSERT IGNORE INTO resource_type_care_template_items
  (id, template_id, label, category, interval_type, interval_value, remind_days_before, block_when_overdue, sort_order)
VALUES
  ('ti-car-001', 'tpl-car-0001-0001-0001-000000000001', 'Scheduled service', 'preventive', 'days', 180, 14, 1, 1),
  ('ti-car-002', 'tpl-car-0001-0001-0001-000000000001', 'Road tax renewal', 'compliance', 'months', 12, 30, 1, 2),
  ('ti-car-003', 'tpl-car-0001-0001-0001-000000000001', 'Insurance renewal', 'compliance', 'months', 12, 30, 1, 3),
  ('ti-car-004', 'tpl-car-0001-0001-0001-000000000001', 'Tyre rotation', 'preventive', 'odometer', 10000, 7, 0, 4),

  ('ti-room-001', 'tpl-room-0001-0001-0001-000000000001', 'Deep clean', 'cleaning', 'days', 90, 7, 0, 1),
  ('ti-room-002', 'tpl-room-0001-0001-0001-000000000001', 'Fire extinguisher check', 'compliance', 'months', 12, 30, 1, 2),
  ('ti-room-003', 'tpl-room-0001-0001-0001-000000000001', 'HVAC filter change', 'preventive', 'months', 6, 14, 0, 3),
  ('ti-room-004', 'tpl-room-0001-0001-0001-000000000001', 'AV equipment check', 'inspection', 'booking_hours', 200, 7, 0, 4),

  ('ti-meet-001', 'tpl-meet-0001-0001-0001-000000000001', 'Deep clean', 'cleaning', 'days', 90, 7, 0, 1),
  ('ti-meet-002', 'tpl-meet-0001-0001-0001-000000000001', 'Fire safety inspection', 'compliance', 'months', 12, 30, 1, 2),
  ('ti-meet-003', 'tpl-meet-0001-0001-0001-000000000001', 'Projector lamp / AV check', 'inspection', 'booking_hours', 150, 7, 0, 3),

  ('ti-hall-001', 'tpl-hall-0001-0001-0001-000000000001', 'Deep clean', 'cleaning', 'days', 60, 7, 0, 1),
  ('ti-hall-002', 'tpl-hall-0001-0001-0001-000000000001', 'Occupancy / fire cert renewal', 'compliance', 'months', 12, 45, 1, 2),
  ('ti-hall-003', 'tpl-hall-0001-0001-0001-000000000001', 'Pest control', 'preventive', 'months', 3, 7, 0, 3),
  ('ti-hall-004', 'tpl-hall-0001-0001-0001-000000000001', 'Post-event turnover clean', 'cleaning', 'booking_count', 10, 3, 0, 4),

  ('ti-eq-001', 'tpl-eq-00001-0001-0001-000000000001', 'Routine inspection', 'inspection', 'days', 90, 7, 0, 1),
  ('ti-eq-002', 'tpl-eq-00001-0001-0001-000000000001', 'Calibration', 'preventive', 'booking_hours', 100, 7, 1, 2);

-- Backfill care items for existing resources from matching type templates
INSERT INTO resource_care_items
  (id, resource_id, template_item_id, label, category, interval_type, interval_value,
   next_due_at, usage_at_last_done, remind_days_before, block_when_overdue, is_active)
SELECT UUID(), r.id, ti.id, ti.label, ti.category, ti.interval_type, ti.interval_value,
  CASE
    WHEN ti.interval_type = 'days' AND ti.interval_value IS NOT NULL THEN DATE_ADD(CURDATE(), INTERVAL ti.interval_value DAY)
    WHEN ti.interval_type = 'months' AND ti.interval_value IS NOT NULL THEN DATE_ADD(CURDATE(), INTERVAL ti.interval_value MONTH)
    ELSE NULL
  END,
  CASE WHEN ti.interval_type IN ('booking_hours','booking_count','odometer') THEN 0 ELSE NULL END,
  ti.remind_days_before, ti.block_when_overdue, 1
FROM resources r
INNER JOIN resource_type_care_templates t ON t.resource_type = r.resource_type
INNER JOIN resource_type_care_template_items ti ON ti.template_id = t.id
WHERE NOT EXISTS (
  SELECT 1 FROM resource_care_items ci
  WHERE ci.resource_id = r.id AND ci.template_item_id = ti.id
);
