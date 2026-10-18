/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Lojista Portal Topbar Component
 */

import React from 'react';
import { Sparkles, Bell, ExternalLink, ShieldAlert, LogOut } from 'lucide-react';
import { DigitalHealthBar } from '../common/DigitalHealthBar';
import { Company } from '../../../types';
import { useAuth } from '../../../context/AuthContext';

interface LojistaTopbarProps {
  company: Company | null;
  onOpenHealthModal: () => void;
  onOpenAiModal: () => void;
  onNavigateCompany: (slug: string) => void;
}

export const LojistaTopbar: React.FC<LojistaTopbarProps> = ({
  company,
  onOpenHealthModal,
  onOpenAiModal,
  onNavigateCompany
}) => {
  const { user, isImpersonating, stopImpersonating, logout } = useAuth();

  return (
    <header className="h-20 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white px-6 flex items-center justify-between sticky top-0 z-20">
      
      {/* Digital Health Score Indicator */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <DigitalHealthBar company={company} onOpenModal={onOpenHealthModal} />
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-3">
        
        {/* Lojista AI Assistant Trigger */}
        <button
          onClick={onOpenAiModal}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-500/20 transition transform hover:-translate-y-0.5"
        >
          <Sparkles className="w-4 h-4 animate-pulse" />
          <span>IA do Lojista</span>
        </button>

        {/* View Public Mini Site */}
        {company?.slug && (
          <button
            onClick={() => onNavigateCompany(company.slug)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            <span>Ver Mini-Site</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Impersonation Indicator */}
        {isImpersonating && (
          <button
            onClick={stopImpersonating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold hover:bg-amber-500/30 transition"
          >
            <ShieldAlert className="w-4 h-4 animate-bounce" />
            <span>Encerrar Impersonação</span>
          </button>
        )}

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-white font-bold text-xs">
            {user?.name?.charAt(0) || 'L'}
          </div>
          <button
            onClick={logout}
            title="Sair da Conta"
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-red-400 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
};
