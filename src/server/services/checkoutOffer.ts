import { PaymentError } from './paymentError.js';
import { paymentCents } from './paymentSettlement.js';

export type CheckoutMethod = 'card' | 'pix';
export interface CheckoutQuote {
  amount: number;
  originalAmount: number;
  couponCode: string | null;
  expiresAt?: string;
  notice?: string;
}
const offers = {
  card: { code: 'TESTECARTAO2', amount: 2, type: 'portal_test_card_v1' },
  pix: { code: 'TESTEPIX1', amount: 1, type: 'portal_test_pix_v1' },
} as const;

// Explicit, operator-configured 24-hour window; absent/invalid configuration is OFF.
function configuration(now = Date.now()) {
  const email = process.env.PAYMENT_TEST_ACCOUNT_EMAIL?.trim().toLowerCase();
  const start = process.env.PAYMENT_TEST_STARTS_AT || '';
  const end = process.env.PAYMENT_TEST_EXPIRES_AT || '';
  const from = Date.parse(start), until = Date.parse(end);
  if (!email || !start.endsWith('Z') || !end.endsWith('Z') || !Number.isFinite(from) ||
      !Number.isFinite(until) || until <= from || until - from > 86400000 || now < from || now >= until) return null;
  return { email, expiresAt: new Date(until).toISOString() };
}
async function eligible(db: any, userId: string) {
  const config = configuration();
  if (!config) return null;
  const [users]: any = await db.query('SELECT email FROM users WHERE id=? LIMIT 1', [userId]);
  return String(users[0]?.email || '').trim().toLowerCase() === config.email ? config : null;
}
async function used(db: any, userId: string, method: CheckoutMethod) {
  // A reserved attempt consumes the offer, even on timeout/refund/rejection.
  // Never recycle a promotion while a remote financial outcome may be unknown.
  const [rows]: any = await db.query('SELECT id FROM subscriptions WHERE userId=? AND payment_type=? LIMIT 1', [userId, offers[method].type]);
  return rows.length > 0;
}
function supported(planId: string, price: number, method: CheckoutMethod) {
  return ['plan_gold_vip', 'plan_diamond_extremo'].includes(planId) && price > offers[method].amount;
}
export async function previewCheckoutOffer(db: any, userId: string, planId: string, price: number, method: CheckoutMethod): Promise<CheckoutQuote> {
  const ordinary: CheckoutQuote = { amount: price, originalAmount: price, couponCode: null };
  if (!supported(planId, price, method)) return ordinary;
  const config = await eligible(db, userId);
  if (!config) return ordinary;
  if (await used(db, userId, method)) return { ...ordinary, notice: 'Cupom de teste já reservado/utilizado nesta modalidade. Uma nova compra tem o valor normal.' };
  return { amount: offers[method].amount, originalAmount: price, couponCode: offers[method].code, expiresAt: config.expiresAt };
}
export async function checkoutPurchasePrice(db: any, userId: string, planId: string, price: number, method: CheckoutMethod, input: { couponCode?: unknown; quotedAmount?: unknown }) {
  const code = input.couponCode;
  let amount = price, paymentType: string = method === 'card' ? 'onetime_card' : 'onetime_pix';
  if (code !== undefined && code !== null && code !== '') {
    if (code !== offers[method].code || !supported(planId, price, method)) throw new PaymentError(400, 'Cupom inválido para este plano ou modalidade.');
    if (!await eligible(db, userId)) throw new PaymentError(409, 'Cupom indisponível ou expirado. Nenhuma cobrança foi criada.');
    if (await used(db, userId, method)) throw new PaymentError(409, 'Cupom de teste já reservado/utilizado. Retome a tentativa existente.');
    amount = offers[method].amount;
    paymentType = offers[method].type;
  }
  if (input.quotedAmount !== undefined && paymentCents(input.quotedAmount) !== paymentCents(amount)) {
    throw new PaymentError(409, 'O valor mudou. Confira novamente o resumo antes de pagar. Nenhuma cobrança foi criada.');
  }
  return { amount, paymentType, promotional: paymentType.startsWith('portal_test_') };
}
