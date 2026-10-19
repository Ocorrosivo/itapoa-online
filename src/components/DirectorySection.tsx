/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, MapPin, Star, Filter, ArrowUpDown, 
  Map, Compass, Sparkles, SlidersHorizontal, Grid, 
  List, ShieldCheck, Heart 
} from 'lucide-react';
import { Company, Category, City } from '../types';

interface DirectorySectionProps {
  companies: Company[];
  categories: Category[];
  cities: City[];
  onNavigateToCompany: (slug: string) => void;
  initialSearch?: string;
  initialCatId?: string;
  initialCityId?: string;
  currentUserId: string;
  favorites: string[]; // list of companyIds favorited
  onToggleFavorite: (companyId: string) => void;
}

export default function DirectorySection({
  companies,
  categories,
  cities,
  onNavigateToCompany,
  initialSearch = '',
  initialCatId = '',
  initialCityId = '',
  currentUserId,
  favorites,
  onToggleFavorite
}: DirectorySectionProps) {
  const [search, setSearch] = useState(initialSearch);
  const [selCat, setSelCat] = useState(initialCatId);
  const [selCity, setSelCity] = useState(initialCityId);
  const [sortBy, setSortBy] = useState<'rating' | 'views' | 'distance'>('rating');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [nearMe, setNearMe] = useState(false);

  // Sync props to state dynamically
  useEffect(() => {
    setSearch(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    setSelCat(initialCatId);
  }, [initialCatId]);

  useEffect(() => {
    setSelCity(initialCityId);
  }, [initialCityId]);

  // Client Coordinates Mock (Itapoá downtown)
  const clientLat = -26.115000;
  const clientLng = -48.610000;

  // Haversine distance helper (in kilometers)
  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Process filters and sorts
  const filteredCompanies = useMemo(() => {
    let result = [...companies];

    // Filter keywords
    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(c => 
        c.name.toLowerCase().includes(term) ||
        c.description.toLowerCase().includes(term) ||
        c.address.toLowerCase().includes(term)
      );
    }

    // Filter category
    if (selCat) {
      result = result.filter(c => c.categoryId === selCat);
    }

    // Filter city
    if (selCity) {
      result = result.filter(c => c.cityId === selCity);
    }

    // Filter "Near me" (within 10km of simulated city center)
    if (nearMe) {
      result = result.filter(c => {
        const d = getDistance(clientLat, clientLng, c.latitude, c.longitude);
        return d <= 8; // near me within 8km limits
      });
    }

    // Sort order
    result.sort((a, b) => {
      // 1. Sponsored diamond premium always comes FIRST regardless of criteria
      const scoreA = a.planLevel === 'diamond_extremo' ? 3 : a.planLevel === 'gold_vip' ? 2 : 1;
      const scoreB = b.planLevel === 'diamond_extremo' ? 3 : b.planLevel === 'gold_vip' ? 2 : 1;
      
      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }

      // 2. Secondary sorting criteria
      if (sortBy === 'rating') {
        return b.rating - a.rating;
      } else if (sortBy === 'views') {
        return b.views - a.views;
      } else if (sortBy === 'distance') {
        const distA = getDistance(clientLat, clientLng, a.latitude, a.longitude);
        const distB = getDistance(clientLat, clientLng, b.latitude, b.longitude);
        return distA - distB; // smaller distance is better
      }
      return 0;
    });

    return result;
  }, [companies, search, selCat, selCity, sortBy, nearMe]);

  const [visibleCount, setVisibleCount] = useState(6);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Reset page size when filters change
  useEffect(() => {
    setVisibleCount(6);
  }, [search, selCat, selCity, sortBy, nearMe]);

  useEffect(() => {
    const observerTarget = loadMoreRef.current;
    if (!observerTarget) return;

    const observer = new IntersectionObserver((entries) => {
      const first = entries[0];
      if (first.isIntersecting) {
        setVisibleCount((prev) => Math.min(prev + 6, filteredCompanies.length));
      }
    }, {
      rootMargin: '100px',
    });

    observer.observe(observerTarget);
    return () => {
      if (observerTarget) {
        observer.unobserve(observerTarget);
      }
      observer.disconnect();
    };
  }, [filteredCompanies.length, visibleCount]);

  const activeCategoryName = categories.find(c => c.id === selCat)?.name || 'Todos os Segmentos';

  return (
    <div id="directory_page" className="w-full py-10 px-4 md:px-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto flex flex-col">
        
        {/* Superior Header layout */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-semibold text-indigo-605 text-indigo-600 uppercase tracking-widest block mb-1">Guia Comercial</span>
            <h1 className="text-2xl font-sans font-black text-slate-900 tracking-tight">
              {activeCategoryName} <span className="text-xs font-normal text-slate-400">({filteredCompanies.length} encontradas)</span>
            </h1>
          </div>

          <div className="flex items-center gap-1.5">
            {/* View Mode */}
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg border transition cursor-pointer ${viewMode === 'grid' ? 'bg-white border-slate-200 shadow-sm text-indigo-600' : 'bg-transparent border-transparent text-slate-400'}`}
              title="Visualização em Grade"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg border transition cursor-pointer ${viewMode === 'list' ? 'bg-white border-slate-200 shadow-sm text-indigo-600' : 'bg-transparent border-transparent text-slate-400'}`}
              title="Visualização em Lista"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* LEFT COLUMN: FILTERS & SIDEBAR */}
          <aside className="w-full lg:w-72 flex flex-col gap-6 shrink-0">
            {/* Search Input Widget */}
            <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400" /> Pesquisa Rápida
              </h3>
              <input 
                type="text" 
                placeholder="Ex: gastronomia, hotel, etc."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-100 border border-slate-200 font-sans text-xs text-slate-900 focus:outline-none focus:border-indigo-400/50"
              />
            </div>

            {/* Geolocation matching Toggle */}
            <div 
              onClick={() => setNearMe(!nearMe)} 
              className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between ${nearMe ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200'}`}
            >
              <div className="flex items-center gap-3">
                <Compass className={`w-5 h-5 ${nearMe ? 'text-indigo-600' : 'text-slate-400'}`} />
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Próximos a mim</h4>
                  <p className="text-[9px] text-slate-400 font-sans">Simular raio de 8km (Itapoá)</p>
                </div>
              </div>
              <div className={`w-7 h-4 rounded-full p-0.5 transition ${nearMe ? 'bg-indigo-600' : 'bg-slate-200'} flex items-center ${nearMe ? 'justify-end' : 'justify-start'}`}>
                <div className="w-3 h-3 rounded-full bg-white shadow-sm" />
              </div>
            </div>

            {/* Selector list of Categories */}
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
              <h3 className="text-xs font-bold text-slate-900 mb-3 uppercase tracking-wider flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-slate-400" /> Segmentos
              </h3>
              <div className="flex flex-col gap-1">
                <button 
                  onClick={() => setSelCat('')}
                  className={`w-full text-left px-2.5 py-1.5 text-[11px] font-medium rounded transition ${!selCat ? 'bg-indigo-50 text-indigo-750 text-indigo-600 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  Todas as Categorias
                </button>
                {categories.map(cat => (
                  <button 
                    key={cat.id}
                    onClick={() => setSelCat(cat.id)}
                    className={`w-full text-left px-2.5 py-1.5 text-[11px] font-medium rounded transition flex items-center justify-between ${selCat === cat.id ? 'bg-indigo-50 text-indigo-600 font-bold border-l-2 border-indigo-600' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Filter by City selector */}
            <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
              <h3 className="text-xs font-bold text-slate-900 mb-3 uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400" /> Cidades
              </h3>
              <div className="flex flex-col gap-1">
                <button 
                  onClick={() => setSelCity('')}
                  className={`w-full text-left px-2.5 py-1.5 text-[11px] font-medium rounded transition ${!selCity ? 'bg-indigo-50 text-indigo-600 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  Todas as Cidades
                </button>
                {cities.map(c => (
                  <button 
                    key={c.id}
                    onClick={() => setSelCity(c.id)}
                    className={`w-full text-left px-2.5 py-1.5 text-[11px] font-medium rounded transition flex items-center justify-between ${selCity === c.id ? 'bg-indigo-50 text-indigo-600 font-bold border-l-2 border-indigo-600' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    <span>{c.name} - {c.state}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Reorder filters lists */}
            <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-slate-400" /> Ordenação de Busca
              </h3>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full p-3 rounded-lg bg-slate-100 border border-slate-200 text-xs font-sans text-slate-700 focus:outline-none"
              >
                <option value="rating">Melhor Avaliação ⭐</option>
                <option value="views">Mais Populares 👀</option>
                <option value="distance">Menor Distância 🧭</option>
              </select>
            </div>
          </aside>

          {/* RIGHT COLUMN: COMPANIES LISTING */}
          <div className="flex-1">
            <AnimatePresence mode="popLayout">
              {filteredCompanies.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full p-20 text-center bg-white border border-slate-200 rounded-3xl flex flex-col items-center"
                >
                  <Search className="w-12 h-12 text-slate-300 mb-4" />
                  <h3 className="text-lg font-bold text-slate-800">Nenhum resultado encontrado</h3>
                  <p className="text-sm text-slate-500 mt-2 max-w-sm">
                    Tente redefinir seus filtros de localização ou digite keywords mais genéricas. Estamos sempre adicionando novos parceiros!
                  </p>
                  <button 
                    onClick={() => { setSearch(''); setSelCat(''); setSelCity(''); setNearMe(false); }}
                    className="mt-4 px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition shadow"
                  >
                    Limpar Todos os Filtros
                  </button>
                </motion.div>
              ) : (
                <motion.div 
                  layout
                  className={`w-full ${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8' : 'flex flex-col gap-6'}`}
                >
                  {filteredCompanies.slice(0, visibleCount).map((c) => {
                    const isFav = favorites.includes(c.id);
                    const isDiamond = c.planLevel === 'diamond_extremo';
                    const isGold = c.planLevel === 'gold_vip';
                    
                    return (
                      <motion.div
                        key={c.id}
                        layoutId={`company_card_${c.id}`}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        onClick={() => onNavigateToCompany(c.slug)}
                        className={`group rounded-3xl overflow-hidden border transition-all duration-300 relative bg-white flex ${viewMode === 'grid' ? 'flex-col h-full hover:-translate-y-1.5 hover:shadow-xl' : 'flex-col md:flex-row h-auto md:h-56 hover:shadow-lg'} ${isDiamond ? 'border-amber-400 shadow-md ring-1 ring-amber-400/25 bg-gradient-to-b from-white to-amber-50/10' : 'border-slate-200/80 shadow-sm'} cursor-pointer`}
                      >
                        {/* Company cover thumbnail */}
                        <div className={`relative overflow-hidden shrink-0 ${viewMode === 'grid' ? 'h-44 w-full' : 'h-48 md:h-full w-full md:w-64 bg-slate-900'}`}>
                          <img 
                            src={c.coverImage} 
                            alt={c.name} 
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            referrerPolicy="no-referrer"
                          />
                          
                          {/* Top floating tags */}
                          <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
                            {isDiamond && (
                              <span className="flex items-center gap-1 font-sans text-[8px] font-extrabold bg-slate-950/90 backdrop-blur-md text-amber-400 px-2 py-1 rounded-full uppercase tracking-wider border border-amber-300/30">
                                <Sparkles className="w-2.5 h-2.5 text-amber-400 fill-amber-400" /> Diamante VIP
                              </span>
                            )}
                            {isGold && (
                              <span className="flex items-center gap-1 font-sans text-[8px] font-extrabold bg-slate-950/90 backdrop-blur-md text-teal-400 px-2 py-1 rounded-full uppercase tracking-wider border border-teal-500/30">
                                Destaque Ouro
                              </span>
                            )}
                          </div>

                          {/* Favorite button toggle */}
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onToggleFavorite(c.id); }}
                            className="absolute top-3 right-3 p-2 rounded-full backdrop-blur-md bg-black/40 hover:bg-black/60 text-white transition z-10 hover:scale-110 cursor-pointer"
                          >
                            <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                          </button>
                        </div>

                        {/* Text and controls body */}
                        <div className="p-5 flex-1 flex flex-col justify-between">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-sans tracking-tight">
                              <span>{cities.find(city => city.id === c.cityId)?.name}</span>
                              <span>•</span>
                              <span>{categories.find(cat => cat.id === c.categoryId)?.name}</span>
                            </div>
                            
                            <h3 className="text-sm md:text-base font-sans font-extrabold text-slate-900 leading-tight group-hover:text-red-650 transition duration-300 truncate">
                              {c.name}
                            </h3>
                            
                            <p className="text-xs text-slate-500 font-sans line-clamp-3 mt-1 leading-relaxed">
                              {c.description}
                            </p>
                          </div>

                          <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4 font-sans text-xs">
                            <div className="flex items-center gap-1 bg-amber-500/5 text-amber-700 px-2 py-0.5 rounded font-bold">
                              <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> {Number(c.rating).toFixed(1)} <span className="text-slate-400 font-normal">({c.reviewCount})</span>
                            </div>
                            
                            <button 
                              className="px-3.5 py-1.5 bg-slate-900 text-white group-hover:bg-red-650 rounded-lg text-[10px] font-bold uppercase tracking-wider transition duration-300 cursor-pointer"
                            >
                              Ver Detalhes
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>

            {visibleCount < filteredCompanies.length && (
              <div ref={loadMoreRef} className="w-full py-8 flex justify-center items-center">
                <div role="status" className="flex items-center gap-2 text-indigo-600 font-medium text-xs font-sans">
                  <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <span>Carregando mais empresas...</span>
                </div>
              </div>
            )}
            
            {visibleCount >= filteredCompanies.length && filteredCompanies.length > 0 && (
              <div className="w-full py-8 text-center text-xs text-slate-400 font-sans font-medium">
                Você viu todos os parceiros premium de Itapoá! ✨
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
