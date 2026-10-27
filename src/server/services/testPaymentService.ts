/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Serviço de Pagamentos de Teste do Mercado Pago.
 * Acessível exclusivamente para Administradores Master.
 *
 * REQUISITOS ESTRITOS:
 * 1. Valores validados no backend:
 *    - PIX: estritamente R$ 1,00 (100 centavos)
 *    - Cartão (crédito ou débito): estritamente R$ 2,50 (250 centavos)
 * 2. O frontend NUNCA define ou altera o preço.
 * 3. Não modifica os preços ou planos oficiais (Bronze, Gold, Diamond).
 * 4. Pagamentos de teste NUNCA liberam assinaturas VIP ou alteram o planLevel das empresas.
 * 5. Cada transação é registrada na tabela `test_payments`.
 * 6. Suporta ambiente Sandbox por padrão e produção sob confirmação explícita.
 * 7. Não armazena dados sensíveis de cartão (apenas brand e last_four retornados pelo gateway).
 */

import crypto from 'node:crypto';
import { pool } from '../mysql.js';
import { PaymentError } from './paymentError.js';
import { paymentCents, mercadoPagoGet } from './paymentSettlement.js';

export const TEST_PAYMENT_AMOUNTS = {
  pix: 1.00,
  card: 2.50,
} as const;

