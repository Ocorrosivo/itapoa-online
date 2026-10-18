/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Company repository. Extends BaseRepository so column whitelisting, hidden
 * columns and bounded pagination apply here too.
 */

import { pool } from '../mysql.js';
import { BaseRepository, ListOptions } from './baseRepository.js';

export class CompanyRepositoryClass extends BaseRepository {
  constructor() {
    super('companies');
  }

  /**
   * Directory listing with a free-text search on top of the whitelisted filters.
   * Accepts both `search` and `q` and normalizes diacritics.
   */
  async search(filters: Record<string, any> = {}, options: ListOptions = {}) {
    const rows = await this.findAll(filters, options);

    const rawTerm = (filters.search ?? filters.q);
    const norm = (s: unknown): string =>
      typeof s === 'string'
        ? s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
        : '';

    const termNorm = norm(rawTerm);
    if (!termNorm) return rows;

    return rows.filter(row => {
      const candidates = [row.name, row.description, row.detailedDescription, row.address];
      if (candidates.some(c => norm(c).includes(termNorm))) return true;

      let featuresArr: unknown[] = [];
      if (Array.isArray(row.features)) {
        featuresArr = row.features;
      } else if (typeof row.features === 'string') {
        try {
          const parsed = JSON.parse(row.features);
          if (Array.isArray(parsed)) featuresArr = parsed;
        } catch {
          // ignore parsing error
        }
      }
      if (featuresArr.some((f: unknown) => norm(f).includes(termNorm))) return true;
      return false;
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
