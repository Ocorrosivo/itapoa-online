/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Header — Menu em ordem exata (7 itens) desktop e mobile iguais, SPA sem reload
 */

import React, { useState } from 'react';
import {
  Sparkles, Settings, LogIn, LogOut, MapPin, Building2,
  ShieldAlert, Bell, Facebook, Instagram, Youtube, ChevronDown, UserCheck, Menu, X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCompany } from '../../context/CompanyContext';
import { AuthorizationService } from '../../services/authorizationService';
import { PermissionGate } from './PermissionGate';

interface HeaderProps {
  currentTab: string;
  onNavigateTab: (tab: string) => void;
  onOpenAuthModal: () => void;
  onOpenAIModal: () => void;
}

// Fase 7 — 10 itens exatos, sem badge, Turismo/Eventos/Informativo separados
const MENU: { label: string; tab: string }[] = [
  { label: 'Início', tab: 'home' },
  { label: 'Projetos Sociais', tab: 'projetos-sociais' },
  { label: 'Categorias', tab: 'categorias' },
  { label: 'Bairros', tab: 'bairros' },
  { label: 'Empresas', tab: 'empresas' },
  { label: 'Turismo', tab: 'turismo' },
  { label: 'Eventos', tab: 'eventos' },
  { label: 'Informativo', tab: 'informativo' },
  { label: 'Empregos', tab: 'empregos' },
  { label: 'Contato', tab: 'contato' },
];

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onNavigateTab,
  onOpenAuthModal,
  onOpenAIModal
}) => {
  const { user, isAuthenticated, logout, isImpersonating, stopImpersonating, realAdminUser } = useAuth();
  const { cities, selectedCityId, setSelectedCityId, categories } = useCompany();
  const [mobileOpen, setMobileOpen] = useState(false);

  const bairros = [
    'Centro', 'Itapema do Norte', 'Barra do Saí', 'Cambiju', 'Rainha', 'Balneário Brasília', 'Pontal do Norte'
  ];

  const handleNav = (tab: string) => {
    setMobileOpen(false);
    onNavigateTab(tab);
  };

  const isActive = (tab: string) => currentTab === tab;

  return (
    <>
      {isImpersonating && (
        <div className="bg-amber-500 text-amber-950 px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 animate-bounce" />
              <span>
                <strong>SESSÃO ASSUMIDA (IMPERSONATION):</strong> Logado como "{user?.name}" (Admin: {realAdminUser?.email})
              </span>
            </div>
            <button
              onClick={stopImpersonating}
              className="px-3 py-1 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
            >
              Encerrar Impersonação
            </button>
          </div>
        </div>
      )}

      <div className="bg-slate-950 text-slate-400 text-[11px] font-semibold py-1 text-center border-b border-slate-800 tracking-wider">
        Guia Comercial e Marketplace Premium
      </div>

      <div className="bg-[#C8102E] text-white shadow-md relative z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div
            onClick={() => handleNav('home')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <img
              src="/logotipo.png"
              alt="Itapoá Online - Guia Comercial e Marketplace"
              className="h-12 md:h-14 w-auto object-contain group-hover:scale-105 transition transform drop-shadow-lg"
            />
            <div className="hidden md:flex flex-col">
              <span className="text-sm font-black tracking-wider text-white uppercase leading-none">ITAPOÁ ONLINE</span>
              <span className="text-[10px] font-semibold text-red-200 tracking-wide mt-0.5">Guia Comercial & Marketplace</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleNav(user?.role === 'admin_master' ? 'admin' : 'painel')}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-black/20 hover:bg-black/30 text-white transition flex items-center gap-1.5"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Meu Painel</span>
                </button>
                <button
                  onClick={logout}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-black/20 hover:bg-black/30 text-white transition flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sair</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="text-xs font-bold px-4 py-2 rounded-xl bg-white text-[#C8102E] hover:bg-red-50 transition shadow-md cursor-pointer"
              >
                Entrar / Cadastrar
              </button>
            )}
            <button
              onClick={() => setMobileOpen(v => !v)}
              className="lg:hidden p-2 rounded-lg bg-black/20 hover:bg-black/30 text-white transition ml-1"
              aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-40 bg-[#0A0915] border-b border-slate-800 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between min-h-12 text-[11px] sm:text-xs font-bold uppercase tracking-wider">
            <nav className="hidden lg:flex items-center h-full flex-wrap">
              {MENU.slice(0, 5).map(item => (
                <button
                  key={item.tab}
                  onClick={() => handleNav(item.tab)}
                  className={`h-12 px-3 flex items-center justify-center transition whitespace-nowrap gap-1.5 ${
                    isActive(item.tab)
                      ? item.tab === 'home'
                        ? 'bg-[#C8102E] text-white font-black'
                        : 'bg-slate-800 text-white'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}
              <div className="flex flex-col border-l border-slate-800 ml-1 pl-1">
                {MENU.slice(5, 8).map(item => (
                  <button
                    key={item.tab}
                    onClick={() => handleNav(item.tab)}
                    className={`h-6 px-3 flex items-center justify-start transition whitespace-nowrap text-[10px] ${
                      isActive(item.tab) ? 'bg-slate-800 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              {MENU.slice(8).map(item => (
                <button
                  key={item.tab}
                  onClick={() => handleNav(item.tab)}
                  className={`h-12 px-3 flex items-center justify-center transition whitespace-nowrap gap-1.5 ${
                    isActive(item.tab) ? 'bg-slate-800 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}

              <button
                onClick={onOpenAuthModal}
                className="h-12 px-3 text-cyan-400 hover:text-cyan-300 hover:bg-slate-800 transition flex items-center gap-1 font-bold whitespace-nowrap"
              >
                <span>VIP 💎</span>
              </button>
            </nav>

            {/* Mobile hint when collapsed */}
            <div className="lg:hidden flex items-center text-slate-400 text-[10px] font-semibold tracking-wider">
              <span className="hidden sm:inline">Menu — toque no ícone ao topo</span>
              <span className="sm:hidden">ITAPOÁ ONLINE</span>
            </div>

            <div className="flex items-center gap-3 h-full">
              <div className="hidden lg:flex items-center gap-3 text-slate-400 border-r border-slate-800 pr-4">
                <Facebook className="w-3.5 h-3.5 hover:text-blue-400 cursor-pointer transition" />
                <Instagram className="w-3.5 h-3.5 hover:text-pink-400 cursor-pointer transition" />
                <span className="text-xs font-bold hover:text-green-400 cursor-pointer transition">w</span>
                <Youtube className="w-3.5 h-3.5 hover:text-red-500 cursor-pointer transition" />
              </div>

              <Bell className="w-4 h-4 text-slate-400 cursor-pointer hover:text-white transition" />

              <button
                onClick={onOpenAIModal}
                title="IA do Guia Comercial"
                className="p-2 text-slate-300 hover:text-amber-400 transition"
              >
                <Sparkles className="w-4 h-4 animate-pulse" />
              </button>

              <PermissionGate permission="companies.edit">
                <button
                  onClick={() => handleNav('admin')}
                  title="Painel Administrativo Master"
                  className="p-2 text-purple-400 hover:text-purple-300 transition"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </PermissionGate>

              <button
                onClick={onOpenAuthModal}
                className="hidden sm:inline-flex px-4 py-1.5 bg-[#C8102E] hover:bg-red-700 text-white font-extrabold text-[10px] rounded transition shadow-md tracking-wider ml-1"
              >
                ANUNCIANTE
              </button>
            </div>
          </div>
        </div>

        {/* Mobile drawer — mesma ordem, lista vertical */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-slate-800 bg-[#0A0915]">
            <nav className="flex flex-col py-2">
              {MENU.map(item => (
                <button
                  key={item.tab}
                  onClick={() => handleNav(item.tab)}
                  className={`text-left px-4 py-3 text-xs font-bold uppercase tracking-wider transition border-b border-slate-800/50 last:border-0 flex items-center gap-2 ${
                    isActive(item.tab) ? 'bg-[#C8102E] text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span>{item.label}</span>
                </button>
              ))}
              <button
                onClick={() => { setMobileOpen(false); onOpenAuthModal(); }}
                className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-cyan-400 hover:bg-slate-800 hover:text-cyan-300 transition"
              >
                VIP 💎
              </button>
            </nav>
          </div>
        )}
      </header>
    </>
  );
};
