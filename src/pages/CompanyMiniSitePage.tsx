/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Exclusive Company Mini-Site Page Component
 */

import React, { useEffect, useState } from 'react';
import CompanyDetailSection from '../components/CompanyDetailSection';
import { Company } from '../types';
import { CompanyRepository } from '../repositories/companyRepository';
import { SeoService } from '../services/seoService';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthContext';

interface CompanyMiniSitePageProps {
  slug: string;
  onBack: () => void;
  onNavigateCompany: (slug: string) => void;
}

export const CompanyMiniSitePage: React.FC<CompanyMiniSitePageProps> = ({
  slug,
  onBack
}) => {
  const { companies, cities, categories, favorites, toggleFavorite } = useCompany();
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    CompanyRepository.getBySlug(slug).then(data => {
      if (isMounted) {
        if (data) {
          setCompany(data);
          CompanyRepository.incrementMetric(data.id, 'views');
          
          SeoService.updateMetaTags({
            title: `${data.name} | Guia Comercial Itapoá`,
            description: data.description,
            image: data.coverImage || data.logo,
            url: window.location.href,
            type: 'business.business'
          });

          const schema = SeoService.generateCompanySchema(data);
          SeoService.injectJsonLd(schema);
        } else {
          const found = companies.find(c => c.slug === slug);
          if (found) {
            setCompany(found);
          }
        }
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [slug, companies]);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-13rem)] bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium text-slate-400">Carregando mini-site exclusivo...</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-[calc(100vh-13rem)] bg-slate-950 text-white flex items-center justify-center p-6 text-center">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl">
          <h2 className="text-2xl font-bold mb-2">Empresa Não Encontrada</h2>
          <p className="text-slate-400 text-sm mb-6">
            O endereço procurado não está disponível ou foi desativado temporariamente.
          </p>
          <button
            onClick={onBack}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition"
          >
            Voltar ao Guia Comercial
          </button>
        </div>
      </div>
    );
  }

  const isFav = favorites.includes(company.id);

  return (
    <CompanyDetailSection
      company={company}
      cities={cities}
      categories={categories}
      currentUserId={user?.id || 'visitor'}
      isFavorited={isFav}
      onToggleFavorite={() => toggleFavorite(company.id)}
      onBack={onBack}
    />
  );
};
