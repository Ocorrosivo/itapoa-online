import { pool } from '../mysql.js';

/** Missing user row means legacy version 0; query failures never mean version 0. */
export async function sessionVersion(userId: string): Promise<number> {
  const [rows]: any = await pool.query('SELECT version FROM user_auth_state WHERE user_id = ?', [userId]);
  const version = rows.length ? Number(rows[0].version) : 0;
  if (!Number.isSafeInteger(version) || version < 0) throw new Error('SESSION_VERSION_UNAVAILABLE');
  return version;
}
