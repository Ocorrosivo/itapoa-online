-- ============================================================
-- MIGRATION: 20261022_webhook_events_and_orphan_media.sql
-- Objetivo: fila persistente de webhooks Mercado Pago + vinculo
--           de media orfa a empresa existente (sem DROP/TRUNCATE).
-- NÃO DESTRUTIVA: idempotente (IF NOT EXISTS / AddColumnIfNotExists).
-- ============================================================

SET NAMES utf8mb4;

-- 1) Fila persistente de webhooks: cada POST /api/webhooks/mercadopago
--    assinado e aceito é registrado aqui ANTES do processamento.
--    Status: pending -> processing -> done | failed (retentável).
--    Reentrega (Mercado Pago retries) é deduplicada por (gateway_event_id).
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
    UNIQUE KEY uniq_gateway_event (gateway, gateway_event_id),
    INDEX idx_webhook_status_created (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) Garantir vinculo de media_items orfa: quando um upload foi feito
--    antes da correção de escopo (entityId NULL), ele fica em 'platform'
--    e não aparece em /companies/:id/media. Script posterior pode migrar
--    com UPDATE ... WHERE entityType='platform' após validação manual.
--    Nenhum dado é movido automaticamente aqui — apenas garante tabela.

-- 3) Índice para auditoria de uploads por empresa (já existe idx_media_entity,
--    apenas documentado aqui para rastreabilidade).
-- idx_media_entity (entityId, entityType) já cobre GET /companies/:id/media.
