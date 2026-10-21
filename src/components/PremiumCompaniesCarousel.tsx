/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Bright Theme Premium Companies Carousel Component for Home Page
 * Destaques rotativos equilibrados para empresas Gold e Diamond sem duplicatas na mesma vitrine
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Phone, ArrowRight, ChevronLeft, ChevronRight, Sparkles, Zap, Award } from 'lucide-react';
import { Company } from '../types';
import { imageIdentity } from '../utils/imageIdentity';

interface PremiumCompaniesCarouselProps {
  companies: Company[];
  categories: { id: string; name: string }[];
  onNavigateCompany: (slug: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const PremiumCompaniesCarousel: React.FC<PremiumCompaniesCarouselProps> = ({
  companies,
  categories,
  onNavigateCompany,
  onNavigateTab
}) => {
  // Filtra empresas com direito a destaque (Diamond, Gold VIP ou concessão administrativa)
  const premiumCompanies = useMemo(() => {
    return companies.filter(c => {
      const p = (c.planLevel || '').toLowerCase();
      const hasPlan = p === 'diamond' || p === 'diamond_extremo' || p === 'gold_vip' || p === 'ouro';
      const hasGrant = c.access_grant_type === 'admin_grant' || Boolean(c.isSponsored);
      return (hasPlan || hasGrant) && c.isActive !== false;
    });
  }, [companies]);

  // Se não houver empresas com plano pago com destaque, usa empresas ativas com imagem para a vitrine não ficar vazia
  const candidateList = useMemo(() => {
    if (premiumCompanies.length > 0) return premiumCompanies;
    return companies.filter(c => c.isActive !== false && (c.coverImage || c.logo));
  }, [premiumCompanies, companies]);

  const [shuffledList, setShuffledList] = useState<Company[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Rotação equilibrada entre Diamond e Gold VIP no carregamento
  useEffect(() => {
    if (candidateList.length === 0) {
      setShuffledList([]);
      return;
    }

    const diamonds = candidateList.filter(c => {
      const p = (c.planLevel || '').toLowerCase();
      return p === 'diamond' || p === 'diamond_extremo';
    });

    const golds = candidateList.filter(c => {
      const p = (c.planLevel || '').toLowerCase();
      return p !== 'diamond' && p !== 'diamond_extremo';
    });

    const shuffleArray = (arr: Company[]) => {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    };

    const shuffledDiamonds = shuffleArray(diamonds);
    const shuffledGolds = shuffleArray(golds);

    // Intercalação equilibrada sem duplicidade de IDs
    const balanced: Company[] = [];
    const maxLen = Math.max(shuffledDiamonds.length, shuffledGolds.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < shuffledDiamonds.length) balanced.push(shuffledDiamonds[i]);
      if (i < shuffledGolds.length) balanced.push(shuffledGolds[i]);
    }

    setShuffledList(balanced.length > 0 ? balanced : shuffleArray(candidateList));
    setCurrentIndex(0);
  }, [candidateList]);

  const handlePrev = () => {
    if (shuffledList.length <= 1) return;
    setCurrentIndex(prev => (prev - 1 + shuffledList.length) % shuffledList.length);
  };

  const handleNext = () => {
    if (shuffledList.length <= 1) return;
    setCurrentIndex(prev => (prev + 1) % shuffledList.length);
  };

  if (shuffledList.length === 0) return null;

  // Seleciona até 3 empresas garantindo ZERO duplicidade na mesma vitrine
  const getVisibleCards = () => {
    const total = shuffledList.length;
    if (total <= 3) {
      return shuffledList;
    }
    const visible: Company[] = [];
    const seenIds = new Set<string>();
    for (let i = 0; i < total && visible.length < 3; i++) {
      const comp = shuffledList[(currentIndex + i) % total];
      if (!seenIds.has(comp.id)) {
        seenIds.add(comp.id);
        visible.push(comp);
      }
    }
    return visible;
  };

  const visibleCompanies = getVisibleCards();

  return (
    <section className="bg-white border border-slate-200 rounded-3xl p-6 md:p-10 shadow-sm relative overflow-hidden my-8">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-6 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
              VITRINE COMERCIAL EM DESTAQUE
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">
            Destaques de Itapoá
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Exposição rotativa dos estabelecimentos participantes com vitrine ampliada e benefícios Gold e Diamond.
          </p>
        </div>

        {/* Carousel Navigation Buttons */}
        {shuffledList.length > 3 && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handlePrev}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition cursor-pointer shadow-sm"
              title="Anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition cursor-pointer shadow-md"
              title="Próximo"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Cards Grid: Desktop (3), Tablet (2), Mobile (1) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visibleCompanies.map((comp) => {
          const categoryName = categories.find(c => c.id === comp.categoryId)?.name || 'Comércio Local';
          const coverImg = comp.coverImage || comp.logo || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80';
          const p = (comp.planLevel || '').toLowerCase();
          const isDiamond = p === 'diamond' || p === 'diamond_extremo';
          const isGold = p === 'gold_vip' || p === 'ouro';

          return (
            <div
              key={comp.id}
              onClick={() => onNavigateCompany(comp.slug)}
              className="bg-white border border-slate-200 rounded-3xl overflow-hidden cursor-pointer transition transform hover:-translate-y-1.5 shadow-sm hover:shadow-xl hover:border-indigo-500 group flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* Cover & VIP Badge */}
                <div className="relative h-48 overflow-hidden bg-slate-100">
                  <img
                    src={coverImg}
                    alt={comp.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    loading="lazy"
                    decoding="async"
                    onError={(e) => {
                      const fallback = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80';
                      if ((e.target as HTMLImageElement).src !== fallback) {
                        (e.target as HTMLImageElement).src = fallback;
                      }
                    }}
                  />

                  {/* Badge de Destaque por Plano */}
                  <div className="absolute top-3 left-3">
                    {isDiamond ? (
                      <span className="bg-amber-500 text-slate-950 text-[9px] font-black uppercase px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 border border-amber-400">
                        <Sparkles className="w-3 h-3 fill-slate-950" />
                        <span>👑 DIAMOND OFICIAL</span>
                      </span>
                    ) : isGold ? (
                      <span className="bg-indigo-600 text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-full shadow-md flex items-center gap-1 border border-indigo-400">
                        <Zap className="w-3 h-3 fill-white" />
                        <span>⭐ GOLD VIP</span>
                      </span>
                    ) : (
                      <span className="bg-slate-900/80 text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        <span>EMPRESA VERIFICADA</span>
                      </span>
                    )}
                  </div>

                  {comp.logo && imageIdentity(comp.logo) !== imageIdentity(coverImg) && (
                    <div className="absolute bottom-3 right-3 w-12 h-12 bg-white border border-slate-200 rounded-2xl p-1 shadow-md">
                      <img
                        src={comp.logo}
                        alt={comp.name}
                        className="w-full h-full object-contain rounded-xl"
                        loading="lazy"
                        onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                      />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5 space-y-2">
                  <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider block">
                    {categoryName} • ITAPOÁ
                  </span>

                  <h3 className="text-base font-black text-slate-900 leading-tight group-hover:text-indigo-600 transition">
                    {comp.name}
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {comp.description}
                  </p>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="p-5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                {comp.whatsapp ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(`https://wa.me/55${comp.whatsapp.replace(/\D/g, '')}`, '_blank');
                    }}
                    className="flex-1 py-2.5 px-3 bg-emerald-50 hover:bg-emerald-600 border border-emerald-200 text-emerald-700 hover:text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                ) : (
                  <div className="flex-1" />
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigateCompany(comp.slug);
                  }}
                  className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] rounded-xl transition uppercase tracking-wider flex items-center gap-1 cursor-pointer shrink-0 shadow-sm"
                >
                  <span>VER DETALHES ↗</span>
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* Footer link to full directory */}
      <div className="text-center pt-8 border-t border-slate-100 mt-8">
        <button
          onClick={() => onNavigateTab('empresas')}
          className="text-indigo-600 hover:text-indigo-800 font-extrabold text-xs uppercase tracking-wider transition cursor-pointer hover:underline inline-flex items-center gap-1"
        >
          <span>CONHEÇA TODAS AS EMPRESAS DE ITAPOÁ &gt;&gt;&gt;</span>
        </button>
      </div>

    </section>
  );
};
