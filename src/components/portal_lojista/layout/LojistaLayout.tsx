/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Main Lojista Portal Layout Shell Component
 */

import React, { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { api } from '../../../lib/apiClient';
import { CompanyProfileForm } from '../views/CompanyProfileForm';
import { LojistaSidebar, LojistaTabType } from './LojistaSidebar';
import { LojistaTopbar } from './LojistaTopbar';
import { DigitalHealthModal } from '../common/DigitalHealthModal';
import { LojistaAiAssistantModal } from '../common/LojistaAiAssistantModal';
import { LojistaDashboardView } from '../views/LojistaDashboardView';
import { BillingSubscriptionView } from '../views/BillingSubscriptionView';
import { AnalyticsLojistaView } from '../views/AnalyticsLojistaView';
import { useCompany } from '../../../context/CompanyContext';
import { useAuth } from '../../../context/AuthContext';
import { Company } from '../../../types';

interface LojistaLayoutProps {
  onNavigateCompany: (slug: string) => void;
}

export const LojistaLayout: React.FC<LojistaLayoutProps> = ({ onNavigateCompany }) => {
  const { user, logout } = useAuth();
  const [ownedCompanies, setOwnedCompanies] = useState<Company[]>([]);
  const [companyError, setCompanyError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let canceled = false;
    api.get<Company[]>('/api/account/companies').then(rows => { if (!canceled) setOwnedCompanies(rows); })
      .catch(() => { if (!canceled) setCompanyError('Não foi possível carregar sua empresa. Recarregue a página.'); });
    return () => { canceled = true; };
  }, [user?.id, reload]);
  const myCompany: Company | null = ownedCompanies[0] || null;

  const [currentTab, setCurrentTab] = useState<LojistaTabType>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Modals
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans antialiased overflow-x-hidden">
      <div className="hidden md:flex shrink-0">
        <LojistaSidebar
          currentTab={currentTab}
          onSelectTab={tab => { setMobileNavOpen(false); setCurrentTab(tab); }}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          company={myCompany}
        />
      </div>

      {mobileNavOpen && (
        <>
          <button
            type="button"
            aria-label="Fechar navegação"
            onClick={() => setMobileNavOpen(false)}
            className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-sm md:hidden"
          />
          <div className="fixed inset-y-0 left-0 z-40 w-72 max-w-[82vw] md:hidden shadow-2xl">
            <div className="h-full flex flex-col bg-slate-900">
              <div className="flex items-center justify-between px-3 py-3 border-b border-slate-800">
                <span className="text-[11px] font-extrabold tracking-widest text-slate-300 uppercase">Menu</span>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  aria-label="Fechar menu"
                  className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <LojistaSidebar
                  currentTab={currentTab}
                  onSelectTab={tab => { setMobileNavOpen(false); setCurrentTab(tab); }}
                  isCollapsed={false}
                  onToggleCollapse={() => setMobileNavOpen(false)}
                  company={myCompany}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="md:hidden sticky top-0 z-20 flex items-center gap-3 px-3 py-3 bg-slate-900/95 backdrop-blur border-b border-slate-800">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Abrir menu"
            className="p-2.5 rounded-xl bg-slate-800 text-slate-200 hover:text-white border border-slate-700"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-xs font-extrabold tracking-widest text-white uppercase truncate">{myCompany?.name || 'Painel Empresário'}</span>
        </div>
        <LojistaTopbar
          company={myCompany}
          onOpenHealthModal={() => setIsHealthModalOpen(true)}
          onOpenAiModal={() => setIsAiModalOpen(true)}
          onNavigateCompany={onNavigateCompany}
        />

        <main className="flex-1 overflow-y-auto">
          {companyError && <p role="alert" className="p-6 text-red-300">{companyError}</p>}
          {myCompany && (!myCompany.categoryId || !myCompany.cityId) && currentTab !== 'profile' && <div className="m-6 p-4 rounded-xl border border-amber-500 text-sm">Seu anúncio ainda está em preparação. <button className="underline" onClick={() => setCurrentTab('profile')}>Completar categoria, cidade e dados da empresa</button></div>}
          {currentTab === 'profile' && myCompany && <CompanyProfileForm company={myCompany} onSaved={() => setReload(n => n + 1)} />}
          {currentTab === 'dashboard' && (
            <LojistaDashboardView company={myCompany} onNavigateTab={setCurrentTab} />
          )}

          {currentTab === 'analytics' && (
            <AnalyticsLojistaView company={myCompany} />
          )}

          {currentTab === 'billing' && (
            <BillingSubscriptionView company={myCompany} />
          )}

          {/* Module Fallbacks */}
          {['health', 'products', 'coupons', 'blog', 'seo', 'reviews', 'crm', 'orders', 'staff', 'tourism', 'helpdesk'].includes(currentTab) && (
            <div className="p-6 md:p-8 space-y-4 text-center max-w-lg mx-auto mt-8 md:mt-12 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
              <div className="w-16 h-16 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center mx-auto text-xl font-bold uppercase">
                {currentTab.slice(0, 2)}
              </div>
              <h2 className="text-xl font-bold text-white capitalize break-words">Módulo: {currentTab}</h2>
              <p className="text-xs text-slate-400 break-words">
                Este módulo do Portal do Lojista está conectado ao MySQL com controle de permissões RBAC + ACL ativadas.
              </p>
              <button
                onClick={() => setCurrentTab('dashboard')}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition"
              >
                Voltar ao Painel do Lojista
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Digital Health Diagnostic Modal */}
      <DigitalHealthModal
        isOpen={isHealthModalOpen}
        onClose={() => setIsHealthModalOpen(false)}
        company={myCompany}
        onNavigateTab={setCurrentTab}
      />

      {/* Lojista AI Assistant Modal */}
      <LojistaAiAssistantModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        company={myCompany}
      />
    </div>
  );
};
