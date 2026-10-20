/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Bright Theme Premium Companies Carousel Component for Home Page
 */

import React, { useState, useEffect } from 'react';
import { Phone, ArrowRight, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Company } from '../types';

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
  // Filter companies on Premium / Diamond / Gold plans
  const premiumCompanies = companies.filter(c => 
    c.planLevel === 'diamond' || 
    c.planLevel === 'diamond_extremo' || 
    c.planLevel === 'premium' || 
    c.planLevel === 'ouro' || 
    c.planLevel === 'gold_vip'
  );

  // Fallback to all companies if fewer than 3 specific premium companies exist
  const displayList = premiumCompanies.length >= 3 ? premiumCompanies : companies;

  // Shuffle initial order on mount so 1st position rotates fairly ONLY on page load
  const [shuffledList, setShuffledList] = useState<Company[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (displayList.length > 0) {
      // Fisher-Yates shuffle array for 100% fair random rotation on page load
      const arr = [...displayList];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      setShuffledList(arr);
    }
  }, [companies]);

  const handlePrev = () => {
    setCurrentIndex(prev => (prev - 1 + shuffledList.length) % shuffledList.length);
  };

  const handleNext = () => {
    setCurrentIndex(prev => (prev + 1) % shuffledList.length);
  };

  if (shuffledList.length === 0) return null;

  // Get current 3 companies to display
  const getVisibleCards = () => {
    const visible: Company[] = [];
    for (let i = 0; i < Math.min(3, shuffledList.length); i++) {
      const idx = (currentIndex + i) % shuffledList.length;
      visible.push(shuffledList[idx]);
    }
    return visible;
  };

  const visibleCompanies = getVisibleCards();

  return (
    <section className="py-10 bg-white border border-slate-200 rounded-3xl p-6 md:p-10 shadow-sm relative overflow-hidden my-8">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 pb-6 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-[#C8102E] animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#C8102E]">
              OFERTAS PREMIUM EM DESTAQUE
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">
            Top Empresas de Itapoá
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Exposição rotativa e contínua dos principais estabelecimentos e prestadores de serviços da cidade.
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
              className="p-2.5 rounded-xl bg-[#C8102E] hover:bg-red-700 text-white transition cursor-pointer shadow-md"
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

          return (
            <div
              key={comp.id}
              onClick={() => onNavigateCompany(comp.slug)}
              className="bg-white border border-slate-200 rounded-3xl overflow-hidden cursor-pointer transition transform hover:-translate-y-1.5 shadow-sm hover:shadow-xl hover:border-[#C8102E] group flex flex-col justify-between"
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
                  <div className="absolute top-3 left-3 bg-[#C8102E] text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                    <span>📍 PARCEIRO VIP PREMIUM</span>
                  </div>
                  {comp.logo && (
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
                  <span className="text-[10px] font-extrabold text-[#C8102E] uppercase tracking-wider block">
                    {categoryName} • ITAPOÁ
                  </span>

                  <h3 className="text-base font-black text-slate-900 leading-tight group-hover:text-[#C8102E] transition">
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
                  className="py-2.5 px-4 bg-[#C8102E] hover:bg-red-700 text-white font-extrabold text-[10px] rounded-xl transition uppercase tracking-wider flex items-center gap-1 cursor-pointer shrink-0 shadow-sm"
                >
                  <span>CLIQUE AQUI ↗</span>
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
          className="text-[#C8102E] hover:text-red-700 font-extrabold text-xs uppercase tracking-wider transition cursor-pointer hover:underline inline-flex items-center gap-1"
        >
          <span>VEJA TODOS OS NOSSOS PARCEIROS &gt;&gt;&gt;</span>
        </button>
      </div>

    </section>
  );
};
