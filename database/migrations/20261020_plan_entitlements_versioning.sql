-- ============================================================
-- MIGRATION: 20261020_plan_entitlements_versioning.sql
-- Objetivo: Versionamento de planos, limites de recursos e rastreabilidade de concessão
-- NÃO DESTRUTIVA: Preserva 100% dos dados, empresas e assinaturas existentes
-- ============================================================

SET NAMES utf8mb4;

-- 1. Tabela plans: colunas estruturadas para limites de recursos e versionamento
-- Adiciona colunas se não existirem
SET @dbname = DATABASE();

-- Procedure auxiliar para adicionar coluna de forma idempotente e segura
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

-- Colunas de versionamento e limites em plans
CALL AddColumnIfNotExists('plans', 'version', 'INT NOT NULL DEFAULT 1');
CALL AddColumnIfNotExists('plans', 'max_gallery_photos', 'INT NOT NULL DEFAULT 3');
CALL AddColumnIfNotExists('plans', 'max_products', 'INT NOT NULL DEFAULT 0');
CALL AddColumnIfNotExists('plans', 'max_coupons', 'INT NOT NULL DEFAULT 0');
CALL AddColumnIfNotExists('plans', 'has_home_highlight', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL AddColumnIfNotExists('plans', 'has_crm', 'TINYINT(1) NOT NULL DEFAULT 1');
CALL AddColumnIfNotExists('plans', 'has_full_presentation', 'TINYINT(1) NOT NULL DEFAULT 0');
CALL AddColumnIfNotExists('plans', 'has_analytics', 'TINYINT(1) NOT NULL DEFAULT 1');
CALL AddColumnIfNotExists('plans', 'is_active', 'TINYINT(1) NOT NULL DEFAULT 1');

-- Colunas de concessão e trial em companies (não altera os dados das empresas)
CALL AddColumnIfNotExists('companies', 'access_grant_type', "VARCHAR(50) NOT NULL DEFAULT 'bronze'");
CALL AddColumnIfNotExists('companies', 'trial_ends_at', 'DATETIME NULL');

-- Colunas de versionamento em subscriptions (preserva contratações históricas)
CALL AddColumnIfNotExists('subscriptions', 'plan_version', 'INT NOT NULL DEFAULT 1');
CALL AddColumnIfNotExists('subscriptions', 'contracted_price', 'DECIMAL(10,2) NULL');

DROP PROCEDURE IF EXISTS AddColumnIfNotExists;

-- 2. Atualização / Carga dos Planos Canônicos Versionados (Versão 1)
-- Bronze gratuito: 3 fotos, métricas essenciais, CRM, sem destaque na home e sem novos produtos ou promoções publicáveis.
INSERT INTO plans (
    id, name, price, billing_cycle, version, max_gallery_photos, max_products, max_coupons,
    has_home_highlight, has_crm, has_full_presentation, has_analytics, is_active, features
) VALUES (
    'plan_bronze',
    'bronze',
    0.00,
    'monthly',
    1,
    3,
    0,
    0,
    0,
    1,
    0,
    1,
    1,
    JSON_ARRAY('Perfil básico', '3 fotos na galeria', 'CRM de leads', 'Métricas essenciais', 'Listagem no diretório')
) ON DUPLICATE KEY UPDATE
    price = VALUES(price),
    version = VALUES(version),
    max_gallery_photos = VALUES(max_gallery_photos),
    max_products = VALUES(max_products),
    max_coupons = VALUES(max_coupons),
    has_home_highlight = VALUES(has_home_highlight),
    has_crm = VALUES(has_crm),
    has_full_presentation = VALUES(has_full_presentation),
    has_analytics = VALUES(has_analytics),
    features = VALUES(features);

-- Gold VIP R$ 49,90/mês: 15 fotos, 5 produtos/serviços, uma promoção, apresentação completa e destaque rotativo.
INSERT INTO plans (
    id, name, price, billing_cycle, version, max_gallery_photos, max_products, max_coupons,
    has_home_highlight, has_crm, has_full_presentation, has_analytics, is_active, features
) VALUES (
    'plan_gold_vip',
    'gold_vip',
    49.90,
    'monthly',
    1,
    15,
    5,
    1,
    1,
    1,
    1,
    1,
    1,
    JSON_ARRAY('Apresentação completa', '15 fotos na galeria', '5 produtos ou serviços', '1 promoção/cupom', 'Destaque rotativo na Home', 'Selo VIP', 'CRM de leads', 'Métricas de desempenho')
) ON DUPLICATE KEY UPDATE
    price = VALUES(price),
    version = VALUES(version),
    max_gallery_photos = VALUES(max_gallery_photos),
    max_products = VALUES(max_products),
    max_coupons = VALUES(max_coupons),
    has_home_highlight = VALUES(has_home_highlight),
    has_crm = VALUES(has_crm),
    has_full_presentation = VALUES(has_full_presentation),
    has_analytics = VALUES(has_analytics),
    features = VALUES(features);

-- Diamond R$ 99,90/mês: 30 fotos, 30 produtos/serviços e três promoções, incluindo os recursos Gold.
INSERT INTO plans (
    id, name, price, billing_cycle, version, max_gallery_photos, max_products, max_coupons,
    has_home_highlight, has_crm, has_full_presentation, has_analytics, is_active, features
) VALUES (
    'plan_diamond_extremo',
    'diamond_extremo',
    99.90,
    'monthly',
    1,
    30,
    30,
    3,
    1,
    1,
    1,
    1,
    1,
    JSON_ARRAY('Todos os recursos Gold', '30 fotos na galeria', '30 produtos ou serviços', '3 promoções/cupons simultâneos', 'Topo das buscas', 'Destaque Diamante prioritário', 'CRM avançado', 'Mini-site exclusivo')
) ON DUPLICATE KEY UPDATE
    price = VALUES(price),
    version = VALUES(version),
    max_gallery_photos = VALUES(max_gallery_photos),
    max_products = VALUES(max_products),
    max_coupons = VALUES(max_coupons),
    has_home_highlight = VALUES(has_home_highlight),
    has_crm = VALUES(has_crm),
    has_full_presentation = VALUES(has_full_presentation),
    has_analytics = VALUES(has_analytics),
    features = VALUES(features);

-- FIM DA MIGRATION
