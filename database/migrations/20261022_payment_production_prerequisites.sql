-- MariaDB 11 only. Explicit authorized maintenance, never application startup.
-- Additive prerequisites from historical migrations, WITHOUT seeds or DML.
-- Do not overwrite prices, plan limits, users, passwords or payment states.
ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_active TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS allow_new_subscriptions TINYINT(1) NOT NULL DEFAULT 1;
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS access_grant_type VARCHAR(50) NOT NULL DEFAULT 'bronze',
  ADD COLUMN IF NOT EXISTS trial_ends_at DATETIME NULL,
  ADD COLUMN IF NOT EXISTS has_used_trial TINYINT(1) NOT NULL DEFAULT 0;
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS plan_version INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS contracted_price DECIMAL(10,2) NULL,
  ADD COLUMN IF NOT EXISTS payment_type VARCHAR(32) NOT NULL DEFAULT 'onetime_pix',
  ADD COLUMN IF NOT EXISTS billing_period_days INT NOT NULL DEFAULT 30;
CREATE TABLE IF NOT EXISTS admin_plan_grants (
  id VARCHAR(64) PRIMARY KEY,
  company_id VARCHAR(64) NOT NULL,
  granted_plan VARCHAR(32) NOT NULL,
  start_date DATETIME NOT NULL,
  end_date DATETIME NOT NULL,
  reason TEXT NOT NULL,
  status ENUM('active','revoked','expired') NOT NULL DEFAULT 'active',
  granted_by_user_id VARCHAR(64) NULL,
  granted_by_email VARCHAR(255) NULL,
  revoked_at DATETIME NULL,
  revoked_reason TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_company_status (company_id,status),
  INDEX idx_status_end_date (status,end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS gateway_payment_state (
  payment_id VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
  subscription_id VARCHAR(255) NOT NULL,
  company_id VARCHAR(255) NOT NULL,
  remote_status VARCHAR(32) NOT NULL,
  remote_updated_at DATETIME(3) NOT NULL,
  activated_at DATETIME(3) NULL,
  expires_at DATETIME(3) NULL,
  UNIQUE KEY uniq_settlement_subscription (subscription_id),
  INDEX idx_settlement_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS webhook_events (
  id VARCHAR(64) PRIMARY KEY,
  gateway VARCHAR(32) NOT NULL DEFAULT 'mercadopago',
  gateway_event_id VARCHAR(128) NOT NULL,
  topic VARCHAR(64) NOT NULL DEFAULT 'payment',
  raw_body JSON NOT NULL,
  signature_header VARCHAR(512) NULL,
  request_id VARCHAR(128) NULL,
  status ENUM('pending','processing','done','failed') NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_gateway_event (gateway,gateway_event_id),
  INDEX idx_webhook_status_created (status,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
