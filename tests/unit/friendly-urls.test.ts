/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Testes Unitários — URLs Amigáveis e Resolução de Slugs
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { slugify } from '../../src/server/services/companyService.js';
import { CompanyRepository } from '../../src/server/repositories/companyRepository.js';
import { pool } from '../../src/server/mysql.js';

describe('URLs Amigáveis e Resolução de Slugs', () => {
  test('1. Normalização e geração de slug limpo e legível (slugify)', () => {
    assert.equal(slugify('Agencia Brainstors'), 'agencia-brainstors');
    assert.equal(slugify('Café & Sorvete — São João d\'Aliança!'), 'cafe-sorvete-sao-joao-d-alianca');
    assert.equal(slugify('Pousada Sol & Mar (Itapoá SC)'), 'pousada-sol-mar-itapoa-sc');
    assert.equal(slugify('  Espaço   Gourmet  123  '), 'espaco-gourmet-123');
  });

  test('2. CompanyRepository.findBySlug aceita tanto o slug amigável quanto o ID legado', async () => {
    const originalQuery = pool.query;
    let queryUsed = '';
    let queryParams: any[] = [];

    (pool as any).query = async (sql: string, params: any[]) => {
      queryUsed = sql;
      queryParams = params;
      return [[{
        id: 'checkout_04d84ff3e123369772b49aa0',
        name: 'Agencia Brainstors',
        slug: 'agencia-brainstors',
        planLevel: 'gold_vip',
        isSponsored: 1,
      }]];
    };

    try {
      // Busca pelo novo slug amigável
      const byFriendlySlug = await CompanyRepository.findBySlug('agencia-brainstors');
      assert.ok(byFriendlySlug);
      assert.equal(byFriendlySlug.slug, 'agencia-brainstors');
      assert.ok(queryUsed.includes('slug = ? OR id = ?'), 'SQL deve consultar por slug OU id');
      assert.deepEqual(queryParams, ['agencia-brainstors', 'agencia-brainstors']);

      // Busca pelo ID legado (retrocompatibilidade)
      const byLegacyId = await CompanyRepository.findBySlug('checkout_04d84ff3e123369772b49aa0');
      assert.ok(byLegacyId);
      assert.equal(byLegacyId.id, 'checkout_04d84ff3e123369772b49aa0');
      assert.deepEqual(queryParams, ['checkout_04d84ff3e123369772b49aa0', 'checkout_04d84ff3e123369772b49aa0']);
    } finally {
      pool.query = originalQuery;
    }
  });
});
