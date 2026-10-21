/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Collapsible Lojista Portal Sidebar Navigation Component
 *
 * Menu Oficial Aprovado:
 * 1. Visão geral.
 * 2. Minha empresa.
 * 3. Produtos e serviços.
 * 4. Clientes.
 * 5. Meu plano.
 * 6. Ajuda.
 * Módulos extras retirados da navegação principal com dados preservados.
 */

import React from 'react';
import { 
  LayoutDashboard, Building2, Package, Users, 
  CreditCard, HelpCircle, ChevronLeft, ChevronRight,
  ExternalLink, Sparkles, Zap, ShieldCheck
} from 'lucide-react';
import { Company } from '../../../types';

export type LojistaTabType = 
  | 'overview'
  | 'company'
  | 'products_services'
  | 'clients'
  | 'plan'
  | 'help'
  // Compatibilidade com tabs internas legadas
  | 'dashboard'
  | 'profile'
  | 'products'
  | 'coupons'
  | 'crm'
  | 'billing'
  | 'helpdesk'
  | 'health'
  | 'analytics'
  | 'blog'
  | 'seo'
  | 'reviews'
  | 'orders'
  | 'staff'
  | 'tourism';

interface LojistaSidebarProps {
  currentTab: LojistaTabType;
  onSelectTab: (tab: LojistaTabType) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  company: Company | null;
}

export const LojistaSidebar: React.FC<LojistaSidebarProps> = ({
  currentTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  company
}) => {
  // 6 Itens Oficiais Aprovados
  const menuItems: { id: LojistaTabType; activeIds: LojistaTabType[]; label: string; icon: React.ElementType; badge?: string }[] = [
    { 
      id: 'overview', 
      activeIds: ['overview', 'dashboard', 'analytics', 'health'],
      label: 'Visão geral', 
      icon: LayoutDashboard 
    },
    { 
      id: 'company', 
      activeIds: ['company', 'profile'],
      label: 'Minha empresa', 
      icon: Building2 
    },
    { 
      id: 'products_services', 
      activeIds: ['products_services', 'products', 'coupons'],
      label: 'Produtos e serviços', 
      icon: Package 
    },
    { 
      id: 'clients', 
      activeIds: ['clients', 'crm'],
      label: 'Clientes', 
      icon: Users,
      badge: 'CRM'
    },
    { 
      id: 'plan', 
      activeIds: ['plan', 'billing'],
      label: 'Meu plano', 
      icon: CreditCard 
    },
    { 
      id: 'help', 
      activeIds: ['help', 'helpdesk'],
      label: 'Ajuda', 
      icon: HelpCircle 
    }
  ];

  const rawPlan = (company?.planLevel || 'bronze').toLowerCase();
  const isDiamond = rawPlan === 'diamond' || rawPlan === 'diamond_extremo';
  const isGold = rawPlan === 'gold_vip' || rawPlan === 'ouro';
  const planLabel = isDiamond ? 'Diamond' : isGold ? 'Gold VIP' : 'Bronze';

  return (
    <aside className={`bg-slate-900 border-r border-slate-800 text-white flex flex-col transition-all duration-300 sticky top-0 h-screen z-30 ${
      isCollapsed ? 'w-20' : 'w-64'
    }`}>
      {/* Brand Header */}
      <div className="h-20 border-b border-slate-800 flex items-center justify-between px-4">
        {!isCollapsed && (
          <div className="flex items-center gap-3 overflow-hidden">
            <img
              src="/logotipo.png"
              alt="Itapoá Online"
              className="w-8 h-8 object-contain shrink-0"
            />
            <div className="min-w-0">
              <span className="font-black text-xs text-white block truncate uppercase tracking-wider">ITAPOÁ ONLINE</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block truncate">
                Painel do Lojista
              </span>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
          className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition mx-auto cursor-pointer"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links — 6 Menus Oficiais */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {!isCollapsed && (
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-3 mb-2">
            Navegação Principal
          </p>
        )}

        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = item.activeIds.includes(currentTab);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              title={isCollapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl font-bold text-xs transition cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              {!isCollapsed && (
                <div className="flex-1 flex items-center justify-between">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer com Status do Plano da Empresa */}
      {!isCollapsed && company && (
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate max-w-[130px]">
              {company.name}
            </span>
            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 ${
              isDiamond 
                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' 
                : isGold 
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30' 
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
            }`}>
              {isDiamond && <Sparkles className="w-2.5 h-2.5 fill-amber-300" />}
              {isGold && <Zap className="w-2.5 h-2.5 fill-indigo-300" />}
              {planLabel}
            </span>
          </div>

          {company.slug && (
            <a
              href={`/empresa/${company.slug}`}
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Ver no Guia</span>
            </a>
          )}
        </div>
      )}
    </aside>
  );
};
