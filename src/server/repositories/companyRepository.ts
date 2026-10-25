/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Company repository. Extends BaseRepository so column whitelisting, hidden
 * columns and bounded pagination apply here too.
 */

import { pool } from '../mysql.js';
import { BaseRepository, ListOptions } from './baseRepository.js';
import { normalizeSearch } from '../../utils/catalogSearch.js';

export class CompanyRepositoryClass extends BaseRepository {
  constructor() {
    super('companies');
  }

  /**
   * Directory listing with a free-text search on top of the whitelisted filters.
   * Accepts both `search` and `q` and normalizes diacritics.
   */
  async search(filters: Record<string, any> = {}, options: ListOptions = {}) {
    const term = normalizeSearch(filters.search) || normalizeSearch(filters.q);
    return this.findAll(filters, {
      ...options,
      publicCompanies: true,
      textSearch: {
        columns: ['name', 'description', 'detailedDescription', 'address', 'features'],
        term
      }
    });
  }

  async incrementViews(slug: string) {
    await pool.query('UPDATE companies SET views = views + 1 WHERE slug = ?', [slug]);
  }

  async incrementClick(id: string) {
    await pool.query(
      'UPDATE companies SET clicksWhatsapp = clicksWhatsapp + 1 WHERE id = ?',
      [id]
    );
    const [rows]: any = await pool.query(
      'SELECT clicksWhatsapp FROM companies WHERE id = ? LIMIT 1',
      [id]
    );
    return rows[0]?.clicksWhatsapp ?? 0;
  }

  /** Registers the owner association used by the anti-IDOR middleware. */
  async createWithOwner(data: Record<string, any>, userId: string) {
    const clean = this.pickWritable(data);
    const physical = await this.getPhysicalColumns();
    for (const key of Object.keys(clean)) {
      if (!physical.has(key)) delete clean[key];
    }
    const keys = Object.keys(clean);
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query(`INSERT INTO companies (${keys.map(key=>'`'+key+'`').join(',')}) VALUES (${keys.map(()=>'?').join(',')})`,keys.map(key=>clean[key]));
      await connection.query("INSERT INTO companies_users(user_id,company_id,access_level) VALUES(?,?,'owner')",[userId,clean.id]);
      const [rows]:any=await connection.query('SELECT * FROM companies WHERE id=?',[clean.id]);
      await connection.commit();
      return rows[0];
    }catch(error){await connection.rollback();throw error;}finally{connection.release();}
  }

  async linkOwner(companyId: string, userId: string) {
    await pool.query(
      `INSERT INTO companies_users (user_id, company_id, access_level)
       VALUES (?, ?, 'owner')
       ON DUPLICATE KEY UPDATE access_level = access_level`,
      [userId, companyId]
    );
  }

  async slugExists(slug: string): Promise<boolean> {
    const [rows]: any = await pool.query(
      'SELECT 1 FROM companies WHERE slug = ? LIMIT 1',
      [slug]
    );
    return rows.length > 0;
  }
}

export const CompanyRepository = new CompanyRepositoryClass();
