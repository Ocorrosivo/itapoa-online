/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Mercado Pago Subscriptions (preapproval_plan / preapproval).
 * The backend is the sole payment authority: plans are created by admin,
 * subscriptions are created server-side with status='authorized', and
 * activation happens ONLY from the verified webhook.
 *
 * Docs: https://www.mercadopago.com.br/developers/pt/docs/subscriptions/landing
 */

import crypto from 'crypto';
import { pool } from '../mysql.js';

const MP_API = 'https://api.mercadopago.com';

export class SubscriptionPaymentError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function accessToken(): Promise<string> {
  const fromEnv = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (fromEnv) return fromEnv;
  const [rows]: any = await pool.query(
    'SELECT accessToken FROM payment_config WHERE id = ? LIMIT 1',
    ['payment']
  );
  const token = rows[0]?.accessToken?.trim();
  if (!token) throw new SubscriptionPaymentError(503, 'Gateway de pagamento não configurado.');
  return token;
}

function webhookSecret(): string | null {
  return process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim() || null;
}

interface PlanRow {
  id: string;
  name: string;
  price: number;
  mercado_pago_plan_id: string | null;
}

async function getPlan(planId: string): Promise<PlanRow> {
  const [rows]: any = await pool.query(
    'SELECT id, name, price, mercado_pago_plan_id FROM plans WHERE id = ? LIMIT 1',
    [planId]
  );
  if (rows.length === 0) throw new SubscriptionPaymentError(404, 'Plano não encontrado.');
  return {
    id: rows[0].id,
    name: rows[0].name,
    price: Number(rows[0].price),
    mercado_pago_plan_id: rows[0].mercado_pago_plan_id ?? null,
  };
}

/**
 * Admin: creates a preapproval_plan on Mercado Pago and persists the MP plan id.
 * Call once per tier (gold_vip, diamond_extremo).
 */
export async function createMpPlan(
  planId: string,
  reason: string,
  amount: number,
  appUrl: string
): Promise<{ mpPlanId: string; raw: any }> {
  const token = await accessToken();
  const base = appUrl.replace(/\/$/, '');
  const resp = await fetch(`${MP_API}/preapproval_plan`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': `plan_${planId}_${Date.now()}`,
    },
    body: JSON.stringify({
      reason,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: Number(amount.toFixed(2)),
        currency_id: 'BRL',
      },
      back_url: `${base}/painel?plan=${planId}`,
    }),
  });
  const data: any = await resp.json();
  if (!resp.ok) {
    throw new SubscriptionPaymentError(502, data?.message || 'Falha ao criar plano no Mercado Pago.');
  }
  const mpPlanId = String(data.id);
  await pool.query('UPDATE plans SET mercado_pago_plan_id = ? WHERE id = ?', [mpPlanId, planId]);
  return { mpPlanId, raw: data };
}

/**
 * Lojista subscribes to a plan. Card must have been tokenized client-side
 * (CardPayment brick -> cardTokenId). Creates a pending subscription row and
 * a preapproval on MP with status='authorized'.
 */
