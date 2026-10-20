/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Header — Turismo como dropdown (Turismo ▾ → Eventos, Informativo)
 */

import React, { useState, useRef, useEffect, useId } from 'react';
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

const MENU_PRIMARY: { label: string; tab: string }[] = [
  { label: 'Início', tab: 'home' },
  { label: 'Projetos Sociais', tab: 'projetos-sociais' },
  { label: 'CATEGORIAS', tab: 'categorias' },
  { label: 'BAIRROS', tab: 'bairros' },
  { label: 'Empresas', tab: 'empresas' },
];

const TURISMO_DROPDOWN: { label: string; tab: string }[] = [
  { label: 'Eventos', tab: 'eventos' },
  { label: 'Informativo', tab: 'informativo' },
];

const MENU_TAIL: { label: string; tab: string }[] = [
  { label: 'EMPREGOS', tab: 'empregos' },
];

const isTurismoActive = (currentTab: string) => currentTab === 'turismo';

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onNavigateTab,
  onOpenAuthModal,
  onOpenAIModal
}) => {
  const { user, isAuthenticated, logout, isImpersonating, stopImpersonating, realAdminUser } = useAuth();
  const { cities, selectedCityId, setSelectedCityId, categories } = useCompany();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [turismoOpen, setTurismoOpen] = useState(false);
  const [turismoMobileOpen, setTurismoMobileOpen] = useState(false);
  const turismoRef = useRef<HTMLDivElement>(null);
  const dropdownId = useId();
  const closeTimeoutRef = useRef<number | null>(null);

  const clearCloseTimeout = () => {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const scheduleClose = () => {
    clearCloseTimeout();
    closeTimeoutRef.current = window.setTimeout(() => setTurismoOpen(false), 120);
  };

  const handleNav = (tab: string) => {
    setMobileOpen(false);
    setTurismoOpen(false);
    setTurismoMobileOpen(false);
    onNavigateTab(tab);
    const anchors: Record<string, string> = { turismo: 'turismo', eventos: 'eventos', informativo: 'informativo' };
    const anchor = anchors[tab];
    if (anchor) {
      setTimeout(() => {
        const el = document.getElementById(anchor);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    }
  };

  const handleVip = () => {
    setMobileOpen(false);
    setTurismoOpen(false);
    onNavigateTab('planos');
  };

  const isActive = (tab: string) => currentTab === tab;

  // Fechar dropdown ao clicar fora ou pressionar Escape
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (turismoRef.current && !turismoRef.current.contains(e.target as Node)) {
        setTurismoOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTurismoOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  useEffect(() => {
    return () => clearCloseTimeout();
  }, []);

  return (
    <>
      {isImpersonating && (
        <div className="bg-amber-500 text-amber-950 px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 animate-bounce" />
              <span>
                <strong>SESSÃO ASSUMIDA (IMPERSONATION):</strong> Logado como &quot;{user?.name}&quot; (Admin: {realAdminUser?.email})
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
              <span className="text-[10px] font-semibold text-red-200 tracking-wide mt-0.5">Guia Comercial &amp; Marketplace</span>
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
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-40 bg-[#0A0915] border-b border-slate-800 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-stretch justify-between min-h-[3.5rem] text-[10px] sm:text-xs font-bold uppercase tracking-wider">
            <nav className="hidden lg:flex items-stretch" aria-label="Menu principal">
              {MENU_PRIMARY.map(item => (
                <button
                  key={item.tab}
                  onClick={() => handleNav(item.tab)}
                  className={`px-3 flex items-center justify-center transition whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
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

              {/* Turismo dropdown — link separado da seta, sem botão dentro de link */}
              <div
                ref={turismoRef}
                className={`relative flex items-stretch border-x border-slate-800/60 ${isTurismoActive(currentTab) ? 'bg-slate-800' : 'bg-transparent'}`}
                onMouseEnter={() => { clearCloseTimeout(); setTurismoOpen(true); }}
                onMouseLeave={scheduleClose}
                onFocusCapture={() => { clearCloseTimeout(); setTurismoOpen(true); }}
              >
                <button
                  onClick={() => handleNav('turismo')}
                  className={`px-3 flex items-center justify-center transition whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:z-10 ${
                    isTurismoActive(currentTab) ? 'text-white' : 'text-slate-300 hover:text-white'
                  }`}
                  aria-current={isTurismoActive(currentTab) ? 'page' : undefined}
                >
                  Turismo
                </button>
                <button
                  type="button"
                  onClick={() => setTurismoOpen(v => !v)}
                  aria-expanded={turismoOpen}
                  aria-controls={dropdownId}
                  aria-label={turismoOpen ? 'Fechar submenu Turismo' : 'Abrir submenu Turismo'}
                  className={`px-2 flex items-center justify-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:z-10 -ml-1 ${
                    isTurismoActive(currentTab) ? 'text-white' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${turismoOpen ? 'rotate-180' : 'rotate-0'}`} aria-hidden="true" />
                </button>

                {/* Dropdown overlay — sem gap, sobrepõe conteúdo */}
                <div
                  id={dropdownId}
                  role="menu"
                  aria-label="Submenu Turismo"
                  className={`absolute top-full left-0 min-w-[180px] bg-white rounded-b-xl rounded-tr-xl shadow-xl border border-slate-200 overflow-hidden z-50 transition-all duration-150 origin-top ${
                    turismoOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-1 pointer-events-none'
                  }`}
                  onMouseEnter={() => { clearCloseTimeout(); setTurismoOpen(true); }}
                  onMouseLeave={scheduleClose}
                >
                  {TURISMO_DROPDOWN.map(item => (
                    <button
                      key={item.tab}
                      role="menuitem"
                      onClick={() => handleNav(item.tab)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') setTurismoOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition flex items-center justify-between focus:outline-none focus-visible:bg-slate-100 focus-visible:text-slate-900"
                    >
                      <span>{item.label}</span>
                      <span aria-hidden="true" className="text-slate-400 text-[10px]">›</span>
                    </button>
                  ))}
                </div>
              </div>

              {MENU_TAIL.map(item => (
                <button
                  key={item.tab}
                  onClick={() => handleNav(item.tab)}
                  className={`px-3 flex items-center justify-center transition whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 ${
                    isActive(item.tab)
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {item.label}
                </button>
              ))}

              <button
                onClick={handleVip}
                className="px-4 flex items-center justify-center text-cyan-400 hover:text-cyan-300 hover:bg-slate-800 transition whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40"
                aria-label="Ver planos VIP"
              >
                <span>VIP 💎</span>
              </button>
            </nav>

            <div className="lg:hidden flex items-center text-slate-400 text-[10px] font-semibold tracking-wider">
              <span className="hidden sm:inline">Menu — toque no ícone ao topo</span>
              <span className="sm:hidden">ITAPOÁ ONLINE</span>
            </div>

            <div className="flex items-center gap-3">
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
                className="p-2 text-slate-300 hover:text-amber-400 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded"
              >
                <Sparkles className="w-4 h-4 animate-pulse" />
              </button>

              <PermissionGate permission="companies.edit">
                <button
                  onClick={() => handleNav('admin')}
                  title="Painel Administrativo Master"
                  className="p-2 text-purple-400 hover:text-purple-300 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </PermissionGate>

              <button
                onClick={onOpenAuthModal}
                className="hidden sm:inline-flex px-4 py-1.5 bg-[#C8102E] hover:bg-red-700 text-white font-extrabold text-[10px] rounded transition shadow-md tracking-wider ml-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              >
                ANUNCIANTE
              </button>
            </div>
          </div>
        </div>

        {mobileOpen && (
          <div className="lg:hidden border-t border-slate-800 bg-[#0A0915]">
            <nav className="flex flex-col py-2" aria-label="Menu mobile">
              {MENU_PRIMARY.map(item => (
                <button
                  key={item.tab}
                  onClick={() => handleNav(item.tab)}
                  className={`text-left px-4 py-3 text-xs font-bold uppercase tracking-wider transition border-b border-slate-800/50 flex items-center gap-2 focus:outline-none focus-visible:bg-slate-800 ${
                    isActive(item.tab) ? 'bg-[#C8102E] text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span>{item.label}</span>
                </button>
              ))}
              {/* Mobile Turismo: texto navega, seta expande */}
              <div className="border-b border-slate-800/50">
                <div className="flex items-stretch">
                  <button
                    onClick={() => handleNav('turismo')}
                    className={`flex-1 text-left px-4 py-3 text-xs font-bold uppercase tracking-wider transition flex items-center gap-2 focus:outline-none focus-visible:bg-slate-800 ${
                      isTurismoActive(currentTab) ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                    aria-current={isTurismoActive(currentTab) ? 'page' : undefined}
                  >
                    Turismo
                  </button>
                  <button
                    type="button"
                    onClick={() => setTurismoMobileOpen(v => !v)}
                    aria-expanded={turismoMobileOpen}
                    aria-controls={`${dropdownId}-mobile`}
                    aria-label={turismoMobileOpen ? 'Recolher submenu Turismo' : 'Expandir submenu Turismo'}
                    className="px-4 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition focus:outline-none focus-visible:bg-slate-800 min-w-[48px]"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform duration-150 ${turismoMobileOpen ? 'rotate-180' : 'rotate-0'}`} aria-hidden="true" />
                  </button>
                </div>
                {turismoMobileOpen && (
                  <div id={`${dropdownId}-mobile`} className="bg-slate-900/60 border-t border-slate-800/50">
                    {TURISMO_DROPDOWN.map(item => (
                      <button
                        key={item.tab}
                        onClick={() => handleNav(item.tab)}
                        className="w-full text-left pl-8 pr-4 py-3 text-xs font-bold uppercase tracking-wider text-slate-300 hover:bg-slate-800 hover:text-white transition flex items-center gap-2 focus:outline-none focus-visible:bg-slate-800 focus-visible:text-white"
                      >
                        <span className="w-1 h-1 rounded-full bg-slate-500" aria-hidden="true" />
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {MENU_TAIL.map(item => (
                <button
                  key={item.tab}
                  onClick={() => handleNav(item.tab)}
                  className={`text-left px-4 py-3 text-xs font-bold uppercase tracking-wider transition border-b border-slate-800/50 flex items-center gap-2 focus:outline-none ${
                    isActive(item.tab) ? 'bg-[#C8102E] text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span>{item.label}</span>
                </button>
              ))}
              <button
                onClick={handleVip}
                className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-cyan-400 hover:bg-slate-800 hover:text-cyan-300 transition focus:outline-none"
              >
                VIP 💎 — Ver Planos
              </button>
            </nav>
          </div>
        )}
      </header>
    </>
  );
};
