-- Explicit activation only: back up production first. No DDL runs at server startup.
-- No FK to avoid altering the collation of legacy user/company identifiers.
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
