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
  /** Resolves the access token from the environment or the stored config. */
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

  /**
   * Creates a pending subscription + payment_log and a real PIX charge at
   * Mercado Pago. external_reference ties the MP payment back to the
   * subscription so the webhook can activate it.
   */
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

    const token = await this.accessToken();

    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const nextBilling = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO subscriptions
         (id, userId, companyId, planId, status, amount, paymentMethod, nextBillingDate)
       VALUES (?, ?, ?, ?, 'pending', ?, 'pix', ?)`,
      [subscriptionId, userId, companyId, planId, plan.price, nextBilling]
    );

    const idempotencyKey = `${subscriptionId}`;
    const body = {
      transaction_amount: Number(plan.price.toFixed(2)),
      description: `Assinatura ${plan.name} — Guia Comercial Itapoá`,
      payment_method_id: 'pix',
      external_reference: subscriptionId,
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
      if (err instanceof PaymentError) throw err;
      throw new PaymentError(502, 'Gateway de pagamento indisponível.');
    }

    const gatewayId = String(mp.id);
    const tx = mp.point_of_interaction?.transaction_data ?? {};

    await pool.query(
      `INSERT INTO payment_logs (id, subscriptionId, amount, status, gateway_reference)
       VALUES (?, ?, ?, 'pending', ?)`,
      [`pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, subscriptionId, plan.price, gatewayId]
    );

    return {
      paymentId: gatewayId,
      qrCode: tx.qr_code ?? '',
      qrCodeBase64: tx.qr_code_base64 ?? '',
      amount: plan.price,
      expirationDate:
        mp.date_of_expiration ?? new Date(Date.now() + 30 * 60000).toISOString(),
      subscriptionId
    };
  }

  /**
   * Creates a Checkout Pro preference and returns its init_point (hosted
   * checkout URL). Used for card payments.
   */
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
          'Content-Type': 'application/json'
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

  /**
   * Verifies the x-signature header against the webhook secret, following
   * Mercado Pago's manifest scheme: `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
   * HMAC-SHA256. Returns true when no secret is configured only in development.
   */
  verifyWebhookSignature(
    signatureHeader: string | undefined,
    requestId: string | undefined,
    dataId: string | undefined
  ): boolean {
    const secret = this.webhookSecret();
    if (!secret) {
      // Without a configured secret we cannot verify; reject in production.
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

    const manifest = `id:${dataId};request-id:${requestId ?? ''};ts:${ts};`;
    const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex');

    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1));
    } catch {
      return false;
    }
  }

  /**
   * Processes a verified payment notification. Re-fetches the payment from
   * Mercado Pago (never trusts the webhook body) and, when approved, activates
   * the subscription. Idempotent on gateway_reference.
   */
  async handlePaymentNotification(paymentId: string): Promise<void> {
    const token = await this.accessToken();

    let mp: any;
    try {
      const resp = await fetch(`${MP_API}/v1/payments/${encodeURIComponent(paymentId)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!resp.ok) return; // Unknown/expired payment id — nothing to do.
      mp = await resp.json();
    } catch {
      throw new PaymentError(502, 'Falha ao consultar o pagamento no gateway.');
    }

    const subscriptionId = mp.external_reference;
    const status = mp.status; // approved | pending | rejected | cancelled ...
    if (!subscriptionId) return;

    const logStatus = status === 'approved' ? 'paid' : status === 'rejected' ? 'failed' : 'pending';

    // Record the payment attempt. gateway_reference is UNIQUE, so a duplicate
    // webhook (Mercado Pago retries) upserts the status instead of throwing —
    // keeping the whole handler idempotent and letting activation below still run.
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

    if (status === 'approved') {
      const nextBilling = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await pool.query(
        'UPDATE subscriptions SET status = ?, nextBillingDate = ? WHERE id = ?',
        ['active', nextBilling, subscriptionId]
      );

      // The public ranking is driven by companies.planLevel. Resolve the plan
      // server-side from the paid subscription; never trust a client payload.
      const [subscriptions]: any = await pool.query(
        `SELECT s.companyId, p.name AS planName
           FROM subscriptions s
           INNER JOIN plans p ON p.id = s.planId
          WHERE s.id = ? LIMIT 1`,
        [subscriptionId]
      );
      const paid = subscriptions[0];
      if (paid?.companyId && paid?.planName) {
        const sponsored = paid.planName === 'gold_vip' || paid.planName === 'diamond_extremo';
        await pool.query(
          'UPDATE companies SET planLevel = ?, isSponsored = ? WHERE id = ?',
          [paid.planName, sponsored ? 1 : 0, paid.companyId]
        );
      }
    } else if (status === 'rejected' || status === 'cancelled') {
      await pool.query('UPDATE subscriptions SET status = ? WHERE id = ?', [
        'canceled',
        subscriptionId
      ]);
    }
  }

  /** Current subscription status for a set of companies. Used for feature gating. */
  async getSubscriptionStatus(companyIds: string[]): Promise<string> {
    if (companyIds.length === 0) return 'trial';
    const placeholders = companyIds.map(() => '?').join(', ');
    const [rows]: any = await pool.query(
      `SELECT status FROM subscriptions
        WHERE companyId IN (${placeholders})
        ORDER BY createdAt DESC LIMIT 1`,
      companyIds
    );
    return rows[0]?.status ?? 'trial';
  }
}

export const paymentService = new PaymentService();
