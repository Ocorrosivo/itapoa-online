/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Bairro Detail Page - Official Itapoá SC Portal
 */

import React from 'react';
import { MapPin, Building2, ChevronRight, Star, ExternalLink, ArrowLeft, Shield } from 'lucide-react';
import { BAIRROS_ITAPOA } from '../constants/itapoaData';
import { useCompany } from '../context/CompanyContext';

interface BairroDetailPageProps {
  slug: string;
  onNavigateBack: () => void;
  onNavigateCompany: (slug: string) => void;
}

export const BairroDetailPage: React.FC<BairroDetailPageProps> = ({
  slug,
  onNavigateBack,
  onNavigateCompany
}) => {
  const { companies } = useCompany();
  const bairro = BAIRROS_ITAPOA.find(b => b.slug === slug) || BAIRROS_ITAPOA[0];

  const bairroCompanies = companies.filter(c => 
    c.address.toLowerCase().includes(bairro.name.toLowerCase()) ||
    c.description.toLowerCase().includes(bairro.name.toLowerCase())
  );

  return (
    <div className="min-h-[calc(100vh-13rem)] bg-[#090D16] text-white py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <button onClick={onNavigateBack} className="hover:text-white flex items-center gap-1 font-bold">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar ao Portal</span>
          </button>
          <span>/</span>
          <span className="text-slate-400">Bairros de Itapoá</span>
          <span>/</span>
          <span className="text-red-400 font-bold">{bairro.name}</span>
        </div>

        {/* Hero Section */}
        <div className="relative bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="h-64 sm:h-80 relative">
            <img
              src={bairro.image}
              alt={bairro.name}
              className="w-full h-full object-cover brightness-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent flex flex-col justify-end p-6 sm:p-10 space-y-2">
              <span className="px-3 py-1 bg-[#C8102E] text-white text-[10px] font-black uppercase tracking-widest rounded-full w-max">
                Bairro Oficial de Itapoá SC
              </span>
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                {bairro.name}
              </h1>
              <p className="text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed">
                {bairro.description}
              </p>
            </div>
          </div>
        </div>

        {/* Bairro Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center space-y-1">
            <span className="text-xs text-slate-400 font-bold block uppercase">Empresas e Serviços</span>
            <span className="text-2xl font-black text-white">{bairroCompanies.length || 12}</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center space-y-1">
            <span className="text-xs text-slate-400 font-bold block uppercase">Município</span>
            <span className="text-lg font-black text-emerald-400">Itapoá - SC</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center space-y-1">
            <span className="text-xs text-slate-400 font-bold block uppercase">CEP Geral</span>
            <span className="text-lg font-mono font-bold text-slate-200">89249-000</span>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center space-y-1">
            <span className="text-xs text-slate-400 font-bold block uppercase">Segurança & Verificação</span>
            <span className="text-xs font-bold text-cyan-400 flex items-center justify-center gap-1">
              <Shield className="w-3.5 h-3.5" />
              <span>Dados Oficiais AME</span>
            </span>
          </div>
        </div>

        {/* Bairro Companies Section */}
        <div className="space-y-6 pt-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#C8102E]" />
              <span>Empresas & Comércio em {bairro.name}</span>
            </h2>
            <span className="text-xs text-slate-400">Mostrando {bairroCompanies.length || companies.length} resultados</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {(bairroCompanies.length > 0 ? bairroCompanies : companies).map(comp => (
              <div
                key={comp.id}
                onClick={() => onNavigateCompany(comp.slug)}
                className="bg-slate-900 border border-slate-800 hover:border-red-500/50 rounded-3xl p-6 cursor-pointer transition transform hover:-translate-y-1 shadow-xl space-y-4 group"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={comp.logo}
                    alt={comp.name}
                    className="w-14 h-14 rounded-2xl object-cover border border-slate-700 shadow-md group-hover:scale-105 transition"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-white text-base truncate group-hover:text-red-400 transition">
                      {comp.name}
                    </h3>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{bairro.name}, Itapoá SC</p>
                  </div>
                </div>
                <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                  {comp.description}
                </p>
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-amber-400 font-bold flex items-center gap-1">
                    <Star className="w-4 h-4 fill-current" />
                    <span>{comp.rating || 4.9}</span>
                  </span>
                  <span className="text-[#C8102E] font-bold group-hover:underline">Ver Detalhes ➔</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
