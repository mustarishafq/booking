-- EMZI Nexus Booking MySQL Schema
-- Run via: npm run migrate
-- Target database comes from DB_NAME in .env (default: booking).
-- migrate.js creates/selects that database; CREATE DATABASE / USE below are stripped at runtime.

CREATE DATABASE IF NOT EXISTS nexus_booking
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE nexus_booking;

-- ------------------------------------------------------------------
-- Users
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            CHAR(36)     NOT NULL,
  email         VARCHAR(255) NOT NULL,
  full_name     VARCHAR(255) DEFAULT '',
  phone         VARCHAR(50)  NOT NULL DEFAULT '',
  role          ENUM('user','admin') NOT NULL DEFAULT 'user',
  credit_balance_cents INT NOT NULL DEFAULT 0,
  password_hash VARCHAR(255) NOT NULL,
  approved      TINYINT(1)   NOT NULL DEFAULT 0,
  reset_token   VARCHAR(255)  DEFAULT NULL,
  reset_token_expires DATETIME DEFAULT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Nexus SSO user ID (safe to run multiple times)
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'nexus_sso_id'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN nexus_sso_id VARCHAR(255) NULL DEFAULT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'uq_users_nexus_sso_id'
);
SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE users ADD UNIQUE KEY uq_users_nexus_sso_id (nexus_sso_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------------
-- Resources
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resources (
  id            CHAR(36)     NOT NULL,
  name          VARCHAR(255) NOT NULL,
  resource_type VARCHAR(255) NOT NULL,
  description   TEXT,
  capacity      INT,
  pricing_model ENUM('hourly','daily','flat') NOT NULL DEFAULT 'hourly',
  rate          DECIMAL(10,2) NOT NULL DEFAULT 0,
  amenities     JSON,
  image_url           TEXT,
  requires_approval   TINYINT(1)   NOT NULL DEFAULT 1,
  pic_user_id         CHAR(36)     DEFAULT NULL,
  status              ENUM('active','maintenance','inactive') NOT NULL DEFAULT 'active',
  location      VARCHAR(255),
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------------
-- Rooms
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rooms (
  id          CHAR(36)     NOT NULL,
  name        VARCHAR(255) NOT NULL,
  description TEXT,
  capacity    INT          NOT NULL DEFAULT 0,
  hourly_rate DECIMAL(10,2) NOT NULL DEFAULT 0,
  amenities   JSON,
  image_url   TEXT,
  status      ENUM('active','maintenance','inactive') NOT NULL DEFAULT 'active',
  floor       VARCHAR(100),
  room_type   ENUM('meeting','conference','workshop','studio','office') NOT NULL DEFAULT 'meeting',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------------
-- Bookings
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
  id                  CHAR(36)     NOT NULL,
  resource_id         VARCHAR(255) NOT NULL,
  resource_name       VARCHAR(255),
  resource_type       VARCHAR(255),
  pricing_model       ENUM('hourly','daily','flat'),
  title               VARCHAR(255) NOT NULL,
  start_time          DATETIME     NOT NULL,
  end_time            DATETIME     NOT NULL,
  status              ENUM('confirmed','cancelled','completed','pending','rejected') NOT NULL DEFAULT 'confirmed',
  cost_cents          INT          NOT NULL DEFAULT 0,
  attendees           INT,
  notes               TEXT,
  is_recurring        TINYINT(1)   NOT NULL DEFAULT 0,
  recurrence_group_id CHAR(36),
  recurrence_weeks    INT,
  booked_by_email     VARCHAR(255),
  booked_by_name      VARCHAR(255),
  created_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_bookings_resource_id (resource_id),
  INDEX idx_bookings_start_time  (start_time),
  INDEX idx_bookings_status      (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------------
-- Transactions
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
  id                   CHAR(36)     NOT NULL,
  user_email           VARCHAR(255) NOT NULL,
  type                 VARCHAR(100) NOT NULL,
  amount_cents         INT          NOT NULL DEFAULT 0,
  balance_after_cents  INT          NOT NULL DEFAULT 0,
  description          TEXT,
  booking_id           CHAR(36),
  created_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_transactions_user_email (user_email),
  INDEX idx_transactions_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------------
-- Settings (key-value store for admin config)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  `key`   VARCHAR(100) NOT NULL,
  `value` TEXT,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------------
-- Roles (custom roles with permission flags)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  id          CHAR(36)     NOT NULL,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  color       VARCHAR(50)  NOT NULL DEFAULT 'slate',
  permissions JSON,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add role_id FK to users (safe to run multiple times via IF NOT EXISTS guard via procedure)
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role_id'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE users ADD COLUMN role_id CHAR(36) NULL DEFAULT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add user_type column to users (internal = free bookings, external = normal credit flow)
SET @col_exists = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'user_type'
);
SET @sql = IF(@col_exists = 0,
  "ALTER TABLE users ADD COLUMN user_type ENUM('internal','external') NOT NULL DEFAULT 'external'",
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------------
-- In-app notifications
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id          CHAR(36)     NOT NULL,
  user_email  VARCHAR(255) NOT NULL,
  type        VARCHAR(50)  NOT NULL,
  title       VARCHAR(255) NOT NULL,
  body        TEXT,
  link        VARCHAR(255),
  read_at     DATETIME     DEFAULT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_notifications_user_email (user_email),
  INDEX idx_notifications_read_at (read_at),
  INDEX idx_notifications_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ------------------------------------------------------------------
-- Audit logs (immutable record of data changes and admin actions)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id            CHAR(36)     NOT NULL,
  actor_id      CHAR(36)     DEFAULT NULL,
  actor_email   VARCHAR(255) DEFAULT NULL,
  action        VARCHAR(50)  NOT NULL,
  entity_type   VARCHAR(50)  NOT NULL,
  entity_id     VARCHAR(255) DEFAULT NULL,
  summary       VARCHAR(500) DEFAULT NULL,
  metadata      JSON,
  ip_address    VARCHAR(45)  DEFAULT NULL,
  user_agent    VARCHAR(500) DEFAULT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_audit_logs_created_at (created_at),
  INDEX idx_audit_logs_actor_email (actor_email),
  INDEX idx_audit_logs_entity_type (entity_type),
  INDEX idx_audit_logs_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Default Nexus SSO config (disabled until configured in Settings)
INSERT IGNORE INTO settings (`key`, `value`) VALUES (
  'nexus_sso',
  '{"enabled":false,"secret":"","issuer":"","default_role":"user","default_role_id":null}'
);

-- Existing databases: run once if upgrading
-- ALTER TABLE resources ADD COLUMN requires_approval TINYINT(1) NOT NULL DEFAULT 1 AFTER image_url;
-- ALTER TABLE resources ADD COLUMN pic_user_id CHAR(36) DEFAULT NULL AFTER requires_approval;
