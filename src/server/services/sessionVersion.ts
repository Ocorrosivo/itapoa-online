import { pool } from '../mysql.js';

/** Legacy installations retain login until the explicitly approved migration. */
export async function sessionVersion(userId: string): Promise<number> {
  try {
    const [rows]: any = await pool.query('SELECT version FROM user_auth_state WHERE user_id = ?', [userId]);
    return Number(rows[0]?.version || 0);
  } catch (error: any) {
    if (error?.code === 'ER_NO_SUCH_TABLE') return 0;
    throw error;
  }
}
