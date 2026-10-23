/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Real Mercado Pago integration. The backend is the sole payment authority:
 *  - PIX charges are created by calling the Mercado Pago REST API directly;
 *  - the QR code returned to the client comes from Mercado Pago, never fabricated;
 *  - activation uses one verified settlement path for webhooks/reconciliation,
 *    never a client-reported status.
 *
 * Credentials in payment_config take precedence over environment fallback.
 * The access token is never sent to the client.
 */

import crypto from 'crypto';
import { pool } from '../mysql.js';
import { PaymentError } from './paymentError.js';
import { assertGatewayPayment, mercadoPagoGet, paymentCents, settlePayment } from './paymentSettlement.js';
export { PaymentError } from './paymentError.js';

const MP_API = 'https://api.mercadopago.com';


interface PlanRow {
  id: string;
  name: string;
  price: number;
  version?: number;
}

interface CreatedPix {
  paymentId: string;
  qrCode: string;
  qrCodeBase64: string;
  amount: number;
  expirationDate: string;
  subscriptionId: string;
}

class PaymentService {
  async gatewayConfig() {
    const [rows]: any = await pool.query('SELECT publicKey, accessToken FROM payment_config WHERE id = ? LIMIT 1', ['payment']);
    const dbPublicKey = rows[0]?.publicKey?.trim();
    const publicKey = dbPublicKey || process.env.MERCADOPAGO_PUBLIC_KEY?.trim() || '';
    const dbAccessToken = rows[0]?.accessToken?.trim();
    const accessTokenConfigured = Boolean(dbAccessToken || process.env.MERCADOPAGO_ACCESS_TOKEN?.trim());
    const webhookConfigured = Boolean(this.webhookSecret());
    const ready = accessTokenConfigured && (process.env.NODE_ENV !== 'production' || webhookConfigured);
    return { publicKey, pixEnabled: ready, cardEnabled: ready && Boolean(publicKey) };
  }

  async assertGatewayReady(db: any = pool) {
    if (process.env.NODE_ENV === 'production' && !this.webhookSecret()) {
      throw new PaymentError(503, 'Pagamentos indisponíveis: configuração de confirmação pendente.');
    }
    return this.accessToken(db);
  }

  /** Only SDK-tokenized card data is accepted. Price and ownership never come from the browser. */
  private async withCreationLock<T>(companyId: string, planId: string, action: (db: any) => Promise<T>): Promise<T> {
    const db = await pool.getConnection();
    const key = 'itapoa:pay:' + crypto.createHash('sha256').update(companyId + ':' + planId).digest('hex').slice(0, 48);
    let locked = false, reusable = true;
    try {
      const [rows]: any = await db.query('SELECT GET_LOCK(?, 5) AS acquired', [key]);
      if (Number(rows[0]?.acquired) !== 1) throw new PaymentError(409, 'Uma tentativa está sendo processada. Aguarde antes de tentar novamente.');
      locked = true;
      return await action(db);
    } finally {
      if (locked) {
        try { await db.query('SELECT RELEASE_LOCK(?)', [key]); }
        catch { db.destroy(); reusable = false; }
      }
      if (reusable) db.release();
    }
  }

  async createCardPayment(userId: string, companyId: string, planId: string, input: Record<string, any>, appUrl: string) {
    return this.withCreationLock(companyId, planId, db => this.createCardPaymentLocked(userId, companyId, planId, input, appUrl, db));
  }

