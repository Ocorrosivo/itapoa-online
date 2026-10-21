/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Schema verification only — READ ONLY.
 *
 * database/schema/MYSQL_SCHEMA.sql is the single official source of the
 * database. The server never issues CREATE TABLE / ALTER TABLE: a partially
 * created schema is worse than none, and DDL must never run automatically
 * against a production database. Import the .sql file manually (phpMyAdmin,
 * Hostinger panel or the mysql client) and this module will only report
 * whether the expected tables are present.
 */

import { pool } from './mysql.js';

/** Tables declared in database/schema/MYSQL_SCHEMA.sql (37). */
export const EXPECTED_TABLES = [
  'cities', 'districts', 'categories', 'roles', 'permissions', 'users',
  'companies', 'companies_users', 'products', 'services', 'coupons',
  'promotions', 'reviews', 'jobs', 'job_applications', 'professionals',
  'portfolio_items', 'blog_posts', 'blog_comments', 'events', 'tourism_places',
  'route_guides', 'route_guide_steps', 'solidarity_campaigns',
  'campaign_comments', 'plans', 'subscriptions', 'payment_logs', 'crm_leads',
  'support_tickets', 'media_items', 'company_analytics_events', 'faq_items', 'audit_logs', 'seo_settings',
  'general_config', 'payment_config', 'notifications'
] as const;

export interface SchemaState {
  reachable: boolean;
  present: string[];
  missing: string[];
}

/**
 * Lists the expected tables that actually exist. Uses information_schema with
 * bound parameters; no identifier is ever interpolated.
 */
export const inspectSchema = async (): Promise<SchemaState> => {
  try {
    const placeholders = EXPECTED_TABLES.map(() => '?').join(', ');
    const [rows]: any = await pool.query(
      `SELECT table_name AS name
         FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_name IN (${placeholders})`,
      [...EXPECTED_TABLES]
    );

    const present = rows.map((row: any) => String(row.name ?? row.NAME ?? row.table_name));
    const missing = EXPECTED_TABLES.filter(table => !present.includes(table));
    return { reachable: true, present, missing };
  } catch {
    return { reachable: false, present: [], missing: [...EXPECTED_TABLES] };
  }
};

/**
 * Logs the schema state at boot. Never throws and never mutates the database,
 * so an incomplete import degrades the API instead of corrupting the schema.
 */
export const reportSchemaState = async (): Promise<SchemaState> => {
  const state = await inspectSchema();

  if (!state.reachable) {
    console.error('❌ Banco de dados inacessível. Verifique as variáveis DB_* do ambiente.');
    return state;
  }

  if (state.missing.length === 0) {
    console.log(`✅ Schema verificado: ${state.present.length}/${EXPECTED_TABLES.length} tabelas presentes.`);
    return state;
  }

  console.warn(
    `⚠️  Schema incompleto: ${state.present.length}/${EXPECTED_TABLES.length} tabelas. ` +
    `Ausentes: ${state.missing.join(', ')}`
  );
  console.warn('   Importe database/schema/MYSQL_SCHEMA.sql manualmente. O servidor não cria tabelas.');
  return state;
};
