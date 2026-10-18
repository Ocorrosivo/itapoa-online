/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Mercado Pago & Financial Context Provider - Clean Architecture
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { TrialService, TrialStatusInfo } from '../services/TrialService';
import { BillingService, PixDetails } from '../services/BillingService';
import { useAuth } from './AuthContext';

interface MercadoPagoContextType {
  trialInfo: TrialStatusInfo;
  activePixModal: PixDetails | null;
  openPixPayment: (companyId: string, planCode: string, amount: number) => Promise<void>;
  closePixModal: () => void;
  regeneratePix: () => Promise<void>;
}

const MercadoPagoContext = createContext<MercadoPagoContextType | undefined>(undefined);

export const MercadoPagoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [trialInfo, setTrialInfo] = useState<TrialStatusInfo>({
    isTrial: true,
    isExpired: false,
    readOnlyMode: false,
    daysRemaining: 7,
    trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  });

  const [activePixModal, setActivePixModal] = useState<PixDetails | null>(null);
  const [currentPixParams, setCurrentPixParams] = useState<{ companyId: string; planCode: string; amount: number } | null>(null);

  useEffect(() => {
    if (user?.createdAt) {
      const info = TrialService.calculateTrialStatus(user.createdAt, user.subscriptionStatus || 'trial');
      setTrialInfo(info);
    }
  }, [user]);

  const openPixPayment = async (companyId: string, planCode: string, amount: number) => {
    setCurrentPixParams({ companyId, planCode, amount });
    const pix = await BillingService.generatePixPayment(companyId, planCode, amount, user?.email || 'contato@itapoa.online');
    setActivePixModal(pix);
  };

  const closePixModal = () => {
    setActivePixModal(null);
  };

  const regeneratePix = async () => {
    if (currentPixParams) {
      await openPixPayment(currentPixParams.companyId, currentPixParams.planCode, currentPixParams.amount);
    }
  };

  return (
    <MercadoPagoContext.Provider
      value={{
        trialInfo,
        activePixModal,
        openPixPayment,
        closePixModal,
        regeneratePix
      }}
    >
      {children}
    </MercadoPagoContext.Provider>
  );
};

export const useMercadoPago = () => {
  const context = useContext(MercadoPagoContext);
  if (!context) {
    throw new Error('useMercadoPago must be used within a MercadoPagoProvider');
  }
  return context;
};
