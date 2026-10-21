import { pool } from '../mysql.js';

/** Legacy installations retain login until the explicitly approved migration. */
export async function sessionVersion(userId: string): Promise<number> {
  try {
    const [rows]: any = await pool.query('SELECT version FROM user_auth_state WHERE user_id = ?', [userId]);
    return Number(rows[0]?.version || 0);
  } catch {
    // Legacy installations retain login (version 0) until table is migrated
    return 0;
  }
}
