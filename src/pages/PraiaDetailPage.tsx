/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Praia Detail Page - Official Itapoá SC Tourism Portal
 */

import React from 'react';
import { MapPin, Navigation, ArrowLeft, Waves, Compass, Star } from 'lucide-react';
import { PRAIAS_ITAPOA } from '../constants/itapoaData';
import { useCompany } from '../context/CompanyContext';

interface PraiaDetailPageProps {
  slug: string;
  onNavigateBack: () => void;
  onNavigateCompany: (slug: string) => void;
}

export const PraiaDetailPage: React.FC<PraiaDetailPageProps> = ({
  slug,
  onNavigateBack,
  onNavigateCompany
}) => {
  const { companies } = useCompany();
  const praia = PRAIAS_ITAPOA.find(p => p.slug === slug) || PRAIAS_ITAPOA[0];

  return (
    <div className="min-h-[calc(100vh-13rem)] bg-[#090D16] text-white py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <button onClick={onNavigateBack} className="hover:text-white flex items-center gap-1 font-bold">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar ao Guia</span>
          </button>
          <span>/</span>
          <span className="text-slate-400">Praias de Itapoá</span>
          <span>/</span>
          <span className="text-[#C8102E] font-bold">{praia.name}</span>
        </div>

        {/* Hero Banner */}
        <div className="relative bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
          <div className="h-72 sm:h-96 relative">
            <img
              src={praia.image}
              alt={praia.name}
              className="w-full h-full object-cover brightness-65"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent flex flex-col justify-end p-6 sm:p-10 space-y-3">
              <span className="px-3.5 py-1 bg-cyan-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full w-max flex items-center gap-1.5">
                <Waves className="w-3.5 h-3.5" />
                <span>Praia Oficial de Itapoá SC</span>
              </span>
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                {praia.name}
              </h1>
              <p className="text-sm sm:text-base text-slate-200 max-w-3xl leading-relaxed">
                {praia.description}
              </p>
            </div>
          </div>
        </div>

        {/* Highlights & How to get there */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Navigation className="w-5 h-5 text-cyan-400" />
              <span>Como Chegar</span>
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-4 rounded-2xl border border-slate-800">
              {praia.howToGet}
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Compass className="w-5 h-5 text-amber-400" />
              <span>Destaques da Praia</span>
            </h2>
            <ul className="space-y-2">
              {praia.highlights.map((h, i) => (
                <li key={i} className="text-xs text-slate-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Nearby Restaurants & Pousadas */}
        <div className="space-y-6 pt-4 border-t border-slate-800">
          <h2 className="text-xl font-black text-white">
            Restaurantes & Pousadas Próximas à {praia.name}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {companies.slice(0, 3).map(comp => (
              <div
                key={comp.id}
                onClick={() => onNavigateCompany(comp.slug)}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-6 cursor-pointer hover:border-cyan-500/50 transition space-y-3"
              >
                <div className="flex items-center gap-3">
                  <img src={comp.logo} alt={comp.name} className="w-12 h-12 rounded-xl object-cover" />
                  <div>
                    <h3 className="font-bold text-white text-sm">{comp.name}</h3>
                    <span className="text-[11px] text-slate-400">{praia.name}, Itapoá SC</span>
                  </div>
                </div>
                <p className="text-xs text-slate-300 line-clamp-2">{comp.description}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
