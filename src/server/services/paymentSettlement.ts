import { pool } from '../mysql.js';
import { PaymentError } from './paymentError.js';
import { mailService } from './mailService.js';

/** Decimal amounts are compared as integer cents, never with an epsilon. */
export function paymentCents(value: unknown): number {
  if ((typeof value !== 'string' && typeof value !== 'number') || !/^\d+(\.\d{1,2})?$/.test(String(value))) {
    throw new PaymentError(422, 'Valor de pagamento inválido.');
  }
  const [whole, fractional = ''] = String(value).split('.');
  const cents = Number(whole) * 100 + Number(fractional.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents <= 0) throw new PaymentError(422, 'Valor de pagamento inválido.');
  return cents;
}
export async function mercadoPagoGet(path: string, token: string): Promise<any> {
  try {
    const response = await fetch(`https://api.mercadopago.com${path}`, {
      headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error('gateway unavailable');
    return await response.json();
  } catch { throw new PaymentError(502, 'Não foi possível confirmar o pagamento no gateway. Tente novamente.'); }
}
const instant = (value: unknown) => {
  if (typeof value !== 'string' || !/[zZ]|[+-]\d{2}:\d{2}$/.test(value)) throw new PaymentError(422, 'Data de pagamento inválida.');
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new PaymentError(422, 'Data de pagamento inválida.');
  return date;
};
const sqlDate = (date: Date) => date.toISOString().slice(0, 23).replace('T', ' ');
const millis = (sql: string | null) => sql ? new Date(sql.replace(' ', 'T') + 'Z').getTime() : 0;
const tier = (plan: string) => {
  if (['plan_gold_vip', 'gold_vip', 'Gold VIP'].includes(plan)) return 'gold_vip';
  if (['plan_diamond_extremo', 'diamond_extremo', 'Diamond'].includes(plan)) return 'diamond_extremo';
  throw new PaymentError(422, 'Plano pago não reconhecido.');
};

/** Both webhook and reconciliation call this exact path, fetching only once. */
export function assertGatewayPayment(mp: any, paymentId: string, token: string, account: any, expectedSubscriptionId?: string) {
  if (!mp || typeof mp !== 'object' || !account || typeof account !== 'object') throw new PaymentError(422, 'Resposta do gateway inválida.');
  const subscriptionId = mp.external_reference;
  const expectedLive = process.env.MERCADOPAGO_MODE
    ? process.env.MERCADOPAGO_MODE === 'production'
    : !token.startsWith('TEST-');
  if (process.env.MERCADOPAGO_MODE && !['test', 'production'].includes(process.env.MERCADOPAGO_MODE)) throw new PaymentError(503, 'Ambiente de pagamento não configurado corretamente.');
  if (String(mp.id) !== paymentId || typeof subscriptionId !== 'string' || !subscriptionId ||
      (expectedSubscriptionId && subscriptionId !== expectedSubscriptionId) || mp.currency_id !== 'BRL' ||
      !/^\d+$/.test(String(account.id)) || String(mp.collector_id) !== String(account.id) ||
      typeof mp.live_mode !== 'boolean' || mp.live_mode !== expectedLive) {
    throw new PaymentError(422, 'Pagamento não corresponde ao contrato ou ao ambiente da integração.');
  }
}

export async function settlePayment(paymentId: string, token: string, expectedSubscriptionId?: string) {
  if (!/^[0-9]+$/.test(paymentId)) throw new PaymentError(422, 'Identificador de pagamento inválido.');
  const mp = await mercadoPagoGet(`/v1/payments/${paymentId}`, token);
  const account = await mercadoPagoGet('/users/me', token);
  assertGatewayPayment(mp, paymentId, token, account, expectedSubscriptionId);
  const subscriptionId = mp.external_reference;
  const updated = instant(mp.date_last_updated);
  const approved = mp.status === 'approved' ? instant(mp.date_approved) : null;
  if (updated.getTime() > Date.now() + 300000 || (approved && approved.getTime() > updated.getTime() + 5000)) throw new PaymentError(422, 'Sequência de datas do pagamento inválida.');
  const knownStates = ['pending', 'in_process', 'authorized', 'approved', 'rejected', 'cancelled', 'refunded', 'charged_back', 'in_mediation'];
  if (!knownStates.includes(mp.status)) throw new PaymentError(422, 'Estado de pagamento não reconhecido.');
  const paidCents = paymentCents(mp.transaction_amount);
  // Fail closed on partial refunds too: the contracted full amount is no longer paid.
  const refund = mp.transaction_amount_refunded == null || Number(mp.transaction_amount_refunded) === 0
    ? 0 : paymentCents(mp.transaction_amount_refunded);
  if (refund > paidCents) throw new PaymentError(422, 'Valor de estorno inválido.');
  const state = refund > 0 ? 'refunded' : String(mp.status);
  const [initial]: any = await pool.query('SELECT companyId FROM subscriptions WHERE id = ? LIMIT 1', [subscriptionId]);
  if (!initial.length) return { status: 'ignored', reconciled: false, message: 'Pedido não localizado nesta aplicação.' };
  const companyId = initial[0].companyId;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [companies]: any = await connection.query('SELECT id, access_grant_type, trial_ends_at FROM companies WHERE id = ? FOR UPDATE', [companyId]);
    const [subscriptions]: any = await connection.query('SELECT *, DATE_FORMAT(nextBillingDate, "%Y-%m-%d %H:%i:%s.%f") AS stored_expiry FROM subscriptions WHERE id = ? FOR UPDATE', [subscriptionId]);
    const sub = subscriptions[0];
    if (!companies[0] || !sub || sub.companyId !== companyId || paymentCents(sub.amount) !== paidCents ||
        (sub.contracted_price != null && paymentCents(sub.contracted_price) !== paidCents) ||
        (mp.metadata?.company_id != null && String(mp.metadata.company_id) !== companyId) ||
        (mp.metadata?.user_id != null && String(mp.metadata.user_id) !== sub.userId) ||
        (sub.paymentMethod === 'pix' ? mp.payment_method_id !== 'pix' : mp.payment_type_id !== 'credit_card')) {
      throw new PaymentError(422, 'Pagamento divergente do pedido. Nenhum acesso foi liberado.');
    }
    const paidTier = tier(sub.planId);
    const [bindings]: any = await connection.query('SELECT subscriptionId FROM payment_logs WHERE gateway_reference = ? FOR UPDATE', [paymentId]);
    if (bindings.some((row: any) => row.subscriptionId !== subscriptionId)) throw new PaymentError(422, 'Pagamento já associado a outro pedido.');
    const [existing]: any = await connection.query(`SELECT *, DATE_FORMAT(remote_updated_at, '%Y-%m-%d %H:%i:%s.%f') AS remote_date,
      DATE_FORMAT(expires_at, '%Y-%m-%d %H:%i:%s.%f') AS expiry_date FROM gateway_payment_state
      WHERE payment_id = ? OR subscription_id = ? FOR UPDATE`, [paymentId, subscriptionId]);
    const previous = existing[0];
    if (existing.length > 1 || (previous && (previous.payment_id !== paymentId || previous.subscription_id !== subscriptionId || previous.company_id !== companyId))) {
      throw new PaymentError(422, 'Vínculo de pagamento inválido.');
    }
    const terminal = previous && ['refunded', 'charged_back'].includes(previous.remote_status);
    const regressesApproval = previous?.activated_at && !['approved', 'refunded', 'charged_back', 'in_mediation'].includes(state);
    if (previous && (updated.getTime() < millis(previous.remote_date) || terminal || regressesApproval ||
        (updated.getTime() === millis(previous.remote_date) && state === previous.remote_status))) {
      await connection.commit();
      const status = sub.status === 'active' && previous.expiry_date && millis(previous.expiry_date) <= Date.now() ? 'expired' : sub.status;
      return { status, reconciled: status === 'active', message: 'Estado já processado; nenhuma alteração duplicada.' };
    }
    const period = Number(sub.billing_period_days || 30);
    if (!Number.isInteger(period) || period < 1 || period > 366) throw new PaymentError(422, 'Período contratado inválido.');
    // Freeze expiry on first approval. Duplicates, late delivery and reconciliation never extend it.
    const expiry = previous?.expiry_date || (sub.status === 'active' && sub.stored_expiry ? sub.stored_expiry : approved ? sqlDate(new Date(approved.getTime() + period * 86400000)) : null);
    const activation = previous?.activated_at || (approved ? sqlDate(approved) : null);
    let nextStatus = sub.status;
    if (['refunded', 'charged_back', 'in_mediation'].includes(state)) nextStatus = 'canceled';
    else if (state === 'approved') nextStatus = expiry && millis(expiry) > Date.now() ? 'active' : 'canceled';
    else if (['rejected', 'cancelled'].includes(state)) nextStatus = 'canceled';
    await connection.query(`INSERT INTO gateway_payment_state
      (payment_id, subscription_id, company_id, remote_status, remote_updated_at, activated_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE remote_status=VALUES(remote_status), remote_updated_at=VALUES(remote_updated_at), activated_at=VALUES(activated_at), expires_at=VALUES(expires_at)`,
      [paymentId, subscriptionId, companyId, state, sqlDate(updated), activation, expiry]);
    await connection.query('UPDATE subscriptions SET status = ?, nextBillingDate = COALESCE(?, nextBillingDate) WHERE id = ?', [nextStatus, expiry, subscriptionId]);
    const logStatus = state === 'approved' ? 'paid' : ['refunded', 'charged_back'].includes(state) ? 'refunded' : ['rejected', 'cancelled'].includes(state) ? 'failed' : 'pending';
    await connection.query(`INSERT INTO payment_logs (id, subscriptionId, amount, status, gateway_reference) VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE status=VALUES(status)`, [`pay_mp_${paymentId}`, subscriptionId, sub.amount, logStatus, paymentId]);
    const [grants]: any = await connection.query(`SELECT granted_plan FROM admin_plan_grants WHERE company_id = ? AND status='active'
      AND start_date <= UTC_TIMESTAMP() AND end_date > UTC_TIMESTAMP() ORDER BY created_at DESC LIMIT 1`, [companyId]);
    const [otherPaid]: any = await connection.query(`SELECT planId FROM subscriptions WHERE companyId=? AND status='active' AND nextBillingDate > UTC_TIMESTAMP()
      ORDER BY CASE WHEN planId='plan_diamond_extremo' THEN 2 ELSE 1 END DESC, nextBillingDate DESC LIMIT 1`, [companyId]);
    let companyTier = 'bronze', grant = 'bronze';
    if (grants[0]) { companyTier = tier(grants[0].granted_plan); grant = 'admin_grant'; }
    else if (otherPaid[0]) { companyTier = tier(otherPaid[0].planId); grant = 'paid'; }
    else if (companies[0].access_grant_type === 'trial' && new Date(companies[0].trial_ends_at).getTime() > Date.now()) { companyTier = 'gold_vip'; grant = 'trial'; }
    await connection.query(`UPDATE companies SET planLevel=?, access_grant_type=?, isSponsored=?,
      has_used_trial=IF(?='active', 1, has_used_trial) WHERE id=?`, [companyTier, grant, companyTier === 'bronze' ? 0 : 1, nextStatus, companyId]);
    await connection.commit();

    if (nextStatus === 'active' && !previous?.activated_at) {
      void (async () => {
        try {
          const [uRows]: any = await pool.query(
            `SELECT u.name, u.email, c.name AS company_name
               FROM subscriptions s
               JOIN users u ON u.id = s.userId
          LEFT JOIN companies c ON c.id = s.companyId
              WHERE s.id = ? LIMIT 1`,
            [subscriptionId]
          );
          if (uRows && uRows.length > 0 && uRows[0].email) {
            const row = uRows[0];
            const planDisplay = sub.planId === 'plan_diamond_extremo' ? 'Diamond Extremo' : 'Gold VIP';
            const orderId = `PED-${String(subscriptionId).slice(-8).toUpperCase()}`;
            const amountStr = (paidCents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            await mailService.sendPaymentApproved({
              to: row.email,
              name: row.name,
              companyName: row.company_name || 'Sua Empresa',
              planName: planDisplay,
              orderId,
              amount: amountStr,
            });
          }
        } catch (mailErr) {
          console.warn('[mail] Failed to send payment approval email:', mailErr);
        }
      })();
    }

    return { status: nextStatus, reconciled: nextStatus === 'active', message: nextStatus === 'active' ? 'Pagamento confirmado no gateway e plano ativo no banco.' : 'Pagamento consultado; nenhum acesso pago concedido.' };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
}
