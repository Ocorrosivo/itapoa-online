/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Restored Home Page Component - Original Layout & Bright Theme
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Play, Facebook, Instagram, Phone, Globe,
  Sun, Palmtree, Fish, Ship, Landmark, MapPin, Store, Briefcase, Users, ArrowRight,
  Search, X, Sparkles, Building2, Calendar, Newspaper
} from 'lucide-react';
import { useCompany } from '../context/CompanyContext';
import { PremiumCompaniesCarousel } from '../components/PremiumCompaniesCarousel';
import { quickSearch, groupLabel, QuickSearchItem, QuickSearchGroup } from '../services/quickSearchService';
import { matchesCompanySearch, normalizeSearch } from '../utils/catalogSearch';

interface HomePageProps {
  onNavigateCompany: (slug: string) => void;
  onNavigateTab: (tab: string) => void;
  onOpenAuthModal: () => void;
  onSelectBairro?: (slug: string) => void;
  onSelectPraia?: (slug: string) => void;
}

const groupIcon: Record<QuickSearchGroup, React.ReactNode> = {
  empresas: <Building2 className="w-4 h-4 text-blue-500" />,
  eventos: <Calendar className="w-4 h-4 text-amber-500" />,
  turismo: <MapPin className="w-4 h-4 text-emerald-500" />,
  blog: <Newspaper className="w-4 h-4 text-purple-500" />,
  empregos: <Briefcase className="w-4 h-4 text-rose-500" />,
};

