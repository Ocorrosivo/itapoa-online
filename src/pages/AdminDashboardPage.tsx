/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Admin Master Dashboard Page Component
 */

import React from 'react';
import { AdminGuard } from '../routes/AdminGuard';
import { AdminMasterLayout } from '../components/admin_master/layout/AdminMasterLayout';

interface AdminDashboardPageProps {
  onOpenAuthModal: () => void;
  onNavigateCompany: (slug: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  onOpenAuthModal,
  onNavigateCompany,
  onNavigateTab = () => {}
}) => {
  return (
    <AdminGuard onRedirectLogin={onOpenAuthModal}>
      <AdminMasterLayout
        onNavigateCompany={onNavigateCompany}
        onNavigateTab={onNavigateTab}
      />
    </AdminGuard>
  );
};
