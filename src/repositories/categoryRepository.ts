/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Category Repository
 */

import { Category } from '../types';
import { apiFetch, ApiError } from '../lib/apiClient';
import { arrayFromPayload } from '../utils/catalogSearch';

export class CategoryRepository {
  static async getAll(): Promise<Category[]> {
      const res = await apiFetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        return arrayFromPayload<Category>(data);
      }
      throw new ApiError(res.status, 'Não foi possível carregar as categorias.');
  }
}
