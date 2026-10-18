/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Analytics service. Every figure is aggregated from MySQL — nothing is estimated.
 */

import { pool } from '../mysql.js';

const countRows = async (table: string): Promise<number> => {
  // Table names are literals from this module, never from a request.
  const [rows]: any = await pool.query(`SELECT COUNT(*) AS total FROM \`${table}\``);
  return Number(rows[0]?.total ?? 0);
};

export interface PlatformStats {
  companies: number;
  users: number;
  jobs: number;
  posts: number;
  coupons: number;
  reviews: number;
  leads: number;
  tickets: number;
  totalViews: number;
  totalWhatsappClicks: number;
}

export interface FinancialKPIs {
  mrr: number;
  arr: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  pastDueSubscriptions: number;
  canceledSubscriptions: number;
  revenueByPlan: { plan: string; total: number }[];
}

export class AnalyticsService {
  /** Aggregate platform counters for the admin dashboard. */
  async getPlatformStats(): Promise<PlatformStats> {
    const [
      companies, users, jobs, posts, coupons, reviews, leads, tickets
    ] = await Promise.all([
      countRows('companies'),
      countRows('users'),
      countRows('jobs'),
      countRows('blog_posts'),
      countRows('coupons'),
      countRows('reviews'),
      countRows('crm_leads'),
      countRows('support_tickets')
    ]);

    const [engagement]: any = await pool.query(
      'SELECT COALESCE(SUM(views), 0) AS views, COALESCE(SUM(clicksWhatsapp), 0) AS clicks FROM companies'
    );

    return {
      companies,
      users,
      jobs,
      posts,
      coupons,
      reviews,
      leads,
      tickets,
      totalViews: Number(engagement[0]?.views ?? 0),
      totalWhatsappClicks: Number(engagement[0]?.clicks ?? 0)
    };
  }

  /**
   * Billing KPIs derived from the subscriptions table.
   * Returns zeros when there is no subscription data — never sample figures.
   */
  async getFinancialKPIs(): Promise<FinancialKPIs> {
    const [statusRows]: any = await pool.query(
      `SELECT status, COUNT(*) AS total, COALESCE(SUM(amount), 0) AS amount
       FROM subscriptions
       GROUP BY status`
    );

    const byStatus = new Map<string, { total: number; amount: number }>();
    for (const row of statusRows) {
      byStatus.set(String(row.status), {
        total: Number(row.total ?? 0),
        amount: Number(row.amount ?? 0)
      });
    }

    const mrr = byStatus.get('active')?.amount ?? 0;

    const [planRows]: any = await pool.query(
      `SELECT p.name AS plan, COALESCE(SUM(s.amount), 0) AS total
       FROM subscriptions s
       INNER JOIN plans p ON p.id = s.planId
       WHERE s.status = 'active'
       GROUP BY p.name
       ORDER BY total DESC`
    );

    return {
      mrr,
      arr: mrr * 12,
      activeSubscriptions: byStatus.get('active')?.total ?? 0,
      trialSubscriptions: byStatus.get('trial')?.total ?? 0,
      pastDueSubscriptions: byStatus.get('past_due')?.total ?? 0,
      canceledSubscriptions: byStatus.get('canceled')?.total ?? 0,
      revenueByPlan: planRows.map((row: any) => ({
        plan: String(row.plan),
        total: Number(row.total ?? 0)
      }))
    };
  }
}

export const analyticsService = new AnalyticsService();
