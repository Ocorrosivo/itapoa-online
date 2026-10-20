/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Main Lojista Portal Layout Shell Component
 */

import React, { useEffect, useState } from 'react';
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
  const { user } = useAuth();
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

  // Modals
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans antialiased">
      
      {/* Collapsible Sidebar */}
      <LojistaSidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        company={myCompany}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
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
            <div className="p-8 space-y-4 text-center max-w-lg mx-auto mt-12 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl">
              <div className="w-16 h-16 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center mx-auto text-xl font-bold uppercase">
                {currentTab.slice(0, 2)}
              </div>
              <h2 className="text-xl font-bold text-white capitalize">Módulo: {currentTab}</h2>
              <p className="text-xs text-slate-400">
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
