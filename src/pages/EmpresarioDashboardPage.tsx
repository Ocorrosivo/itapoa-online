/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Empresário Workspace Dashboard Page Component
 */

import React from 'react';
import { EmpresarioGuard } from '../routes/EmpresarioGuard';
import { LojistaLayout } from '../components/portal_lojista/layout/LojistaLayout';

interface EmpresarioDashboardPageProps {
  onOpenAuthModal: () => void;
  onNavigateCompany?: (slug: string) => void;
}

export const EmpresarioDashboardPage: React.FC<EmpresarioDashboardPageProps> = ({
  onOpenAuthModal,
  onNavigateCompany = () => {}
}) => {
  return (
    <EmpresarioGuard onRedirectLogin={onOpenAuthModal}>
      <LojistaLayout onNavigateCompany={onNavigateCompany} />
    </EmpresarioGuard>
  );
};
