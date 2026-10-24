-- ============================================================
-- MIGRATION: 20261024_company_contact_links.sql
-- Objetivo: Persistir links de contato da empresa (Instagram,
--           Facebook, WhatsApp já existente, site) na própria
--           tabela companies. Idempotente e não destrutiva.
--           Complementa campos que a UI já coleta mas que
--           ainda não possuem coluna no MYSQL_SCHEMA.
-- NÃO DESTRUTIVA: ADD COLUMN IF NOT EXISTS apenas.
-- ============================================================

SET NAMES utf8mb4;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS instagram VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS facebook  VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS website   VARCHAR(512) NULL;
