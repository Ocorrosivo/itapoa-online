/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Main Admin Master Panel Layout Shell
 */

import React, { useState } from 'react';
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
  
  // Modals
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);
  const [isBiAiOpen, setIsBiAiOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans antialiased">
      
      {/* Collapsible Sidebar */}
      <AdminSidebar
        currentView={currentView}
        onSelectView={setCurrentView}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
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
