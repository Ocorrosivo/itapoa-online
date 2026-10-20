import crypto from 'node:crypto';
import { pool } from '../mysql.js';
import { PaymentError } from './paymentService.js';

export interface CheckoutContact { name: string; phone: string; email: string }

export function checkoutContact(input: Record<string, unknown>): CheckoutContact {
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const phone = typeof input.phone === 'string' ? input.phone.replace(/\D/g, '') : '';
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  if (name.length < 2 || name.length > 120 || phone.length < 10 || phone.length > 15 ||
      email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new PaymentError(400, 'Informe nome, telefone e e-mail válidos.');
  }
  return { name, phone, email };
}

/** A private, resumable company shell, not a fabricated public listing. No schema changes. */
export async function prepareCheckoutCompany(userId: string, contact: CheckoutContact) {
  const id = `checkout_${crypto.createHash('sha256').update(userId).digest('hex').slice(0, 24)}`;
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [users]: any = await conn.query('SELECT id FROM users WHERE id = ? FOR UPDATE', [userId]);
    if (!users.length) throw new PaymentError(401, 'Entre novamente na sua conta.');
    const [existing]: any = await conn.query('SELECT id FROM companies WHERE id = ?', [id]);
    if (!existing.length) {
      await conn.query(
        `INSERT INTO companies (id, name, slug, phone, whatsapp, planLevel, features)
         VALUES (?, ?, ?, ?, ?, 'bronze', '[]')`,
        [id, contact.name, id, contact.phone, contact.phone]
      );
      await conn.query("INSERT INTO companies_users (user_id, company_id, access_level) VALUES (?, ?, 'owner')", [userId, id]);
    }
    const [owners]: any = await conn.query('SELECT company_id FROM companies_users WHERE user_id = ? AND company_id = ?', [userId, id]);
    if (!owners.length) throw new PaymentError(403, 'Acesso negado.');
    await conn.commit();
    return id;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally { conn.release(); }
}

export async function listOwnedCompanies(userId: string) {
  const [rows]: any = await pool.query(
    `SELECT c.* FROM companies c INNER JOIN companies_users cu ON cu.company_id = c.id
     WHERE cu.user_id = ? ORDER BY c.createdAt DESC LIMIT 100`, [userId]
  );
  return rows;
}
