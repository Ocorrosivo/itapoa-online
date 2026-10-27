-- Migração aditiva para registro isolado de pagamentos de teste (Mercado Pago)
-- Permite validar PIX (R$ 1,00) e Cartão (R$ 2,50) sem afetar assinaturas comerciais VIP

CREATE TABLE IF NOT EXISTS test_payments (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    company_id VARCHAR(255) NULL,
    payment_method VARCHAR(50) NOT NULL, -- 'pix', 'credit_card', 'debit_card'
    amount DECIMAL(10,2) NOT NULL,       -- estritamente 1.00 ou 2.50
    environment VARCHAR(20) NOT NULL DEFAULT 'sandbox', -- 'sandbox' ou 'production'
    status VARCHAR(50) NOT NULL DEFAULT 'pending',     -- 'pending', 'approved', 'rejected', 'cancelled'
    gateway_reference VARCHAR(255) NULL, -- ID retornado pelo Mercado Pago
    qr_code TEXT NULL,                   -- Código Copia e Cola do PIX
    qr_code_base64 LONGTEXT NULL,        -- Imagem do QR Code Base64
    payer_email VARCHAR(255) NULL,
    card_last_four VARCHAR(4) NULL,
    card_brand VARCHAR(50) NULL,
    error_message TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_test_pay_user (user_id),
    INDEX idx_test_pay_env (environment),
    INDEX idx_test_pay_status (status),
    INDEX idx_test_pay_gateway (gateway_reference)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
