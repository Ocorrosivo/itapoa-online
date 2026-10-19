/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Public SaaS Plans Page Component
 */

import React from 'react';
import SaaSPricing from '../components/SaaSPricing';
import { useCompany } from '../context/CompanyContext';
import { useSEO } from '../hooks/useSEO';

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

  useSEO({
    title: 'Planos SaaS para Empresas - Anuncie sua Marca em Itapoá',
    description: 'Conheça nossos planos Essencial, Profissional e Premium. Destaque sua empresa com mini-site exclusivo, cupons de desconto, CRM e métricas.'
  });

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If modal is not active or handled, ESC goes back to home
      if (e.key === 'Escape') {
        onNavigateTab('home');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNavigateTab]);

  return (
    <div className="bg-slate-50 text-slate-900 font-sans">
      <SaaSPricing
        cities={cities}
        categories={categories}
        onListingCreated={() => {
          refreshData();
          onSelectPlan('admin');
        }}
      />
    </div>
  );
};
