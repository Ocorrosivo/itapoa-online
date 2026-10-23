/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Company service. Owns the business rules for the public directory and for
 * tenant-scoped company writes.
 */

import { CompanyRepository } from '../repositories/companyRepository.js';
import { ListOptions } from '../repositories/baseRepository.js';

const PLAN_WEIGHT: Record<string, number> = {
  diamond_extremo: 3,
  gold_vip: 2,
  bronze: 1
};

/** Removes Unicode combining marks (U+0300–U+036F) left by NFD normalisation. */
const stripDiacritics = (value: string): string =>
  value
    .normalize('NFD')
    .split('')
    .filter(char => {
      const code = char.charCodeAt(0);
      return code < 0x0300 || code > 0x036f;
    })
    .join('');

const slugify = (value: string): string =>
  stripDiacritics(value.toLowerCase())
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

export class CompanyService {
  /**
   * Public directory listing, ranked by plan then rating.
   */
  async getCompanies(filters: Record<string, any>, options: ListOptions = {}) {
    const companies = await CompanyRepository.search(filters, options);

    return [...companies].sort((a, b) => {
      const weightA = PLAN_WEIGHT[a.planLevel] ?? 1;
      const weightB = PLAN_WEIGHT[b.planLevel] ?? 1;
      if (weightB !== weightA) return weightB - weightA;
      return (Number(b.rating) || 0) - (Number(a.rating) || 0);
    });
  }

  async getCompanyBySlug(slug: string) {
    const company = await CompanyRepository.findBySlug(slug);
    if (company?.id?.startsWith('checkout_') && (!company.categoryId || !company.cityId)) return null;
    if (company) {
      await CompanyRepository.incrementViews(slug);
    }
    return company;
  }

  /**
   * Creates a company and binds it to its owner in companies_users, which is
   * what the anti-IDOR middleware relies on.
   */
  async createCompany(data: Record<string, any>, ownerUserId: string) {
    const name = typeof data.name === 'string' ? data.name.trim() : '';
    if (!name) {
      throw new Error('Nome da empresa é obrigatório.');
    }

    let slug = slugify(name);
    if (!slug) slug = `empresa-${Date.now()}`;
    if (await CompanyRepository.slugExists(slug)) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    // New self-service listings always start on the free tier. Paid placement
    // is activated only by the verified Mercado Pago webhook.
    const planLevel = 'bronze';

    // Only real, caller-supplied content is persisted. Absent fields stay null
    // rather than being filled with placeholder media or coordinates.
    const company = {
      id: `comp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      slug,
      logo: data.logo ?? null,
      coverImage: data.coverImage ?? null,
      categoryId: data.categoryId ?? null,
      cityId: data.cityId ?? null,
      description: data.description ?? null,
      detailedDescription: data.detailedDescription ?? data.description ?? null,
      reviewCount: 0,
      phone: data.phone ?? null,
      whatsapp: typeof data.whatsapp === 'string' ? data.whatsapp.replace(/\D/g, '') : null,
      address: data.address ?? null,
      hours: data.hours ?? null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      isSponsored: (planLevel as string) === 'diamond_extremo' || (planLevel as string) === 'gold_vip' ? 1 : 0,
      planLevel,
      features: Array.isArray(data.features) ? data.features : [],
      views: 0,
      clicksWhatsapp: 0
    };

    return CompanyRepository.createWithOwner(company, ownerUserId);
  }

  /**
   * Updates a company. Tenant ownership is enforced by middleware before this
   * runs; the repository drops any column outside the whitelist.
   */
  async updateCompany(id: string, data: Record<string, any>) {
    // Self-service profile completion must never grant paid placement or change identity.
    const editable = ['name','slug','logo','coverImage','categoryId','cityId',
      'description','detailedDescription','phone','whatsapp','address','hours',
      'latitude','longitude','features'];
    const profile = Object.fromEntries(Object.entries(data).filter(([key]) => editable.includes(key)));
    return CompanyRepository.update(id, profile);
  }

  async registerClick(id: string) {
    return CompanyRepository.incrementClick(id);
  }
}

export const companyService = new CompanyService();
