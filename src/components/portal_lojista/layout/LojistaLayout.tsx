/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Main Lojista Portal Layout Shell Component
 */

import React, { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { api } from '../../../lib/apiClient';
import { LojistaSidebar, LojistaTabType } from './LojistaSidebar';
import { LojistaTopbar } from './LojistaTopbar';
import { DigitalHealthModal } from '../common/DigitalHealthModal';
import { LojistaAiAssistantModal } from '../common/LojistaAiAssistantModal';
import { LojistaDashboardView } from '../views/LojistaDashboardView';
import { BillingSubscriptionView } from '../views/BillingSubscriptionView';
import { AnalyticsLojistaView } from '../views/AnalyticsLojistaView';
import { EditMiniSiteView } from '../views/EditMiniSiteView';
import { ProductsView } from '../views/ProductsView';
import { CouponsView } from '../views/CouponsView';
import { ProductsAndServicesView } from '../views/ProductsAndServicesView';
import { BlogView } from '../views/BlogView';
import { CrmView } from '../views/CrmView';
import { ReviewsView } from '../views/ReviewsView';
import { OrdersView } from '../views/OrdersView';
import { SeoView } from '../views/SeoView';
import { StaffView } from '../views/StaffView';
import { HelpdeskView } from '../views/HelpdeskView';
import { HealthView } from '../views/HealthView';
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
    api.get<Company[]>('/api/account/companies')
      .then(rows => { if (!canceled) setOwnedCompanies(rows); })
      .catch(() => { if (!canceled) setCompanyError('Não foi possível carregar sua empresa. Recarregue a página.'); });
    return () => { canceled = true; };
  }, [user?.id, reload]);

  const myCompany: Company | null = ownedCompanies[0] || null;

  const [currentTab, setCurrentTab] = useState<LojistaTabType>('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  const handleSelectTab = (tab: LojistaTabType) => {
    setMobileNavOpen(false);
    setCurrentTab(tab);
  };

  return (
    <div className="h-screen h-[100dvh] bg-slate-950 text-slate-100 flex font-sans antialiased overflow-hidden">
      {/* Desktop sidebar — fixa na viewport; apenas o conteúdo rola */}
      <div className="hidden md:flex shrink-0 h-screen h-[100dvh] overflow-hidden">
        <LojistaSidebar
          currentTab={currentTab}
          onSelectTab={handleSelectTab}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          company={myCompany}
        />
      </div>

      {/* Mobile drawer */}
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
                  onSelectTab={handleSelectTab}
                  isCollapsed={false}
                  onToggleCollapse={() => setMobileNavOpen(false)}
                  company={myCompany}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main content — única região com rolagem vertical */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        {/* Mobile topbar */}
        <div className="md:hidden sticky top-0 z-20 flex items-center gap-3 px-3 py-3 bg-slate-900/95 backdrop-blur border-b border-slate-800">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Abrir menu"
            className="p-2.5 rounded-xl bg-slate-800 text-slate-200 hover:text-white border border-slate-700"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-xs font-extrabold tracking-widest text-white uppercase truncate">
            {myCompany?.name || 'Painel Empresário'}
          </span>
        </div>

        <LojistaTopbar
          company={myCompany}
          onOpenHealthModal={() => setIsHealthModalOpen(true)}
          onOpenAiModal={() => setIsAiModalOpen(true)}
          onNavigateCompany={onNavigateCompany}
        />

        <main className="flex-1 overflow-y-auto">
          {/* Error */}
          {companyError && (
            <p role="alert" className="p-6 text-red-300 text-sm">{companyError}</p>
          )}

          {/* Incomplete profile banner */}
          {myCompany && (!myCompany.categoryId || !myCompany.cityId) && currentTab !== 'profile' && (
            <div className="mx-4 sm:mx-6 mt-4 p-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 flex items-center gap-3">
              <span className="text-amber-400 text-lg shrink-0">⚠</span>
              <span className="text-sm text-amber-200">
                Seu anúncio ainda não está visível no catálogo.{' '}
                <button
                  className="underline font-bold text-amber-400 hover:text-amber-300"
                  onClick={() => setCurrentTab('profile')}
                >
                  Complete categoria e cidade →
                </button>
              </span>
            </div>
          )}

          {/* ── 1. Visão geral ── */}
          {(currentTab === 'overview' || currentTab === 'dashboard') && (
            <LojistaDashboardView company={myCompany} onNavigateTab={handleSelectTab} />
          )}

          {/* ── 2. Minha empresa ── */}
          {(currentTab === 'company' || currentTab === 'profile') && myCompany && (
            <EditMiniSiteView
              company={myCompany}
              onSaved={() => setReload(n => n + 1)}
              onNavigateCompany={onNavigateCompany}
            />
          )}

          {/* ── 3. Produtos e serviços ── */}
          {(currentTab === 'products_services' || currentTab === 'products' || currentTab === 'coupons') && (
            <ProductsAndServicesView company={myCompany} onNavigateTab={handleSelectTab} />
          )}

          {/* ── 4. Clientes (CRM) ── */}
          {(currentTab === 'clients' || currentTab === 'crm') && (
            <CrmView company={myCompany} />
          )}

          {/* ── 5. Meu plano ── */}
          {(currentTab === 'plan' || currentTab === 'billing') && (
            <BillingSubscriptionView company={myCompany} />
          )}

          {/* ── 6. Ajuda ── */}
          {(currentTab === 'help' || currentTab === 'helpdesk') && (
            <HelpdeskView company={myCompany} />
          )}

          {/* ── Módulos secundários preservados ── */}
          {currentTab === 'health' && (
            <HealthView
              company={myCompany}
              onNavigateTab={handleSelectTab}
              onNavigateCompany={myCompany?.slug ? onNavigateCompany : undefined}
            />
          )}

          {currentTab === 'analytics' && (
            <AnalyticsLojistaView company={myCompany} />
          )}

          {currentTab === 'blog' && (
            <BlogView company={myCompany} />
          )}

          {currentTab === 'reviews' && (
            <ReviewsView company={myCompany} />
          )}

          {currentTab === 'orders' && (
            <OrdersView company={myCompany} />
          )}

          {currentTab === 'seo' && (
            <SeoView
              company={myCompany}
              onNavigateCompany={myCompany?.slug ? onNavigateCompany : undefined}
            />
          )}

          {currentTab === 'staff' && (
            <StaffView company={myCompany} />
          )}

          {currentTab === 'tourism' && (
            <div className="p-8 flex flex-col items-center justify-center gap-4 text-center min-h-[40vh]">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-3xl">🏖️</div>
              <p className="text-base font-bold text-white">Módulo de Turismo em desenvolvimento</p>
              <p className="text-xs text-slate-400 max-w-xs">
                Em breve você poderá vincular pontos turísticos e roteiros ao seu negócio para atrair visitantes.
              </p>
            </div>
          )}
        </main>
      </div>

      {/* Digital Health Modal */}
      <DigitalHealthModal
        isOpen={isHealthModalOpen}
        onClose={() => setIsHealthModalOpen(false)}
        company={myCompany}
        onNavigateTab={setCurrentTab}
      />

      {/* AI Assistant Modal */}
      <LojistaAiAssistantModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        company={myCompany}
      />
    </div>
  );
};