export interface TestPaymentRecord {
  id: string;
  userId: string;
  companyId: string | null;
  paymentMethod: string;
  amount: number;
  environment: 'sandbox' | 'production';
  status: string;
  gatewayReference: string | null;
  qrCode: string | null;
  qrCodeBase64: string | null;
  payerEmail: string | null;
  cardLastFour: string | null;
  cardBrand: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export class TestPaymentService {
  /**
   * Obtém credenciais ativas e determina se o gateway está em Sandbox ou Produção.
   */
  async getGatewayCredentials(preferredEnv: 'sandbox' | 'production' = 'sandbox') {
    // 1. Verificar se há credenciais sandbox explícitas em env
    const sandboxToken = process.env.MERCADOPAGO_SANDBOX_ACCESS_TOKEN?.trim();
    const sandboxPublicKey = process.env.MERCADOPAGO_SANDBOX_PUBLIC_KEY?.trim();

    // 2. Consultar payment_config
    const [rows]: any = await pool.query(
      'SELECT publicKey, accessToken FROM payment_config WHERE id = ? LIMIT 1',
      ['payment']
    );
    const dbPublicKey = rows[0]?.publicKey?.trim() || '';
    const dbAccessToken = rows[0]?.accessToken?.trim() || '';

    const defaultToken = dbAccessToken || process.env.MERCADOPAGO_ACCESS_TOKEN?.trim() || '';
    const defaultPublicKey = dbPublicKey || process.env.MERCADOPAGO_PUBLIC_KEY?.trim() || '';

    const isLiveCredential = defaultToken.startsWith('APP_USR-');
    const isSandboxCredential = defaultToken.startsWith('TEST-');

    if (preferredEnv === 'sandbox') {
      if (sandboxToken && sandboxPublicKey) {
        return {
          token: sandboxToken,
          publicKey: sandboxPublicKey,
          environment: 'sandbox' as const,
          isLiveCredential: false,
        };
      }
      if (isSandboxCredential) {
        return {
          token: defaultToken,
          publicKey: defaultPublicKey,
          environment: 'sandbox' as const,
          isLiveCredential: false,
        };
      }
      // Se não há credencial TEST configurada, mas o admin está em sandbox
      return {
        token: defaultToken,
        publicKey: defaultPublicKey,
        environment: 'sandbox' as const,
        isLiveCredential,
        needsSandboxKey: isLiveCredential,
      };
    }

    // Produção (Transações Reais de Baixo Valor)
    if (!defaultToken) {
      throw new PaymentError(503, 'Gateway Mercado Pago não configurado.');
    }

    return {
      token: defaultToken,
      publicKey: defaultPublicKey,
      environment: 'production' as const,
      isLiveCredential,
    };
  }

  /**
   * Configuração pública para o checkout do Admin Master.
   */
  async getConfig(preferredEnv: 'sandbox' | 'production' = 'sandbox') {
    const creds = await this.getGatewayCredentials(preferredEnv);
    return {
      publicKey: creds.publicKey,
      environment: creds.environment,
      isLiveCredential: creds.isLiveCredential,
      needsSandboxKey: creds.needsSandboxKey ?? false,
      amounts: TEST_PAYMENT_AMOUNTS,
      pixEnabled: Boolean(creds.token),
      cardEnabled: Boolean(creds.token && creds.publicKey),
    };
  }

  /**
   * Criação de PIX de Teste (estritamente R$ 1,00).
   */
  async createPixTestPayment(
    userId: string,
    companyId: string | null,
    payerEmail: string,
    payerName = 'Administrador Teste',
    environment: 'sandbox' | 'production' = 'sandbox',
    appUrl = 'https://itapoa.online'
  ) {
    if (!payerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payerEmail)) {
      throw new PaymentError(400, 'Informe um e-mail válido para o pagamento de teste.');
    }

    const amount = TEST_PAYMENT_AMOUNTS.pix; // Estritamente 1.00
    const creds = await this.getGatewayCredentials(environment);
    if (!creds.token) {
      throw new PaymentError(503, 'Credenciais do Mercado Pago não configuradas.');
    }

    const testId = `test_pix_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
    const notificationUrl = `${appUrl.replace(/\/$/, '')}/api/webhooks/mercadopago`;

    // Chamada à API oficial do Mercado Pago
    let mpResponse: any;
    try {
      const res = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        signal: AbortSignal.timeout(15000),
        headers: {
          Authorization: `Bearer ${creds.token}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': testId,
        },
        body: JSON.stringify({
          transaction_amount: amount,
          description: `Pagamento de Teste PIX R$ ${amount.toFixed(2)} — Itapoá Online`,
          payment_method_id: 'pix',
          external_reference: testId,
          notification_url: notificationUrl,
          payer: {
            email: payerEmail.trim().toLowerCase(),
            first_name: payerName,
          },
          metadata: {
            is_test_payment: true,
            test_payment_id: testId,
            environment,
            user_id: userId,
            company_id: companyId,
          },
        }),
      });

      mpResponse = await res.json().catch(() => ({}));
      if (!res.ok || !mpResponse?.id) {
        const errorDetail = mpResponse?.message || 'Falha na resposta do Mercado Pago.';
        console.error('[test-payments] pix_creation_failed', res.status, mpResponse);
        throw new PaymentError(res.status === 400 ? 400 : 502, `Mercado Pago: ${errorDetail}`);
      }
    } catch (err: any) {
      if (err instanceof PaymentError) throw err;
      throw new PaymentError(502, `Não foi possível gerar o PIX de teste no gateway: ${err?.message || err}`);
    }

    const poi = mpResponse.point_of_interaction?.transaction_data;
    const qrCode = poi?.qr_code || '';
    const qrCodeBase64 = poi?.qr_code_base64 || '';
    const gatewayRef = String(mpResponse.id);
    const mpStatus = String(mpResponse.status || 'pending');

    // Registrar exclusivamente na tabela test_payments
    await pool.query(
      `INSERT INTO test_payments 
        (id, user_id, company_id, payment_method, amount, environment, status, gateway_reference, qr_code, qr_code_base64, payer_email)
       VALUES (?, ?, ?, 'pix', ?, ?, ?, ?, ?, ?, ?)`,
      [testId, userId, companyId, amount, environment, mpStatus, gatewayRef, qrCode, qrCodeBase64, payerEmail]
    );

    return {
      id: testId,
      gatewayReference: gatewayRef,
      amount,
      qrCode,
      qrCodeBase64,
      status: mpStatus,
      environment,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Criação de Cartão de Teste (estritamente R$ 2,50).
   * Suporta crédito ou débito conforme identificado pelo Brick / token do Mercado Pago.
   * Não armazena dados sensíveis de cartão.
   */
  async createCardTestPayment(
    userId: string,
    companyId: string | null,
    cardFormData: Record<string, any>,
    environment: 'sandbox' | 'production' = 'sandbox',
    appUrl = 'https://itapoa.online'
  ) {
    const amount = TEST_PAYMENT_AMOUNTS.card; // Estritamente 2.50
    const creds = await this.getGatewayCredentials(environment);
    if (!creds.token) {
      throw new PaymentError(503, 'Credenciais do Mercado Pago não configuradas.');
    }

    const form = cardFormData.formData ?? cardFormData ?? {};
    const token = form.token;
    const paymentMethodId = form.payment_method_id;
    const installments = Number(form.installments) || 1;
    const payer = form.payer ?? {};
    const email = typeof payer.email === 'string' ? payer.email.trim().toLowerCase() : '';
    const identification = payer.identification ?? {};
    const docNumber = String(identification.number ?? '').replace(/\D/g, '');
    const docType = String(identification.type ?? 'CPF').toUpperCase().trim();

    if (!token || !paymentMethodId) {
      throw new PaymentError(400, 'Token de cartão e método de pagamento são obrigatórios.');
    }

    const testId = `test_card_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`;
    const notificationUrl = `${appUrl.replace(/\/$/, '')}/api/webhooks/mercadopago`;

    let mpResponse: any;
    try {
      const res = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        signal: AbortSignal.timeout(15000),
        headers: {
          Authorization: `Bearer ${creds.token}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': testId,
        },
        body: JSON.stringify({
          transaction_amount: amount,
          token,
          description: `Pagamento de Teste Cartão R$ ${amount.toFixed(2)} — Itapoá Online`,
          payment_method_id: paymentMethodId,
          ...(form.issuer_id ? { issuer_id: String(form.issuer_id) } : {}),
          installments,
          external_reference: testId,
          notification_url: notificationUrl,
          payer: {
            email: email || 'admin@itapoa.online',
            ...(docNumber ? { identification: { type: docType, number: docNumber } } : {}),
          },
          metadata: {
            is_test_payment: true,
            test_payment_id: testId,
            environment,
            user_id: userId,
            company_id: companyId,
          },
        }),
      });

      mpResponse = await res.json().catch(() => ({}));
      if (!res.ok || !mpResponse?.id) {
        const errorDetail = mpResponse?.message || 'Falha ao processar cartão com Mercado Pago.';
        console.error('[test-payments] card_creation_failed', res.status, mpResponse);
        throw new PaymentError(res.status === 400 ? 400 : 502, `Mercado Pago: ${errorDetail}`);
      }
    } catch (err: any) {
      if (err instanceof PaymentError) throw err;
      throw new PaymentError(502, `Erro ao processar pagamento com cartão: ${err?.message || err}`);
    }

    const gatewayRef = String(mpResponse.id);
    const mpStatus = String(mpResponse.status || 'pending');
    const paymentMethodType = mpResponse.payment_type_id === 'debit_card' ? 'debit_card' : 'credit_card';
    const cardLastFour = mpResponse.card?.last_four_digits ? String(mpResponse.card.last_four_digits) : null;
    const cardBrand = mpResponse.payment_method_id ? String(mpResponse.payment_method_id) : null;

    // Registrar exclusivamente na tabela test_payments
    await pool.query(
      `INSERT INTO test_payments 
        (id, user_id, company_id, payment_method, amount, environment, status, gateway_reference, payer_email, card_last_four, card_brand)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [testId, userId, companyId, paymentMethodType, amount, environment, mpStatus, gatewayRef, email, cardLastFour, cardBrand]
    );

    return {
      id: testId,
      gatewayReference: gatewayRef,
      paymentMethod: paymentMethodType,
      amount,
      status: mpStatus,
      environment,
      cardBrand,
      cardLastFour,
      statusDetail: mpResponse.status_detail,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Reconcilia ou consulta status de um pagamento de teste diretamente no Mercado Pago.
   * Não altera planos comerciais ou VIP.
   */
  async reconcileTestPayment(testPaymentId: string) {
    const [rows]: any = await pool.query(
      'SELECT * FROM test_payments WHERE id = ? LIMIT 1',
      [testPaymentId]
    );
    if (!rows.length) {
      throw new PaymentError(404, 'Transação de teste não encontrada.');
    }
    const testPay = rows[0];

    const creds = await this.getGatewayCredentials(testPay.environment);
    if (!creds.token) {
      throw new PaymentError(503, 'Gateway não configurado para reconciliação.');
    }

    let mp: any = null;
    if (testPay.gateway_reference) {
      try {
        mp = await mercadoPagoGet(`/v1/payments/${encodeURIComponent(testPay.gateway_reference)}`, creds.token);
      } catch (err) {
        console.warn('[test-payments] reconcile_fetch_failed', err);
      }
    }

    if (!mp) {
      // Buscar por external_reference
      try {
        const search = await mercadoPagoGet(`/v1/payments/search?external_reference=${encodeURIComponent(testPaymentId)}`, creds.token);
        if (Array.isArray(search.results) && search.results.length > 0) {
          mp = search.results[0];
        }
      } catch (err) {
        console.warn('[test-payments] search_failed', err);
      }
    }

    if (!mp) {
      return {
        id: testPay.id,
        status: testPay.status,
        reconciled: false,
        message: 'Aguardando atualização do gateway.',
      };
    }

    const remoteStatus = String(mp.status || 'pending');
    await pool.query(
      'UPDATE test_payments SET status = ?, gateway_reference = COALESCE(gateway_reference, ?), updated_at = UTC_TIMESTAMP() WHERE id = ?',
      [remoteStatus, String(mp.id), testPaymentId]
    );

    return {
      id: testPay.id,
      gatewayReference: String(mp.id),
      status: remoteStatus,
      amount: Number(testPay.amount),
      paymentMethod: testPay.payment_method,
      environment: testPay.environment,
      reconciled: true,
      message: `Status atualizado: ${remoteStatus}`,
    };
  }

  /**
   * Settle exclusivo para webhooks de teste.
   * Chamado quando external_reference inicia com 'test_'.
   * Garante que NENHUMA empresa receba upgrade VIP como efeito colateral.
   */
  async settleTestWebhookPayment(paymentId: string, token: string) {
    const mp = await mercadoPagoGet(`/v1/payments/${paymentId}`, token);
    const subscriptionId = String(mp.external_reference || '');

    if (!subscriptionId.startsWith('test_')) {
      return { status: 'ignored', reconciled: false };
    }

    const [rows]: any = await pool.query(
      'SELECT id, amount, environment FROM test_payments WHERE id = ? LIMIT 1',
      [subscriptionId]
    );

    if (!rows.length) {
      return { status: 'ignored', reconciled: false, message: 'Pagamento de teste não localizado no banco.' };
    }

    const testPay = rows[0];
    const paidCents = paymentCents(mp.transaction_amount);
    const expectedCents = paymentCents(testPay.amount);

    if (paidCents !== expectedCents) {
      console.warn('[test-payments] amount_mismatch', paidCents, expectedCents);
      throw new PaymentError(422, 'Valor divergente no pagamento de teste.');
    }

    const remoteStatus = String(mp.status || 'pending');
    await pool.query(
      'UPDATE test_payments SET status = ?, gateway_reference = ?, updated_at = UTC_TIMESTAMP() WHERE id = ?',
      [remoteStatus, paymentId, subscriptionId]
    );

    return {
      id: subscriptionId,
      status: remoteStatus,
      reconciled: true,
      message: `Pagamento de teste ${subscriptionId} atualizado para ${remoteStatus} sem impacto nos planos VIP.`,
    };
  }

  /**
   * Lista o histórico de pagamentos de teste para auditoria no painel Master.
   */
  async listHistory(limit = 50): Promise<TestPaymentRecord[]> {
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const [rows]: any = await pool.query(
      `SELECT 
        id, user_id AS userId, company_id AS companyId, payment_method AS paymentMethod,
        amount, environment, status, gateway_reference AS gatewayReference,
        qr_code AS qrCode, qr_code_base64 AS qrCodeBase64, payer_email AS payerEmail,
        card_last_four AS cardLastFour, card_brand AS cardBrand, error_message AS errorMessage,
        DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS createdAt,
        DATE_FORMAT(updated_at, '%Y-%m-%d %H:%i:%s') AS updatedAt
       FROM test_payments
       ORDER BY created_at DESC
       LIMIT ?`,
      [safeLimit]
    );

    return (rows || []).map((r: any) => ({
      ...r,
      amount: Number(r.amount),
    }));
  }
}

export const testPaymentService = new TestPaymentService();
