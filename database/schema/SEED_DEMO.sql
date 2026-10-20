-- ============================================================
-- SEED_DEMO — Guia Comercial Itapoá (catálogo demo)
-- ============================================================
-- Importe DEPOIS de MYSQL_SCHEMA.sql e SEED.sql:
--   mysql < database/schema/MYSQL_SCHEMA.sql
--   mysql < database/schema/SEED.sql
--   mysql < database/schema/SEED_DEMO.sql
--
-- Reimportável: todos os INSERTs usam ON DUPLICATE KEY UPDATE.
-- Cobre os termos de busca da home: "Mercado, Pousada,
-- Hambúrguer, Itapema, Lava Rápido" + bairros reais.
-- ============================================================

SET NAMES utf8mb4;
START TRANSACTION;

-- ------------------------------------------------------------
-- CITIES
-- ------------------------------------------------------------
INSERT INTO cities (id, name, state) VALUES
  ('city_itapoa',      'Itapoá',      'SC'),
  ('city_joinville',   'Joinville',   'SC'),
  ('city_curitiba',    'Curitiba',    'PR'),
  ('city_florianopolis','Florianópolis','SC')
ON DUPLICATE KEY UPDATE name = VALUES(name), state = VALUES(state);

-- ------------------------------------------------------------
-- DISTRICTS (bairros) — 21 bairros reais de src/constants/itapoaData.ts
-- ------------------------------------------------------------
INSERT INTO districts (id, city_id, name) VALUES
  ('b_1',  'city_itapoa', 'Barra do Saí'),
  ('b_2',  'city_itapoa', 'Rainha'),
  ('b_3',  'city_itapoa', 'Cambiju'),
  ('b_4',  'city_itapoa', 'Itapema do Norte'),
  ('b_5',  'city_itapoa', 'Samambaial'),
  ('b_6',  'city_itapoa', 'São José'),
  ('b_7',  'city_itapoa', 'Maresia'),
  ('b_8',  'city_itapoa', 'Centro'),
  ('b_9',  'city_itapoa', 'Continental'),
  ('b_10', 'city_itapoa', 'Bamerindus'),
  ('b_11', 'city_itapoa', 'Pontal do Norte'),
  ('b_12', 'city_itapoa', 'Figueira do Pontal'),
  ('b_13', 'city_itapoa', 'Jaguaruna'),
  ('b_14', 'city_itapoa', 'Entre-Rios'),
  ('b_15', 'city_itapoa', 'Saí Guaçu'),
  ('b_16', 'city_itapoa', 'Volta Velha'),
  ('b_17', 'city_itapoa', 'Gleba I'),
  ('b_18', 'city_itapoa', 'Gleba II'),
  ('b_19', 'city_itapoa', 'Palmeiras'),
  ('b_20', 'city_itapoa', 'Bom Retiro'),
  ('b_21', 'city_itapoa', 'Princesa do Mar')
ON DUPLICATE KEY UPDATE name = VALUES(name), city_id = VALUES(city_id);

-- ------------------------------------------------------------
-- CATEGORIES — 10 segmentos base
-- ------------------------------------------------------------
INSERT INTO categories (id, name, slug, icon, description) VALUES
  ('cat_gastronomia', 'Gastronomia',        'gastronomia', 'Utensils',      'Restaurantes, lanchonetes, hamburguerias e bares'),
  ('cat_hospedagem',  'Hospedagem',         'hospedagem',  'Hotel',         'Pousadas, hotéis e temporada'),
  ('cat_saude',       'Saúde & Bem-estar',  'saude',       'HeartPulse',    'Clínicas, farmácias e cuidados'),
  ('cat_comercio',    'Comércio',           'comercio',    'ShoppingBag',   'Mercados, lojas e varejo'),
  ('cat_servicos',    'Serviços',           'servicos',    'Briefcase',     'Serviços gerais e profissionais'),
  ('cat_beleza',      'Beleza & Estética',  'beleza',      'Sparkles',      'Salões, estética e barbearias'),
  ('cat_construcao',  'Construção',         'construcao',  'Hammer',        'Materiais, obras e reformas'),
  ('cat_automotivo',  'Automotivo',         'automotivo',  'Car',           'Oficinas, lava rápido e autopeças'),
  ('cat_turismo',     'Turismo & Lazer',    'turismo',     'Compass',       'Passeios, praias e ecoturismo'),
  ('cat_educacao',    'Educação',           'educacao',    'GraduationCap', 'Escolas, cursos e reforço')
