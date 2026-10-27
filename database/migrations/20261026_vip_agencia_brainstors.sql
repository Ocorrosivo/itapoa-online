-- Migração: Concessão VIP e Atualização de Slug Amigável para Agencia Brainstors
-- ID da empresa: checkout_04d84ff3e123369772b49aa0

-- 1. Atualizar a empresa com slug amigável e plano Gold VIP patrocinado
UPDATE companies 
SET 
  slug = 'agencia-brainstors',
  planLevel = 'gold_vip',
  access_grant_type = 'admin_grant',
  isSponsored = 1
WHERE id = 'checkout_04d84ff3e123369772b49aa0' OR name LIKE '%Agencia Brainstors%';

-- 2. Registrar concessão administrativa para auditoria e histórico
INSERT INTO admin_plan_grants 
  (id, company_id, granted_plan, start_date, end_date, reason, status, granted_by_email, created_at)
SELECT 
  'grant_brainstors_vip',
  c.id,
  'gold_vip',
  NOW(),
  DATE_ADD(NOW(), INTERVAL 1 YEAR),
  'Concessão VIP solicitada pelo administrador master',
  'active',
  'admin@itapoa.online',
  NOW()
FROM companies c
WHERE c.id = 'checkout_04d84ff3e123369772b49aa0' OR c.name LIKE '%Agencia Brainstors%'
LIMIT 1
ON DUPLICATE KEY UPDATE status = 'active', end_date = DATE_ADD(NOW(), INTERVAL 1 YEAR);
