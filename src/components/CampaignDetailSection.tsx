/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Phone, Share2, Heart, Calendar, User, MapPin, 
  Send, MessageSquare, ArrowLeft, Landmark, Award
} from 'lucide-react';
import { SolidarityCampaign, CampaignComment } from '../types';

interface CampaignDetailSectionProps {
  campaign: SolidarityCampaign;
  onBack: () => void;
  loggedUserName?: string;
}

export default function CampaignDetailSection({
  campaign: initialCampaign,
  onBack,
  loggedUserName = 'Visitante Solidário'
}: CampaignDetailSectionProps) {
  const [campaign, setCampaign] = useState<SolidarityCampaign>(initialCampaign);
  const [copiedLink, setCopiedLink] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [newCommentAuthor, setNewCommentAuthor] = useState('');
  const [activeGalleryIdx, setActiveGalleryIdx] = useState(0);

  // Sync state if initialCampaign changes
  useEffect(() => {
    setCampaign(initialCampaign);
    setActiveGalleryIdx(0);
  }, [initialCampaign]);

  // Gallery slider handlers
  const handleNextGallery = () => {
    if (campaign.gallery && campaign.gallery.length > 0) {
      setActiveGalleryIdx(prev => (prev + 1) % campaign.gallery.length);
    }
  };

  const handlePrevGallery = () => {
    if (campaign.gallery && campaign.gallery.length > 0) {
      setActiveGalleryIdx(prev => (prev - 1 + campaign.gallery.length) % campaign.gallery.length);
    }
  };

  // SEO updates dynamically
  useEffect(() => {
    const originalTitle = document.title;
    document.title = `${campaign.title} | Rede de Solidariedade AME`;

    // Metas
    const setMetaTag = (nameAttr: string, valueAttr: string, content: string) => {
      let el = document.querySelector(`meta[${nameAttr}="${valueAttr}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(nameAttr, valueAttr);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMetaTag('name', 'description', campaign.description);
    setMetaTag('property', 'og:title', campaign.title);
    setMetaTag('property', 'og:description', campaign.description);
    setMetaTag('property', 'og:image', campaign.imageUrl);
    setMetaTag('property', 'og:url', window.location.href);

    return () => {
      document.title = originalTitle;
    };
  }, [campaign]);

  // Copy Link action
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  // Post comment handler
  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const author = newCommentAuthor.trim() || loggedUserName || 'Voluntário Anônimo';

    fetch(`/api/campaigns/${campaign.id}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userName: author,
        comment: newCommentText.trim()
      })
    })
      .then(res => {
        if (!res.ok) throw new Error('Falha ao enviar comentário');
        return res.json();
      })
      .then(data => {
        if (data.success && data.campaign) {
          setCampaign(data.campaign);
          setNewCommentText('');
          setNewCommentAuthor('');
        }
      })
      .catch(err => console.error(err));
  };

  // WhatsApp Action
  const handleWhatsAppHelp = () => {
    const message = encodeURIComponent(`Olá, gostaria de ajudar na campanha "${campaign.title}" organizada pela AME Itapoá!`);
    window.open(`https://wa.me/5547997190413?text=${message}`, '_blank');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 font-sans">
      
      {/* Navigation Header */}
      <button 
        onClick={onBack}
        className="mb-6 flex items-center gap-2 text-sm font-bold text-red-650 hover:text-red-700 transition cursor-pointer select-none"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar para o Início
      </button>

      {/* Hero Banner Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-12">
        
        {/* Left Column: Image and details */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Main Hero Banner Card */}
          <div className="relative h-[240px] md:h-[420px] rounded-3xl overflow-hidden shadow-lg bg-slate-900 border border-slate-200">
            <img 
              src={campaign.imageUrl} 
              alt={campaign.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            {/* Dark elegant gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            
            <div className="absolute bottom-6 left-6 right-6 text-white text-left">
              <span className="inline-block bg-yellow-400 text-slate-950 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-3 shadow-md">
                {campaign.category}
              </span>
              <h1 className="text-xl md:text-3xl font-black uppercase leading-tight tracking-tight mb-2">
                {campaign.title}
              </h1>
              <p className="text-white/85 text-xs md:text-sm line-clamp-2 max-w-2xl font-light">
                {campaign.description}
              </p>
            </div>
          </div>

          {/* Core Text content - detailed description */}
          <div className="bg-white border border-slate-150 p-6 md:p-8 rounded-3xl shadow-sm text-left">
            <h2 className="text-lg font-black uppercase text-slate-900 mb-4 border-b border-slate-100 pb-2 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-650" /> Sobre a Campanha Solidária
            </h2>
            <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-line font-sans space-y-4">
              {campaign.detailedDescription || campaign.description}
            </div>
          </div>

          {/* Dynamic Gallery Slider if images exist */}
          {campaign.gallery && campaign.gallery.length > 0 && (
            <div className="bg-white border border-slate-150 p-6 rounded-3xl shadow-sm flex flex-col text-left">
              <h2 className="text-base font-black uppercase text-slate-900 mb-2">Galeria de Fotos Oficiais</h2>
              <p className="text-xs text-slate-500 mb-4">Veja registros e preparações das arrecadações em Itapoá.</p>

              <div className="relative w-full h-[220px] md:h-[360px] bg-slate-950 rounded-2xl overflow-hidden shadow-inner group">
                <AnimatePresence mode="wait">
                  <motion.img 
                    key={activeGalleryIdx}
                    src={campaign.gallery[activeGalleryIdx]}
                    alt={`Galeria ${activeGalleryIdx + 1}`}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.25 }}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </AnimatePresence>

                {/* Arrow Overlay Buttons */}
                {campaign.gallery.length > 1 && (
                  <>
                    <button 
                      type="button"
                      onClick={handlePrevGallery}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 backdrop-blur-md text-white hover:bg-black/75 transition flex items-center justify-center cursor-pointer select-none border border-white/10"
                    >
                      ◀
                    </button>
                    <button 
                      type="button"
                      onClick={handleNextGallery}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 backdrop-blur-md text-white hover:bg-black/75 transition flex items-center justify-center cursor-pointer select-none border border-white/10"
                    >
                      ▶
                    </button>
                  </>
                )}

                {/* Badge Index overlay */}
                <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-full text-white text-[10px] font-bold">
                  {activeGalleryIdx + 1} / {campaign.gallery.length}
                </div>
              </div>

              {/* Dot Indicators */}
              {campaign.gallery.length > 1 && (
                <div className="flex justify-center gap-1.5 mt-3">
                  {campaign.gallery.map((_, idx) => (
                    <button 
                      key={idx}
                      type="button"
                      onClick={() => setActiveGalleryIdx(idx)}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${activeGalleryIdx === idx ? 'w-5 bg-red-600' : 'bg-slate-300 hover:bg-slate-450'}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Comments section */}
          <div className="bg-white border border-slate-150 p-6 md:p-8 rounded-3xl shadow-sm text-left">
            <h2 className="text-lg font-black uppercase text-slate-900 mb-6 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-red-650" /> Comentários e Apoio Comunitário
            </h2>

            {/* Existing comments list */}
            <div className="space-y-4 mb-8">
              {campaign.comments && campaign.comments.length > 0 ? (
                campaign.comments.map((comm) => (
                  <div key={comm.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex gap-3">
                    <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center font-bold text-red-700 text-xs shrink-0 uppercase">
                      {comm.userName.substring(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-xs text-slate-800">{comm.userName}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(comm.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-slate-600 text-xs leading-relaxed">{comm.comment}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 text-xs italic">Nenhum comentário enviado ainda. Seja o primeiro a apoiar esta causa!</p>
              )}
            </div>

            {/* Comment Form */}
            <form onSubmit={handlePostComment} className="border-t border-slate-100 pt-6">
              <span className="text-xs font-bold text-slate-800 block mb-3 uppercase">Deixe sua mensagem de incentivo</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input 
                  type="text" 
                  placeholder="Seu nome (ex: Maria Souza)" 
                  value={newCommentAuthor}
                  onChange={(e) => setNewCommentAuthor(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 outline-none focus:border-red-650 transition"
                />
                <span className="text-[10px] text-slate-500 self-center">O nome padrão será &quot;{loggedUserName}&quot; caso deixado em branco.</span>
              </div>
              <div className="relative">
                <textarea 
                  rows={3}
                  placeholder="Escreva aqui suas palavras de carinho ou informe como pode ajudar..."
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-800 outline-none focus:border-red-650 transition resize-none"
                />
                <button 
                  type="submit"
                  className="absolute bottom-4.5 right-4.5 bg-red-650 hover:bg-red-700 text-white rounded-xl px-4 py-2 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Send className="w-3.5 h-3.5" /> Enviar
                </button>
              </div>
            </form>
          </div>

        </div>

        {/* Right Column: Key Details, Help options and CTA */}
        <div className="lg:col-span-4 flex flex-col gap-6 text-left">
          
          {/* Quick Info Sidebar */}
          <div className="p-6 bg-white border border-slate-150 rounded-3xl shadow-sm flex flex-col gap-5">
            <h3 className="text-sm font-black uppercase text-slate-900 border-b border-slate-100 pb-2">
              Detalhes do Projeto
            </h3>

            <div className="flex gap-3">
              <Calendar className="w-5 h-5 text-red-650 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block leading-none mb-1">Prazo de Encerramento</span>
                <span className="text-xs font-bold text-slate-800">{campaign.deadline}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <User className="w-5 h-5 text-red-650 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block leading-none mb-1">Responsável</span>
                <span className="text-xs font-bold text-slate-800">{campaign.responsible}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <MapPin className="w-5 h-5 text-red-650 shrink-0" />
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block leading-none mb-1">Ponto de Entrega Principal</span>
                <span className="text-xs font-semibold text-slate-700 leading-tight block">{campaign.address || 'Prédio da AME Itapoá'}</span>
              </div>
            </div>

            {/* Sharing buttons */}
            <div className="border-t border-slate-100 pt-4 mt-1">
              <button 
                onClick={handleCopyLink}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border shadow-sm cursor-pointer ${copiedLink ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'}`}
              >
                <Share2 className="w-3.5 h-3.5" />
                {copiedLink ? '✓ Link de Partilha Copiado' : 'Compartilhar Causa'}
              </button>
            </div>
          </div>

          {/* How to Help Options Card */}
          <div className="p-6 bg-gradient-to-br from-red-650 to-red-750 text-white rounded-3xl shadow-lg flex flex-col gap-5 border border-red-700/30">
            <h3 className="text-sm font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5 border-b border-white/10 pb-2">
              <Heart className="w-4 h-4 fill-amber-300 stroke-amber-300" /> Como Você Pode Ajudar?
            </h3>

            {/* PIX details */}
            <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-left">
              <span className="text-[9px] font-black tracking-widest text-amber-300 block mb-1.5 uppercase">Transferência PIX</span>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold break-all">{campaign.pix}</span>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(campaign.pix);
                    alert('Chave PIX copiada para a área de transferência!');
                  }}
                  className="bg-white text-red-650 hover:bg-amber-100 text-[9px] font-bold px-2 py-1 rounded transition shrink-0 uppercase cursor-pointer"
                  title="Copiar PIX"
                >
                  Copiar
                </button>
              </div>
            </div>

            {/* Traditional Bank details if specified */}
            {campaign.bankTransfer && (
              <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-left">
                <span className="text-[9px] font-black tracking-widest text-amber-300 block mb-1.5 uppercase flex items-center gap-1">
                  <Landmark className="w-3 h-3" /> Depósito / Transferência Bancária
                </span>
                <p className="text-[11px] leading-relaxed font-sans font-medium text-slate-100">
                  {campaign.bankTransfer}
                </p>
              </div>
            )}

            {/* Contact WhatsApp Call to Action */}
            <button 
              onClick={handleWhatsAppHelp}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-500/15 transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              {/* WhatsApp Responsive Vector Icon */}
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-slate-950">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.731-1.456L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.114-2.906-6.99C16.554 1.874 14.082.84 11.45.84 6.01.84 1.585 5.265 1.581 10.7a9.81 9.81 0 001.448 4.966l-.1.597-1.002 3.655 3.743-.981.577.342z" />
              </svg>
              Quero Ajudar via WhatsApp
            </button>
          </div>

          {/* Supporting Companies List */}
          {campaign.supportingCompanies && campaign.supportingCompanies.length > 0 && (
            <div className="p-6 bg-white border border-slate-150 rounded-3xl shadow-sm flex flex-col gap-4">
              <h3 className="text-xs font-black uppercase text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-red-650" /> Empresas Apoiadoras
              </h3>
              <p className="text-[11px] text-slate-500">Parceiros comerciais da rede AME que patrocinam esta iniciativa.</p>
              
              <div className="flex flex-col gap-2.5 mt-1">
                {campaign.supportingCompanies.map((compName, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 p-2 bg-slate-50 border border-slate-100 rounded-xl">
                    <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-800 font-extrabold text-[10px] flex items-center justify-center uppercase select-none">
                      💼
                    </div>
                    <span className="text-xs font-bold text-slate-700">{compName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Toast alert for copied link */}
      <AnimatePresence>
        {copiedLink && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-slate-950 text-white border border-white/10 shadow-2xl px-6 py-3 rounded-2xl flex items-center gap-2 font-sans text-xs font-bold"
          >
            <span className="text-emerald-500">✓</span> Link da campanha copiado com sucesso!
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
