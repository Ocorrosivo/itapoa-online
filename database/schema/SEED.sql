-- ============================================================
-- SEED DATA — Guia Comercial Itapoá
-- ============================================================
-- Import this AFTER MYSQL_SCHEMA.sql. It is required, not optional:
--
--  * `users.role` has a FOREIGN KEY to `roles(id)`. Without the rows
--    below, EVERY registration fails with a foreign-key error.
--  * Without the admin_master account, nobody can log into the admin
--    panel — there is no self-service path to that role.
--  * The three plans match PLAN_WEIGHT in companyService.ts.
--
-- After first login, CHANGE the one-time admin password delivered separately.
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- --- Roles (referenced by users.role FK) ---
INSERT INTO roles (id, name, description) VALUES
  ('admin_master', 'Administrador Master', 'Acesso total à plataforma'),
  ('advertiser',   'Anunciante',           'Dono de empresa / lojista'),
  ('user',         'Usuário',              'Usuário comum do portal')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

-- --- Admin master account ---
-- One-time password hash (bcrypt, 12 rounds). The plaintext is never stored here.
INSERT INTO users (id, name, email, password, role, city) VALUES
  ('user_admin_master',
   'Administrador Itapoá',
   'admin@itapoa.online',
   '$2b$12$FFd7OE7WDTJklyKnJSdFputAQpTlBRBwRwjhWhRvvYH7u6IF9SthC',
   'admin_master',
   'Itapoá')
ON DUPLICATE KEY UPDATE
  role = VALUES(role),
  password = IF(
    password = '$2b$12$FFr9GAqTEHLg8GjtvYyzF.m89SlIbQOp3mfxEegAkd3VrwUtzlP02',
    VALUES(password),
    password
  );

-- --- Subscription plans (match PLAN_WEIGHT in companyService.ts) ---
INSERT INTO plans (id, name, price, billing_cycle, features) VALUES
  ('plan_bronze',          'bronze',          0.00,  'monthly',
   JSON_ARRAY('Perfil básico', 'Listagem no diretório')),
  ('plan_gold_vip',        'gold_vip',        49.90, 'monthly',
   JSON_ARRAY('Destaque na busca', 'Selo VIP', 'Galeria de fotos', 'Cupons')),
  ('plan_diamond_extremo', 'diamond_extremo', 99.90, 'monthly',
   JSON_ARRAY('Topo da busca', 'Selo Diamante', 'Mini-site completo', 'CRM de leads', 'Vagas de emprego'))
ON DUPLICATE KEY UPDATE price = VALUES(price), features = VALUES(features);

-- --- Payment gateway config (token stays empty; set it in the admin panel) ---
INSERT INTO payment_config (id, gateway, publicKey, accessToken, webhookUrl) VALUES
  ('payment', 'mercadopago', '', '', 'https://itapoa.online/api/webhooks/mercadopago')
ON DUPLICATE KEY UPDATE gateway = VALUES(gateway);

-- --- General platform config ---
INSERT INTO general_config (id, platformName, tagline, emailSupport) VALUES
  ('general', 'Itapoá Online', 'Guia Comercial e Marketplace de Itapoá', 'contato@itapoa.online')
ON DUPLICATE KEY UPDATE platformName = VALUES(platformName);

SET FOREIGN_KEY_CHECKS = 1;
