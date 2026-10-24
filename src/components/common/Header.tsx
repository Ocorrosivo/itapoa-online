/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Header — Turismo como dropdown (Turismo ▾ → Eventos, Informativo)
 */

import React, { useState, useRef, useEffect, useId } from 'react';
import {
  Sparkles, Settings, LogIn, LogOut, MapPin, Building2,
  ShieldAlert, Bell, Facebook, Instagram, Youtube, ChevronDown, UserCheck, Menu, X,
  Home, Megaphone
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

      <header
        className={`sticky top-0 z-40 transition-all duration-300 ${
          currentTab === 'home'
            ? 'bg-slate-950/70 backdrop-blur-md border-b border-white/10 text-white shadow-xl'
            : 'bg-[#0A0915] border-b border-slate-800 text-white shadow-xl'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 py-2 sm:py-2.5">
          <div className="flex items-center justify-between gap-2 lg:gap-4 min-h-[3rem]">
            {/* Brand / Logo */}
            <div
              onClick={() => handleNav('home')}
              className="flex items-center cursor-pointer group flex-shrink-0"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleNav('home'); }}
              aria-label="Itapoá Online"
            >
              <img
                src="/logotipo.png"
                alt="Itapoá Online"
                className="h-10 sm:h-12 w-auto object-contain group-hover:scale-105 transition transform drop-shadow-md"
              />
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5" aria-label="Menu principal">
              {/* Início: Red pill button as in Image 2 */}
              <button
                onClick={() => handleNav('home')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition whitespace-nowrap ${
                  isActive('home')
                    ? 'bg-[#C8102E] text-white shadow-sm font-black'
                    : 'text-slate-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                <span>Início</span>
              </button>

              {MENU_PRIMARY.filter(i => i.tab !== 'home').map(item => (
                <button
                  key={item.tab}
                  onClick={() => handleNav(item.tab)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition whitespace-nowrap ${
                    isActive(item.tab)
                      ? 'bg-[#C8102E] text-white font-black'
                      : 'text-slate-200 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {item.label}
                </button>
              ))}

              {/* Turismo Dropdown */}
              <div
                ref={turismoRef}
                className="relative flex items-center"
                onMouseEnter={() => { clearCloseTimeout(); setTurismoOpen(true); }}
                onMouseLeave={scheduleClose}
                onFocusCapture={() => { clearCloseTimeout(); setTurismoOpen(true); }}
              >
                <button
                  onClick={() => handleNav('turismo')}
                  className={`px-2.5 py-1.5 rounded-l-lg text-xs font-bold uppercase tracking-wider transition whitespace-nowrap flex items-center gap-1 ${
                    isTurismoActive(currentTab) ? 'bg-[#C8102E] text-white' : 'text-slate-200 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Turismo
                </button>
                <button
                  type="button"
                  onClick={() => setTurismoOpen(v => !v)}
                  className={`px-1.5 py-1.5 rounded-r-lg text-xs transition -ml-1 ${
                    isTurismoActive(currentTab) ? 'bg-[#C8102E] text-white' : 'text-slate-200 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${turismoOpen ? 'rotate-180' : 'rotate-0'}`} />
                </button>

                {/* Dropdown Menu */}
                <div
                  id={dropdownId}
                  role="menu"
                  className={`absolute top-full left-0 min-w-[180px] bg-slate-900/95 backdrop-blur-md rounded-xl shadow-2xl border border-white/10 overflow-hidden z-50 transition-all duration-150 origin-top mt-1 ${
                    turismoOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-1 pointer-events-none'
                  }`}
                >
                  {TURISMO_DROPDOWN.map(item => (
                    <button
                      key={item.tab}
                      role="menuitem"
                      onClick={() => handleNav(item.tab)}
                      className="w-full text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-200 hover:bg-[#C8102E] hover:text-white transition flex items-center justify-between"
                    >
                      <span>{item.label}</span>
                      <span className="text-slate-400 text-xs">›</span>
                    </button>
                  ))}
                </div>
              </div>

              {MENU_TAIL.map(item => (
                <button
                  key={item.tab}
                  onClick={() => handleNav(item.tab)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition whitespace-nowrap ${
                    isActive(item.tab)
                      ? 'bg-[#C8102E] text-white font-black'
                      : 'text-slate-200 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {item.label}
                </button>
              ))}

              <button
                onClick={handleVip}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-cyan-400 hover:text-cyan-300 hover:bg-white/10 transition whitespace-nowrap flex items-center gap-1"
              >
                <span>VIP 💎</span>
              </button>
            </nav>

            {/* Right CTA and Icons */}
            <div className="flex items-center gap-1.5 sm:gap-2.5">
              {/* Social Icons */}
              <div className="hidden xl:flex items-center gap-2.5 text-slate-300 border-r border-white/15 pr-3">
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition" aria-label="Facebook">
                  <Facebook className="w-3.5 h-3.5" />
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-pink-400 transition" aria-label="Instagram">
                  <Instagram className="w-3.5 h-3.5" />
                </a>
                <a href="https://wa.me/" target="_blank" rel="noopener noreferrer" className="hover:text-green-400 font-bold text-xs transition" aria-label="WhatsApp">
                  w
                </a>
              </div>

              {/* Notification Bell */}
              <button title="Notificações" className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition">
                <Bell className="w-4 h-4" />
              </button>

              {/* IA / Sparkles */}
              <button
                onClick={onOpenAIModal}
                title="IA do Guia Comercial"
                className="p-1.5 text-slate-300 hover:text-amber-400 hover:bg-white/10 rounded-lg transition"
              >
                <Sparkles className="w-4 h-4 animate-pulse" />
              </button>

              {/* Admin Gear */}
              <PermissionGate permission="companies.edit">
                <button
                  onClick={() => handleNav('admin')}
                  title="Painel Administrativo Master"
                  className="p-1.5 text-purple-400 hover:text-purple-300 hover:bg-white/10 rounded-lg transition"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </PermissionGate>

              {/* Authenticated user quick actions */}
              {isAuthenticated && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleNav(user?.role === 'admin_master' ? 'admin' : 'painel')}
                    className="text-xs font-bold px-2.5 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white transition flex items-center gap-1"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Meu Painel</span>
                  </button>
                  <button
                    onClick={logout}
                    title="Sair"
                    className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* ANUNCIANTE Button (Megaphone) */}
              <button
                onClick={onOpenAuthModal}
                className="px-3 sm:px-4 py-1.5 bg-[#C8102E] hover:bg-red-700 text-white font-extrabold text-[11px] rounded-lg transition shadow-md tracking-wider flex items-center gap-1.5 cursor-pointer ml-1"
              >
                <Megaphone className="w-3.5 h-3.5" />
                <span>ANUNCIANTE</span>
              </button>

              {/* Mobile hamburger */}
              <button
                onClick={() => setMobileOpen(v => !v)}
                className="lg:hidden p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition ml-1"
                aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
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
