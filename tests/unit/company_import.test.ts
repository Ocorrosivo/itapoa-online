import test from 'node:test';
import assert from 'node:assert/strict';
import { CompanyImportService, CompanyImportRow } from '../../src/server/services/companyImportService.js';

test('CompanyImportService — Validação, Normalização e Detecção de Duplicatas', async (t) => {
  await t.test('1. Normalização de nomes e geração de slugs', () => {
    assert.equal(CompanyImportService.slugify('Restaurante Pérola - Itapoá!'), 'restaurante-perola-itapoa');
    assert.equal(CompanyImportService.slugify('Pousada Vila ÁguaMar'), 'pousada-vila-aguamar');
    assert.equal(CompanyImportService.normalizeText('Itapoá / SC'), 'itapoa / sc');
  });

  await t.test('2. Validação de dados válidos em lote', async () => {
    const mockRows: CompanyImportRow[] = [
      {
        nome: 'Pizzaria Maresia Teste',
        categoria: 'Gastronomia',
        cidade: 'Itapoá',
        bairro: 'Itapema do Norte',
        telefone: '(47) 3443-0000',
        whatsapp: '(47) 99999-0001',
        endereco: 'Rua das Flores, 100'
      },
      {
        nome: 'Hotel Mar Azul Teste',
        categoria: 'Hospedagem',
        cidade: 'Itapoá',
        bairro: 'Paese',
        telefone: '4734431111',
        whatsapp: '47988880002',
        endereco: 'Av. Beira Mar, 500'
      }
    ];

    const preview = await CompanyImportService.validateAndPreview(mockRows);
    assert.equal(preview.totalRows, 2);
    assert.equal(preview.validRows, 2);
    assert.equal(preview.invalidRows, 0);
    assert.equal(preview.items[0].categoryId, 'cat_gastronomia');
    assert.equal(preview.items[0].cityId, 'city_itapoa');
    assert.equal(preview.items[0].cleanPhone, '4734430000');
    assert.equal(preview.items[0].cleanWhatsapp, '47999990001');
    assert.equal(preview.items[1].categoryId, 'cat_hospedagem');
  });

  await t.test('3. Detecção de duplicatas no mesmo lote', async () => {
    const mockRows: CompanyImportRow[] = [
      {
        nome: 'Supermercado Teste Duplicata',
        categoria: 'Comércio Local',
        cidade: 'Itapoá',
        whatsapp: '47999991234'
      },
      {
        nome: 'Supermercado Teste Duplicata', // Mesmo nome
        categoria: 'Comércio Local',
        cidade: 'Itapoá',
        whatsapp: '47999991234'
      }
    ];

    const preview = await CompanyImportService.validateAndPreview(mockRows);
    assert.equal(preview.totalRows, 2);
    assert.equal(preview.validRows, 1);
    assert.equal(preview.duplicateRows, 1);
    assert.equal(preview.items[1].isDuplicate, true);
    assert.match(preview.items[1].duplicateReason || '', /linha anterior/);
  });

  await t.test('4. Rejeição de cidades não permitidas', async () => {
    const mockRows: CompanyImportRow[] = [
      {
        nome: 'Empresa Fora de Área',
        categoria: 'Serviços',
        cidade: 'Joinville', // Não permitida
        whatsapp: '47999999999'
      }
    ];

    const preview = await CompanyImportService.validateAndPreview(mockRows);
    assert.equal(preview.validRows, 0);
    assert.equal(preview.invalidRows, 1);
    assert.match(preview.items[0].errors[0], /Cidade "Joinville" não permitida/);
  });
});
