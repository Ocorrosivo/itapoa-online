/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Read-Only Mode Banner Component
 */

import React from 'react';
import { Lock, ShieldAlert, Sparkles, CreditCard } from 'lucide-react';
import { useMercadoPago } from '../../context/MercadoPagoContext';

interface ReadOnlyBannerProps {
  onSelectPlan: () => void;
}

export const ReadOnlyBanner: React.FC<ReadOnlyBannerProps> = ({ onSelectPlan }) => {
  const { trialInfo } = useMercadoPago();

  if (!trialInfo.readOnlyMode) return null;

  return (
    <div className="bg-gradient-to-r from-red-950 via-slate-900 to-red-950 border-y border-red-900/60 p-4 text-white shadow-2xl">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0 border border-red-500/40">
            <Lock className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span className="text-xs font-black uppercase text-red-400 tracking-wider block">
              PERÍODO DE TESTE (TRIAL) ENCERRADO — MODO SOMENTE LEITURA ATIVO
            </span>
            <p className="text-xs text-slate-300">
              Seus dados, produtos e histórico continuam 100% salvos e protegidos. Assine um plano para liberar edições e novos cadastros.
            </p>
          </div>
        </div>

        <button
          onClick={onSelectPlan}
          className="px-6 py-2.5 bg-[#C8102E] hover:bg-red-700 text-white font-extrabold text-xs rounded-xl transition shadow-xl tracking-wider uppercase flex items-center gap-2 shrink-0"
        >
          <CreditCard className="w-4 h-4" />
          <span>ASSINAR PLANO AGORA ➔</span>
        </button>
      </div>
    </div>
  );
};
