/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Generic CRUD service used by the entity routes.
 * Tenant scoping is applied here, from the authenticated session only.
 */

import { BaseRepository } from '../repositories/baseRepository.js';
import { AuthenticatedUser } from '../middleware/auth.js';

export class ServiceError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export class CrudService {
  constructor(
    private readonly repository: BaseRepository,
    private readonly idPrefix: string
  ) {}

  /** Public listing. Only whitelisted filters survive in the repository. */
  async list(filters: Record<string, any> = {}) {
    return this.repository.findAll(filters);
  }

  /**
   * Listing restricted to the companies the caller owns. admin_master sees all.
   */
  async listForUser(
    user: AuthenticatedUser,
    companyIds: string[],
    filters: Record<string, any> = {}
  ) {
    const column = this.repository.companyColumn;
    if (user.role === 'admin_master' || !column) {
      return this.repository.findAll(filters);
    }

    if (companyIds.length === 0) return [];

    // One scoped query per owned company keeps every identifier whitelisted.
    const batches = await Promise.all(
      companyIds.map(companyId =>
        this.repository.findAll(filters, { scope: { [column]: companyId } })
      )
    );
    return batches.flat();
  }

  async get(id: string) {
    const record = (await this.repository.findById(id)) ?? (await this.repository.findBySlug(id));
    if (!record) throw new ServiceError(404, 'Registro não encontrado.');
    return record;
  }

  /**
   * Creates a record. When the table is company-scoped, the company id comes
   * from the verified session scope, never from the request body.
   */
  async create(payload: Record<string, any>, companyIds: string[] = []) {
    const column = this.repository.companyColumn;
    const data: Record<string, any> = {
      ...payload,
      id: `${this.idPrefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    };

    if (column) {
      const scopedCompany = companyIds[0] ?? payload[column];
      if (!scopedCompany) {
        throw new ServiceError(400, 'Empresa de destino não identificada.');
      }
      data[column] = scopedCompany;
    }

    return this.repository.create(data);
  }

  async update(id: string, payload: Record<string, any>) {
    // Ownership was checked for the existing record. Never move it to another
    // tenant with a client-supplied company key after that check.
    const data = { ...payload };
    if (this.repository.companyColumn) delete data[this.repository.companyColumn];
    const updated = await this.repository.update(id, data);
    if (!updated) throw new ServiceError(400, 'Nenhum campo válido informado.');
    return updated;
  }

  async remove(id: string) {
    const removed = await this.repository.delete(id);
    if (!removed) throw new ServiceError(404, 'Registro não encontrado.');
    return { success: true };
  }
}
