-- ============================================================
-- MIGRATION: 20261021_mercadopago_trial_and_billing.sql
-- Objetivo: Experiência Gold de 7 dias, elegibilidade única de trial,
--           diferenciação de pagamento avulso vs assinatura recorrente,
--           e preservação de contratos e preços acordados.
-- NÃO DESTRUTIVA: Preserva 100% dos dados, empresas e assinaturas existentes
-- ============================================================

SET NAMES utf8mb4;

-- 1. Procedure auxiliar para adicionar colunas de forma idempotente
DROP PROCEDURE IF EXISTS AddColumnIfNotExists;
DELIMITER //
CREATE PROCEDURE AddColumnIfNotExists(
    IN tableName VARCHAR(64),
    IN colName VARCHAR(64),
    IN colDef VARCHAR(255)
)
BEGIN
    DECLARE colExists INT DEFAULT 0;
    SELECT COUNT(*) INTO colExists
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = tableName
      AND column_name = colName;
    IF colExists = 0 THEN
        SET @sql = CONCAT('ALTER TABLE `', tableName, '` ADD COLUMN `', colName, '` ', colDef);
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END //
DELIMITER ;

-- Coluna para controlar se a empresa já usufruiu da experiência de teste (evita repetições indevidas)
CALL AddColumnIfNotExists('companies', 'has_used_trial', 'TINYINT(1) NOT NULL DEFAULT 0');

-- Colunas em subscriptions para diferenciar tipo de pagamento e registrar condições contratadas
CALL AddColumnIfNotExists('subscriptions', 'payment_type', "VARCHAR(32) NOT NULL DEFAULT 'onetime_pix'");
CALL AddColumnIfNotExists('subscriptions', 'billing_period_days', 'INT NOT NULL DEFAULT 30');
CALL AddColumnIfNotExists('subscriptions', 'plan_version', 'INT NOT NULL DEFAULT 1');
CALL AddColumnIfNotExists('subscriptions', 'contracted_price', 'DECIMAL(10,2) NULL');

DROP PROCEDURE IF EXISTS AddColumnIfNotExists;