export const HomePage: React.FC<HomePageProps> = ({
  onNavigateCompany,
  onNavigateTab,
  onOpenAuthModal,
  onSelectBairro,
  onSelectPraia
}) => {
  const { companies, categories, searchCatId, setSearchCatId, loading, catalogError, refreshData } = useCompany();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBairroFilter, setSelectedBairroFilter] = useState<string | null>(null);
  const [liveSuggestions, setLiveSuggestions] = useState<QuickSearchItem[]>([]);
  const [isSearchingLive, setIsSearchingLive] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  const litoralBanners = [
    {
      title: 'Nossas Praias',
      slug: 'praia-itapema-do-norte',
      img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
      icon: <Sun className="w-3.5 h-3.5 text-amber-300" />
    },
    {
      title: 'O Trapiche',
      slug: 'praia-do-pontal',
      img: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=600&q=80',
      icon: <Palmtree className="w-3.5 h-3.5 text-emerald-300" />
    },
    {
      title: 'Pesca Tradicional',
      slug: 'praia-barra-do-sai',
      img: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=80',
      icon: <Fish className="w-3.5 h-3.5 text-cyan-300" />
    },
    {
      title: 'Porto Itapoá',
      slug: 'praia-do-pontal',
      img: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80',
      icon: <Ship className="w-3.5 h-3.5 text-blue-300" />
    },
    {
      title: 'Farol de Itapoá',
      slug: 'praia-itapema-do-norte',
      img: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
      icon: <Landmark className="w-3.5 h-3.5 text-amber-200" />
    }
  ];

  const normalizeStr = normalizeSearch;

  const handleExecuteSearch = () => {
    setShowDropdown(false);
    const el = document.getElementById('parceiros_section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSelectSuggestion = (item: QuickSearchItem) => {
    setShowDropdown(false);
    if (item.group === 'empresas') {
      onNavigateCompany(item.slug);
    } else if (item.group === 'eventos' || item.group === 'turismo' || item.group === 'blog') {
      onNavigateTab('turismo');
    } else if (item.group === 'empregos') {
      onNavigateTab('empregos');
    }
  };

  // Live suggestions debounce ao digitar no campo único
  useEffect(() => {
    const term = searchTerm.trim();
    if (term.length < 2) {
      setLiveSuggestions([]);
      setIsSearchingLive(false);
      return;
    }
    setIsSearchingLive(true);
    const timer = setTimeout(async () => {
      try {
        const results = await quickSearch(term);
        setLiveSuggestions(results);
      } catch {
        setLiveSuggestions([]);
      } finally {
        setIsSearchingLive(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fechar dropdown de sugestões ao clicar fora
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Randomized order on page load for fair exposure across all companies
  const [shuffledCompanies, setShuffledCompanies] = useState<any[]>([]);

  React.useEffect(() => {
      const arr = [...companies];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      setShuffledCompanies(arr);
  }, [companies]);

  const companyListToFilter = shuffledCompanies.length > 0 ? shuffledCompanies : companies;

  const filteredCompanies = companyListToFilter.filter((c: any) => {
    const term = normalizeStr(searchTerm.trim());
    const matchesSearch = !term || (() => {
      const catObj = categories.find(cat => cat.id === c.categoryId);
      const catMatch = catObj ? normalizeStr(catObj.name || '').includes(term) : false;
      const prodMatch = (c.products || []).some((p: any) => 
        normalizeStr(p.name || '').includes(term) || normalizeStr(p.description || '').includes(term)
      );
      return matchesCompanySearch(c, term) || catMatch || prodMatch;
    })();

    const matchesCat = !searchCatId || c.categoryId === searchCatId;
    const matchesBairro = !selectedBairroFilter || normalizeStr(c.address || '').includes(normalizeStr(selectedBairroFilter));
    return matchesSearch && matchesCat && matchesBairro;
  });

  return (
    <div className="bg-slate-50 text-slate-900 flex flex-col">
      {/* 1. Panoramic Hero Section with Aerial Background (Image 2 & 3) */}
      <section className="relative w-full bg-slate-950 overflow-hidden shadow-2xl">
        {/* Background Image: Aerial photo of Itapoá */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
          style={{ backgroundImage: `url('/hero-itapoa.jpg')` }}
          aria-hidden="true"
        />

        {/* Ambient Gradient Overlays for Readability & Contrast (-35% de overlay para maior visibilidade da praia) */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/60 via-slate-950/30 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-slate-950/15 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-transparent to-slate-950/50 pointer-events-none" />

        {/* Hero Content Container */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 pt-10 sm:pt-14 lg:pt-16 pb-8 sm:pb-10 flex flex-col justify-between min-h-[520px] sm:min-h-[560px] lg:min-h-[600px]">
          {/* Headline block */}
          <div className="max-w-2xl space-y-3 sm:space-y-4">
            <div className="inline-flex items-center gap-2.5">
              <span className="w-8 h-1 bg-[#C8102E] rounded-full inline-block" />
              <span className="text-xs sm:text-sm font-extrabold uppercase tracking-widest text-slate-200">
                BEM-VINDO AO
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-none drop-shadow-xl">
              ITAPOÁ ONLINE
            </h1>

            <p className="text-sm sm:text-base lg:text-lg font-medium text-slate-100 drop-shadow-md">
              Aqui você encontra tudo o que precisa em um só lugar!
            </p>

            {/* Quick category shortcuts row with icons and divider lines */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-2 text-xs sm:text-sm font-bold text-white drop-shadow">
              <button
                type="button"
                onClick={handleExecuteSearch}
                className="flex items-center gap-1.5 hover:text-red-300 transition cursor-pointer"
              >
                <Store className="w-4 h-4 text-red-400" />
                <span>Comércio Local</span>
              </button>
              <span className="text-white/30 hidden sm:inline">|</span>

              <button
                type="button"
                onClick={() => {
                  setSearchTerm('Serviços');
                  handleExecuteSearch();
                }}
                className="flex items-center gap-1.5 hover:text-red-300 transition cursor-pointer"
              >
                <Briefcase className="w-4 h-4 text-red-400" />
                <span>Serviços</span>
              </button>
              <span className="text-white/30 hidden sm:inline">|</span>

              <button
                type="button"
                onClick={() => onNavigateTab('turismo')}
                className="flex items-center gap-1.5 hover:text-red-300 transition cursor-pointer"
              >
                <MapPin className="w-4 h-4 text-red-400" />
                <span>Turismo</span>
              </button>
              <span className="text-white/30 hidden sm:inline">|</span>

              <button
                type="button"
                onClick={() => onNavigateTab('empregos')}
                className="flex items-center gap-1.5 hover:text-red-300 transition cursor-pointer"
              >
                <Users className="w-4 h-4 text-red-400" />
                <span>Empregos</span>
              </button>
            </div>
          </div>

          {/* 6 Cards floating strip along bottom of Hero */}
          <div className="pt-8 sm:pt-12">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
              {litoralBanners.map((b, idx) => (
                <div
                  key={idx}
                  onClick={() => onSelectPraia && onSelectPraia(b.slug)}
                  className="relative overflow-hidden rounded-2xl group cursor-pointer h-36 sm:h-40 lg:h-44 shadow-xl border border-white/15 bg-slate-900 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-white/40"
                >
                  <img
                    src={b.img}
                    alt={b.title}
                    className="w-full h-full object-cover object-center group-hover:scale-110 transition duration-700 brightness-85"
                    loading="lazy"
                    decoding="async"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-transparent flex items-end p-3 sm:p-4">
                    <span className="text-[12px] sm:text-[13px] font-bold text-white tracking-tight drop-shadow-md flex items-center gap-1.5">
                      {b.icon}
                      <span>{b.title}</span>
                    </span>
                  </div>
                </div>
              ))}

              {/* 6th Card: ITAPOÁ SC Special Red Card */}
              <div
                onClick={() => onNavigateTab('tourism')}
                className="relative bg-gradient-to-br from-red-600 via-[#C8102E] to-red-800 rounded-2xl flex flex-col justify-center items-center text-center p-4 cursor-pointer group h-36 sm:h-40 lg:h-44 shadow-xl border border-red-500/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-white/50"
              >
                <MapPin className="w-6 h-6 text-white mb-1 drop-shadow group-hover:scale-110 transition" />
                <span className="text-lg sm:text-xl font-black tracking-widest text-white uppercase block leading-tight">
                  ITAPOÁ SC
                </span>
                <span className="text-[11px] italic text-red-100 block mt-0.5">"Paraíso Catarinense"</span>
                <span className="text-[10px] font-extrabold uppercase text-white tracking-wider mt-3 border border-white/60 px-3 py-1 rounded-lg bg-black/20 flex items-center gap-1 group-hover:bg-white group-hover:text-[#C8102E] transition">
                  GUIA OFICIAL <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <div className="w-full max-w-7xl mx-auto px-4 space-y-10 py-8">

        {/* Dynamic Carousel of Premium Companies (Bright Theme) */}
        <PremiumCompaniesCarousel
          companies={companies}
          categories={categories}
          onNavigateCompany={onNavigateCompany}
          onNavigateTab={onNavigateTab}
        />

        {/* 2. Premium Unified Search Section (Single Box + Live Suggestions + High-Converting Design) */}
        <div className="relative rounded-3xl bg-gradient-to-b from-white via-slate-50/80 to-slate-100/70 p-6 sm:p-10 lg:p-12 border border-slate-200/90 shadow-xl shadow-slate-200/60 overflow-visible text-center space-y-6">
          {/* Ambient subtle glow at top */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-24 bg-red-500/5 blur-3xl pointer-events-none rounded-full" />

          {/* Section Header */}
          <div className="relative z-10 space-y-2.5 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-red-50 border border-red-100 text-[#C8102E] text-[10px] sm:text-[11px] font-black uppercase tracking-widest shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-[#C8102E]" />
              <span>ACHE TUDO O QUE PRECISA EM ITAPOÁ</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
              O que você está buscando hoje?
            </h2>
            <p className="text-xs sm:text-sm font-medium text-slate-500">
              Busque por empresa, categoria, bairro, produto ou serviço. <strong className="text-slate-700">Ex: Mercado, Pousada, Hambúrguer, Itapema, Lava Rápido</strong>
            </p>
          </div>

          {/* SINGLE UNIFIED PREMIUM SEARCH BOX */}
          <div ref={searchWrapRef} className="relative max-w-2xl mx-auto z-30">
            <div className="relative flex items-center bg-white rounded-2xl shadow-xl shadow-slate-200/80 border-2 border-slate-200 focus-within:border-[#C8102E] focus-within:ring-4 focus-within:ring-[#C8102E]/10 transition-all duration-300 p-1.5 sm:p-2">
              <div className="pl-3 sm:pl-4 pr-1 text-slate-400 flex items-center pointer-events-none flex-shrink-0">
                <Search className="w-5 h-5 text-slate-400" />
              </div>

              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  if (e.target.value.trim().length >= 2) setShowDropdown(true);
                }}
                onFocus={() => {
                  if (searchTerm.trim().length >= 2) setShowDropdown(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleExecuteSearch();
                }}
                placeholder="Digite o nome da empresa, serviço, bairro ou produto..."
                aria-label="Buscar em Itapoá"
                className="flex-1 py-3 px-3 text-sm sm:text-base font-semibold text-slate-900 placeholder:text-slate-400 placeholder:font-normal bg-transparent focus:outline-none"
              />

              {searchTerm && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setShowDropdown(false);
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition mr-1 cursor-pointer"
                  title="Limpar busca"
                  aria-label="Limpar busca"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={handleExecuteSearch}
                className="bg-gradient-to-r from-[#C8102E] to-red-600 hover:from-red-700 hover:to-[#C8102E] text-white px-6 sm:px-8 py-3 sm:py-3.5 rounded-xl font-black text-xs sm:text-sm tracking-wider uppercase shadow-md shadow-red-500/25 hover:shadow-lg hover:shadow-red-500/35 active:scale-95 transition cursor-pointer flex items-center gap-1.5 flex-shrink-0"
              >
                <span>BUSCAR</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Live Instant Suggestions Dropdown */}
            {showDropdown && searchTerm.trim().length >= 2 && (
              <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-[min(65vh,480px)] overflow-y-auto text-left">
                {isSearchingLive ? (
                  <div className="px-4 py-6 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-slate-300 border-t-[#C8102E] rounded-full animate-spin" />
                    <span>Buscando resultados em Itapoá…</span>
                  </div>
                ) : liveSuggestions.length === 0 ? (
                  <div className="px-5 py-6 text-center space-y-2">
                    <p className="text-sm font-bold text-slate-800">
                      Nenhum resultado direto para “{searchTerm}”
                    </p>
                    <p className="text-xs text-slate-500">
                      Pressione <strong className="text-slate-700">BUSCAR</strong> para filtrar os parceiros cadastrados logo abaixo.
                    </p>
                    <button
                      type="button"
                      onClick={handleExecuteSearch}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#C8102E] hover:underline pt-1 cursor-pointer"
                    >
                      Ver parceiros filtrados <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="py-2">
                    <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
                      <span className="font-semibold">Sugestões rápidas encontradas:</span>
                      <span className="text-[11px] font-bold text-[#C8102E]">{liveSuggestions.length} itens</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {liveSuggestions.slice(0, 8).map((item) => (
                        <button
                          key={`${item.group}-${item.id}`}
                          type="button"
                          onClick={() => handleSelectSuggestion(item)}
                          className="w-full px-4 py-3 hover:bg-red-50/50 flex items-center justify-between transition cursor-pointer text-left group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="p-2 rounded-lg bg-slate-100 group-hover:bg-white transition flex-shrink-0">
                              {groupIcon[item.group]}
                            </span>
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-slate-800 group-hover:text-[#C8102E] truncate transition">
                                {item.title}
                              </div>
                              {item.subtitle && (
                                <div className="text-xs text-slate-400 truncate mt-0.5">
                                  {item.subtitle}
                                </div>
                              )}
                            </div>
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 group-hover:bg-[#C8102E] group-hover:text-white transition flex-shrink-0 ml-2">
                            {groupLabel(item.group)}
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                      <button
                        type="button"
                        onClick={handleExecuteSearch}
                        className="text-xs font-bold text-[#C8102E] hover:underline inline-flex items-center gap-1 cursor-pointer"
                      >
                        Ver todos os resultados na lista abaixo <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick search chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 max-w-2xl mx-auto pt-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Sugestões:</span>
            {['Todos', 'Mercado', 'Pousada', 'Hambúrguer', 'Itapema', 'Lava Rápido', 'Clínica', 'Construção'].map((chip) => {
              const isSelected = chip === 'Todos'
                ? (!searchTerm && !searchCatId && !selectedBairroFilter)
                : searchTerm.toLowerCase() === chip.toLowerCase();
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    if (chip === 'Todos') {
                      setSearchTerm('');
                      setSelectedBairroFilter(null);
                      setSearchCatId('');
                    } else {
                      setSearchTerm(chip);
                    }
                    handleExecuteSearch();
                  }}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-[#C8102E] text-white shadow-md shadow-red-500/20 scale-105'
                      : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 shadow-2xs hover:border-slate-300'
                  }`}
                >
                  {chip}
                </button>
              );
            })}
          </div>

          {/* Active filter badges */}
          {(searchTerm || searchCatId || selectedBairroFilter) && (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-3 text-xs border-t border-slate-200/60 max-w-2xl mx-auto">
              <span className="text-slate-500 font-semibold">Filtro ativo:</span>
              {searchTerm && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-100 text-[#C8102E] font-medium">
                  "{searchTerm}"
                  <button aria-label="Remover termo de busca" onClick={() => setSearchTerm('')} className="hover:text-red-900 cursor-pointer ml-1 font-bold">×</button>
                </span>
              )}
              {searchCatId && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                  {categories.find(c => c.id === searchCatId)?.name || 'Categoria'}
                  <button aria-label="Remover categoria" onClick={() => setSearchCatId('')} className="hover:text-blue-900 cursor-pointer ml-1 font-bold">×</button>
                </span>
              )}
              {selectedBairroFilter && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
                  {selectedBairroFilter}
                  <button aria-label="Remover bairro" onClick={() => setSelectedBairroFilter(null)} className="hover:text-amber-950 cursor-pointer ml-1 font-bold">×</button>
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedBairroFilter(null);
                  setSearchCatId('');
                }}
                className="text-[11px] text-slate-500 underline hover:text-[#C8102E] ml-2 cursor-pointer font-medium"
              >
                Limpar todos
              </button>
            </div>
          )}
        </div>

        <div id="parceiros_section" className="space-y-12 pt-8">
          <div className="flex flex-col items-center text-center space-y-2">
            <span className="text-[10px] font-black tracking-widest text-[#C8102E] uppercase">
              NOSSOS APOIADORES OFICIAIS
            </span>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight relative inline-block pb-4 text-center">
              Nossos Parceiros
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-[#C8102E] rounded-full"></span>
            </h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(idx => (
                <div key={idx} className="bg-white border border-slate-200 rounded-3xl overflow-hidden p-4 space-y-3 animate-pulse shadow-sm">
                  <div className="bg-slate-200 h-36 rounded-2xl w-full"></div>
                  <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                  <div className="h-3 bg-slate-100 rounded w-full"></div>
                  <div className="h-3 bg-slate-100 rounded w-4/5"></div>
                </div>
              ))}
            </div>
          ) : catalogError ? (
            <div role="alert" className="bg-white border border-red-200 rounded-3xl p-12 text-center space-y-4 shadow-sm max-w-lg mx-auto">
              <h3 className="text-lg font-bold text-slate-800">Catálogo indisponível</h3>
              <p className="text-xs text-slate-500">{catalogError}</p>
              <button onClick={() => refreshData()} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold">Tentar novamente</button>
            </div>
          ) : companies.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4 shadow-sm max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-xl font-bold">
                ℹ️
              </div>
              <h3 className="text-lg font-bold text-slate-800">Catálogo vazio</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Ainda não há empresas cadastradas. Volte em breve para conhecer os parceiros de Itapoá.
              </p>
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4 shadow-sm max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-full bg-red-50 text-[#C8102E] flex items-center justify-center mx-auto text-xl font-bold">
                🔍
              </div>
              <h3 className="text-lg font-bold text-slate-800">Nenhum resultado encontrado.</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Não encontramos empresas ou serviços para os filtros aplicados{searchTerm ? ` ("${searchTerm}")` : ''}. Tente buscar por termos como Mercado, Pousada, Hamburguer ou Lava Rápido.
              </p>
              <button 
                onClick={() => {
                  setSearchTerm('');
                  setSelectedBairroFilter(null);
                  setSearchCatId('');
                }} 
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
              >
                Limpar Busca
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredCompanies.map((comp: any) => (
                <div
                  key={comp.id}
                  onClick={() => onNavigateCompany(comp.slug)}
                  className="bg-white border border-slate-200 rounded-3xl overflow-hidden cursor-pointer transition transform hover:-translate-y-1 shadow-sm hover:shadow-xl group flex flex-col"
                >
                  {/* Image & Badge */}
                  <div className="relative h-40">
                    <img
                      src={(comp as any).coverImage || comp.logo}
                      alt={comp.name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition duration-500"
                      onError={(e) => {
                        const fallback = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80';
                        if ((e.target as HTMLImageElement).src !== fallback) {
                          (e.target as HTMLImageElement).src = fallback;
                        }
                      }}
                    />
                    <div className="absolute top-4 left-4">
                      <span className="bg-[#C8102E] text-white text-[8px] font-black uppercase px-2 py-1 rounded shadow-md">
                        ITAPOÁ PARCEIRO
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5 space-y-3 flex flex-col flex-1">
                    <span className="text-[10px] font-bold text-[#C8102E] uppercase tracking-wider">
                      {categories.find(c => c.id === (comp as any).categoryId)?.name || 'Comércio Local'}
                    </span>
                    <h3 className="text-sm font-black text-slate-900 leading-tight">
                      {comp.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 line-clamp-3 leading-relaxed flex-1">
                      {comp.description}
                    </p>
                    
                    {/* Footer Card */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        {comp.website && (
                          <div 
                            onClick={(e) => { e.stopPropagation(); window.open(comp.website, '_blank'); }}
                            className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center hover:text-blue-500 hover:border-blue-500 transition"
                            title="Website"
                          >
                            <Globe className="w-3 h-3" />
                          </div>
                        )}
                        {comp.whatsapp && (
                          <div 
                            onClick={(e) => { e.stopPropagation(); window.open(`https://wa.me/55${comp.whatsapp.replace(/\D/g, '')}`, '_blank'); }}
                            className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center hover:text-green-500 hover:border-green-500 transition"
                            title="WhatsApp"
                          >
                            <Phone className="w-3 h-3" />
                          </div>
                        )}
                        {comp.facebook && (
                          <div 
                            onClick={(e) => { e.stopPropagation(); window.open(comp.facebook, '_blank'); }}
                            className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center hover:text-blue-600 hover:border-blue-600 transition"
                            title="Facebook"
                          >
                            <Facebook className="w-3 h-3" />
                          </div>
                        )}
                        {comp.instagram && (
                          <div 
                            onClick={(e) => { e.stopPropagation(); window.open(comp.instagram, '_blank'); }}
                            className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center hover:text-pink-500 hover:border-pink-500 transition"
                            title="Instagram"
                          >
                            <Instagram className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                      
                      <button 
                        onClick={(e) => { e.stopPropagation(); onNavigateCompany(comp.slug); }}
                        className="bg-[#C8102E] text-white text-[9px] font-black uppercase px-4 py-1.5 rounded-full hover:bg-red-700 transition cursor-pointer"
                      >
                        CLIQUE AQUI ↗
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-center pt-8 pb-12">
            <button 
              onClick={() => onNavigateTab('directory')}
              className="text-[#C8102E] font-black text-sm uppercase tracking-wider hover:text-red-700 transition cursor-pointer hover:underline"
            >
              VEJA TODOS OS NOSSOS PARCEIROS &gt;&gt;&gt;
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
