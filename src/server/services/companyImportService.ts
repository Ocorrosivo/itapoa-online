/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Import Service — Validador, Mapeador e Importador em Lotes de Empresas (CSV)
 * Restrito estritamente a administradores master.
 */

import { pool } from '../mysql.js';
import { CompanyRepository } from '../repositories/companyRepository.js';
import { ALLOWED_COMPANY_CITIES } from './companyService.js';

export interface CompanyImportRow {
  nome: string;
  categoria?: string;
  categoria_id?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  endereco?: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  origem?: string;
  status?: string;
  [key: string]: any;
}

export interface ImportValidationItem {
  rowNumber: number;
  data: CompanyImportRow;
  normalizedName: string;
  slug: string;
  cityId: string;
  categoryId: string;
  cleanPhone: string;
  cleanWhatsapp: string;
  isDuplicate: boolean;
  duplicateReason?: string;
  duplicateCompanyId?: string;
  errors: string[];
  warnings: string[];
}

export interface ImportPreviewResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  items: ImportValidationItem[];
}

export interface ImportExecutionResult {
  totalSubmitted: number;
  importedCount: number;
  skippedCount: number;
  errors: { rowNumber: number; error: string; companyName: string }[];
  importedCompanyIds: string[];
}

const CATEGORY_MAP: Record<string, string> = {
  gastronomia: 'cat_gastronomia',
  hospedagem: 'cat_hospedagem',
  hotel: 'cat_hospedagem',
  pousada: 'cat_hospedagem',
  comercio: 'cat_comercio',
  'comercio local': 'cat_comercio',
  varejo: 'cat_comercio',
  servicos: 'cat_servicos',
  saude: 'cat_saude',
  clinica: 'cat_saude',
  dentista: 'cat_saude',
  veterinaria: 'cat_saude',
  farmacia: 'cat_saude',
  beleza: 'cat_beleza',
  'beleza e estetica': 'cat_beleza',
  construcao: 'cat_construcao',
  'construcao e reforma': 'cat_construcao',
  automotivo: 'cat_automotivo',
  mecanica: 'cat_automotivo',
  turismo: 'cat_turismo',
  'turismo e lazer': 'cat_turismo',
  nautica: 'cat_turismo',
  educacao: 'cat_educacao',
  curso: 'cat_educacao'
};

const CITY_MAP: Record<string, string> = {
  itapoa: 'city_itapoa',
  'itapoá': 'city_itapoa',
  curitiba: 'city_curitiba'
};

