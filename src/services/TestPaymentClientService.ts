/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Cliente frontend para Pagamentos de Teste do Mercado Pago (Exclusivo Admin Master).
 */

import { api } from '../lib/apiClient';

export interface TestPaymentConfig {
  publicKey: string;
  environment: 'sandbox' | 'production';
  isLiveCredential: boolean;
  needsSandboxKey: boolean;
  amounts: {
    pix: number;
    card: number;
  };
  pixEnabled: boolean;
  cardEnabled: boolean;
}

export interface TestPaymentItem {
  id: string;
  userId: string;
  companyId: string | null;
  paymentMethod: string;
  amount: number;
  environment: 'sandbox' | 'production';
  status: string;
  gatewayReference: string | null;
  qrCode: string | null;
  qrCodeBase64: string | null;
  payerEmail: string | null;
  cardLastFour: string | null;
  cardBrand: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatedTestPix {
  id: string;
  gatewayReference: string;
  amount: number;
  qrCode: string;
  qrCodeBase64: string;
  status: string;
  environment: 'sandbox' | 'production';
  createdAt: string;
}

export interface CreatedTestCard {
  id: string;
  gatewayReference: string;
  paymentMethod: string;
  amount: number;
  status: string;
  environment: 'sandbox' | 'production';
  cardBrand: string | null;
  cardLastFour: string | null;
  statusDetail?: string;
  createdAt: string;
}

export class TestPaymentClientService {
  static async getConfig(environment: 'sandbox' | 'production' = 'sandbox'): Promise<TestPaymentConfig> {
    return await api.get<TestPaymentConfig>(`/api/admin/test-payments/config?env=${environment}`);
  }

  static async getHistory(limit = 50): Promise<TestPaymentItem[]> {
    return await api.get<TestPaymentItem[]>(`/api/admin/test-payments/history?limit=${limit}`);
  }

  static async createPix(
    environment: 'sandbox' | 'production' = 'sandbox',
    payerEmail?: string,
    companyId?: string
  ): Promise<CreatedTestPix> {
    return await api.post<CreatedTestPix>('/api/admin/test-payments/pix', {
      environment,
      payerEmail,
      companyId,
    });
  }

  static async createCard(
    environment: 'sandbox' | 'production' = 'sandbox',
    cardData: Record<string, unknown>,
    companyId?: string
  ): Promise<CreatedTestCard> {
    return await api.post<CreatedTestCard>('/api/admin/test-payments/card', {
      environment,
      companyId,
      ...cardData,
    });
  }

  static async getStatus(id: string): Promise<{
    id: string;
    gatewayReference?: string;
    status: string;
    amount: number;
    paymentMethod: string;
    environment: string;
    reconciled: boolean;
    message?: string;
  }> {
    return await api.get(`/api/admin/test-payments/status/${encodeURIComponent(id)}`);
  }
}
