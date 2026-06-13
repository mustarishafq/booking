-- Incremental migration: audit_logs (safe to re-run)
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