ON DUPLICATE KEY UPDATE name = VALUES(name), slug = VALUES(slug), icon = VALUES(icon), description = VALUES(description);

-- ------------------------------------------------------------
-- COMPANIES — 16 empresas demo (cobrindo todos os termos de busca)
-- As 8 primeiras são as do vitrine HomeSection; as demais cobrem
-- "Mercado, Pousada, Hambúrguer, Lava Rápido, Itapema, Clínica"
-- ------------------------------------------------------------
INSERT INTO companies (id, name, slug, logo, coverImage, categoryId, cityId, description, detailedDescription, rating, reviewCount, phone, whatsapp, address, hours, latitude, longitude, isSponsored, planLevel, features, views, clicksWhatsapp) VALUES
-- 1 - Love Baby's (Saúde)
('comp_love_babys', 'Hotel Infantil Love Baby''s', 'hotel-infantil-love-babys',
 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&w=400&q=80',
 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&w=800&q=80',
 'cat_saude', 'city_itapoa',
 'Amor e segurança para seu bem mais precioso! Cuidado infantil e estimulação precoce com períodos flexíveis.',
 'Serviço altamente qualificado com pedagogos diplomados. Atividades artísticas, pedagógicas e recreação integrada no litoral de Itapoá.',
 4.9, 38, '(47) 99665-1227', '5547996651227', 'Rua João Horácio Vieira, 1200 - Itapema do Norte, Itapoá - SC', 'Seg-Sex 07:00-19:00', -26.1185, -48.6135, 1, 'diamond_extremo', JSON_ARRAY('Berçário', 'Integral', 'Pedagogia'), 420, 56),

-- 2 - Caminho de Luz (Serviços)
('comp_caminho_luz', 'Caminho de Luz', 'caminho-de-luz-itapoa',
 'https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=400&q=80',
 'https://images.unsplash.com/photo-1519817650390-64a93db51149?auto=format&fit=crop&w=800&q=80',
 'cat_servicos', 'city_itapoa',
 'Palestra pública semanal e apoio fraterno. Espaço de estudo e reflexão espiritual.',
 'Encontros todas as quartas às 19:30 com palestras de voluntários. Inspirado em "Bem-aventurados os misericordiosos".',
 5.0, 22, '(47) 99719-0413', '5547997190413', 'Rua Mariana Michels Borges, 280 - Centro, Itapoá - SC', 'Qua 19:30-21:00', -26.1150, -48.6100, 0, 'bronze', JSON_ARRAY('Palestras', 'Apoio fraterno'), 180, 12),

-- 3 - Válore (Turismo/Eventos) - Comércio
('comp_valore', 'Válore Shopping & Formatura', 'valore-shopping-itapoa',
 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=400&q=80',
 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80',
 'cat_comercio', 'city_itapoa',
 'A infraestrutura dos seus sonhos para eventos marcantes. Salão nobre para casamentos e formaturas.',
 'Capacidade 150 a 1.000 pessoas, acústica premium, ar central, camarins e área gastronômica com buffets parceiros.',
 4.8, 44, '(47) 3443-1200', '5547997190413', 'Av. Beira Mar, 1500 - Itapema do Norte, Itapoá - SC', 'Seg-Sex 09:00-18:00', -26.1170, -48.6120, 1, 'gold_vip', JSON_ARRAY('Eventos', 'Formaturas', 'Buffet'), 310, 29),

-- 4 - Centro Desenvolvimento Humano (Serviços)
('comp_cdh', 'Centro de Desenvolvimento Humano', 'centro-desenvolvimento-humano-itapoa',
 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=400&q=80',
 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80',
 'cat_servicos', 'city_itapoa',
 'Constelação sistêmica e mentoria executiva com Sheila Miglioli. Treinamentos corporativos.',
 'Terapia sistêmica familiar, oratória para executivos e desbloqueios emocionais com foco em alta performance.',
 4.9, 31, '(47) 98906-6501', '5541989066501', 'Rua André Rodrigues de Freitas, 410 - Centro, Itapoá - SC', 'Seg-Sex 08:00-18:00', -26.1140, -48.6110, 1, 'gold_vip', JSON_ARRAY('Constelação', 'Mentoria', 'Oratória'), 260, 34),