  private async createCardPaymentLocked(userId: string, companyId: string, planId: string, input: Record<string, any>, appUrl: string, db: any) {
    const [activePlan]: any = await db.query("SELECT id FROM subscriptions WHERE companyId=? AND planId=? AND status='active' AND (nextBillingDate IS NULL OR nextBillingDate > UTC_TIMESTAMP()) LIMIT 1", [companyId, planId]);
    if (activePlan.length) throw new PaymentError(409, 'Este plano já está ativo. Nenhuma nova cobrança foi criada.');
    const plan = await this.getPlan(planId, db);
    if (plan.price <= 0) throw new PaymentError(400, 'Este plano não requer pagamento.');
    const token = await this.assertGatewayReady(db);
    const requestId = typeof input.requestId === 'string' ? input.requestId : '';
    const form = input.formData ?? {};
    const payer = form.payer ?? {};
    const email = typeof payer.email === 'string' ? payer.email.trim().toLowerCase() : '';
    const identification = payer.identification ?? {};
    const docNumber = String(identification.number ?? '').replace(/\D/g, '');
    const docType = String(identification.type ?? '').toUpperCase().trim();

    if (!/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(requestId) || !/^[\w-]{8,255}$/.test(String(form.token ?? '')) ||
        !/^[\w-]{2,60}$/.test(String(form.payment_method_id ?? '')) ||
        !Number.isInteger(form.installments) || form.installments < 1 || form.installments > 12 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 ||
        !['CPF', 'CNPJ'].includes(docType) ||
        !(docType === 'CPF' ? /^\d{11}$/ : /^\d{14}$/).test(docNumber)) {
      throw new PaymentError(400, 'Confira os dados do pagamento.');
    }
    const [pending]: any = await db.query("SELECT id, userId, paymentMethod, createdAt, TIMESTAMPDIFF(SECOND, createdAt, UTC_TIMESTAMP()) AS ageSeconds FROM subscriptions WHERE companyId=? AND planId=? AND status='pending' ORDER BY createdAt DESC LIMIT 1", [companyId, planId]);
    if (pending[0]) {
      if (pending[0].userId !== userId || pending[0].paymentMethod !== 'credit_card') throw new PaymentError(409, 'Há outro pagamento em andamento para este plano. Retome a tentativa existente.');
      // Age is not evidence that a remote charge failed. Never replay a token.
      return { subscriptionId: pending[0].id, status: 'unknown' };
    }
    const subscriptionId = `card_${crypto.createHash('sha256').update(`${userId}:${requestId}`).digest('hex')}`;
    const [usedAttempt]: any = await db.query('SELECT id FROM subscriptions WHERE id=?', [subscriptionId]);
    if (usedAttempt.length) throw new PaymentError(409, 'Esta tentativa já foi utilizada. Consulte seu status antes de iniciar outra.');
    await db.query(
      `INSERT IGNORE INTO subscriptions (id, userId, companyId, planId, status, amount, paymentMethod, payment_type, contracted_price, plan_version, nextBillingDate)
       VALUES (?, ?, ?, ?, 'pending', ?, 'credit_card', 'onetime_card', ?, ?, ?)`,
      [subscriptionId, userId, companyId, planId, plan.price, plan.price, plan.version || 1, new Date(Date.now() + 30 * 86400000)]
    ).catch(async () => {
      return await db.query(
        `INSERT IGNORE INTO subscriptions (id, userId, companyId, planId, status, amount, paymentMethod, nextBillingDate)
         VALUES (?, ?, ?, ?, 'pending', ?, 'credit_card', ?)`,
        [subscriptionId, userId, companyId, planId, plan.price, new Date(Date.now() + 30 * 86400000)]
      );
    });
    const [rows]: any = await db.query('SELECT userId, companyId, planId, amount FROM subscriptions WHERE id = ?', [subscriptionId]);
    const sub = rows[0];
    if (!sub || sub.userId !== userId || sub.companyId !== companyId || sub.planId !== planId || Number(sub.amount) !== plan.price) {
      throw new PaymentError(409, 'Esta tentativa pertence a outra compra. Inicie uma nova tentativa.');
    }
    let response: globalThis.Response;
    try {
      response = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST', signal: AbortSignal.timeout(15000),
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'X-Idempotency-Key': subscriptionId },
        body: JSON.stringify({
          token: form.token, payment_method_id: form.payment_method_id,
          ...(form.issuer_id ? { issuer_id: String(form.issuer_id) } : {}),
          installments: form.installments, transaction_amount: plan.price,
          description: `Plano ${plan.name} — Itapoá Online`, external_reference: subscriptionId,
          metadata: { company_id: companyId, user_id: userId, plan_id: planId },
          notification_url: `${appUrl.replace(/\/$/, '')}/api/webhooks/mercadopago`,
          payer: { email, identification: { type: docType, number: docNumber } }
        })
      });
    } catch {
      // Unknown outcome: preserve this attempt and wait for its webhook. Never invite a second charge.
      return { subscriptionId, status: 'unknown' };
    }
    const payment: any = await response.json().catch(() => ({}));
    if (response.ok && !payment.id) return { subscriptionId, status: 'unknown' };
    if (!response.ok || !payment.id) {
      console.error('[payment-card] gateway_request_failed', response.status);
      if (response.status >= 500 || [409, 429].includes(response.status)) return { subscriptionId, status: 'unknown' };
      await db.query("UPDATE subscriptions SET status='canceled' WHERE id=? AND status='pending'", [subscriptionId]);
      throw new PaymentError(response.status === 400 ? 400 : 422, 'O Mercado Pago não conseguiu processar esta tentativa. Confira os dados ou tente novamente.');
    }
    await db.query(
      `INSERT INTO payment_logs (id, subscriptionId, amount, status, gateway_reference) VALUES (?, ?, ?, 'pending', ?)
       ON DUPLICATE KEY UPDATE gateway_reference = VALUES(gateway_reference)`,
      [`pay_mp_${String(payment.id)}`, subscriptionId, plan.price, String(payment.id)]
    );
    if (['rejected', 'cancelled'].includes(payment.status)) {
      await db.query("UPDATE subscriptions SET status='canceled' WHERE id=? AND status='pending'", [subscriptionId]);
    }
    // Approval is applied only by the shared validated settlement transaction.
    return { paymentId: String(payment.id), subscriptionId, status: String(payment.status) };
  }
  private async accessToken(db: any = pool): Promise<string> {
    const [rows]: any = await db.query(
      'SELECT accessToken FROM payment_config WHERE id = ? LIMIT 1',
      ['payment']
    );
    const dbToken = rows[0]?.accessToken?.trim();
    if (dbToken) return dbToken;

    const fromEnv = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
    if (fromEnv) return fromEnv;

    throw new PaymentError(503, 'Gateway de pagamento não configurado.');
  }

  private webhookSecret(): string | null {
    return process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim() || null;
  }

  private async getPlan(planId: string, db: any = pool): Promise<PlanRow> {
    const [rows]: any = await db.query(
      'SELECT id, name, price, version, is_active, allow_new_subscriptions FROM plans WHERE id = ? LIMIT 1',
      [planId]
    );
    if (rows.length === 0) throw new PaymentError(404, 'Plano não encontrado.');
    if (rows[0].is_active === 0 || rows[0].allow_new_subscriptions === 0) throw new PaymentError(409, 'Este plano não está disponível para contratação.');
    const price = Number(rows[0].price) === 0 ? 0 : paymentCents(rows[0].price) / 100;
    if (price > 0 && !['plan_gold_vip','plan_diamond_extremo'].includes(rows[0].id)) throw new PaymentError(409, 'Plano pago não reconhecido.');
    return { id: rows[0].id, name: rows[0].name, price, version: Number(rows[0].version) || 1 };
  }

  async createPixPayment(userId: string, companyId: string, planId: string, payerEmail: string,
    payerName?: string, payerDoc?: { type?: string; number?: string }, requestId?: string): Promise<CreatedPix> {
    return this.withCreationLock(companyId, planId, db => this.createPixPaymentLocked(userId, companyId, planId, payerEmail, payerName, payerDoc, requestId, db));
  }

  private async createPixPaymentLocked(
    userId: string,
    companyId: string,
    planId: string,
    payerEmail: string,
    payerName: string | undefined,
    payerDoc: { type?: string; number?: string } | undefined,
    requestId: string | undefined,
    db: any
  ): Promise<CreatedPix> {
    if (typeof payerEmail !== 'string' || payerEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payerEmail)) throw new PaymentError(400, 'Informe um e-mail válido para o pagamento.');
    await this.assertGatewayReady(db);
    const [activePlan]: any = await db.query("SELECT id FROM subscriptions WHERE companyId=? AND planId=? AND status='active' AND (nextBillingDate IS NULL OR nextBillingDate > UTC_TIMESTAMP()) LIMIT 1", [companyId, planId]);
    if (activePlan.length) throw new PaymentError(409, 'Este plano já está ativo. Nenhuma nova cobrança foi criada.');
    const plan = await this.getPlan(planId, db);
    if (plan.price <= 0) {
      throw new PaymentError(400, 'Este plano não requer pagamento.');
    }

    const [other]: any = await db.query("SELECT id FROM subscriptions WHERE companyId=? AND planId=? AND status='pending' AND paymentMethod != 'pix' LIMIT 1", [companyId, planId]);
    if (other.length) throw new PaymentError(409, 'Há outro pagamento em andamento. Retome a tentativa existente.');
    const existing = await this.getActivePixForCompany(companyId, planId, userId, db);
    if (existing) return existing;

    const token = await this.accessToken(db);

    const [pending]: any = await db.query("SELECT id, createdAt, TIMESTAMPDIFF(SECOND, createdAt, UTC_TIMESTAMP()) AS ageSeconds FROM subscriptions WHERE companyId=? AND planId=? AND status='pending' AND paymentMethod='pix' ORDER BY createdAt DESC LIMIT 1", [companyId, planId]);
    if (pending[0]) {
        const [logs]: any = await db.query('SELECT gateway_reference FROM payment_logs WHERE subscriptionId=? LIMIT 1', [pending[0].id]);
        if (!logs[0]?.gateway_reference) throw new PaymentError(409, 'Existe uma tentativa sem confirmação. Aguarde a reconciliação; não gere outra cobrança.');
        const previous = await mercadoPagoGet('/v1/payments/' + encodeURIComponent(logs[0].gateway_reference), token);
        assertGatewayPayment(previous, String(logs[0].gateway_reference), token, await mercadoPagoGet('/users/me', token), pending[0].id);
        if (previous.external_reference !== pending[0].id || previous.currency_id !== 'BRL' || paymentCents(previous.transaction_amount) !== paymentCents(plan.price)) {
          throw new PaymentError(422, 'A cobrança anterior requer conferência. Nenhuma nova cobrança foi criada.');
        }
        const expired = previous.status === 'pending' && typeof previous.date_of_expiration === 'string' && new Date(previous.date_of_expiration).getTime() <= Date.now();
        if (!expired && !['rejected','cancelled','refunded','charged_back'].includes(previous.status)) {
          throw new PaymentError(409, 'A cobrança anterior ainda requer confirmação. Consulte seu status antes de tentar novamente.');
        }
        await db.query("UPDATE subscriptions SET status='canceled' WHERE id=? AND status='pending'", [pending[0].id]);
    }
    const normReqId = typeof requestId === 'string' && /^[a-f0-9-]{8,64}$/i.test(requestId.trim()) ? requestId.trim() : crypto.randomUUID();
    const subscriptionId = 'pix_' + crypto.createHash('sha256').update(userId + ':' + companyId + ':' + planId + ':' + normReqId).digest('hex');
    const [used]: any = await db.query('SELECT id FROM subscriptions WHERE id=?', [subscriptionId]);
    if (used.length) throw new PaymentError(409, 'Esta tentativa já foi utilizada. Inicie uma nova tentativa após confirmar o encerramento da anterior.');
    const nextBilling = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.query(
      `INSERT IGNORE INTO subscriptions
         (id, userId, companyId, planId, status, amount, paymentMethod, payment_type, contracted_price, plan_version, nextBillingDate)
       VALUES (?, ?, ?, ?, 'pending', ?, 'pix', 'onetime_pix', ?, ?, ?)`,
      [subscriptionId, userId, companyId, planId, plan.price, plan.price, plan.version || 1, nextBilling]
    ).catch(async () => {
      return await db.query(
        `INSERT IGNORE INTO subscriptions
           (id, userId, companyId, planId, status, amount, paymentMethod, nextBillingDate)
         VALUES (?, ?, ?, ?, 'pending', ?, 'pix', ?)`,
        [subscriptionId, userId, companyId, planId, plan.price, nextBilling]
      );
    });

    const [subRows]: any = await db.query(
      'SELECT userId, companyId, planId, amount FROM subscriptions WHERE id = ?',
      [subscriptionId]
    );
    const sub = subRows[0];
    if (!sub || sub.userId !== userId || sub.companyId !== companyId || sub.planId !== planId || Number(sub.amount) !== plan.price) {
      throw new PaymentError(409, 'Esta tentativa pertence a outra compra. Inicie uma nova tentativa.');
    }

    // Se já houver um registro de gateway para esta tentativa determinística, reutilizar
    const [existingLogs]: any = await db.query(
      'SELECT gateway_reference FROM payment_logs WHERE subscriptionId = ? LIMIT 1',
      [subscriptionId]
    );
    if (existingLogs.length > 0 && existingLogs[0].gateway_reference) {
      const reuse = await this.getActivePixForCompany(companyId, planId, userId, db);
      if (reuse) return reuse;
      throw new PaymentError(409, 'Esta cobrança já foi emitida. Consulte seu status antes de iniciar outra.');
    }

    const idempotencyKey = `${subscriptionId}`;
    const dateOfExpiration = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const appUrl = (process.env.APP_URL || 'https://itapoa.online').replace(/\/$/, '');

    const nameParts = (payerName || '').trim().split(/\s+/);
    const firstName = nameParts[0] || 'Cliente';
    const lastName = nameParts.slice(1).join(' ') || 'Itapoá';

    const cleanDocNumber = payerDoc?.number ? String(payerDoc.number).replace(/\D/g, '') : '';
    const cleanDocType = payerDoc?.type ? String(payerDoc.type).toUpperCase().trim() : '';
    const hasDoc = (cleanDocType === 'CPF' && cleanDocNumber.length === 11) || (cleanDocType === 'CNPJ' && cleanDocNumber.length === 14);

    const body: Record<string, any> = {
      transaction_amount: Number(plan.price.toFixed(2)),
      description: `Assinatura ${plan.name} — Guia Comercial Itapoá`,
      payment_method_id: 'pix',
      external_reference: subscriptionId,
      date_of_expiration: dateOfExpiration,
      notification_url: `${appUrl}/api/webhooks/mercadopago`,
      metadata: { company_id: companyId, user_id: userId, plan_id: planId },
      payer: {
        email: payerEmail,
        first_name: firstName,
        last_name: lastName,
        ...(hasDoc ? { identification: { type: cleanDocType, number: cleanDocNumber } } : {})
      }
    };

    let mp: any;
    try {
      const resp = await fetch(`${MP_API}/v1/payments`, {
        method: 'POST', signal: AbortSignal.timeout(15000),
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify(body)
      });
      mp = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        console.error('[payment-pix] gateway_request_failed', resp.status);
        if (resp.status >= 500 || [409,429].includes(resp.status)) throw new PaymentError(502, 'Resultado da emissão ainda não confirmado. Aguarde a reconciliação antes de tentar novamente.');
        throw new PaymentError(422, 'Não foi possível emitir o Pix. Confira os dados e tente novamente.');
      }
      if (!/^\d+$/.test(String(mp.id))) throw new PaymentError(502, 'Resultado da emissão ainda não confirmado. Aguarde a reconciliação.');
    } catch (err) {
      if (err instanceof PaymentError) {
        if (err.status >= 400 && err.status < 500) try {
          await db.query('UPDATE subscriptions SET status = ? WHERE id = ? AND status = ?', ['canceled', subscriptionId, 'pending']);
        } catch {}
        throw err;
      }
      console.warn(`[payment] MP timeout/network for ${subscriptionId}`);
      throw new PaymentError(503, 'Gateway temporariamente indisponível. Tente novamente em instantes.');
    }

    const gatewayId = String(mp.id);
    const tx = mp.point_of_interaction?.transaction_data ?? {};

    await db.query(
      `INSERT INTO payment_logs (id, subscriptionId, amount, status, gateway_reference)
       VALUES (?, ?, ?, 'pending', ?)
       ON DUPLICATE KEY UPDATE gateway_reference = VALUES(gateway_reference)`,
      [`pay_mp_${gatewayId}`, subscriptionId, plan.price, gatewayId]
    );

    return {
      paymentId: gatewayId,
      qrCode: tx.qr_code ?? '',
      qrCodeBase64: tx.qr_code_base64 ?? '',
      amount: plan.price,
      expirationDate: mp.date_of_expiration ?? dateOfExpiration,
      subscriptionId: subscriptionId
    };
  }

  async createCheckoutPreference(_userId: string, _companyId: string, _planId: string, _payerEmail: string, _appUrl: string): Promise<{initPoint: string; subscriptionId: string}> {
    // Legacy redirect flow has no persistent attempt contract and is not used by
    // CheckoutPage. Do not expose a second, non-idempotent charging path.
    throw new PaymentError(410, 'Checkout externo descontinuado. Utilize a página de checkout com cartão ou Pix.');
  }

  verifyWebhookSignature(signatureHeader: string | undefined, requestId: string | undefined, dataId: string | undefined): boolean {
    const secret = this.webhookSecret();
    if (!secret || !signatureHeader || !requestId || !dataId || signatureHeader.length > 1024 ||
        requestId.length > 128 || /[\r\n;]/.test(requestId) || !/^[a-z0-9_-]{1,128}$/i.test(dataId)) return false;
    const parts = signatureHeader.split(',').map(part => part.trim().split('='));
    if (parts.some(part => part.length !== 2)) return false;
    const timestamps = parts.filter(([key]) => key === 'ts');
    const signatures = parts.filter(([key]) => key === 'v1').map(([, value]) => value);
    if (timestamps.length !== 1 || !signatures.length) return false;
    const ts = timestamps[0][1];
    if (!/^\d{10}(\d{3})?$/.test(ts || '')) return false;
    const seconds = ts.length === 13 ? Number(ts) / 1000 : Number(ts);
    if (Math.abs(Date.now() / 1000 - seconds) > 300) return false;
    const manifest = 'id:' + dataId.toLowerCase() + ';request-id:' + requestId + ';ts:' + ts + ';';
    const expected = crypto.createHmac('sha256', secret).update(manifest).digest();
    return signatures.some(value => /^[a-f0-9]{64}$/i.test(value || '') &&
      crypto.timingSafeEqual(expected, Buffer.from(value, 'hex')));
  }

  async handlePaymentNotification(paymentId: string) {
    return settlePayment(paymentId, await this.accessToken());
  }

  async getActivePixForCompany(companyId: string, planId: string, userId: string, db: any = pool): Promise<CreatedPix | null> {
    const [subs]: any = await db.query(
      `SELECT s.id, s.amount, s.planId AS subPlanId, pl.gateway_reference, pl.createdAt, s.createdAt AS subCreatedAt,
              TIMESTAMPDIFF(SECOND, s.createdAt, UTC_TIMESTAMP()) AS ageSeconds
         FROM subscriptions s
         INNER JOIN payment_logs pl ON pl.subscriptionId = s.id
        WHERE s.companyId = ? AND s.planId = ? AND s.userId = ? AND s.status = 'pending' AND s.paymentMethod = 'pix'
        ORDER BY s.createdAt DESC LIMIT 1`,
      [companyId, planId, userId]
    );
    if (subs.length === 0) return null;
    const row = subs[0];
    if (String(row.subPlanId) !== String(planId)) return null;

    try {
      const token = await this.accessToken(db);
      const resp = await fetch(`${MP_API}/v1/payments/${encodeURIComponent(String(row.gateway_reference))}`, {
        headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000)
      });
      if (!resp.ok) return null;
      const mp: any = await resp.json();
      assertGatewayPayment(mp, String(row.gateway_reference), token, await mercadoPagoGet('/users/me', token), String(row.id));
      if (mp.status !== 'pending' && mp.status !== 'in_process') return null;
      if (mp.currency_id !== 'BRL') return null;
      if (String(mp.external_reference) !== String(row.id) || String(mp.id) !== String(row.gateway_reference)) return null;
      const expected = Number(row.amount);
      const got = Number(mp.transaction_amount);
      if (paymentCents(mp.transaction_amount) !== paymentCents(row.amount)) return null;
      
      const expiration = mp.date_of_expiration;
      if (typeof expiration !== 'string' || !Number.isFinite(Date.parse(expiration)) || Date.parse(expiration) <= Date.now()) return null;
      const tx = mp.point_of_interaction?.transaction_data ?? {};
      return {
        paymentId: String(mp.id),
        qrCode: tx.qr_code ?? '',
        qrCodeBase64: tx.qr_code_base64 ?? '',
        amount: got || expected || 0,
        expirationDate: expiration,
        subscriptionId: String(row.id)
      };
    } catch {
      return null;
    }
  }

  getSubscriptionStatus(companyIds: string[]): Promise<string> {
    if (companyIds.length === 0) return Promise.resolve('trial');
    const placeholders = companyIds.map(() => '?').join(', ');
    return pool.query(
      `SELECT status FROM subscriptions
        WHERE companyId IN (${placeholders})
        ORDER BY createdAt DESC LIMIT 1`,
      companyIds
    ).then(([rows]: any) => rows[0]?.status ?? 'trial') as Promise<string>;
  }

  /**
   * Reconcilia uma cobrança/assinatura pendente consultando o Mercado Pago de forma idempotente.
   * Evita duplicidade de liberação e resolve atrasos ou falhas na entrega do webhook.
   */
  async reconcilePayment(subscriptionId: string) {
    const [rows]: any = await pool.query('SELECT status FROM subscriptions WHERE id = ? LIMIT 1', [subscriptionId]);
    if (!rows.length) throw new PaymentError(404, 'Assinatura / Cobrança não encontrada.');
    const [logs]: any = await pool.query('SELECT gateway_reference FROM payment_logs WHERE subscriptionId = ? ORDER BY createdAt DESC LIMIT 1', [subscriptionId]);
    if (!logs[0]?.gateway_reference) {
      const token = await this.accessToken();
      // A timeout may happen after the provider created a charge but before its
      // ID was saved. Search read-only by our server-owned external reference.
      const search = await mercadoPagoGet('/v1/payments/search?external_reference=' + encodeURIComponent(subscriptionId), token);
      const matches = Array.isArray(search.results) ? search.results.filter((payment: any) => payment.external_reference === subscriptionId) : [];
      if (matches.length > 1) throw new PaymentError(409, 'Mais de um pagamento encontrado. Aguarde a conferência do suporte.');
      if (matches.length === 1) return settlePayment(String(matches[0].id), token, subscriptionId);
      return { status: rows[0].status, reconciled: false, message: 'Aguardando identificação do pagamento no gateway. Não inicie outra cobrança.' };
    }
    return settlePayment(String(logs[0].gateway_reference), await this.accessToken(), subscriptionId);
  }
}

export const paymentService = new PaymentService();
