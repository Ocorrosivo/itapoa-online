-- MariaDB additive migration; apply separately after backup, never during deploy.
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS instagram VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS facebook VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS tiktok VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS website VARCHAR(500) NULL;