-- 5 - AgroTudo (Comércio)
('comp_agrotudo', 'Agropecuária AgroTudo D''Horta', 'agropecuaria-agrotudo-dhorta',
 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=400&q=80',
 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=800&q=80',
 'cat_comercio', 'city_itapoa',
 'Tudo para seu pet, sua horta e seu jardim. Rações premium e mudas saudáveis.',
 'Av. João Horácio Vieira, 3336 - Caminho da Onça. Adubos orgânicos, defensivos e orientações de cultivo local.',
 4.7, 52, '(47) 99115-9797', '5547991159797', 'Av. João Horácio Vieira, 3336 - Samambaial, Itapoá - SC', 'Seg-Sab 08:00-18:00', -26.1200, -48.6150, 0, 'bronze', JSON_ARRAY('Pet Care', 'Mudas', 'Rações'), 190, 18),

-- 6 - Casa Temporada (Hospedagem)
('comp_casa_temp', 'Casa Temporada e Eventos', 'casa-temporada-eventos-itapoa',
 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=80',
 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
 'cat_hospedagem', 'city_itapoa',
 'Sua estadia aconchegante com privacidade garantida. Casa mobiliada a metros do balneário.',
 'Com cozinha equipada, Wi-Fi veloz, churrasqueira e área de lazer. Ideal para famílias grandes.',
 4.8, 27, '(47) 99719-0413', '5547997190413', 'Rua das Palmeiras, 88 - Barra do Saí, Itapoá - SC', 'Diária', -26.1050, -48.6200, 1, 'diamond_extremo', JSON_ARRAY('Wi-Fi', 'Churrasqueira', '3 quartos'), 350, 41),

-- 7 - Viva Capoeira (Saúde)
('comp_viva_cap', 'Projeto Viva Capoeira', 'projeto-viva-capoeira',
 'https://images.unsplash.com/photo-1510531704581-5b2870972060?auto=format&fit=crop&w=400&q=80',
 'https://images.unsplash.com/photo-1510531704581-5b2870972060?auto=format&fit=crop&w=800&q=80',
 'cat_saude', 'city_itapoa',
 'Cultura, esporte e socialização comunitária. Aulas de capoeira para crianças e adolescentes.',
 'Projeto comunitário de cidadania via musicalidade do berimbau, expressão corporal e disciplina.',
 5.0, 19, '(47) 99719-0413', '5547997190413', 'Ginásio Municipal - Centro, Itapoá - SC', 'Ter/Qui 18:00-20:00', -26.1160, -48.6095, 0, 'bronze', JSON_ARRAY('Capoeira', 'Cultura'), 95, 7),

-- 8 - AMA (Saúde)
('comp_ama', 'AMA Itapoá SC - Associação Autista', 'ama-itapoasc-associacao-autista',
 'https://images.unsplash.com/photo-1508962914676-134849a727f0?auto=format&fit=crop&w=400&q=80',
 'https://images.unsplash.com/photo-1508962914676-134849a727f0?auto=format&fit=crop&w=800&q=80',
 'cat_saude', 'city_itapoa',
 'Sensibilizando o comércio e acolhendo famílias. Defesa de direitos no espectro autista.',
 'Apoiadora da barraca "Todo Mundo Ama" nas festas municipais. Doações para atendimento especializado.',
 5.0, 30, '(47) 99719-0413', '5547997190413', 'Rua Mariana Michels Borges, 100 - Centro, Itapoá - SC', 'Seg-Sex 08:00-17:00', -26.1155, -48.6105, 0, 'bronze', JSON_ARRAY('Acolhimento', 'Palestras'), 140, 9),

-- 9 - Mercado Central (Comércio) — cobre "Mercado"
('comp_mercado_central', 'Mercado Central Itapoá', 'mercado-central-itapoa',
 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80',
 'cat_comercio', 'city_itapoa',
 'Mercado completo no coração de Itapema do Norte. Açougue, padaria e hortifruti todos os dias.',
 'Entrega em domicílio, açougue com cortes nobres, padaria própria e estacionamento.',
 4.6, 61, '(47) 3443-2000', '554734432000', 'Av. Ana Maria Rodrigues de Freitas, 800 - Itapema do Norte, Itapoá - SC', 'Seg-Dom 07:00-21:00', -26.1180, -48.6125, 1, 'gold_vip', JSON_ARRAY('Açougue', 'Padaria', 'Entrega'), 480, 62),

