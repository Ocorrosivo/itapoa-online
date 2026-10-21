import { pool } from '../src/server/mysql.js';

async function migrate() {
  console.log('--- Verificando e aplicando migrações não-destrutivas ---');

  // 1. company_analytics_events
  await pool.query(`
    CREATE TABLE IF NOT EXISTS company_analytics_events (
      id VARCHAR(64) PRIMARY KEY,
      company_id VARCHAR(64) NOT NULL,
      event_type VARCHAR(32) NOT NULL,
      source VARCHAR(64) DEFAULT 'direct',
      device VARCHAR(32) DEFAULT 'mobile',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_cae_company_created (company_id, created_at),
      INDEX idx_cae_company_type_created (company_id, event_type, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('✓ Tabela company_analytics_events OK');

  // 2. user_email_verifications
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_email_verifications (
      user_id VARCHAR(255) PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      token_hash CHAR(64) NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      verified_at DATETIME NULL,
      INDEX idx_uev_token_hash (token_hash),
      INDEX idx_uev_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  console.log('✓ Tabela user_email_verifications OK');

  // 3. Checar colunas clicksPhone e clicksRoute em companies
  const [compCols]: any = await pool.query(`
    SELECT COLUMN_NAME FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'companies'
  `);
  const compColNames = new Set(compCols.map((c: any) => c.COLUMN_NAME));
  
  if (!compColNames.has('clicksPhone')) {
    await pool.query('ALTER TABLE companies ADD COLUMN clicksPhone INT NOT NULL DEFAULT 0');
    console.log('✓ Adicionada coluna companies.clicksPhone');
  } else {
    console.log('✓ Coluna companies.clicksPhone já existe');
  }

  if (!compColNames.has('clicksRoute')) {
    await pool.query('ALTER TABLE companies ADD COLUMN clicksRoute INT NOT NULL DEFAULT 0');
    console.log('✓ Adicionada coluna companies.clicksRoute');
  } else {
    console.log('✓ Coluna companies.clicksRoute já existe');
  }

  // 4. Checar colunas crm_leads
  const [leadCols]: any = await pool.query(`
    SELECT COLUMN_NAME FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'crm_leads'
  `);
  const leadColNames = new Set(leadCols.map((c: any) => c.COLUMN_NAME));

  if (!leadColNames.has('interest')) {
    await pool.query('ALTER TABLE crm_leads ADD COLUMN interest VARCHAR(255) NULL');
    console.log('✓ Adicionada coluna crm_leads.interest');
  }
  if (!leadColNames.has('notes')) {
    await pool.query('ALTER TABLE crm_leads ADD COLUMN notes TEXT NULL');
    console.log('✓ Adicionada coluna crm_leads.notes');
  }
  if (!leadColNames.has('next_contact_at')) {
    await pool.query('ALTER TABLE crm_leads ADD COLUMN next_contact_at DATETIME NULL');
    console.log('✓ Adicionada coluna crm_leads.next_contact_at');
  }

  console.log('--- Migração concluída com sucesso ---');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Erro na migração:', err.message);
  process.exit(1);
});
