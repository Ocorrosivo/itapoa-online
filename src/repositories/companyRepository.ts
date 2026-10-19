/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Company Repository - Data Access Layer for Companies (Tenants)
 */

import { Company } from '../types';
import { apiFetch, ApiError } from '../lib/apiClient';
import { arrayFromPayload, featureArray } from '../utils/catalogSearch';

export class CompanyRepository {
  /**
   * Fetch all active companies with optional category/search filters.
   * Query params are forwarded to GET /api/companies so the server
   * can filter before returning.
   */
  static async getAll(params?: { categoryId?: string; cityId?: string; search?: string; q?: string }): Promise<Company[]> {
      const qs = new URLSearchParams();
      qs.set('limit', '200');
      if (params?.categoryId) qs.set('categoryId', params.categoryId);
      if (params?.cityId) qs.set('cityId', params.cityId);
      if (params?.search) qs.set('search', params.search);
      if (params?.q) qs.set('q', params.q);
      const url = qs.toString() ? `/api/companies?${qs.toString()}` : '/api/companies';
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        return arrayFromPayload<Company>(data).map(company => ({
          ...company, features: featureArray(company.features)
        }));
      }
      throw new ApiError(res.status, 'Não foi possível carregar o catálogo.');
  }

  /**
   * Get Company by Slug
   */
  static async getBySlug(slug: string): Promise<Company | null> {
    try {
      const res = await apiFetch(`/api/companies/${encodeURIComponent(slug)}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('API fallback error for company by slug');
    }
    return null;
  }

  /**
   * Save or Update Company Details
   * Create goes to POST /api/companies/create (auth required); update to PUT /api/companies/:id.
   */
  static async save(company: Partial<Company>): Promise<Company | null> {
    try {
      const isUpdate = Boolean(company.id);
      const method = isUpdate ? 'PUT' : 'POST';
      const url = isUpdate ? `/api/companies/${encodeURIComponent(company.id!)}` : '/api/companies/create';
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(company)
      });
      if (res.ok) {
        const payload = await res.json();
        return payload?.company ?? payload?.data?.company ?? payload?.data ?? payload;
      }
      const err = await res.json().catch(() => ({}));
      console.error('API error saving company:', err);
      return null;
    } catch (err) {
      console.error('API fallback error saving company:', err);
      return null;
    }
  }

  /**
   * Increment metric counters (views, whatsapp clicks, calls, routes)
   */
  static async incrementMetric(companyId: string, metric: 'views' | 'clicksWhatsapp' | 'clicksPhone' | 'clicksRoutes') {
    try {
      await apiFetch(`/api/companies/${companyId}/${metric}`, { method: 'POST' });
    } catch (err) {
      // ignore
    }
  }
}