export async function createSubscription(
  userId: string,
  companyId: string,
  planId: string,
  payerEmail: string,
  cardTokenId: string,
  appUrl: string
): Promise<{ subscriptionId: string; preapprovalId: string; status: string }> {
  const plan = await getPlan(planId);
  if (plan.price <= 0) throw new SubscriptionPaymentError(400, 'Este plano não requer pagamento.');
  if (!plan.mercado_pago_plan_id) {
    throw new SubscriptionPaymentError(
      503,
      'Plano do Mercado Pago ainda não configurado. O administrador precisa criar o plano primeiro.'
    );
  }

  const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const nextBilling = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await pool.query(
    `INSERT INTO subscriptions (id, userId, companyId, planId, status, amount, paymentMethod, nextBillingDate)
     VALUES (?, ?, ?, ?, 'pending', ?, 'credit_card', ?)`,
    [subscriptionId, userId, companyId, planId, plan.price, nextBilling]
  );

  const token = await accessToken();
  const base = appUrl.replace(/\/$/, '');

  let mp: any;
  try {
    const resp = await fetch(`${MP_API}/preapproval`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': subscriptionId,
      },
      body: JSON.stringify({
        preapproval_plan_id: plan.mercado_pago_plan_id,
        payer_email: payerEmail,
        card_token_id: cardTokenId,
        status: 'authorized',
        back_url: `${base}/painel?subscription=${subscriptionId}`,
        external_reference: subscriptionId,
      }),
    });
    mp = await resp.json();
    if (!resp.ok) {
      throw new SubscriptionPaymentError(502, mp?.message || 'Falha ao criar assinatura no gateway.');
    }
  } catch (err) {
    if (err instanceof SubscriptionPaymentError) throw err;
    throw new SubscriptionPaymentError(502, 'Gateway de pagamento indisponível.');
  }

  const preapprovalId = String(mp.id);
    await pool.query(
      `INSERT INTO payment_logs (id, subscriptionId, amount, status, gateway_reference)
     VALUES (?, ?, ?, 'pending', ?)`,
    [`pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, subscriptionId, plan.price, preapprovalId]
  );

  return { subscriptionId, preapprovalId, status: String(mp.status ?? 'pending') };
}

export function verifySubscriptionWebhookSignature(
  signatureHeader: string | undefined,
  requestId: string | undefined,
  dataId: string | undefined
): boolean {
  const secret = webhookSecret();
  if (!secret) return process.env.NODE_ENV !== 'production';
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
 * Handles both subscription topics:
 * - subscription_preapproval (GET /preapproval/{id}) -> entitlement only when status === 'authorized'
 * - subscription_authorized_payment (GET /authorized_payments/{id}) -> log charge only
 */
export async function handleSubscriptionNotification(notificationId: string): Promise<void> {
  const token = await accessToken();
  let preapproval: any = null;
  try {
    const resp = await fetch(`${MP_API}/preapproval/${encodeURIComponent(notificationId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (resp.ok) preapproval = await resp.json();
  } catch { /* fall through */ }

  if (preapproval && preapproval.id) {
    const subscriptionId: string | undefined = preapproval.external_reference;
    const status: string = preapproval.status;
    if (!subscriptionId) return;
    const logStatus = status === 'authorized' ? 'paid' : status === 'cancelled' ? 'failed' : 'pending';

    await pool.query(
      `INSERT INTO payment_logs (id, subscriptionId, amount, status, gateway_reference)
       VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE status = VALUES(status)`,
      [
        `pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        subscriptionId,
        Number(preapproval.auto_recurring?.transaction_amount) || 0,
        logStatus,
        String(preapproval.id),
      ]
    );

    if (status === 'authorized') {
      const nextBilling = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await pool.query('UPDATE subscriptions SET status = ?, nextBillingDate = ? WHERE id = ?', [
        'active',
      nextBilling,
      subscriptionId,
    ]);
    const [subscriptions]: any = await pool.query(
      `SELECT s.companyId, p.name AS planName
         FROM subscriptions s INNER JOIN plans p ON p.id = s.planId
        WHERE s.id = ? LIMIT 1`,
      [subscriptionId]
    );
    const paid = subscriptions[0];
    if (paid?.companyId && paid?.planName) {
      const sponsored = paid.planName === 'gold_vip' || paid.planName === 'diamond_extremo';
      await pool.query('UPDATE companies SET planLevel = ?, isSponsored = ? WHERE id = ?', [
        paid.planName,
        sponsored ? 1 : 0,
        paid.companyId,
      ]);
    }
    } else if (status === 'cancelled' || status === 'paused') {
      await pool.query('UPDATE subscriptions SET status = ? WHERE id = ?', ['canceled', subscriptionId]);
    }
    return;
  }

  try {
    const resp = await fetch(`${MP_API}/authorized_payments/${encodeURIComponent(notificationId)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) return;
    const charge: any = await resp.json();
    const preapprovalId: string | undefined = charge.preapproval_id ? String(charge.preapproval_id) : undefined;
    if (!preapprovalId) return;
    const [rows]: any = await pool.query('SELECT subscriptionId FROM payment_logs WHERE gateway_reference = ? LIMIT 1', [preapprovalId]);
    const subscriptionId: string | undefined = rows[0]?.subscriptionId;
    if (!subscriptionId) return;
    const chargeStatus: string = charge.status || 'pending';
    const mapped = chargeStatus === 'approved' ? 'paid' : chargeStatus === 'rejected' ? 'failed' : 'pending';
    await pool.query(`INSERT INTO payment_logs (id, subscriptionId, amount, status, gateway_reference) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE status = VALUES(status)`, [`pay_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, subscriptionId, Number(charge.transaction_amount) || 0, mapped, `ap_${String(charge.id)}`]);
  } catch { /* ignore charge lookup failures */ }
}

export async function cancelSubscription(subscriptionId: string, companyIds: string[]): Promise<void> {
  const [rows]: any = await pool.query('SELECT id, companyId FROM subscriptions WHERE id = ? LIMIT 1', [
    subscriptionId,
  ]);
  if (rows.length === 0) throw new SubscriptionPaymentError(404, 'Assinatura não encontrada.');
  if (!companyIds.includes(rows[0].companyId)) {
    throw new SubscriptionPaymentError(403, 'Sem permissão para esta assinatura.');
  }
  const [logs]: any = await pool.query(
    'SELECT gateway_reference FROM payment_logs WHERE subscriptionId = ? ORDER BY createdAt DESC LIMIT 1',
    [subscriptionId]
  );
  const preapprovalId = logs[0]?.gateway_reference;
  if (preapprovalId) {
    const token = await accessToken();
    await fetch(`${MP_API}/preapproval/${encodeURIComponent(preapprovalId)}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'cancelled' }),
    }).catch(() => {});
  }
  await pool.query('UPDATE subscriptions SET status = ? WHERE id = ?', ['canceled', subscriptionId]);
}
