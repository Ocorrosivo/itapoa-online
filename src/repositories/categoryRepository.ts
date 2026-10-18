/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Category Repository
 */

import { Category } from '../types';
import { apiFetch } from '../lib/apiClient';

export class CategoryRepository {
  static async getAll(): Promise<Category[]> {
    try {
      const res = await apiFetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        return Array.isArray(data) ? data : (Array.isArray((data as any)?.data) ? (data as any).data : []);
      }
    } catch (err) {
      console.warn('API fallback error for categories');
    }

    return [];
  }
}
