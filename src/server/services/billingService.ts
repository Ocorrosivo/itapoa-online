/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Billing reads. Subscriptions and payment logs come straight from MySQL;
 * gateway integration is not part of this layer.
 */

import { pool } from '../mysql.js';

export class BillingService {
  /**
   * Payment logs for one company, resolved through its subscriptions.
   * The company id is always a bound parameter.
   */
  async listPaymentLogsByCompany(companyId: string) {
    const [rows]: any = await pool.query(
      `SELECT pl.id, pl.subscriptionId, pl.amount, pl.status,
              pl.gateway_reference, pl.createdAt,
              s.planId, s.paymentMethod
         FROM payment_logs pl
         INNER JOIN subscriptions s ON s.id = pl.subscriptionId
        WHERE s.companyId = ?
        ORDER BY pl.createdAt DESC
        LIMIT 200`,
      [companyId]
    );
    return rows;
  }

  /** All payment logs, admin view. */
  async listAllPaymentLogs() {
    const [rows]: any = await pool.query(
      `SELECT id, subscriptionId, amount, status, gateway_reference, createdAt
         FROM payment_logs
        ORDER BY createdAt DESC
        LIMIT 200`
    );
    return rows;
  }

  /** Subscriptions of one company. */
  async listSubscriptionsByCompany(companyId: string) {
    const [rows]: any = await pool.query(
      `SELECT id, userId, companyId, planId, status, amount, paymentMethod,
              nextBillingDate, createdAt
         FROM subscriptions
        WHERE companyId = ?
        ORDER BY createdAt DESC`,
      [companyId]
    );
    return rows;
  }
}

export const billingService = new BillingService();