export class CompanyImportService {
  /**
   * Normaliza texto simples (minúsculas sem diacríticos).
   */
  static normalizeText(str: string): string {
    return (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  /**
   * Gera slug a partir do nome.
   */
  static slugify(name: string): string {
    const clean = this.normalizeText(name)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    return clean || `empresa-${Date.now().toString(36)}`;
  }

  /**
   * Pré-visualiza e valida uma lista de registros extraídos de CSV.
   */
  static async validateAndPreview(rows: CompanyImportRow[]): Promise<ImportPreviewResult> {
    const items: ImportValidationItem[] = [];

    // Busca empresas existentes no banco para checar duplicatas de uma só vez
    let existingCompanies: any[] = [];
    try {
      const [dbRows]: any = await pool.query(
        'SELECT id, name, slug, phone, whatsapp, address FROM companies'
      );
      existingCompanies = dbRows || [];
    } catch {
      existingCompanies = [];
    }

    const seenSlugsInBatch = new Set<string>();
    const seenNamesInBatch = new Set<string>();

    let validCount = 0;
    let duplicateCount = 0;
    let invalidCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 1;
      const errors: string[] = [];
      const warnings: string[] = [];

      const rawName = String(row.nome || row.name || '').trim();
      if (!rawName) {
        errors.push('Nome da empresa é obrigatório.');
      }

      const normalizedName = this.normalizeText(rawName);
      const slug = this.slugify(rawName);

      // Validação e mapeamento de Cidade
      const rawCity = String(row.cidade || row.city || 'Itapoá').trim();
      const normCity = this.normalizeText(rawCity);
      const cityId = CITY_MAP[normCity] || (ALLOWED_COMPANY_CITIES.includes(normCity) ? normCity : '');

      if (!cityId || !ALLOWED_COMPANY_CITIES.includes(cityId)) {
        errors.push(`Cidade "${rawCity}" não permitida. Apenas Itapoá e Curitiba são aceitas.`);
      }

      // Validação e mapeamento de Categoria
      let categoryId = String(row.categoria_id || '').trim();
      if (!categoryId) {
        const rawCategory = String(row.categoria || row.category || '').trim();
        const normCat = this.normalizeText(rawCategory);
        categoryId = CATEGORY_MAP[normCat] || 'cat_comercio';
      }

      // Limpeza de telefones
      const cleanPhone = String(row.telefone || row.phone || '').replace(/\D/g, '');
      const cleanWhatsapp = String(row.whatsapp || cleanPhone).replace(/\D/g, '');

      // Detecção de Duplicatas
      let isDuplicate = false;
      let duplicateReason: string | undefined;
      let duplicateCompanyId: string | undefined;

      // 1. No lote atual
      if (seenNamesInBatch.has(normalizedName)) {
        isDuplicate = true;
        duplicateReason = 'Nome idêntico já presente em linha anterior deste mesmo lote.';
      } else {
        seenNamesInBatch.add(normalizedName);
      }

      // 2. No banco de dados
      if (!isDuplicate) {
        const match = existingCompanies.find(c => {
          const cNormName = this.normalizeText(c.name || '');
          if (cNormName === normalizedName) return true;
          if (c.slug === slug) return true;
          const cWhats = String(c.whatsapp || '').replace(/\D/g, '');
          if (cleanWhatsapp && cWhats && cleanWhatsapp === cWhats) return true;
          return false;
        });

        if (match) {
          isDuplicate = true;
          duplicateCompanyId = match.id;
          duplicateReason = `Empresa já cadastrada no portal (ID: ${match.id}, Nome: "${match.name}").`;
        }
      }

      if (isDuplicate) {
        duplicateCount++;
      } else if (errors.length > 0) {
        invalidCount++;
      } else {
        validCount++;
      }

      items.push({
        rowNumber,
        data: row,
        normalizedName,
        slug,
        cityId,
        categoryId,
        cleanPhone,
        cleanWhatsapp,
        isDuplicate,
        duplicateReason,
        duplicateCompanyId,
        errors,
        warnings
      });
    }

    return {
      totalRows: rows.length,
      validRows: validCount,
      invalidRows: invalidCount,
      duplicateRows: duplicateCount,
      items
    };
  }

  /**
   * Executa a importação real em lote dos itens pré-validados.
   */
  static async executeImport(
    validatedItems: ImportValidationItem[],
    adminUserId: string,
    options: { skipDuplicates?: boolean } = { skipDuplicates: true }
  ): Promise<ImportExecutionResult> {
    const connection = await pool.getConnection();
    const importedCompanyIds: string[] = [];
    const errors: { rowNumber: number; error: string; companyName: string }[] = [];
    let importedCount = 0;
    let skippedCount = 0;

    try {
      await connection.beginTransaction();

      for (const item of validatedItems) {
        if (item.errors.length > 0) {
          errors.push({
            rowNumber: item.rowNumber,
            error: item.errors.join('; '),
            companyName: item.data.nome || 'Sem nome'
          });
          skippedCount++;
          continue;
        }

        if (item.isDuplicate && options.skipDuplicates) {
          skippedCount++;
          continue;
        }

        let slug = item.slug;
        const [existingSlug]: any = await connection.query(
          'SELECT 1 FROM companies WHERE slug = ? LIMIT 1',
          [slug]
        );
        if (existingSlug && existingSlug.length > 0) {
          slug = `${slug}-${Date.now().toString(36)}`;
        }

        const companyId = `comp_import_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const companyRecord = {
          id: companyId,
          name: item.data.nome.trim(),
          slug,
          logo: null,
          coverImage: null,
          categoryId: item.categoryId,
          cityId: item.cityId,
          description: item.data.bairro ? `Empresa localizada no bairro ${item.data.bairro}, Itapoá.` : 'Empresa cadastrada no Guia Oficial de Itapoá.',
          detailedDescription: null,
          reviewCount: 0,
          phone: item.cleanPhone || null,
          whatsapp: item.cleanWhatsapp || null,
          address: item.data.endereco || null,
          hours: 'Segunda a Sexta das 08h às 18h',
          latitude: null,
          longitude: null,
          isSponsored: 0,
          planLevel: 'bronze',
          access_grant_type: 'bronze',
          trial_ends_at: null,
          has_used_trial: 0,
          views: 0,
          clicksWhatsapp: 0,
          website: item.data.website || null,
          instagram: item.data.instagram || null,
          facebook: item.data.facebook || null
        };

        const keys = Object.keys(companyRecord);
        await connection.query(
          `INSERT INTO companies (${keys.map(k => '`' + k + '`').join(',')}) VALUES (${keys.map(() => '?').join(',')})`,
          keys.map(k => (companyRecord as any)[k])
        );

        // Associa provisoriamente ao admin_master como curador inicial da importação
        await connection.query(
          "INSERT INTO companies_users (user_id, company_id, access_level) VALUES (?, ?, 'owner') ON DUPLICATE KEY UPDATE access_level = 'owner'",
          [adminUserId, companyId]
        );

        importedCompanyIds.push(companyId);
        importedCount++;
      }

      // Registro de Auditoria Administrativa
      const auditId = `audit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await connection.query(
        `INSERT INTO audit_logs (id, userId, action, entityType, entityId, details, createdAt)
         VALUES (?, ?, 'COMPANIES_CSV_IMPORT', 'companies', 'batch', ?, NOW())`,
        [
          auditId,
          adminUserId,
          JSON.stringify({
            importedCount,
            skippedCount,
            errorsCount: errors.length,
            companyIds: importedCompanyIds.slice(0, 50)
          })
        ]
      ).catch(() => {});

      await connection.commit();
    } catch (err: any) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }

    return {
      totalSubmitted: validatedItems.length,
      importedCount,
      skippedCount,
      errors,
      importedCompanyIds
    };
  }
}
