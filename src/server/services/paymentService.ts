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
  private async accessToken(): Promise<string> {
    const fromEnv = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
    if (fromEnv) return fromEnv;

    const [rows]: any = await pool.query(
      'SELECT accessToken FROM payment_config WHERE id = ? LIMIT 1',
      ['payment']
    );
    const token = rows[0]?.accessToken?.trim();
    if (!token) {
      throw new PaymentError(503, 'Gateway de pagamento não configurado.');
    }
    return token;
  }

  private webhookSecret(): string | null {
    return process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim() || null;
  }

  private async getPlan(planId: string): Promise<PlanRow> {
    const [rows]: any = await pool.query(
      'SELECT id, name, price FROM plans WHERE id = ? LIMIT 1',
      [planId]
    );
    if (rows.length === 0) throw new PaymentError(404, 'Plano não encontrado.');
    return { id: rows[0].id, name: rows[0].name, price: Number(rows[0].price) };
  }

  async createPixPayment(
    userId: string,
    companyId: string,
    planId: string,
    payerEmail: string
  ): Promise<CreatedPix> {
    const plan = await this.getPlan(planId);
    if (plan.price <= 0) {
      throw new PaymentError(400, 'Este plano não requer pagamento.');
    }

    const existing = await this.getActivePixForCompany(companyId, planId, userId);
    if (existing) return existing;

    const token = await this.accessToken();

    let subscriptionId: string;
    let nextBilling: Date;
    {
      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();
        const [pending]: any = await conn.query(
          `SELECT id FROM subscriptions
            WHERE companyId = ? AND planId = ? AND userId = ? AND status = 'pending' AND paymentMethod = 'pix'
            ORDER BY createdAt DESC LIMIT 1 FOR UPDATE`,
          [companyId, planId, userId]
        );
        if (pending.length > 0) {
          await conn.rollback();
          conn.release();
          const reuse = await this.getActivePixForCompany(companyId, planId, userId);
          if (reuse) return reuse;
          throw new PaymentError(409, 'Já existe uma cobrança pendente para este plano. Aguarde a expiração ou use a recuperação.');
        }

        subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        nextBilling = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await conn.query(
          `INSERT INTO subscriptions
             (id, userId, companyId, planId, status, amount, paymentMethod, nextBillingDate)
           VALUES (?, ?, ?, ?, 'pending', ?, 'pix', ?)`,
          [subscriptionId, userId, companyId, planId, plan.price, nextBilling]
        );
        await conn.commit();
        conn.release();
      } catch (err) {
        try { await conn.rollback(); } catch {}
        try { conn.release(); } catch {}
        if (err instanceof PaymentError) throw err;
        throw err;
      }
    }

    const idempotencyKey = `${subscriptionId}`;
    const dateOfExpiration = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const body = {
      transaction_amount: Number(plan.price.toFixed(2)),
      description: `Assinatura ${plan.name} — Guia Comercial Itapoá`,
      payment_method_id: 'pix',
      external_reference: subscriptionId,
      date_of_expiration: dateOfExpiration,
      payer: { email: payerEmail }
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
      mp = await resp.json();
      if (!resp.ok) {
        throw new PaymentError(502, mp?.message || 'Falha ao criar cobrança no gateway.');
      }
    } catch (err) {
      try {
        await pool.query('DELETE FROM subscriptions WHERE id = ? AND status = ?', [subscriptionId!, 'pending']);
      } catch {}
      if (err instanceof PaymentError) throw err;
      throw new PaymentError(502, 'Gateway de pagamento indisponível.');
    }

    const gatewayId = String(mp.id);
    const tx = mp.point_of_interaction?.transaction_data ?? {};

    await pool.query(
      `INSERT INTO payment_logs (id, subscriptionId, amount, status, gateway_reference)
       VALUES (?, ?, ?, 'pending', ?)`,
      [`pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, subscriptionId!, plan.price, gatewayId]
    );

    return {
      paymentId: gatewayId,
      qrCode: tx.qr_code ?? '',
      qrCodeBase64: tx.qr_code_base64 ?? '',
      amount: plan.price,
      expirationDate: mp.date_of_expiration ?? dateOfExpiration,
      subscriptionId: subscriptionId!
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
         (id, userId, companyId, planId, status, amount, paymentMethod, nextBillingDate)
       VALUES (?, ?, ?, ?, 'pending', ?, 'credit_card', ?)`,
      [subscriptionId, userId, companyId, planId, plan.price, nextBilling]
    );

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
          await conn2.query('UPDATE companies SET planLevel = ?, isSponsored = ? WHERE id = ?', [paid.planName, sponsored ? 1 : 0, paid.companyId]);
        }
      } else if (status === 'rejected' || status === 'cancelled') {
        if (curStatus === 'pending') await conn2.query('UPDATE subscriptions SET status = ? WHERE id = ?', ['canceled', subscriptionId]);
      } else if (status === 'refunded' || status === 'charged_back') {
        await conn2.query('UPDATE subscriptions SET status = ? WHERE id = ?', ['canceled', subscriptionId]);
        const [comp]: any = await conn2.query('SELECT companyId FROM subscriptions WHERE id = ? LIMIT 1', [subscriptionId]);
        if (comp[0]?.companyId) await conn2.query('UPDATE companies SET planLevel = ?, isSponsored = ? WHERE id = ?', ['bronze', 0, comp[0].companyId]);
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
}

export const paymentService = new PaymentService();
