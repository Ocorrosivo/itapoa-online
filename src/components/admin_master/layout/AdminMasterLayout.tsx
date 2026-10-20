/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Main Admin Master Panel Layout Shell
 */

import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { AdminSidebar, AdminViewType } from './AdminSidebar';
import { AdminTopbar } from './AdminTopbar';
import { SpotlightSearchModal } from '../common/SpotlightSearchModal';
import { AdminBiAiModal } from '../common/AdminBiAiModal';
import { DashboardView } from '../views/DashboardView';
import { CompaniesView } from '../views/CompaniesView';
import { PlansView } from '../views/PlansView';
import { FinancialView } from '../views/FinancialView';
import { AuditLogsView } from '../views/AuditLogsView';
import { AdminProfileView } from '../views/AdminProfileView';
import { GeneralSettingsView } from '../views/GeneralSettingsView';
import { UsersView } from '../views/UsersView';
import { CrmView } from '../views/CrmView';
import { MarketplaceView } from '../views/MarketplaceView';
import { TourismView } from '../views/TourismView';
import { EventsView } from '../views/EventsView';
import { BlogAdminView } from '../views/BlogAdminView';
import { PortalContentView } from '../views/PortalContentView';
import { InfrastructureView } from '../views/InfrastructureView';

interface AdminMasterLayoutProps {
  onNavigateCompany: (slug: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const AdminMasterLayout: React.FC<AdminMasterLayoutProps> = ({
  onNavigateCompany,
  onNavigateTab
}) => {
  const [currentView, setCurrentView] = useState<AdminViewType>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  
  // Modals
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);
  const [isBiAiOpen, setIsBiAiOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans antialiased overflow-x-hidden">
      <div className="hidden md:flex shrink-0">
        <AdminSidebar
          currentView={currentView}
          onSelectView={v => { setMobileNavOpen(false); setCurrentView(v); }}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
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
                <AdminSidebar
                  currentView={currentView}
                  onSelectView={v => { setMobileNavOpen(false); setCurrentView(v); }}
                  isCollapsed={false}
                  onToggleCollapse={() => setMobileNavOpen(false)}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main Content Area */}
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
          <span className="text-xs font-extrabold tracking-widest text-white uppercase truncate">Admin Master</span>
        </div>
        <AdminTopbar
          onOpenSpotlight={() => setIsSpotlightOpen(true)}
          onOpenBiAi={() => setIsBiAiOpen(true)}
          onSelectProfile={() => setCurrentView('profile')}
        />

        <main className="flex-1 overflow-y-auto">
          {currentView === 'dashboard' && <DashboardView onNavigateCompany={onNavigateCompany} />}
          {currentView === 'profile' && <AdminProfileView />}
          {currentView === 'settings' && <GeneralSettingsView />}
          {currentView === 'companies' && <CompaniesView onNavigateCompany={onNavigateCompany} />}
          {currentView === 'users' && <UsersView />}
          {currentView === 'plans' && <PlansView />}
          {currentView === 'financial' && <FinancialView />}
          {currentView === 'crm' && <CrmView />}
          {currentView === 'marketplace' && <MarketplaceView />}
          {currentView === 'tourism' && <TourismView />}
          {currentView === 'events' && <EventsView />}
          {currentView === 'blog' && <BlogAdminView />}
          {currentView === 'content' && <PortalContentView />}
          {currentView === 'infrastructure' && <InfrastructureView />}
          {currentView === 'audit' && <AuditLogsView />}
        </main>
      </div>

      {/* Spotlight Search (Ctrl + K) */}
      <SpotlightSearchModal
        isOpen={isSpotlightOpen}
        onClose={() => setIsSpotlightOpen(false)}
        onNavigateCompany={onNavigateCompany}
        onNavigateTab={onNavigateTab}
      />

      {/* Executive BI AI Assistant */}
      <AdminBiAiModal
        isOpen={isBiAiOpen}
        onClose={() => setIsBiAiOpen(false)}
      />
    </div>
  );
};
