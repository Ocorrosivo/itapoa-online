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
