-- Migration: add Mercado Pago plan id to plans for Subscriptions
-- Run AFTER MYSQL_SCHEMA.sql. Safe to re-run (IF NOT EXISTS via check).
-- Links local plans (plan_gold_vip, plan_diamond_extremo) to MP preapproval_plan ids.

SET @has_col := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'plans'
    AND COLUMN_NAME = 'mercado_pago_plan_id'
);
SET @ddl := IF(@has_col = 0,
  'ALTER TABLE plans ADD COLUMN mercado_pago_plan_id VARCHAR(255) NULL AFTER features',
  'SELECT 1'
);
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;
