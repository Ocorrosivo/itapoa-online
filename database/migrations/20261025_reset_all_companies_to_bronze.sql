-- Migração: Garantir que todas as empresas cadastradas fiquem no plano gratuito (Bronze) sem distinção
-- Executada para unificar todos os cadastros no plano gratuito padrão do portal

UPDATE companies
SET planLevel = 'bronze',
    access_grant_type = 'bronze',
    isSponsored = 0;
