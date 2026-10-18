/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Restored Home Page Component - Original Layout & Bright Theme
 */

import React, { useState } from 'react';
import { 
  Play, Facebook, Instagram, Phone, Globe
} from 'lucide-react';
import { useCompany } from '../context/CompanyContext';
import { PremiumCompaniesCarousel } from '../components/PremiumCompaniesCarousel';

interface HomePageProps {
  onNavigateCompany: (slug: string) => void;
  onNavigateTab: (tab: string) => void;
  onOpenAuthModal: () => void;
  onSelectBairro?: (slug: string) => void;
  onSelectPraia?: (slug: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigateCompany,
  onNavigateTab,
  onOpenAuthModal,
  onSelectBairro,
  onSelectPraia
}) => {
  const { companies, categories, searchCatId, setSearchCatId, loading } = useCompany();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBairroFilter, setSelectedBairroFilter] = useState<string | null>(null);

  const litoralBanners = [
    { title: 'Nossas Praias', slug: 'praia-itapema-do-norte', img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80', badge: '● Nossas Praias' },
    { title: 'O Trapiche', slug: 'praia-do-pontal', img: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=600&q=80', badge: '● O Trapiche' },
    { title: 'Pesca Tradicional', slug: 'praia-barra-do-sai', img: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=80', badge: '● Pesca Tradicional' },
    { title: 'Porto Itapoá', slug: 'praia-do-pontal', img: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80', badge: '● Porto Itapoá' },
    { title: 'Farol de Itapoá', slug: 'praia-itapema-do-norte', img: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80', badge: '● Farol de Itapoá' }
  ];

  const normalizeStr = (str: string) => 
    str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const handleExecuteSearch = () => {
    const el = document.getElementById('parceiros_section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Randomized order on page load for fair exposure across all companies
  const [shuffledCompanies, setShuffledCompanies] = useState<any[]>([]);

  React.useEffect(() => {
    if (companies.length > 0) {
      const arr = [...companies];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      setShuffledCompanies(arr);
    }
  }, [companies]);

  const companyListToFilter = shuffledCompanies.length > 0 ? shuffledCompanies : companies;

  const filteredCompanies = companyListToFilter.filter((c: any) => {
    const term = normalizeStr(searchTerm.trim());
    const matchesSearch = !term || (() => {
      const nameMatch = normalizeStr(c.name || '').includes(term);
      const descMatch = normalizeStr(c.description || '').includes(term) || normalizeStr(c.detailedDescription || '').includes(term);
      const addrMatch = normalizeStr(c.address || '').includes(term);
      const catObj = categories.find(cat => cat.id === c.categoryId);
      const catMatch = catObj ? normalizeStr(catObj.name || '').includes(term) : false;
      const prodMatch = (c.products || []).some((p: any) => 
        normalizeStr(p.name || '').includes(term) || normalizeStr(p.description || '').includes(term)
      );
      const featureMatch = (c.features || []).some((f: string) => normalizeStr(f).includes(term));
      return nameMatch || descMatch || addrMatch || catMatch || prodMatch || featureMatch;
    })();

    const matchesCat = !searchCatId || c.categoryId === searchCatId;
    const matchesBairro = !selectedBairroFilter || normalizeStr(c.address || '').includes(normalizeStr(selectedBairroFilter));
    return matchesSearch && matchesCat && matchesBairro;
  });

  return (
    <div className="bg-slate-50 text-slate-900 flex flex-col">
      {/* 1. Litoral Photo Banners Strip */}
      <div className="grid grid-cols-2 md:grid-cols-6 h-32 md:h-40">
        {litoralBanners.map((b, idx) => (
          <div
            key={idx}
            onClick={() => onSelectPraia && onSelectPraia(b.slug)}
            className="relative overflow-hidden group cursor-pointer"
          >
            <img
              src={b.img}
              alt={b.title}
              className="w-full h-full object-cover group-hover:scale-110 transition duration-700 brightness-75"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent flex items-end p-4">
              <span className="text-[13px] font-bold text-white tracking-tight drop-shadow-md">
                {b.badge}
              </span>
            </div>
          </div>
        ))}

        {/* 6th Red Card: ITAPOÁ SC */}
        <div 
          onClick={() => onNavigateTab('tourism')}
          className="relative bg-gradient-to-br from-red-800 to-[#C8102E] flex flex-col justify-center items-center text-center p-4 cursor-pointer group"
        >
          <span className="text-xl font-black tracking-widest text-white uppercase block group-hover:scale-105 transition">
            ITAPOÁ SC
          </span>
          <span className="text-[11px] italic text-red-200 block mt-1">"Paraíso Catarinense"</span>
          <span className="text-[10px] font-extrabold uppercase text-white/90 tracking-wider mt-3 border border-white/40 px-3 py-1 rounded bg-black/20">
            GUIA OFICIAL
          </span>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 space-y-12 py-8">
        
        {/* Dynamic Carousel of Premium Companies (Bright Theme) */}
        <PremiumCompaniesCarousel
          companies={companies}
          categories={categories}
          onNavigateCompany={onNavigateCompany}
          onNavigateTab={onNavigateTab}
        />

        <div className="text-center space-y-6 pt-16">
          <div className="space-y-2">
            <span className="text-[10px] font-black tracking-widest text-[#C8102E] uppercase">
              ACHE TUDO O QUE PRECISA
            </span>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              O que você está buscando?
            </h2>
            <p className="text-xs font-semibold text-slate-500">
              Busque por empresa, categoria, bairro, produto ou serviço. <strong className="text-slate-800">Exemplo: Mercado, Pousada, Hambúrguer, Itapema, Lava Rápido</strong>
            </p>
          </div>

          <div className="max-w-2xl mx-auto flex items-center shadow-lg rounded-xl overflow-hidden border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-[#C8102E]/30">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleExecuteSearch();
              }}
              placeholder="Digite o nome da empresa, serviço, bairro ou produto..."
              className="flex-1 px-6 py-4 text-sm focus:outline-none placeholder-slate-400 bg-white"
            />
            <button 
              onClick={handleExecuteSearch}
              className="bg-black text-white px-8 py-4 font-black text-xs tracking-wider uppercase hover:bg-slate-800 transition cursor-pointer"
            >
              BUSCAR &gt;&gt;
            </button>
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
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                    isSelected
                      ? 'bg-[#C8102E] text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {chip}
                </button>
              );
            })}
          </div>

          {/* Active filter badges */}
          {(searchTerm || searchCatId || selectedBairroFilter) && (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs">
              <span className="text-slate-500 font-medium">Filtro ativo:</span>
              {searchTerm && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-100 text-[#C8102E] font-medium">
                  "{searchTerm}"
                  <button onClick={() => setSearchTerm('')} className="hover:text-red-900 cursor-pointer ml-1 font-bold">×</button>
                </span>
              )}
              {searchCatId && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                  {categories.find(c => c.id === searchCatId)?.name || 'Categoria'}
                  <button onClick={() => setSearchCatId('')} className="hover:text-blue-900 cursor-pointer ml-1 font-bold">×</button>
                </span>
              )}
              {selectedBairroFilter && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">
                  {selectedBairroFilter}
                  <button onClick={() => setSelectedBairroFilter(null)} className="hover:text-amber-950 cursor-pointer ml-1 font-bold">×</button>
                </span>
              )}
              <button
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
          ) : companies.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-4 shadow-sm max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-xl font-bold">
                ℹ️
              </div>
              <h3 className="text-lg font-bold text-slate-800">Catálogo em Inicialização</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Nenhuma empresa encontrada no banco de dados. Importe o script <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-mono text-[11px]">database/schema/SEED_DEMO.sql</code> para carregar o catálogo de 16 empresas e bairros de Itapoá.
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
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
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
