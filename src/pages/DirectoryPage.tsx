/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Public Directory Page Component
 */

import React from 'react';
import DirectorySection from '../components/DirectorySection';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthContext';
import { useSEO } from '../hooks/useSEO';

interface DirectoryPageProps {
  onNavigateCompany: (slug: string) => void;
}

export const DirectoryPage: React.FC<DirectoryPageProps> = ({ onNavigateCompany }) => {
  const {
    companies,
    categories,
    cities,
    searchWord,
    searchCatId,
    selectedCityId,
    favorites,
    toggleFavorite
  } = useCompany();

  const { user } = useAuth();

  useSEO({
    title: 'Guia Completo de Empresas e Negócios',
    description: 'Explore o diretório comercial com busca inteligente de lojas, empresas, telefones e horários em Itapoá.'
  });

  return (
    <DirectorySection
      companies={companies}
      categories={categories}
      cities={cities}
      onNavigateToCompany={onNavigateCompany}
      initialSearch={searchWord}
      initialCatId={searchCatId}
      initialCityId={selectedCityId}
      currentUserId={user?.id || 'visitor'}
      favorites={favorites}
      onToggleFavorite={toggleFavorite}
    />
  );
};