-- 10 - Pousada Itapema (Hospedagem) — cobre "Pousada" + "Itapema"
('comp_pousada_itapema', 'Pousada Beira Mar Itapema', 'pousada-beira-mar-itapema',
 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80',
 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
 'cat_hospedagem', 'city_itapoa',
 'Pousada pé na areia em Itapema do Norte. Café da manhã incluso e vista mar.',
 'Suítes com ar, frigobar e varanda. A 30m da 1ª Pedra. Aceita pet de pequeno porte.',
 4.7, 47, '(47) 3443-2100', '554734432100', 'Av. Beira Mar, 620 - Itapema do Norte, Itapoá - SC', 'Diária', -26.1190, -48.6130, 1, 'diamond_extremo', JSON_ARRAY('Café incluso', 'Vista mar', 'Pet friendly'), 390, 48),

-- 11 - Hamburgueria (Gastronomia) — cobre "Hambúrguer"
('comp_burger_itapema', 'Hamburgueria Itapema Burger', 'hamburgueria-itapema-burger',
 'https://images.unsplash.com/photo-1568909344668-6f14a07b56a0?auto=format&fit=crop&w=400&q=80',
 'https://images.unsplash.com/photo-1568909344668-6f14a07b56a0?auto=format&fit=crop&w=800&q=80',
 'cat_gastronomia', 'city_itapoa',
 'Hambúrguer artesanal, porções e milk-shake. Delivery até 23h em Itapema e Centro.',
 'Blend angus 180g, pão brioche da casa e maionese artesanal. Combo família e promoções no WhatsApp.',
 4.8, 73, '(47) 99120-3344', '5547991203344', 'Rua Francisco Quintino, 210 - Itapema do Norte, Itapoá - SC', 'Ter-Dom 18:00-23:00', -26.1175, -48.6115, 1, 'gold_vip', JSON_ARRAY('Delivery', 'Artesanal', 'Porções'), 520, 88),

-- 12 - Lava Rápido (Automotivo) — cobre "Lava Rápido"
('comp_lava_itapema', 'Lava Rápido Itapema Brilho', 'lava-rapido-itapema-brilho',
 'https://images.unsplash.com/photo-1603386329225-868f9b1ee6c9?auto=format&fit=crop&w=400&q=80',
 'https://images.unsplash.com/photo-1603386329225-868f9b1ee6c9?auto=format&fit=crop&w=800&q=80',
 'cat_automotivo', 'city_itapoa',
 'Lava rápido, polimento e higienização automotiva. Atendimento sem agendamento em Itapema.',
 'Lavagem completa, cera, aspiração e pretinho. Polimento e vitrificação com agendamento.',
 4.5, 36, '(47) 99230-5566', '5547992305566', 'Rua André Rodrigues de Freitas, 900 - Itapema do Norte, Itapoá - SC', 'Seg-Sab 08:00-18:00', -26.1188, -48.6128, 0, 'bronze', JSON_ARRAY('Lavagem', 'Polimento', 'Higienização'), 160, 21),

-- 13 - Clínica (Saúde) — cobre "Clínica"
('comp_clinica', 'Clínica Saúde Itapoá', 'clinica-saude-itapoa',
 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=400&q=80',
 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80',
 'cat_saude', 'city_itapoa',
 'Clínica médica e odontológica no Centro. Consultas, exames e convênios.',
 'Clínico geral, pediatria, ginecologia e odontologia. Exames laboratoriais parceiros.',
 4.6, 28, '(47) 3443-3000', '554734433000', 'Rua Mariana Michels Borges, 450 - Centro, Itapoá - SC', 'Seg-Sex 08:00-18:00', -26.1152, -48.6108, 0, 'bronze', JSON_ARRAY('Consultas', 'Exames', 'Convênios'), 150, 14),

-- 14 - Restaurante Sabor do Mar (Gastronomia)
('comp_sabor_mar', 'Restaurante Sabor do Mar', 'restaurante-sabor-do-mar',
 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=400&q=80',
 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80',
 'cat_gastronomia', 'city_itapoa',
 'Frutos do mar frescos e moqueca premiada. Vista para a Baía de Babitonga no Pontal.',
 'Sequência de camarão, peixe na brasa e caipirinhas. Ambiente familiar com deck ao entardecer.',
 4.9, 55, '(47) 3443-4000', '554734434000', 'Rua da Baía, 120 - Pontal do Norte, Itapoá - SC', 'Seg-Dom 11:00-22:00', -26.1300, -48.6050, 1, 'diamond_extremo', JSON_ARRAY('Frutos do mar', 'Deck', 'Vista baía'), 410, 39),

