/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Public SaaS Plans Page Component
 */

import React from 'react';
import SaaSPricing from '../components/SaaSPricing';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthContext';
import { useSEO } from '../hooks/useSEO';
import { readPendingPurchase, clearPendingPurchase } from '../lib/pendingPurchase';

interface PlansPageProps {
  onSelectPlan: (planId: string) => void;
  onNavigateTab?: (tab: string) => void;
  onOpenAuthModal?: () => void;
}

export const PlansPage: React.FC<PlansPageProps> = ({
  onSelectPlan,
  onNavigateTab = (_tab: string) => {},
  onOpenAuthModal = () => {}
}) => {
  const { cities, categories, refreshData } = useCompany();
  const { isAuthenticated } = useAuth();

  useSEO({
    title: 'Planos SaaS para Empresas - Anuncie sua Marca em Itapoá',
    description: 'Conheça nossos planos Essencial, Profissional e Premium. Destaque sua empresa com mini-site exclusivo, cupons de desconto, CRM e métricas.'
  });

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onNavigateTab('home');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNavigateTab]);

  // If user returns authenticated with a pending plan, keep intent available for SaaSPricing to resume
  React.useEffect(() => {
    if (isAuthenticated) {
      const pending = readPendingPurchase();
      if (pending) {
        // keep it — SaaSPricing will auto-resume; also handle company-required flow there
      }
    }
  }, [isAuthenticated]);

  return (
    <div className="bg-slate-50 text-slate-900 font-sans">
      <SaaSPricing
        cities={cities}
        categories={categories}
        onListingCreated={() => {
          refreshData();
          clearPendingPurchase();
          onSelectPlan('painel');
        }}
      />
    </div>
  );
};
