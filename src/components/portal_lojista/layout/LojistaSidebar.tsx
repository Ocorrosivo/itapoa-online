/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Collapsible Lojista Portal Sidebar Navigation Component
 */

import React from 'react';
import { 
  LayoutDashboard, Building2, Package, Tag, Ticket, FileText, 
  Layers, Star, Users, Clock, ShoppingCart, CreditCard, UserPlus, 
  Compass, Bell, HelpCircle, ChevronLeft, ChevronRight, Award, Activity, BarChart3
} from 'lucide-react';
import { Company } from '../../../types';

export type LojistaTabType = 
  | 'dashboard'
  | 'health'
  | 'profile'
  | 'products'
  | 'coupons'
  | 'blog'
  | 'seo'
  | 'reviews'
  | 'crm'
  | 'analytics'
  | 'orders'
  | 'billing'
  | 'staff'
  | 'tourism'
  | 'helpdesk';

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
  const sections = [
    {
      group: 'Principal',
      items: [
        { id: 'dashboard', label: 'Painel Geral', icon: LayoutDashboard },
        { id: 'health', label: 'Saúde Digital (0-100)', icon: Activity, badge: 'Score' },
        { id: 'analytics', label: 'BI & Analytics', icon: BarChart3 },
        { id: 'profile', label: 'Editar Mini-Site', icon: Building2 }
      ]
    },
    {
      group: 'Catálogo & Ofertas',
      items: [
        { id: 'products', label: 'Produtos & Serviços', icon: Package },
        { id: 'coupons', label: 'Cupons & Promoções', icon: Ticket },
        { id: 'blog', label: 'Blog da Empresa', icon: FileText }
      ]
    },
    {
      group: 'Vendas & Relacionamento',
      items: [
        { id: 'crm', label: 'CRM de Clientes', icon: Users },
        { id: 'reviews', label: 'Avaliações & Reviews', icon: Star },
        { id: 'orders', label: 'Pedidos & Agendamentos', icon: ShoppingCart }
      ]
    },
    {
      group: 'Configurações & Plano',
      items: [
        { id: 'seo', label: 'SEO & Schemas', icon: Layers },
        { id: 'billing', label: 'Plano & Faturamento', icon: CreditCard },
        { id: 'staff', label: 'Equipe de Funcionários', icon: UserPlus },
        { id: 'helpdesk', label: 'Central de Suporte', icon: HelpCircle }
      ]
    }
  ];

  return (
    <aside className={`bg-slate-900 border-r border-slate-800 text-white flex flex-col transition-all duration-300 sticky top-0 h-screen z-30 ${
      isCollapsed ? 'w-20' : 'w-64'
    }`}>
      {/* Company Brand Header */}
      <div className="h-20 border-b border-slate-800 flex items-center justify-between px-4">
        {!isCollapsed && (
          <div className="flex items-center gap-3 overflow-hidden">
            <img
              src="/logotipo.png"
              alt="Itapoá Online"
              className="w-9 h-9 object-contain shrink-0"
            />
            <div className="min-w-0">
              <span className="font-extrabold text-xs text-white block truncate uppercase tracking-wider">ITAPOÁ ONLINE</span>
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block truncate">
                {company?.name || 'Painel Empresário'}
              </span>
            </div>
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition mx-auto"
        >
          {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto p-3 space-y-6">
        {sections.map((sec, idx) => (
          <div key={idx} className="space-y-1">
            {!isCollapsed && (
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">
                {sec.group}
              </h4>
            )}
            {sec.items.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id as LojistaTabType)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold text-xs transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  {!isCollapsed && (
                    <div className="flex-1 flex items-center justify-between">
                      <span className="truncate">{item.label}</span>
                      {item.badge && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
};