-- 15 - Salão (Beleza)
('comp_salao', 'Studio Beleza Itapema', 'studio-beleza-itapema',
 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=400&q=80',
 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80',
 'cat_beleza', 'city_itapoa',
 'Salão e barbearia em Itapema do Norte. Cortes, coloração e estética com hora marcada.',
 'Progressiva, mechas, manicure e design de sobrancelhas. Pacotes noiva e formatura.',
 4.7, 33, '(47) 99140-7788', '5547991407788', 'Av. Ana Maria Rodrigues de Freitas, 300 - Itapema do Norte, Itapoá - SC', 'Ter-Sab 09:00-19:00', -26.1178, -48.6122, 0, 'bronze', JSON_ARRAY('Corte', 'Coloração', 'Manicure'), 110, 16),

-- 16 - Materiais de Construção (Construção)
('comp_construcao', 'Materiais de Construção Itapoá', 'materiais-construcao-itapoa',
 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=400&q=80',
 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80',
 'cat_construcao', 'city_itapoa',
 'Tudo para sua obra e reforma. Entrega rápida em todos os bairros de Itapoá.',
 'Cimento, areia, telhas, tintas e ferragens. Orçamento por WhatsApp e entrega no mesmo dia.',
 4.5, 24, '(47) 3443-5000', '554734435000', 'Av. João Horácio Vieira, 900 - Samambaial, Itapoá - SC', 'Seg-Sab 07:30-18:00', -26.1210, -48.6160, 0, 'bronze', JSON_ARRAY('Entrega', 'Orçamento', 'Materiais'), 130, 11)
ON DUPLICATE KEY UPDATE
  name = VALUES(name), slug = VALUES(slug), categoryId = VALUES(categoryId), cityId = VALUES(cityId),
  description = VALUES(description), detailedDescription = VALUES(detailedDescription),
  coverImage = VALUES(coverImage), logo = VALUES(logo), address = VALUES(address),
  latitude = VALUES(latitude), longitude = VALUES(longitude), planLevel = VALUES(planLevel),
  isSponsored = VALUES(isSponsored), features = VALUES(features);

-- ------------------------------------------------------------
-- PRODUCTS (exemplos para busca por produto)
-- ------------------------------------------------------------
INSERT INTO products (id, company_id, name, description, price, image) VALUES
  ('prod_1', 'comp_mercado_central', 'Picanha Angus 1kg', 'Corte nobre Angus, peça embalada a vácuo', 89.90, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80'),
  ('prod_2', 'comp_burger_itapema', 'Combo X-Tudo + Fritas', 'Hambúrguer artesanal 180g + fritas + refri lata', 32.90, 'https://images.unsplash.com/photo-1568909344668-6f14a07b56a0?auto=format&fit=crop&w=400&q=80'),
  ('prod_3', 'comp_agrotudo', 'Ração Premium 15kg', 'Ração cães adultos sabor carne', 129.90, 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?auto=format&fit=crop&w=400&q=80')
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), price = VALUES(price);

-- ------------------------------------------------------------
-- SERVICES (exemplos para busca por serviço)
-- ------------------------------------------------------------
INSERT INTO services (id, company_id, name, description, price) VALUES
  ('serv_1', 'comp_lava_itapema', 'Lavagem Completa', 'Lavagem externa, interna, aspiração e pretinho', 45.00),
  ('serv_2', 'comp_salao', 'Corte + Escova', 'Corte feminino com escova modelada', 65.00),
  ('serv_3', 'comp_clinica', 'Consulta Clínico Geral', 'Consulta com retorno em 15 dias', 120.00)
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), price = VALUES(price);

-- ------------------------------------------------------------
-- Vínculo de posse: vincula as empresas demo ao admin master
-- ------------------------------------------------------------
INSERT INTO companies_users (user_id, company_id, access_level)
SELECT u.id, c.id, 'owner'
FROM users u
CROSS JOIN companies c
WHERE u.email = 'admin@itapoa.online'
  AND c.id IN (
    'comp_love_babys', 'comp_caminho_luz', 'comp_valore', 'comp_cdh',
    'comp_agrotudo', 'comp_casa_temp', 'comp_viva_cap', 'comp_ama',
    'comp_mercado_central', 'comp_pousada_itapema', 'comp_burger_itapema',
    'comp_lava_itapema', 'comp_clinica', 'comp_sabor_mar', 'comp_salao', 'comp_construcao'
  )
ON DUPLICATE KEY UPDATE access_level = VALUES(access_level);

COMMIT;
