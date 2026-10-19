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
  charset: 'utf8mb4',
  connectTimeout: 5000,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 50,
  // Reject multi-statement payloads outright (defence in depth against injection).
  multipleStatements: false
});

// Idle connection errors must not become uncaught EventEmitter errors.
pool.on('connection', connection => {
  connection.on('error', () => {});
});

export const isDatabaseUnavailable = (error: unknown): boolean => {
  const code = (error as { code?: string })?.code;
  return typeof code === 'string' && [
    'ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET',
    'EHOSTUNREACH', 'ENETUNREACH', 'PROTOCOL_CONNECTION_LOST',
    'ER_CON_COUNT_ERROR', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR'
  ].includes(code);
};

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
