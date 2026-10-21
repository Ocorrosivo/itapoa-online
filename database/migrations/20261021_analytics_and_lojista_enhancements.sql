-- ============================================================
-- MIGRATION: 20261021_analytics_and_lojista_enhancements.sql
-- Objetivo: Telemetria de Métricas Reais, CRM Enriquecido e Galeria de Fotos
-- NÃO DESTRUTIVA: Preserva 100% dos dados, empresas e leads existentes
-- ============================================================

SET NAMES utf8mb4;

-- 1. Tabela de Telemetria de Eventos Analíticos Reais
CREATE TABLE IF NOT EXISTS company_analytics_events (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL,
    event_type VARCHAR(32) NOT NULL, -- 'view', 'whatsapp', 'phone', 'route'
    source VARCHAR(64) DEFAULT 'direct',
    device VARCHAR(32) DEFAULT 'mobile',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_cae_company_created (company_id, created_at),
    INDEX idx_cae_company_type_created (company_id, event_type, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Procedure auxiliar para adicionar colunas de forma idempotente
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

-- Colunas de cliques consolidados em companies
CALL AddColumnIfNotExists('companies', 'clicksPhone', 'INT NOT NULL DEFAULT 0');
CALL AddColumnIfNotExists('companies', 'clicksRoute', 'INT NOT NULL DEFAULT 0');

-- Colunas de CRM simples em crm_leads
CALL AddColumnIfNotExists('crm_leads', 'interest', 'VARCHAR(255) NULL');
CALL AddColumnIfNotExists('crm_leads', 'notes', 'TEXT NULL');
CALL AddColumnIfNotExists('crm_leads', 'next_contact_at', 'DATETIME NULL');

-- Coluna opcional de company_id em support_tickets para associar à empresa
CALL AddColumnIfNotExists('support_tickets', 'company_id', 'VARCHAR(64) NULL');

DROP PROCEDURE IF EXISTS AddColumnIfNotExists;
