/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Restored Header Component - A.M.E. Itapoá Red Branding & Premium Nav
 */

import React, { useState } from 'react';
import { 
  Sparkles, Settings, LogIn, LogOut, MapPin, Building2, 
  ShieldAlert, Bell, Facebook, Instagram, Youtube, ChevronDown, UserCheck
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

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onNavigateTab,
  onOpenAuthModal,
  onOpenAIModal
}) => {
  const { user, isAuthenticated, logout, isImpersonating, stopImpersonating, realAdminUser } = useAuth();
  const { cities, selectedCityId, setSelectedCityId, categories } = useCompany();
  const [showCategoriesDropdown, setShowCategoriesDropdown] = useState(false);
  const [showBairrosDropdown, setShowBairrosDropdown] = useState(false);

  const bairros = [
    'Centro', 'Itapema do Norte', 'Barra do Saí', 'Cambiju', 'Rainha', 'Balneário Brasília', 'Pontal do Norte'
  ];

  return (
    <>
      {/* Impersonation Banner */}
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

      {/* Super Top Title */}
      <div className="bg-slate-950 text-slate-400 text-[11px] font-semibold py-1 text-center border-b border-slate-800 tracking-wider">
        Guia Comercial e Marketplace Premium
      </div>

      {/* Red Banner ITAPOÁ ONLINE */}
      <div className="bg-[#C8102E] text-white shadow-md relative z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          
          {/* Brand Logo - ITAPOÁ ONLINE */}
          <div 
            onClick={() => {
              if (window.location.pathname === '/') {
                window.location.reload();
              } else {
                window.location.href = '/';
              }
            }}
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

          {/* Right Action */}
          <div className="flex items-center justify-end gap-2">
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigateTab(user?.role === 'admin_master' ? 'admin' : 'painel')}
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
          </div>

        </div>
      </div>

      {/* Dark Main Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#0A0915] border-b border-slate-800 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-12 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
            
            {/* Nav Links */}
            <nav className="flex items-center h-full">
              <button
                onClick={() => onNavigateTab('home')}
                className={`h-full px-4 flex items-center justify-center font-black transition ${
                  currentTab === 'home' ? 'bg-[#C8102E] text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                Início
              </button>

              <button
                onClick={() => onNavigateTab('projetos-sociais')}
                className={`h-full px-3 text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center gap-1 ${
                  currentTab === 'projetos-sociais' ? 'bg-slate-800 text-white' : ''
                }`}
              >
                PROJETOS SOCIAIS
              </button>

              {/* Categorias Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowCategoriesDropdown(!showCategoriesDropdown)}
                  className="px-3 py-3 text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center gap-1"
                >
                  <span>CATEGORIAS</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {showCategoriesDropdown && (
                  <div className="absolute top-full left-0 w-56 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-50 normal-case space-y-1">
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          onNavigateTab('empresas');
                          setShowCategoriesDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Bairros Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowBairrosDropdown(!showBairrosDropdown)}
                  className="px-3 py-3 text-slate-300 hover:text-white hover:bg-slate-800 transition flex items-center gap-1"
                >
                  <span>BAIRROS</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {showBairrosDropdown && (
                  <div className="absolute top-full left-0 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-50 normal-case space-y-1">
                    {bairros.map(b => (
                      <button
                        key={b}
                        onClick={() => {
                          onNavigateTab('empresas');
                          setShowBairrosDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => onNavigateTab('empresas')}
                className={`px-3 py-3 text-slate-300 hover:text-white hover:bg-slate-800 transition ${
                  currentTab === 'empresas' ? 'bg-slate-800 text-white' : ''
                }`}
              >
                Empresas
              </button>

              <button
                onClick={() => onNavigateTab('turismo')}
                className={`px-3 py-3 text-slate-300 hover:text-white hover:bg-slate-800 transition ${
                  currentTab === 'turismo' ? 'bg-slate-800 text-white' : ''
                }`}
              >
                Turismo
              </button>

              <button
                onClick={() => onNavigateTab('eventos')}
                className={`px-3 py-3 text-slate-300 hover:text-white hover:bg-slate-800 transition ${
                  currentTab === 'eventos' ? 'bg-slate-800 text-white' : ''
                }`}
              >
                Eventos
              </button>

              <button
                onClick={() => onNavigateTab('rh-empregos')}
                className={`px-3 py-3 text-slate-300 hover:text-white hover:bg-slate-800 transition ${
                  currentTab === 'rh-empregos' ? 'bg-slate-800 text-white' : ''
                }`}
              >
                RH / EMPREGOS
              </button>

              <button
                onClick={() => onNavigateTab('blog')}
                className={`px-3 py-3 text-slate-300 hover:text-white hover:bg-slate-800 transition ${
                  currentTab === 'blog' ? 'bg-slate-800 text-white' : ''
                }`}
              >
                Informativo
              </button>

              <button
                onClick={() => onNavigateTab('planos')}
                className="px-3 py-3 text-cyan-400 hover:text-cyan-300 hover:bg-slate-800 transition flex items-center gap-1 font-bold"
              >
                <span>VIP 💎</span>
              </button>
            </nav>

            {/* Social Icons & Advertiser CTA */}
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
                  onClick={() => onNavigateTab('admin')}
                  title="Painel Administrativo Master"
                  className="p-2 text-purple-400 hover:text-purple-300 transition"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </PermissionGate>

              <button
                onClick={onOpenAuthModal}
                className="px-4 py-1.5 bg-[#C8102E] hover:bg-red-700 text-white font-extrabold text-[10px] rounded transition shadow-md tracking-wider ml-1"
              >
                ANUNCIANTE
              </button>
            </div>

          </div>
        </div>
      </header>
    </>
  );
};
