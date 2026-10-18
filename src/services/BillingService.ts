/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Billing client. Thin wrapper over the real backend payment endpoints —
 * no payment data is ever fabricated here; the server is the payment authority.
 */

import { api } from '../lib/apiClient';

export interface PixDetails {
  paymentId: string;
  qrCode: string;
  qrCodeBase64: string;
  amount: number;
  expirationDate: string;
  expiresInSeconds: number;
}

interface PixApiResponse {
  paymentId: string;
  qrCode: string;
  qrCodeBase64: string;
  amount: number;
  expirationDate: string;
  subscriptionId: string;
}

export class BillingService {
  /**
   * Creates a real PIX charge on the backend and returns the QR issued by
   * Mercado Pago. planCode is the plan id (e.g. plan_gold_vip).
   */
  static async generatePixPayment(
    companyId: string,
    planCode: string,
    _amount: number,
    payerEmail: string
  ): Promise<PixDetails> {
    const res = await api.post<PixApiResponse>('/api/payments/pix', {
      companyId,
      planId: planCode,
      payerEmail
    });

    const expiresInSeconds = Math.max(
      0,
      Math.floor((new Date(res.expirationDate).getTime() - Date.now()) / 1000)
    );

    return {
      paymentId: res.paymentId,
      qrCode: res.qrCode,
      qrCodeBase64: res.qrCodeBase64,
      amount: res.amount,
      expirationDate: res.expirationDate,
      expiresInSeconds: expiresInSeconds || 1800
    };
  }

  /**
   * Creates a Checkout Pro preference on the backend and returns the hosted
   * checkout URL to redirect the buyer to.
   */
  static async generateCheckoutPreference(
    companyId: string,
    planCode: string,
    _amount: number,
    payerEmail: string
  ): Promise<string> {
    const res = await api.post<{ initPoint: string; subscriptionId: string }>(
      '/api/payments/checkout',
      { companyId, planId: planCode, payerEmail }
    );
    return res.initPoint;
  }

  /** Authoritative subscription status from the backend (feature gating). */
  static async getSubscriptionStatus(): Promise<string> {
    const res = await api.get<{ status: string }>('/api/payments/status');
    return res.status;
  }
}
