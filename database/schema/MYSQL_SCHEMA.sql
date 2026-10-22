-- ==============================================================================
-- 🚀 PROJETO: GUIA COMERCIAL ITAPOÁ ONLINE
-- 🗄️ MYSQL SCHEMA COMPLETO (Definitivo)
-- ==============================================================================
-- Este arquivo representa o dump DDL (Data Definition Language) de toda a modelagem
-- estrutural, contendo +30 tabelas. Projetado nativamente para MySQL / MariaDB.
-- Evita PostgreSQL specific commands (como UUID, JSONB) utilizando VARCHAR(255)
-- para IDs universais e campos text/json.
-- ==============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ==========================================
-- 1. ESTRUTURA CORE (Endereçamento e Permissões)
-- ==========================================

CREATE TABLE IF NOT EXISTS cities (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    state VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS districts (
    id VARCHAR(255) PRIMARY KEY,
    city_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    icon VARCHAR(100),
    description TEXT,
    parent_id VARCHAR(255) NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(100) PRIMARY KEY, -- ex: 'admin_master', 'advertiser', 'user'
    name VARCHAR(255) NOT NULL,
    description TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS permissions (
    id VARCHAR(255) PRIMARY KEY,
    role_id VARCHAR(100) NOT NULL,
    module VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL, -- 'read', 'write', 'delete'
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 2. USUÁRIOS E EMPRESAS (Multitenancy Básico)
-- ==========================================

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    role VARCHAR(100) DEFAULT 'user',
    phone VARCHAR(50),
    city VARCHAR(255),
    avatarUrl VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role) REFERENCES roles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional recovery feature, installed explicitly on existing databases.
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    user_id VARCHAR(255) PRIMARY KEY,
    token_hash CHAR(64) NOT NULL UNIQUE,
    password_fingerprint CHAR(64) NOT NULL,
    expires_at DATETIME(3) NOT NULL,
    created_at DATETIME(3) NOT NULL,
    used_at DATETIME(3) NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_auth_state (
    user_id VARCHAR(255) PRIMARY KEY,
    version INT UNSIGNED NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS companies (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    logo VARCHAR(255),
    coverImage VARCHAR(255),
    categoryId VARCHAR(255),
    cityId VARCHAR(255),
    description TEXT,
    detailedDescription TEXT,
    rating DECIMAL(3,2) DEFAULT 5.00,
    reviewCount INT DEFAULT 0,
    phone VARCHAR(50),
    whatsapp VARCHAR(50),
    address VARCHAR(255),
    hours TEXT,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    isSponsored TINYINT(1) DEFAULT 0,
    planLevel VARCHAR(50) DEFAULT 'bronze',
    features JSON, -- Armazena array de features
    views INT DEFAULT 0,
    clicksWhatsapp INT DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (cityId) REFERENCES cities(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabela associativa Users <-> Companies (Multitenancy / Dono da Empresa)
CREATE TABLE IF NOT EXISTS companies_users (
    user_id VARCHAR(255) NOT NULL,
    company_id VARCHAR(255) NOT NULL,
    access_level VARCHAR(50) DEFAULT 'owner',
    PRIMARY KEY (user_id, company_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ==========================================
-- 3. MÓDULOS DE NEGÓCIOS (Ofertas, Vagas, Avaliações)
-- ==========================================

CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(255) PRIMARY KEY,
    company_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2),
    image VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS services (
    id VARCHAR(255) PRIMARY KEY,
    company_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS coupons (
    id VARCHAR(255) PRIMARY KEY,
    companyId VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    discountValue DECIMAL(10,2),
    discountType VARCHAR(50),
    code VARCHAR(50),
    expirationDate DATETIME,
    isActive TINYINT(1) DEFAULT 1,
    totalLimit INT,
    usedCount INT DEFAULT 0,
    rules TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS promotions (
    id VARCHAR(255) PRIMARY KEY,
    company_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    discount_percentage INT,
    start_date DATETIME,
    end_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reviews (
    id VARCHAR(255) PRIMARY KEY,
    entityId VARCHAR(255) NOT NULL, -- Pode ser company_id, professional_id, etc.
    entityType VARCHAR(50) NOT NULL, -- 'company', 'professional', 'product'
    userId VARCHAR(255),
    userName VARCHAR(255),
    userAvatar VARCHAR(255),
    rating DECIMAL(2,1) NOT NULL,
    comment TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_entity (entityId, entityType)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS jobs (
    id VARCHAR(255) PRIMARY KEY,
    companyId VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    requirements TEXT,
    salary DECIMAL(10,2),
    type VARCHAR(50), -- 'CLT', 'PJ', 'Estágio'
    isActive TINYINT(1) DEFAULT 1,
    applicationsCount INT DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS job_applications (
    id VARCHAR(255) PRIMARY KEY,
    jobId VARCHAR(255) NOT NULL,
    userId VARCHAR(255), -- Pode ser null se aplicado sem login
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    coverLetter TEXT,
    resumeUrl VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (jobId) REFERENCES jobs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 4. PROFISSIONAIS (Autônomos e Portfólio)
-- ==========================================

CREATE TABLE IF NOT EXISTS professionals (
    id VARCHAR(255) PRIMARY KEY,
    userId VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(255),
    bio TEXT,
    avatar VARCHAR(255),
    categoryId VARCHAR(255),
    cityId VARCHAR(255),
    rating DECIMAL(3,2) DEFAULT 5.0,
    views INT DEFAULT 0,
    contactPhone VARCHAR(50),
    contactEmail VARCHAR(255),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL,
    FOREIGN KEY (cityId) REFERENCES cities(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS portfolio_items (
    id VARCHAR(255) PRIMARY KEY,
    professional_id VARCHAR(255) NOT NULL,
    title VARCHAR(255),
    description TEXT,
    image_url VARCHAR(255),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (professional_id) REFERENCES professionals(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 5. CONTEÚDO (Blog, Turismo, Eventos)
-- ==========================================

CREATE TABLE IF NOT EXISTS blog_posts (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    content TEXT,
    excerpt TEXT,
    coverImage VARCHAR(255),
    authorId VARCHAR(255),
    categoryId VARCHAR(255),
    views INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'published',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (authorId) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS blog_comments (
    id VARCHAR(255) PRIMARY KEY,
    postId VARCHAR(255) NOT NULL,
    userId VARCHAR(255),
    userName VARCHAR(255) NOT NULL,
    comment TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (postId) REFERENCES blog_posts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS events (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    date DATETIME,
    location VARCHAR(255),
    coverImage VARCHAR(255),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tourism_places (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    location VARCHAR(255),
    coverImage VARCHAR(255),
    rating DECIMAL(3,2) DEFAULT 5.0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS route_guides (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration VARCHAR(50),
    distance VARCHAR(50),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS route_guide_steps (
    id VARCHAR(255) PRIMARY KEY,
    route_guide_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    stop_order INT NOT NULL,
    FOREIGN KEY (route_guide_id) REFERENCES route_guides(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS solidarity_campaigns (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    goalAmount DECIMAL(10,2),
    raisedAmount DECIMAL(10,2) DEFAULT 0,
    organizer VARCHAR(255),
    endDate DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS campaign_comments (
    id VARCHAR(255) PRIMARY KEY,
    campaignId VARCHAR(255) NOT NULL,
    userName VARCHAR(255) NOT NULL,
    comment TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaignId) REFERENCES solidarity_campaigns(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 6. FATURAMENTO E FINANCEIRO
-- ==========================================

CREATE TABLE IF NOT EXISTS plans (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL, -- bronze, silver, gold_vip, diamond_extremo
    price DECIMAL(10,2) NOT NULL,
    billing_cycle VARCHAR(50) DEFAULT 'monthly',
    features JSON
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subscriptions (
    id VARCHAR(255) PRIMARY KEY,
    userId VARCHAR(255) NOT NULL,
    companyId VARCHAR(255) NOT NULL,
    planId VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active', -- active, past_due, canceled
    amount DECIMAL(10,2),
    paymentMethod VARCHAR(50), -- pix, credit_card
    nextBillingDate DATETIME,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (planId) REFERENCES plans(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payment_logs (
    id VARCHAR(255) PRIMARY KEY,
    subscriptionId VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50), -- paid, failed, pending
    gateway_reference VARCHAR(255), -- Mercado Pago ID
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_gateway_reference (gateway_reference),
    FOREIGN KEY (subscriptionId) REFERENCES subscriptions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 7. SUPORTE, CRM E UTILITÁRIOS
-- ==========================================

CREATE TABLE IF NOT EXISTS crm_leads (
    id VARCHAR(255) PRIMARY KEY,
    company_id VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    source VARCHAR(100), -- 'whatsapp_click', 'form'
    status VARCHAR(50) DEFAULT 'new',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS support_tickets (
    id VARCHAR(255) PRIMARY KEY,
    userId VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'open',
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS media_items (
    id VARCHAR(255) PRIMARY KEY,
    url VARCHAR(255) NOT NULL,
    entityId VARCHAR(255),
    entityType VARCHAR(50), -- 'company', 'blog'
    fileType VARCHAR(50), -- 'image/png'
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_media_entity (entityId, entityType)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS faq_items (
    id VARCHAR(255) PRIMARY KEY,
    entityId VARCHAR(255), -- Pode ser uma empresa
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================
-- 8. CONFIGURAÇÕES E AUDITORIA DO SISTEMA
-- ==========================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId VARCHAR(255),
    userName VARCHAR(255),
    userEmail VARCHAR(255),
    action VARCHAR(255) NOT NULL,
    details TEXT,
    ip VARCHAR(50),
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS seo_settings (
    id VARCHAR(255) PRIMARY KEY,
    page VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255),
    description TEXT,
    keywords TEXT,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS general_config (
    id VARCHAR(255) PRIMARY KEY,
    platformName VARCHAR(255),
    tagline VARCHAR(255),
    logoMain VARCHAR(255),
    colorPrimary VARCHAR(50),
    phone VARCHAR(50),
    whatsapp VARCHAR(50),
    emailSupport VARCHAR(255),
    facebook VARCHAR(255),
    instagram VARCHAR(255),
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payment_config (
    id VARCHAR(255) PRIMARY KEY,
    gateway VARCHAR(100) DEFAULT 'mercadopago',
    publicKey VARCHAR(255),
    accessToken VARCHAR(255),
    webhookUrl VARCHAR(255),
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(255) PRIMARY KEY,
    userId VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    isRead TINYINT(1) DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verified payment state: explicit migration required on existing installations.
CREATE TABLE IF NOT EXISTS gateway_payment_state (
    payment_id VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    subscription_id VARCHAR(255) NOT NULL,
    company_id VARCHAR(255) NOT NULL,
    remote_status VARCHAR(32) NOT NULL,
    remote_updated_at DATETIME(3) NOT NULL,
    activated_at DATETIME(3) NULL,
    expires_at DATETIME(3) NULL,
    UNIQUE KEY uniq_settlement_subscription (subscription_id),
    INDEX idx_settlement_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
-- FIM DO DUMP DDL
