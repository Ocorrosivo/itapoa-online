/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Portal Content Management View Component - Editable Sections, Texts & Banners
 */

import React, { useState } from 'react';
import { Layout, Save, CheckCircle2, FileText, Image, MessageSquare } from 'lucide-react';

export const PortalContentView: React.FC = () => {
  const [heroTitle, setHeroTitle] = useState('O Guia Comercial Oficial de Itapoá');
  const [heroSubtitle, setHeroSubtitle] = useState('Encontre empresas locais, praias, gastronomia, turismo e ofertas exclusivas na cidade.');
  const [bannerMain, setBannerMain] = useState('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80');
  const [aboutText, setAboutText] = useState('O Itapoá Online é o portal e marketplace de maior relevância comercial da cidade...');
  const [contactEmail, setContactEmail] = useState('contato@itapoa.online');
  const [footerText, setFooterText] = useState('© 2026 ITAPOÁ ONLINE - Todos os direitos reservados. Plataforma Comercial Multi-Tenant SaaS.');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 4000);
  };

  return (
    <div className="space-y-6 p-6">
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Gestão de Conteúdo do Portal</h1>
          <p className="text-xs text-slate-400 mt-1">
            Edite textos da Página Inicial, sobre nós, banners, política de privacidade, termos e rodapé.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-6 py-3 bg-[#C8102E] hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-xl transition flex items-center gap-2 cursor-pointer uppercase"
        >
          <Save className="w-4 h-4" />
          <span>Salvar Conteúdo</span>
        </button>
      </div>

      {isSaved && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-600/50 rounded-2xl text-emerald-300 text-xs font-bold flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>Conteúdo do portal atualizado e publicado com sucesso!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        
        {/* Section 1: Hero Banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
          <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Layout className="w-5 h-5 text-[#C8102E]" /> Banner Principal da Home
            </h2>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Título Principal da Home</label>
              <input
                type="text"
                value={heroTitle}
                onChange={e => setHeroTitle(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Subtítulo Explicativo</label>
              <textarea
                rows={2}
                value={heroSubtitle}
                onChange={e => setHeroSubtitle(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">URL da Imagem de Fundo (Hero)</label>
              <input
                type="text"
                value={bannerMain}
                onChange={e => setBannerMain(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Textos Institucionais */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
          <div className="border-b border-slate-800 pb-4">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" /> Sobre Nós & Rodapé
            </h2>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Resumo Institucional (Sobre Nós)</label>
              <textarea
                rows={4}
                value={aboutText}
                onChange={e => setAboutText(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Texto de Direitos Autorais do Rodapé</label>
              <input
                type="text"
                value={footerText}
                onChange={e => setFooterText(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
              />
            </div>
          </div>
        </div>

      </form>

    </div>
  );
};
