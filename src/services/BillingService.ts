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
  subscriptionId: string;
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
  private static toPixDetails(res: PixApiResponse): PixDetails {
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
      expiresInSeconds: expiresInSeconds || 1800,
      subscriptionId: res.subscriptionId
    };
  }

  /** Active PIX for a company/plan (recover after reload without duplicate). */
  static async getActivePix(companyId: string, planCode: string): Promise<PixDetails | null> {
    const params = new URLSearchParams({ companyId, planId: planCode });
    const res = await api.get<PixApiResponse | null>(`/api/payments/pix/active?${params.toString()}`);
    if (!res) return null;
    return BillingService.toPixDetails(res as PixApiResponse);
  }

  /** Poll per-subscription status (Pix + Checkout). Webhook remains activation path. */
  static async getSubscriptionStatusById(subscriptionId: string): Promise<string> {
    const res = await api.get<{ status: string }>(`/api/payments/subscription/${encodeURIComponent(subscriptionId)}/status`);
    return res.status;
  }

  static async getSubscriptionStatusDetails(subscriptionId: string): Promise<{ status: string; expiresAt?: string; planId?: string; companyId?: string }> {
    return await api.get<{ status: string; expiresAt?: string; planId?: string; companyId?: string }>(`/api/payments/subscription/${encodeURIComponent(subscriptionId)}/status`);
  }

  /**
   * Creates a real PIX charge on the backend and returns the QR issued by
   * Mercado Pago. planCode is the plan id (e.g. plan_gold_vip).
   */
  static async generatePixPayment(
    companyId: string,
    planCode: string,
    _amount: number,
    payerEmail: string,
    payerName?: string,
    payerDoc?: { type?: string; number?: string },
    requestId?: string
  ): Promise<PixDetails> {
    const res = await api.post<PixApiResponse>('/api/payments/pix', {
      companyId,
      planId: planCode,
      payerEmail,
      payerName,
      payerDoc,
      requestId
    });

    return BillingService.toPixDetails(res);
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

  /** Reconciliação com o Mercado Pago para confirmar pagamento sem esperar pelo webhook. */
  static async reconcilePayment(subscriptionId: string): Promise<{ status: string; reconciled: boolean; message: string }> {
    return await api.post<{ status: string; reconciled: boolean; message: string }>(
      `/api/payments/subscription/${encodeURIComponent(subscriptionId)}/reconcile`
    );
  }

  /** Consulta elegibilidade para 7 dias de experiência Gold. */
  static async checkTrialEligibility(companyId: string): Promise<{
    eligible: boolean;
    reason?: string;
    hasUsedTrial: boolean;
    trialEndsAt: string | null;
  }> {
    return await api.get<{
      eligible: boolean;
      reason?: string;
      hasUsedTrial: boolean;
      trialEndsAt: string | null;
    }>(`/api/plans/trial-eligibility/${encodeURIComponent(companyId)}`);
  }

  /** Inicia os 7 dias de experiência Gold (sem cobrança). */
  static async startSevenDayGoldTrial(companyId: string): Promise<{
    success: boolean;
    trialEndsAt: string;
    planTier: string;
    message: string;
  }> {
    return await api.post<{
      success: boolean;
      trialEndsAt: string;
      planTier: string;
      message: string;
    }>('/api/plans/start-trial', { companyId });
  }
}
