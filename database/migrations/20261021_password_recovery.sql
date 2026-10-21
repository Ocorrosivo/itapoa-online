-- Apply explicitly AFTER backup and authorization. Never run automatically on deploy.
-- Additive and repeatable; does not reset users, passwords or active sessions.
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
