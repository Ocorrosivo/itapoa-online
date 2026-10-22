/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Real Mercado Pago integration. The backend is the sole payment authority:
 *  - PIX charges are created by calling the Mercado Pago REST API directly;
 *  - the QR code returned to the client comes from Mercado Pago, never fabricated;
 *  - subscription activation happens ONLY from the verified webhook, never from
 *    a client-reported status.
 *
 * The access token is read from the environment (MERCADOPAGO_ACCESS_TOKEN) and,
 * failing that, from the payment_config row — it is never sent to the client.
 */

import crypto from 'crypto';
import { pool } from '../mysql.js';

const MP_API = 'https://api.mercadopago.com';

export class PaymentError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

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

  async assertGatewayReady() {
    if (process.env.NODE_ENV === 'production' && !this.webhookSecret()) {
      throw new PaymentError(503, 'Pagamentos indisponíveis: configuração de confirmação pendente.');
    }
    return this.accessToken();
  }

  /** Only SDK-tokenized card data is accepted. Price and ownership never come from the browser. */
  /** Only SDK-tokenized card data is accepted. Price and ownership never come from the browser. */
  async createCardPayment(userId: string, companyId: string, planId: string, input: Record<string, any>, appUrl: string) {
    const plan = await this.getPlan(planId);
    if (plan.price <= 0) throw new PaymentError(400, 'Este plano não requer pagamento.');
    const token = await this.assertGatewayReady();
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
    const subscriptionId = `card_${crypto.createHash('sha256').update(`${userId}:${requestId}`).digest('hex')}`;
    await pool.query(
      `INSERT IGNORE INTO subscriptions (id, userId, companyId, planId, status, amount, paymentMethod, payment_type, contracted_price, plan_version, nextBillingDate)
       VALUES (?, ?, ?, ?, 'pending', ?, 'credit_card', 'subscription', ?, ?, ?)`,
      [subscriptionId, userId, companyId, planId, plan.price, plan.price, plan.version || 1, new Date(Date.now() + 30 * 86400000)]
    ).catch(async () => {
      return await pool.query(
        `INSERT IGNORE INTO subscriptions (id, userId, companyId, planId, status, amount, paymentMethod, nextBillingDate)
         VALUES (?, ?, ?, ?, 'pending', ?, 'credit_card', ?)`,
        [subscriptionId, userId, companyId, planId, plan.price, new Date(Date.now() + 30 * 86400000)]
      );
    });
    const [rows]: any = await pool.query('SELECT userId, companyId, planId, amount FROM subscriptions WHERE id = ?', [subscriptionId]);
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
          notification_url: `${appUrl.replace(/\/$/, '')}/api/webhooks/mercadopago`,
          payer: { email, identification: { type: docType, number: docNumber } }
        })
      });
    } catch {
      // Unknown outcome: preserve this attempt and wait for its webhook. Never invite a second charge.
      return { subscriptionId, status: 'unknown' };
    }
    const payment: any = await response.json().catch(() => ({}));
    if (!response.ok || !payment.id) {
      const errDetail = payment?.message || (Array.isArray(payment?.cause) ? payment.cause.map((c: any) => c.description || c.code).join(', ') : '');
      console.error(`[payment-card] Mercado Pago error (HTTP ${response.status}):`, errDetail);
      if (response.status >= 500) return { subscriptionId, status: 'unknown' };
      throw new PaymentError(response.status === 400 ? 400 : 422, errDetail || 'O Mercado Pago não conseguiu processar esta tentativa. Confira os dados ou tente novamente.');
    }
    await pool.query(
      `INSERT INTO payment_logs (id, subscriptionId, amount, status, gateway_reference) VALUES (?, ?, ?, 'pending', ?)
       ON DUPLICATE KEY UPDATE gateway_reference = VALUES(gateway_reference)`,
      [`pay_${crypto.randomUUID()}`, subscriptionId, plan.price, String(payment.id)]
    );
    // Even an approved gateway response does not activate a plan. Only the verified webhook does.
    return { paymentId: String(payment.id), subscriptionId, status: String(payment.status) };
  }
  private async accessToken(): Promise<string> {
    const [rows]: any = await pool.query(
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

  private async getPlan(planId: string): Promise<PlanRow> {
    const [rows]: any = await pool.query(
      'SELECT id, name, price, version FROM plans WHERE id = ? LIMIT 1',
      [planId]
    ).catch(async () => {
      return await pool.query(
        'SELECT id, name, price, 1 as version FROM plans WHERE id = ? LIMIT 1',
        [planId]
      );
    });
    if (rows.length === 0) throw new PaymentError(404, 'Plano não encontrado.');
    return { id: rows[0].id, name: rows[0].name, price: Number(rows[0].price), version: Number(rows[0].version) || 1 };
  }

  async createPixPayment(
    userId: string,
    companyId: string,
    planId: string,
    payerEmail: string,
    payerName?: string,
    payerDoc?: { type?: string; number?: string },
    requestId?: string
  ): Promise<CreatedPix> {
    await this.assertGatewayReady();
    const plan = await this.getPlan(planId);
    if (plan.price <= 0) {
      throw new PaymentError(400, 'Este plano não requer pagamento.');
    }

    const existing = await this.getActivePixForCompany(companyId, planId, userId);
    if (existing) return existing;

    const token = await this.accessToken();

    // subscriptionId determinístico e seguro contra concorrência entre abas diferentes:
    // Se já houver uma tentativa pendente criada para a mesma empresa/plano/usuário nos últimos 30 min,
    // reaproveitar o subscriptionId existente em vez de criar um segundo id conflitante
    let subscriptionId: string;
    const [existingPending]: any = await pool.query(
      `SELECT id, createdAt FROM subscriptions
        WHERE companyId = ? AND planId = ? AND userId = ? AND status = 'pending' AND paymentMethod = 'pix'
        ORDER BY createdAt DESC LIMIT 1`,
      [companyId, planId, userId]
    ).catch(() => [[]]);

    const activePending = existingPending?.[0];
    const isRecent = activePending?.createdAt
      ? (Date.now() - new Date(activePending.createdAt).getTime()) < 30 * 60 * 1000
      : false;

    if (activePending?.id && isRecent) {
      subscriptionId = activePending.id;
    } else {
      // Cancela qualquer tentativa pendente anterior expirada ou obsoleta com outro ID
      await pool.query(
        "UPDATE subscriptions SET status = 'canceled' WHERE companyId = ? AND planId = ? AND userId = ? AND status = 'pending' AND paymentMethod = 'pix'",
        [companyId, planId, userId]
      ).catch(() => {});

      const normReqId = typeof requestId === 'string' && /^[a-f0-9-]{8,64}$/i.test(requestId.trim())
        ? requestId.trim()
        : null;
      subscriptionId = normReqId
        ? `pix_${crypto.createHash('sha256').update(`${userId}:${companyId}:${planId}:${normReqId}`).digest('hex')}`
        : `pix_${crypto.createHash('sha256').update(`${userId}:${companyId}:${planId}:${Date.now()}`).digest('hex')}`;
    }
    const nextBilling = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await pool.query(
      `INSERT IGNORE INTO subscriptions
         (id, userId, companyId, planId, status, amount, paymentMethod, payment_type, contracted_price, plan_version, nextBillingDate)
       VALUES (?, ?, ?, ?, 'pending', ?, 'pix', 'onetime_pix', ?, ?, ?)`,
      [subscriptionId, userId, companyId, planId, plan.price, plan.price, plan.version || 1, nextBilling]
    ).catch(async () => {
      return await pool.query(
        `INSERT IGNORE INTO subscriptions
           (id, userId, companyId, planId, status, amount, paymentMethod, nextBillingDate)
         VALUES (?, ?, ?, ?, 'pending', ?, 'pix', ?)`,
        [subscriptionId, userId, companyId, planId, plan.price, nextBilling]
      );
    });

    const [subRows]: any = await pool.query(
      'SELECT userId, companyId, planId, amount FROM subscriptions WHERE id = ?',
      [subscriptionId]
    );
    const sub = subRows[0];
    if (!sub || sub.userId !== userId || sub.companyId !== companyId || sub.planId !== planId || Number(sub.amount) !== plan.price) {
      throw new PaymentError(409, 'Esta tentativa pertence a outra compra. Inicie uma nova tentativa.');
    }

    // Se já houver um registro de gateway para esta tentativa determinística, reutilizar
    const [existingLogs]: any = await pool.query(
      'SELECT gateway_reference FROM payment_logs WHERE subscriptionId = ? LIMIT 1',
      [subscriptionId]
    );
    if (existingLogs.length > 0 && existingLogs[0].gateway_reference) {
      const reuse = await this.getActivePixForCompany(companyId, planId, userId);
      if (reuse) return reuse;
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
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify(body)
      });
      mp = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        const errDetail = mp?.message || mp?.error || (Array.isArray(mp?.cause) ? mp.cause.map((c: any) => c.description || c.code).join(', ') : '');
        console.error(`[payment-pix] Mercado Pago error (HTTP ${resp.status}):`, errDetail, JSON.stringify(mp));
        throw new PaymentError(422, errDetail || 'Falha ao criar cobrança Pix no gateway.');
      }
    } catch (err) {
      if (err instanceof PaymentError) {
        try {
          await pool.query('UPDATE subscriptions SET status = ? WHERE id = ? AND status = ?', ['canceled', subscriptionId, 'pending']);
        } catch {}
        throw err;
      }
      console.warn(`[payment] MP timeout/network for ${subscriptionId}`);
      throw new PaymentError(503, 'Gateway temporariamente indisponível. Tente novamente em instantes.');
    }

    const gatewayId = String(mp.id);
    const tx = mp.point_of_interaction?.transaction_data ?? {};

    await pool.query(
      `INSERT INTO payment_logs (id, subscriptionId, amount, status, gateway_reference)
       VALUES (?, ?, ?, 'pending', ?)
       ON DUPLICATE KEY UPDATE gateway_reference = VALUES(gateway_reference)`,
      [`pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, subscriptionId, plan.price, gatewayId]
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

  async createCheckoutPreference(
    userId: string,
    companyId: string,
    planId: string,
    payerEmail: string,
    appUrl: string
  ): Promise<{ initPoint: string; subscriptionId: string }> {
    const plan = await this.getPlan(planId);
    if (plan.price <= 0) throw new PaymentError(400, 'Este plano não requer pagamento.');

    const token = await this.accessToken();
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const nextBilling = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO subscriptions
         (id, userId, companyId, planId, status, amount, paymentMethod, payment_type, contracted_price, plan_version, nextBillingDate)
       VALUES (?, ?, ?, ?, 'pending', ?, 'credit_card', 'subscription', ?, ?, ?)`,
      [subscriptionId, userId, companyId, planId, plan.price, plan.price, plan.version || 1, nextBilling]
    ).catch(async () => {
      return await pool.query(
        `INSERT INTO subscriptions
           (id, userId, companyId, planId, status, amount, paymentMethod, nextBillingDate)
         VALUES (?, ?, ?, ?, 'pending', ?, 'credit_card', ?)`,
        [subscriptionId, userId, companyId, planId, plan.price, nextBilling]
      );
    });

    const base = appUrl.replace(/\/$/, '');
    const body = {
      items: [
        {
          title: `Assinatura ${plan.name} — Guia Comercial Itapoá`,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: Number(plan.price.toFixed(2))
        }
      ],
      payer: { email: payerEmail },
      external_reference: subscriptionId,
      notification_url: `${base}/api/webhooks/mercadopago`,
      back_urls: {
        success: `${base}/painel?payment=success`,
        failure: `${base}/painel?payment=failure`,
        pending: `${base}/painel?payment=pending`
      },
      auto_return: 'approved'
    };

    let mp: any;
    try {
      const resp = await fetch(`${MP_API}/checkout/preferences`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': subscriptionId
        },
        body: JSON.stringify(body)
      });
      mp = await resp.json();
      if (!resp.ok) throw new PaymentError(502, mp?.message || 'Falha ao criar checkout.');
    } catch (err) {
      if (err instanceof PaymentError) throw err;
      throw new PaymentError(502, 'Gateway de pagamento indisponível.');
    }

    return { initPoint: mp.init_point, subscriptionId };
  }

  verifyWebhookSignature(
    signatureHeader: string | undefined,
    requestId: string | undefined,
    dataId: string | undefined
  ): boolean {
    const secret = this.webhookSecret();
    if (!secret) {
      return process.env.NODE_ENV !== 'production';
    }
    if (!signatureHeader || !dataId) return false;

    const parts = Object.fromEntries(
      signatureHeader.split(',').map(kv => {
        const [k, v] = kv.split('=');
        return [k?.trim(), v?.trim()];
      })
    );
    const ts = parts['ts'];
    const v1 = parts['v1'];
    if (!ts || !v1) return false;

    const tsNum = Number(ts);
    if (!Number.isFinite(tsNum)) return false;
    const nowSec = Math.floor(Date.now() / 1000);
    const tsSec = tsNum > 1e12 ? Math.floor(tsNum / 1000) : tsNum;
    if (Math.abs(nowSec - tsSec) > 300) return false;

    const manifest = `id:${dataId};request-id:${requestId ?? ''};ts:${ts};`;
    const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
    } catch {
      return false;
    }
  }

  async handlePaymentNotification(paymentId: string): Promise<void> {
    const token = await this.accessToken();

    let mp: any;
    try {
      const resp = await fetch(`${MP_API}/v1/payments/${encodeURIComponent(paymentId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!resp.ok) return;
      mp = await resp.json();
    } catch {
      throw new PaymentError(502, 'Falha ao consultar o pagamento no gateway.');
    }

    const subscriptionId = mp.external_reference;
    const status = mp.status;
    if (!subscriptionId) return;

    if (mp.currency_id && mp.currency_id !== 'BRL') return;

    const [subRows]: any = await pool.query(
      'SELECT id, status, amount, planId, companyId FROM subscriptions WHERE id = ? LIMIT 1',
      [subscriptionId]
    );
    if (subRows.length === 0) return;
    const sub = subRows[0];
    if (sub.status === 'active') return;

    const expectedAmount = Number(sub.amount);
    const paidAmount = Number(mp.transaction_amount);
    if (Number.isFinite(expectedAmount) && Number.isFinite(paidAmount) && status === 'approved' && Math.abs(paidAmount - expectedAmount) > 0.01) {
      console.warn(`[webhook] amount mismatch sub=${subscriptionId} expected=${expectedAmount} got=${paidAmount}`);
      return;
    }

    const logStatus = status === 'approved' ? 'paid' : status === 'rejected' ? 'failed' : status === 'refunded' || status === 'charged_back' ? 'refunded' : 'pending';

    await pool.query(
      `INSERT INTO payment_logs (id, subscriptionId, amount, status, gateway_reference)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE status = VALUES(status)`,
      [
        `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        subscriptionId,
        Number(mp.transaction_amount) || 0,
        logStatus,
        String(mp.id)
      ]
    );

    const conn2 = await pool.getConnection();
    try {
      await conn2.beginTransaction();
      const [cur]: any = await conn2.query('SELECT status FROM subscriptions WHERE id = ? FOR UPDATE', [subscriptionId]);
      const curStatus = cur[0]?.status;
      if (curStatus === 'active' && status !== 'refunded' && status !== 'charged_back') {
        await conn2.rollback();
        conn2.release();
        return;
      }

      if (status === 'approved') {
        const nextBilling = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await conn2.query('UPDATE subscriptions SET status = ?, nextBillingDate = ? WHERE id = ?', ['active', nextBilling, subscriptionId]);
        const [subscriptions]: any = await conn2.query(
          `SELECT s.companyId, p.name AS planName FROM subscriptions s INNER JOIN plans p ON p.id = s.planId WHERE s.id = ? LIMIT 1`,
          [subscriptionId]
        );
        const paid = subscriptions[0];
        if (paid?.companyId && paid?.planName) {
          const sponsored = paid.planName === 'gold_vip' || paid.planName === 'diamond_extremo';
          await conn2.query(
            `UPDATE companies 
             SET planLevel = ?, access_grant_type = 'paid', has_used_trial = 1, isSponsored = ? 
             WHERE id = ?`,
            [paid.planName, sponsored ? 1 : 0, paid.companyId]
          ).catch(async () => {
            return await conn2.query(
              'UPDATE companies SET planLevel = ?, isSponsored = ? WHERE id = ?',
              [paid.planName, sponsored ? 1 : 0, paid.companyId]
            );
          });
        }
      } else if (status === 'rejected' || status === 'cancelled') {
        if (curStatus === 'pending') await conn2.query('UPDATE subscriptions SET status = ? WHERE id = ?', ['canceled', subscriptionId]);
      } else if (status === 'refunded' || status === 'charged_back') {
        await conn2.query('UPDATE subscriptions SET status = ? WHERE id = ?', ['canceled', subscriptionId]);
        const [comp]: any = await conn2.query('SELECT companyId FROM subscriptions WHERE id = ? LIMIT 1', [subscriptionId]);
        if (comp[0]?.companyId) {
          const [otherActive]: any = await conn2.query(
            'SELECT id FROM subscriptions WHERE companyId = ? AND status = ? AND id != ? LIMIT 1',
            [comp[0].companyId, 'active', subscriptionId]
          );
          if (otherActive.length === 0) {
            await conn2.query('UPDATE companies SET planLevel = ?, isSponsored = ? WHERE id = ?', ['bronze', 0, comp[0].companyId]);
          }
        }
      }
      await conn2.commit();
      conn2.release();
    } catch (e) {
      try { await conn2.rollback(); } catch {}
      try { conn2.release(); } catch {}
      throw e;
    }
  }

  async getActivePixForCompany(companyId: string, planId: string, userId: string): Promise<CreatedPix | null> {
    const [subs]: any = await pool.query(
      `SELECT s.id, s.amount, s.planId AS subPlanId, pl.gateway_reference, pl.createdAt
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
      const token = await this.accessToken();
      const resp = await fetch(`${MP_API}/v1/payments/${encodeURIComponent(String(row.gateway_reference))}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!resp.ok) return null;
      const mp: any = await resp.json();
      if (mp.status !== 'pending' && mp.status !== 'in_process') return null;
      if (mp.currency_id && mp.currency_id !== 'BRL') return null;
      if (mp.external_reference && String(mp.external_reference) !== String(row.id)) return null;
      const expected = Number(row.amount);
      const got = Number(mp.transaction_amount);
      if (Number.isFinite(expected) && Number.isFinite(got) && Math.abs(expected - got) > 0.01) return null;
      const expIso: string | null = mp.date_of_expiration ?? null;
      if (expIso) {
        const expMs = new Date(expIso).getTime();
        if (Number.isFinite(expMs) && expMs <= Date.now()) return null;
      } else {
        const created = new Date(row.createdAt).getTime();
        if (Date.now() - created > 30 * 60 * 1000) return null;
      }
      const tx = mp.point_of_interaction?.transaction_data ?? {};
      return {
        paymentId: String(mp.id),
        qrCode: tx.qr_code ?? '',
        qrCodeBase64: tx.qr_code_base64 ?? '',
        amount: got || expected || 0,
        expirationDate: expIso ?? new Date(new Date(row.createdAt).getTime() + 30 * 60 * 1000).toISOString(),
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
  async reconcilePayment(subscriptionId: string): Promise<{
    status: string;
    reconciled: boolean;
    message: string;
  }> {
    const [subRows]: any = await pool.query(
      'SELECT id, status, planId, companyId, amount, paymentMethod FROM subscriptions WHERE id = ? LIMIT 1',
      [subscriptionId]
    );
    if (subRows.length === 0) {
      throw new PaymentError(404, 'Assinatura / Cobrança não encontrada.');
    }
    const sub = subRows[0];
    if (sub.status === 'active') {
      return { status: 'active', reconciled: true, message: 'Cobrança já confirmada e plano ativo.' };
    }

    const [logs]: any = await pool.query(
      'SELECT gateway_reference FROM payment_logs WHERE subscriptionId = ? ORDER BY createdAt DESC LIMIT 1',
      [subscriptionId]
    );
    const paymentId = logs[0]?.gateway_reference;
    if (!paymentId) {
      return { status: sub.status, reconciled: false, message: 'Nenhum registro de pagamento associado no gateway.' };
    }

    const token = await this.accessToken();
    let mp: any;
    try {
      const resp = await fetch(`${MP_API}/v1/payments/${encodeURIComponent(paymentId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!resp.ok) {
        return { status: sub.status, reconciled: false, message: 'Gateway não retornou status atualizado.' };
      }
      mp = await resp.json();
    } catch {
      return { status: sub.status, reconciled: false, message: 'Falha de comunicação com o Mercado Pago.' };
    }

    if (mp.status === 'approved') {
      await this.handlePaymentNotification(paymentId);
      return { status: 'active', reconciled: true, message: 'Pagamento confirmado e plano ativado com sucesso!' };
    }

    return {
      status: mp.status || sub.status,
      reconciled: false,
      message: `Status atual no Mercado Pago: ${mp.status || 'pendente'}`
    };
  }
}

export const paymentService = new PaymentService();
