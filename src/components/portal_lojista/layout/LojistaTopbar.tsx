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
    <header className="min-h-20 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white px-4 md:px-6 py-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-20">

      {/* Digital Health Score Indicator */}
      <div className="flex items-center gap-4 flex-1 min-w-0 max-w-full md:max-w-md">
        <DigitalHealthBar company={company} onOpenModal={onOpenHealthModal} />
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2 md:gap-3 flex-wrap justify-end min-w-0">

        {/* Lojista AI Assistant Trigger */}
        <button
          onClick={onOpenAiModal}
          className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-[11px] md:text-xs font-bold shadow-lg shadow-blue-500/20 transition transform hover:-translate-y-0.5 shrink-0"
        >
          <Sparkles className="w-4 h-4 animate-pulse" />
          <span className="hidden sm:inline">IA do Lojista</span>
          <span className="sm:hidden">IA</span>
        </button>

        {/* View Public Mini Site */}
        {company?.slug && (
          <button
            onClick={() => onNavigateCompany(company.slug)}
            className="flex items-center gap-1.5 px-3 md:px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 text-[11px] md:text-xs font-semibold transition shrink-0"
          >
            <span className="hidden sm:inline">Ver Mini-Site</span>
            <span className="sm:hidden">Site</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Impersonation Indicator */}
        {isImpersonating && (
          <button
            onClick={stopImpersonating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] md:text-xs font-bold hover:bg-amber-500/30 transition max-w-full"
          >
            <ShieldAlert className="w-4 h-4 animate-bounce shrink-0" />
            <span className="truncate">Encerrar Impersonação</span>
          </button>
        )}

        {/* User Profile */}
        <div className="flex items-center gap-2 md:gap-3 pl-2 md:pl-3 border-l border-slate-800 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-white font-bold text-xs shrink-0">
            {user?.name?.charAt(0) || 'L'}
          </div>
          <button
            onClick={logout}
            title="Sair da Conta"
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-red-400 transition shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
};
