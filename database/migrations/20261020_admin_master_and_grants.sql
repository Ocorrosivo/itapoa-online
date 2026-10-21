-- ============================================================
-- MIGRATION: 20261020_admin_master_and_grants.sql
-- Objetivo: Gestão de Planos, Auditoria, Concessões Promocionais e Conta Master
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

-- Colunas de apresentação comercial e regras de contratação em plans
CALL AddColumnIfNotExists('plans', 'display_name', 'VARCHAR(100) NULL');
CALL AddColumnIfNotExists('plans', 'description', 'TEXT NULL');
CALL AddColumnIfNotExists('plans', 'badge', 'VARCHAR(50) NULL');
CALL AddColumnIfNotExists('plans', 'button_text', 'VARCHAR(50) NULL');
CALL AddColumnIfNotExists('plans', 'sort_order', 'INT NOT NULL DEFAULT 0');
CALL AddColumnIfNotExists('plans', 'is_recommended', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL AddColumnIfNotExists('plans', 'allow_new_subscriptions', 'TINYINT(1) NOT NULL DEFAULT 1');
CALL AddColumnIfNotExists('plans', 'trial_days', 'INT NOT NULL DEFAULT 0');

DROP PROCEDURE IF EXISTS AddColumnIfNotExists;

-- 2. Tabela de Concessões Administrativas Promocionais (Histórico e Estado Ativo)
-- Concessão administrativa NÃO gera cobrança nem pagamento fictício
CREATE TABLE IF NOT EXISTS admin_plan_grants (
    id VARCHAR(64) PRIMARY KEY,
    company_id VARCHAR(64) NOT NULL,
    granted_plan VARCHAR(32) NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    reason TEXT NOT NULL,
    status ENUM('active', 'revoked', 'expired') NOT NULL DEFAULT 'active',
    granted_by_user_id VARCHAR(64) NULL,
    granted_by_email VARCHAR(255) NULL,
    revoked_at DATETIME NULL,
    revoked_reason TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_company_status (company_id, status),
    INDEX idx_status_end_date (status, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabela de Auditoria de Alterações em Planos
CREATE TABLE IF NOT EXISTS plan_audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    plan_id VARCHAR(64) NOT NULL,
    action VARCHAR(32) NOT NULL,
    changed_by_user_id VARCHAR(64) NULL,
    changed_by_email VARCHAR(255) NULL,
    changes_json JSON NOT NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_plan_date (plan_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Conta Master Oficial do Sistema (suprememidias.ok@gmail.com)
INSERT INTO users (id, name, email, password, role, city) VALUES
  ('user_master_suprememidias',
   'Master Admin',
   'suprememidias.ok@gmail.com',
   '$2b$12$FFd7OE7WDTJklyKnJSdFputAQpTlBRBwRwjhWhRvvYH7u6IF9SthC',
   'admin_master',
   'Itapoá')
ON DUPLICATE KEY UPDATE
  role = 'admin_master';

-- 5. Atualização dos Planos Canônicos com dados comerciais padrão
UPDATE plans SET
    display_name = 'Bronze Gratuito',
    description = 'Perfil essencial no diretório de Itapoá com CRM e 3 fotos na galeria.',
    badge = 'Gratuito',
    button_text = 'Começar Gratuitamente',
    sort_order = 1,
    is_recommended = 0,
    allow_new_subscriptions = 1,
    trial_days = 0
WHERE id = 'plan_bronze';

UPDATE plans SET
    display_name = 'Gold VIP',
    description = 'Apresentação completa, 15 fotos, 5 produtos, 1 promoção e destaque rotativo na Home.',
    badge = 'Mais Popular',
    button_text = 'Assinar Gold VIP',
    sort_order = 2,
    is_recommended = 1,
    allow_new_subscriptions = 1,
    trial_days = 0
WHERE id = 'plan_gold_vip';

UPDATE plans SET
    display_name = 'Diamond',
    description = 'Topo das buscas, 30 fotos, 30 produtos, 3 promoções e mini-site de máxima visibilidade.',
    badge = 'Máxima Exposição',
    button_text = 'Assinar Diamond',
    sort_order = 3,
    is_recommended = 0,
    allow_new_subscriptions = 1,
    trial_days = 0
WHERE id = 'plan_diamond_extremo';
