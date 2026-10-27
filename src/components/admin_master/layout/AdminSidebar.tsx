/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Collapsible Admin Master Sidebar Navigation Component
 */

import React from 'react';
import { 
  LayoutDashboard, Building2, Users, CreditCard, DollarSign, 
  Tag, MapPin, Compass, Ticket, FileText, ImageIcon, ShieldCheck, 
  BarChart3, Settings, Bell, MessageSquare, Briefcase, ChevronLeft, ChevronRight, Layers, Award, Sparkles, FolderTree, Image, LogOut,
  FlaskConical
} from 'lucide-react';

export type AdminViewType = 
  | 'dashboard'
  | 'profile'
  | 'companies'
  | 'users'
  | 'plans'
  | 'financial'
  | 'crm'
  | 'marketplace'
  | 'tourism'
  | 'events'
  | 'blog'
  | 'content'
  | 'infrastructure'
  | 'audit'
  | 'settings'
  | 'test-payments';

interface AdminSidebarProps {
  currentView: AdminViewType;
  onSelectView: (view: AdminViewType) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentView,
  onSelectView,
  isCollapsed,
  onToggleCollapse
}) => {
  const navSections = [
    {
      group: 'Administrador Master',
      items: [
        { id: 'profile', label: 'Minha Conta', icon: ShieldCheck, badge: 'Master' },
        { id: 'settings', label: 'Configurações Gerais', icon: Settings }
      ]
    },
    {
      group: 'Visão Geral',
      items: [
        { id: 'dashboard', label: 'Dashboard KPIs', icon: LayoutDashboard },
        { id: 'companies', label: 'Empresas', icon: Building2, badge: 'Multi' },
        { id: 'users', label: 'Usuários & RBAC', icon: Users }
      ]
    },
    {
      group: 'SaaS & Financeiro',
      items: [
        { id: 'plans', label: 'Planos SaaS', icon: Award },
        { id: 'financial', label: 'Financeiro Executivo', icon: DollarSign },
        { id: 'crm', label: 'CRM de Leads', icon: Briefcase },
        { id: 'test-payments', label: 'Pagamentos de Teste', icon: FlaskConical, badge: 'Mercado Pago' }
      ]
    },
    {
      group: 'Conteúdo & Portal',
      items: [
        { id: 'marketplace', label: 'Marketplace', icon: Tag },
        { id: 'tourism', label: 'Turismo & Roteiros', icon: Compass },
        { id: 'events', label: 'Eventos & Agenda', icon: Ticket },
        { id: 'blog', label: 'Blog & Notícias', icon: FileText },
        { id: 'content', label: 'Conteúdo do Portal', icon: FileText }
      ]
    },
    {
      group: 'Infraestrutura',
      items: [
        { id: 'infrastructure', label: 'Status Infraestrutura', icon: Layers },
        { id: 'audit', label: 'Logs do Sistema', icon: ShieldCheck }
      ]
    }
  ];

  return (
    <aside className={`bg-slate-900 border-r border-slate-800 text-white flex flex-col transition-all duration-300 h-full z-30 shrink-0 select-none ${
      isCollapsed ? 'w-20' : 'w-64'
    }`}>
      {/* Sidebar Header */}
      <div className="h-20 border-b border-slate-800 flex items-center justify-between px-4">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <img
              src="/logotipo.png"
              alt="Itapoá Online"
              className="h-10 w-auto object-contain"
            />
            <div>
              <span className="font-bold text-xs text-white block uppercase tracking-wider">ITAPOÁ ONLINE</span>
              <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">Painel Admin</span>
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

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto p-3 space-y-6">
        {navSections.map((sec, idx) => (
          <div key={idx} className="space-y-1">
            {!isCollapsed && (
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-3 mb-2">
                {sec.group}
              </h4>
            )}
            {sec.items.map(item => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectView(item.id as AdminViewType)}
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
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300">
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

      {/* Sidebar Footer Logout Button */}
      <div className="p-3 border-t border-slate-800">
        <button
          onClick={() => {
            localStorage.clear();
            window.location.href = '/';
          }}
          title={isCollapsed ? 'Sair do Sistema' : undefined}
          className="w-full flex items-center justify-center gap-3 px-3 py-3 rounded-xl font-bold text-xs bg-red-950/40 hover:bg-[#C8102E] text-red-300 hover:text-white border border-red-900/40 transition group cursor-pointer shadow-lg"
        >
          <LogOut className="w-4 h-4 shrink-0 text-red-400 group-hover:text-white transition" />
          {!isCollapsed && <span>Sair do Sistema</span>}
        </button>
      </div>
    </aside>
  );
};
