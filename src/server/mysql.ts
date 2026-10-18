/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * MySQL connection pool. Credentials come exclusively from the environment.
 */

import mysql from 'mysql2/promise';
import { env } from './config/env.js';

export const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.name,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Reject multi-statement payloads outright (defence in depth against injection).
  multipleStatements: false
});

export const query = async (sql: string, params?: any[]) => {
  const [rows] = await pool.execute(sql, params);
  return rows;
};

/**
 * Verifies connectivity without leaking credentials into logs.
 */
export const checkConnection = async (): Promise<boolean> => {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
};
