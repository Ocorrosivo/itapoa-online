/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Testes Unitários — Pagamentos de Teste no Itapoá Online
 * 
 * Validação rigorosa dos 12 requisitos:
 * 1. Acesso restrito e identificação clara como Pagamentos de Teste.
 * 2. Opções de preço exclusivas: PIX R$ 1,00 e Cartão R$ 2,50 (crédito/débito).
 * 3. Integração com Mercado Pago existente.
 * 4. Validação estrita do valor no backend (o backend impõe 1.00 e 2.50).
 * 5. Preços oficiais dos planos Bronze, Gold e Diamond intactos.
 * 6. Pagamentos de teste NUNCA liberam assinaturas VIP ou alteram o planLevel das empresas.
 * 7. Registro individual em `test_payments`.
 * 8. Ambiente sandbox padrão e confirmação obrigatória para transações reais.
 * 9. Não armazenamento de dados sensíveis de cartão (apenas brand e last_four).
 * 10. Webhooks e prevenção de divergência de valores.
 * 11. Reconciliação e atualização de status.
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { testPaymentService, TEST_PAYMENT_AMOUNTS } from '../../src/server/services/testPaymentService.js';
import { pool } from '../../src/server/mysql.js';

describe('Pagamentos de Teste Mercado Pago (Backend & Regras de Negócio)', () => {
  const originalQuery = pool.query;
  const originalFetch = globalThis.fetch;
  const originalEnvToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  const originalEnvSandboxToken = process.env.MERCADOPAGO_SANDBOX_ACCESS_TOKEN;

  let queryLog: { sql: string; values: any[] }[] = [];
  let fetchLog: { url: string; headers: any; body: any }[] = [];

  beforeEach(() => {
    queryLog = [];
    fetchLog = [];

    (pool as any).query = async (statement: string, values: any[] = []) => {
      queryLog.push({ sql: statement, values });
      // Mock de consulta à payment_config
      if (statement.includes('FROM payment_config')) {
        return [[{ publicKey: 'TEST-pk-12345', accessToken: 'TEST-token-12345' }]];
      }
      // Mock de consulta à test_payments
      if (statement.includes('FROM test_payments WHERE id = ?')) {
        return [[{
          id: values[0] || 'test_pix_123',
          user_id: 'user_master',
          company_id: 'company_test',
          payment_method: 'pix',
          amount: 1.00,
          environment: 'sandbox',
          status: 'pending',
          gateway_reference: 'mp_pay_999',
        }]];
      }
      return [[]];
    };

    globalThis.fetch = async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = String(url);
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      fetchLog.push({ url: urlStr, headers: init?.headers, body });

      if (urlStr.includes('/v1/payments')) {
        return new Response(JSON.stringify({
          id: 999888777,
          status: 'pending',
          status_detail: 'waiting_transfer',
          transaction_amount: body?.transaction_amount,
          payment_type_id: body?.token ? 'credit_card' : 'bank_transfer',
          payment_method_id: body?.payment_method_id || 'pix',
          card: body?.token ? { last_four_digits: '1234' } : undefined,
          point_of_interaction: {
            transaction_data: {
              qr_code: 'pix-qr-code-test-string',
              qr_code_base64: 'data:image/png;base64,mockqr',
            },
          },
        }), { status: 201 });
      }

      return new Response(JSON.stringify({}), { status: 200 });
    };
  });

  afterEach(() => {
    pool.query = originalQuery;
    globalThis.fetch = originalFetch;
    process.env.MERCADOPAGO_ACCESS_TOKEN = originalEnvToken;
    process.env.MERCADOPAGO_SANDBOX_ACCESS_TOKEN = originalEnvSandboxToken;
  });

  test('1. Valores Estritos: PIX é R$ 1,00 e Cartão é R$ 2,50', () => {
    assert.equal(TEST_PAYMENT_AMOUNTS.pix, 1.00, 'PIX deve ser estritamente R$ 1,00');
    assert.equal(TEST_PAYMENT_AMOUNTS.card, 2.50, 'Cartão de crédito ou débito deve ser estritamente R$ 2,50');
  });

  test('2. Sandbox por Padrão e Detecção de Chaves', async () => {
    const config = await testPaymentService.getConfig('sandbox');
    assert.equal(config.environment, 'sandbox', 'Ambiente padrão retornado deve ser sandbox');
    assert.equal(config.amounts.pix, 1.00);
    assert.equal(config.amounts.card, 2.50);
  });

  test('3. Criação de PIX de Teste valida e força R$ 1,00 no backend', async () => {
    const result = await testPaymentService.createPixTestPayment(
      'user_admin_master',
      'company_sample_123',
      'admin@itapoa.online',
      'Admin Master Teste',
      'sandbox',
      'https://itapoa.online'
    );

    assert.ok(result.id.startsWith('test_pix_'), 'Identificador de teste deve iniciar com test_pix_');
    assert.equal(result.amount, 1.00, 'Valor retornado deve ser 1.00');
    assert.equal(result.qrCode, 'pix-qr-code-test-string');
    assert.equal(result.status, 'pending');

    // Verificar se o payload enviado à API do Mercado Pago teve transaction_amount = 1.00
    const mpRequest = fetchLog.find(f => f.url.includes('/v1/payments'));
    assert.ok(mpRequest, 'Deveria ter chamado a API do Mercado Pago');
    assert.equal(mpRequest.body.transaction_amount, 1.00, 'Mercado Pago deve receber estritamente 1.00');
    assert.equal(mpRequest.body.payment_method_id, 'pix');
    assert.equal(mpRequest.body.metadata.is_test_payment, true);

    // Verificar se persistiu exclusivamente na tabela test_payments
    const insertQuery = queryLog.find(q => q.sql.includes('INSERT INTO test_payments'));
    assert.ok(insertQuery, 'Deve inserir na tabela test_payments');
    assert.ok(insertQuery.sql.includes("'pix'"), 'SQL deve conter método pix');
    assert.equal(insertQuery.values[3], 1.00); // amount
    assert.equal(insertQuery.values[4], 'sandbox'); // environment

    // Garantir que NENHUMA query tocou em companies ou plans
    const modifiedCompanies = queryLog.filter(q => q.sql.includes('UPDATE companies') || q.sql.includes('INSERT INTO companies'));
    assert.equal(modifiedCompanies.length, 0, 'Jamais deve alterar a tabela companies em pagamentos de teste');
  });

  test('4. Criação de Cartão de Teste força R$ 2,50 no backend e NÃO armazena dados sensíveis', async () => {
    const cardPayload = {
      token: 'fake_card_token_xyz987',
      payment_method_id: 'master',
      installments: 1,
      payer: {
        email: 'admin@itapoa.online',
        identification: { type: 'CPF', number: '12345678901' },
      },
    };

    const result = await testPaymentService.createCardTestPayment(
      'user_admin_master',
      'company_sample_123',
      cardPayload,
      'sandbox',
      'https://itapoa.online'
    );

    assert.ok(result.id.startsWith('test_card_'), 'Identificador de teste deve iniciar com test_card_');
    assert.equal(result.amount, 2.50, 'Valor retornado deve ser estritamente 2.50');
    assert.equal(result.cardLastFour, '1234');

    // Verificar chamada ao Mercado Pago
    const mpRequest = fetchLog.find(f => f.url.includes('/v1/payments'));
    assert.ok(mpRequest, 'Deveria ter chamado a API do Mercado Pago');
    assert.equal(mpRequest.body.transaction_amount, 2.50, 'Mercado Pago deve receber estritamente 2.50');
    assert.equal(mpRequest.body.token, 'fake_card_token_xyz987');

    // Verificar se NÃO salvou token ou CVV no banco de dados
    const insertQuery = queryLog.find(q => q.sql.includes('INSERT INTO test_payments'));
    assert.ok(insertQuery, 'Deve inserir na tabela test_payments');
    assert.equal(insertQuery.values[4], 2.50);
    assert.equal(insertQuery.values[9], '1234'); // cardLastFour
    assert.equal(insertQuery.values[10], 'master'); // cardBrand

    // Assegurar que nenhum valor de token/cvv/cartão completo está presente nos parâmetros SQL
    const serializedSqlValues = JSON.stringify(insertQuery.values);
    assert.equal(serializedSqlValues.includes('fake_card_token_xyz987'), false, 'Token de cartão não deve ser persistido no banco');
  });

  test('5. Webhook de Pagamento de Teste NÃO concede Plano VIP nem altera empresas', async () => {
    // Simular resposta da API do Mercado Pago ao buscar o pagamento
    globalThis.fetch = async () => new Response(JSON.stringify({
      id: 999888777,
      status: 'approved',
      transaction_amount: 1.00,
      external_reference: 'test_pix_demo123',
    }), { status: 200 });

    const settleResult = await testPaymentService.settleTestWebhookPayment('999888777', 'TEST-token-12345');

    assert.equal(settleResult.status, 'approved');
    assert.equal(settleResult.reconciled, true);

    // Verificar que apenas a tabela test_payments foi atualizada
    const updateQuery = queryLog.find(q => q.sql.includes('UPDATE test_payments'));
    assert.ok(updateQuery, 'Deve atualizar a tabela test_payments para approved');
    assert.equal(updateQuery.values[0], 'approved');

    // Garantir que NENHUM update em companies foi disparado
    const companyUpdates = queryLog.filter(q => q.sql.includes('UPDATE companies'));
    assert.equal(companyUpdates.length, 0, 'Webhook de teste NUNCA deve alterar status VIP ou planLevel em companies');
  });

  test('6. Rejeição de Divergência de Valor (Prevenção de Fraude / Inconsistência)', async () => {
    // Simular que o gateway reportou valor divergente do R$ 1,00 esperado
    globalThis.fetch = async () => new Response(JSON.stringify({
      id: 999888777,
      status: 'approved',
      transaction_amount: 0.50, // Divergente
      external_reference: 'test_pix_demo123',
    }), { status: 200 });

    await assert.rejects(
      async () => {
        await testPaymentService.settleTestWebhookPayment('999888777', 'TEST-token-12345');
      },
      /Valor divergente no pagamento de teste/
    );
  });
});
