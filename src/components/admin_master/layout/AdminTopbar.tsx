/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Admin Master Topbar Component with Spotlight & BI AI Trigger
 */

import React from 'react';
import { Search, Sparkles, Bell, UserCheck, ShieldAlert, BarChart2, LogOut } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

interface AdminTopbarProps {
  onOpenSpotlight: () => void;
  onOpenBiAi: () => void;
  onSelectProfile?: () => void;
}

export const AdminTopbar: React.FC<AdminTopbarProps> = ({ onOpenSpotlight, onOpenBiAi, onSelectProfile }) => {
  const { user, isImpersonating, stopImpersonating } = useAuth();

  return (
    <header className="min-h-20 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white px-4 md:px-6 py-3 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-20">

      {/* Search Bar Trigger */}
      <div className="flex items-center gap-4 flex-1 min-w-0 max-w-full md:max-w-xl">
        <button
          onClick={onOpenSpotlight}
          className="w-full bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-2xl px-3 md:px-4 py-2.5 text-xs text-slate-400 flex items-center justify-between gap-2 transition group cursor-pointer min-w-0"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Search className="w-4 h-4 text-blue-400 group-hover:scale-110 transition shrink-0" />
            <span className="truncate">Busca Global Spotlight (empresas, usuários, faturas...)...</span>
          </div>
          <span className="hidden sm:inline text-[10px] font-mono bg-slate-900 border border-slate-700 text-slate-400 px-2 py-0.5 rounded-md shrink-0">
            Ctrl + K
          </span>
        </button>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2 md:gap-3 flex-wrap justify-end min-w-0">

        {/* BI AI Assistant Trigger */}
        <button
          onClick={onOpenBiAi}
          className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-[11px] md:text-xs font-bold shadow-lg shadow-purple-500/20 transition shrink-0 cursor-pointer"
        >
          <BarChart2 className="w-4 h-4" />
          <span className="hidden sm:inline">IA BI Executivo</span>
          <span className="sm:hidden">IA BI</span>
        </button>

        {/* Impersonation Indicator */}
        {isImpersonating && (
          <button
            onClick={stopImpersonating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] md:text-xs font-bold hover:bg-amber-500/30 transition cursor-pointer max-w-full min-w-0"
          >
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span className="truncate">Sair Impersonação ({user?.name})</span>
          </button>
        )}

        {/* Notifications */}
        <button className="p-2.5 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800 transition relative cursor-pointer shrink-0">
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-[#C8102E] absolute top-2 right-2 animate-ping"></span>
        </button>

        {/* User Profile */}
        <div
          onClick={onSelectProfile}
          className="flex items-center gap-2 md:gap-3 pl-2 md:pl-3 border-l border-slate-800 cursor-pointer group min-w-0 shrink-0"
          title="Ver meu perfil Minha Conta"
        >
          <img
            src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'}
            alt={user?.name || 'Administrador Master'}
            className="w-9 h-9 rounded-xl object-cover border border-slate-700 group-hover:border-[#C8102E] transition shrink-0"
          />
          <div className="hidden lg:block min-w-0">
            <span className="text-xs font-bold text-white block leading-none group-hover:text-red-400 transition truncate">{user?.name || 'Administrador Master'}</span>
            <span className="text-[10px] text-emerald-400 font-bold block mt-1 truncate">● Master Executivo</span>
          </div>
        </div>

        {/* Permanent Sair / Logout Button */}
        <button
          onClick={() => {
            localStorage.clear();
            window.location.href = '/';
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-950/60 hover:bg-[#C8102E] border border-red-900/50 text-red-200 hover:text-white text-xs font-extrabold transition shadow cursor-pointer shrink-0"
          title="Sair do sistema e encerrar sessão"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sair</span>
        </button>

      </div>
    </header>
  );
};
