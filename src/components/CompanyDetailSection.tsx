/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * CompanyDetailSection — Apresentação de Empresas com Diferenciação Rigorosa por Plano
 *
 * Planos:
 * - Bronze: Apresentação essencial (logo, contatos, horários, endereço, até 3 fotos, sem concorrentes se pago).
 * - Gold VIP: Capa personalizada, selo VIP, galeria de até 15 fotos, catálogo de até 5 produtos e 1 promoção.
 * - Diamond: Apresentação completa e ampliada (capa premium, selo Diamond, até 30 fotos, até 30 produtos e 3 promoções).
 *
 * Regras estritas:
 * - Perfis pagos (Gold/Diamond) NUNCA exibem anúncios de concorrentes.
 * - Sem promessas falsas (sem promessas de primeiro lugar permanente, vendas garantidas ou IA 24h).
 * - Preserva 100% dos dados, rotas e URLs existentes.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Phone, Share2, Star, Clock, MapPin, Globe, Sparkles,
  Send, Heart, User, Filter, ArrowUpDown, Search, Award,
  Zap, Tag, ShoppingBag, CheckCircle2, ChevronRight, MessageSquare
} from 'lucide-react';
import { Company, Review, City, Category, ProductOrService, FAQItem } from '../types';
import { featureArray, toNumber, arrayFromPayload } from '../utils/catalogSearch';

interface CompanyDetailSectionProps {
  company: Company;
  cities: City[];
  categories: Category[];
  currentUserId: string;
  isFavorited: boolean;
  onToggleFavorite: (companyId: string) => void;
  onBack: () => void;
}

export default function CompanyDetailSection({
  company,
  cities,
  categories,
  currentUserId,
  isFavorited,
  onToggleFavorite,
  onBack
}: CompanyDetailSectionProps) {
  // Identificação do Plano Efetivo da Empresa
  const rawPlan = (company.planLevel || 'bronze').toLowerCase();
  const isDiamond = rawPlan === 'diamond' || rawPlan === 'diamond_extremo';
  const isGold = rawPlan === 'gold_vip' || rawPlan === 'ouro';
  const isBronze = !isDiamond && !isGold;
  const isPaid = isDiamond || isGold || company.access_grant_type === 'paid' || company.access_grant_type === 'admin_grant' || Boolean(company.isSponsored);

  // Limites estruturais por plano
  const maxGalleryPhotos = isDiamond ? 30 : isGold ? 15 : 3;
  const maxProductsLimit = isDiamond ? 30 : isGold ? 5 : 0;
  const maxCouponsLimit = isDiamond ? 3 : isGold ? 1 : 0;

  const safeRating = toNumber((company as any).rating, 0);
  const safeFeatures = featureArray((company as any).features);
  const allProducts: ProductOrService[] = Array.isArray((company as any).products) ? (company as any).products : [];
  const safeProducts = allProducts.slice(0, maxProductsLimit);
  const safeFaqs: FAQItem[] = Array.isArray((company as any).faqs) ? (company as any).faqs : [];

  const [activeTab, setActiveTab] = useState<'info' | 'products' | 'coupons' | 'reviews'>('info');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewAuthor, setNewReviewAuthor] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [sortOption, setSortOption] = useState<'recent' | 'oldest' | 'highest' | 'lowest'>('recent');
  const [reviewsSearch, setReviewsSearch] = useState<string>('');
  const [activeGalleryIdx, setActiveGalleryIdx] = useState(0);

  // Galeria de Fotos respeitando estritamente o limite do plano (Logo e Capa à parte)
  const galleryImages = useMemo(() => {
    const rawImages: string[] = [];
    if (safeProducts.length > 0) {
      safeProducts.forEach(p => {
        if (p.imageUrl) rawImages.push(p.imageUrl);
      });
    }
    const cleanList = Array.from(new Set(rawImages.filter(Boolean)));
    return cleanList.slice(0, maxGalleryPhotos);
  }, [safeProducts, maxGalleryPhotos]);

  // Carregar avaliações
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/reviews?entityId=${company.id}&entityType=company`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (cancelled) return;
        setReviews(Array.isArray(data) ? data : arrayFromPayload(data));
      })
      .catch(() => {
        if (!cancelled) setReviews([]);
      });
    return () => { cancelled = true; };
  }, [company.id]);

  // Carregar promoções/cupons (apenas para planos Gold e Diamond)
  useEffect(() => {
    if (isBronze) {
      setCoupons([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/coupons?companyId=${encodeURIComponent(company.id)}`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : arrayFromPayload(data);
        const active = list.filter((cp: any) => cp.isActive !== false);
        setCoupons(active.slice(0, maxCouponsLimit));
      })
      .catch(() => {
        if (!cancelled) setCoupons([]);
      });
    return () => { cancelled = true; };
  }, [company.id, isBronze, maxCouponsLimit]);

  const handleNextGallery = () => {
    if (galleryImages.length <= 1) return;
    setActiveGalleryIdx(prev => (prev + 1) % galleryImages.length);
  };

  const handlePrevGallery = () => {
    if (galleryImages.length <= 1) return;
    setActiveGalleryIdx(prev => (prev - 1 + galleryImages.length) % galleryImages.length);
  };

  const trackTelemetry = (eventType: 'view' | 'whatsapp' | 'phone' | 'route') => {
    if (!company.id) return;
    fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_id: company.id,
        event_type: eventType,
        source: 'guiacomercial',
        device: typeof window !== 'undefined' && window.innerWidth < 768 ? 'mobile' : 'desktop'
      })
    }).catch(() => {});
  };

  // Registra visualização real na montagem
  useEffect(() => {
    trackTelemetry('view');
  }, [company.id]);

  const handleLeadWhatsAppClick = () => {
    trackTelemetry('whatsapp');
    fetch(`/api/companies/${company.id}/click`, { method: 'POST' }).catch(() => {});
    const cleanPhone = (company.whatsapp || company.phone || '').replace(/\D/g, '');
    const textMsg = encodeURIComponent(
      `Olá! Encontrei o perfil de ${company.name} no Guia Comercial de Itapoá e gostaria de saber mais informações.`
    );
    window.open(`https://wa.me/55${cleanPhone}?text=${textMsg}`, '_blank');
  };

  const handleProductWhatsAppClick = (productName: string) => {
    trackTelemetry('whatsapp');
    fetch(`/api/companies/${company.id}/click`, { method: 'POST' }).catch(() => {});
    const cleanPhone = (company.whatsapp || company.phone || '').replace(/\D/g, '');
    const textMsg = encodeURIComponent(
      `Olá! Vi o item "${productName}" no catálogo de ${company.name} no Guia Comercial de Itapoá e gostaria de saber mais detalhes e disponibilidade.`
    );
    window.open(`https://wa.me/55${cleanPhone}?text=${textMsg}`, '_blank');
  };

  const handlePhoneClick = () => {
    trackTelemetry('phone');
    if (company.phone) {
      window.open(`tel:${company.phone}`, '_self');
    }
  };

  const handleRouteClick = () => {
    trackTelemetry('route');
    const destination = company.address 
      ? encodeURIComponent(`${company.address}, Itapoá, SC`) 
      : company.latitude && company.longitude 
        ? `${company.latitude},${company.longitude}` 
        : encodeURIComponent(`${company.name}, Itapoá, SC`);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${destination}`, '_blank');
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewComment.trim() || !newReviewAuthor.trim()) return;

    fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityId: company.id,
        entityType: 'company',
        userName: newReviewAuthor.trim(),
        rating: newReviewRating,
        comment: newReviewComment.trim()
      })
    })
      .then(res => res.ok ? res.json() : Promise.reject(res.status))
      .then(() =>
        fetch(`/api/reviews?entityId=${company.id}&entityType=company`)
          .then(res => res.ok ? res.json() : [])
          .then(data => setReviews(Array.isArray(data) ? data : arrayFromPayload(data)))
      )
      .then(() => {
        setNewReviewComment('');
        setNewReviewAuthor('');
        alert('Depoimento enviado com sucesso!');
      })
      .catch(() => {
        alert('Não foi possível registrar a avaliação no momento.');
      });
  };

  const filteredAndSortedReviews = useMemo(() => {
    let result = [...reviews];
    if (reviewsSearch.trim()) {
      const q = reviewsSearch.toLowerCase();
      result = result.filter(rev =>
        rev.userName.toLowerCase().includes(q) ||
        rev.comment.toLowerCase().includes(q)
      );
    }
    if (ratingFilter !== 'all') {
      const targetRating = parseInt(ratingFilter, 10);
      result = result.filter(rev => rev.rating === targetRating);
    }
    result.sort((a, b) => {
      if (sortOption === 'recent') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortOption === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortOption === 'highest') return b.rating - a.rating;
      if (sortOption === 'lowest') return a.rating - b.rating;
      return 0;
    });
    return result;
  }, [reviews, ratingFilter, sortOption, reviewsSearch]);

  const currentCity = cities.find(c => c.id === company.cityId);
  const currentCategory = categories.find(cat => cat.id === company.categoryId);

  return (
    <div id="company_detail_container" className="relative w-full min-h-screen bg-slate-50 pb-20">
      
      {/* 1. CABEÇALHO DIFERENCIADO POR PLANO */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6">
        
        {/* CABEÇALHO GOLD / DIAMOND COM CAPA PERSONALIZADA E SELO */}
        {!isBronze ? (
          <section id="detail_cover_vip" className={`relative w-full h-[320px] md:h-[400px] rounded-3xl overflow-hidden shadow-2xl border ${
            isDiamond 
              ? 'border-amber-400/40 ring-1 ring-amber-400/30' 
              : 'border-indigo-400/30 ring-1 ring-indigo-400/20'
          }`}>
            <img
              src={company.coverImage || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80'}
              alt={company.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className={`absolute inset-0 ${
              isDiamond 
                ? 'bg-gradient-to-t from-slate-950 via-slate-950/60 to-black/30' 
                : 'bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent'
            }`} />

            {/* Top Bar Actions */}
            <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10">
              <button
                type="button"
                onClick={onBack}
                className="px-4 py-2 bg-slate-950/80 border border-white/20 text-white font-bold text-xs rounded-full hover:bg-slate-900 transition flex items-center gap-1.5 backdrop-blur cursor-pointer shadow"
              >
                ← Voltar para o Guia
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="p-2.5 bg-slate-950/80 border border-white/20 text-white rounded-full hover:bg-slate-900 transition backdrop-blur shadow cursor-pointer"
                  title="Compartilhar Link Oficial"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onToggleFavorite(company.id)}
                  className="p-2.5 bg-slate-950/80 border border-white/20 text-white rounded-full hover:bg-slate-900 transition backdrop-blur shadow cursor-pointer"
                >
                  <Heart className={`w-4 h-4 ${isFavorited ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                </button>
              </div>
            </div>

            {/* Bottom Content: Logo, Selo Oficial e Contatos */}
            <div className="absolute bottom-6 left-6 right-6 z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div className="flex gap-4 items-center">
                <img
                  src={company.logo || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=200&q=80'}
                  alt={company.name}
                  className="w-16 h-16 md:w-22 md:h-22 rounded-2xl md:rounded-3xl object-cover border-2 border-white shadow-2xl bg-white shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="text-white">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-[11px] font-bold text-teal-300 uppercase tracking-wider">
                      {currentCategory?.name || 'Comércio'} • {currentCity?.name || 'Itapoá'}
                    </span>

                    {/* SELO OFICIAL POR PLANO */}
                    {isDiamond ? (
                      <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 border border-amber-300 shadow-md">
                        <Sparkles className="w-3 h-3 fill-slate-950" />
                        <span>👑 PARCEIRO DIAMOND OFICIAL</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white border border-indigo-400 shadow-md">
                        <Zap className="w-3 h-3 fill-white" />
                        <span>⭐ PARCEIRO VIP GOLD</span>
                      </span>
                    )}
                  </div>

                  <h1 className="text-2xl md:text-3xl font-sans font-black tracking-tight">{company.name}</h1>
                  
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex items-center gap-1 bg-amber-400 text-slate-950 px-2 py-0.5 rounded text-xs font-bold">
                      <Star className="w-3.5 h-3.5 fill-slate-950 text-slate-950" /> {safeRating.toFixed(1)}
                    </div>
                    <span className="text-xs text-slate-300">({reviews.length} avaliações autorizadas)</span>
                  </div>
                </div>
              </div>

              {/* Ações Rápidas */}
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={handleLeadWhatsAppClick}
                  className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs md:text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-95 shrink-0"
                >
                  <Phone className="w-4 h-4 fill-slate-950" />
                  <span>Chamar no WhatsApp</span>
                </button>

                {company.phone && (
                  <button
                    type="button"
                    onClick={handlePhoneClick}
                    className="px-4 py-3 bg-slate-900/90 hover:bg-slate-800 text-white border border-white/20 font-bold text-xs md:text-sm rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <span>Ligar</span>
                  </button>
                )}
              </div>
            </div>
          </section>
        ) : (
          /* CABEÇALHO ESSENCIAL BRONZE (Clean, Direto e Objetivo) */
          <section id="detail_cover_bronze" className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 border border-slate-800 shadow-lg relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <button
                type="button"
                onClick={onBack}
                className="text-xs font-bold text-slate-400 hover:text-white transition flex items-center gap-1"
              >
                ← Voltar para o Guia
              </button>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700 px-2.5 py-1 rounded-full">
                  Presença Essencial no Guia
                </span>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-xl transition"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <img
                  src={company.logo || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=200&q=80'}
                  alt={company.name}
                  className="w-16 h-16 md:w-20 md:h-20 rounded-2xl object-cover border border-slate-700 bg-white shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                    {currentCategory?.name || 'Comércio'} • {currentCity?.name || 'Itapoá'}
                  </span>
                  <h1 className="text-2xl md:text-3xl font-black text-white">{company.name}</h1>
                  <p className="text-xs text-slate-400 mt-1 max-w-xl">{company.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleLeadWhatsAppClick}
                  className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs md:text-sm rounded-xl transition flex items-center gap-2 shadow"
                >
                  <Phone className="w-4 h-4 fill-slate-950" />
                  <span>WhatsApp</span>
                </button>
              </div>
            </div>
          </section>
        )}

      </div>

      {/* 2. BARRA DE NAVEGAÇÃO DE ABAS */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8">
        <div className="flex border-b border-slate-200 gap-4 md:gap-8 mb-8 overflow-x-auto whitespace-nowrap scrollbar-none">
          <button
            onClick={() => setActiveTab('info')}
            className={`pb-4 text-sm font-bold transition inline-flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === 'info' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Informações Gerais</span>
          </button>

          {/* Catálogo de Produtos: apenas Gold (até 5) e Diamond (até 30) */}
          {!isBronze && (
            <button
              onClick={() => setActiveTab('products')}
              className={`pb-4 text-sm font-bold transition inline-flex items-center gap-2 border-b-2 cursor-pointer ${
                activeTab === 'products' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Catálogo ({safeProducts.length})</span>
            </button>
          )}

          {/* Cupons e Promoções: apenas Gold (1) e Diamond (até 3) */}
          {!isBronze && coupons.length > 0 && (
            <button
              onClick={() => setActiveTab('coupons')}
              className={`pb-4 text-sm font-bold transition inline-flex items-center gap-2 border-b-2 cursor-pointer ${
                activeTab === 'coupons' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Tag className="w-4 h-4 text-amber-500" />
              <span>Promoções Ativas ({coupons.length})</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-4 text-sm font-bold transition inline-flex items-center gap-2 border-b-2 cursor-pointer ${
              activeTab === 'reviews' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Avaliações ({reviews.length})</span>
          </button>
        </div>

        {/* 3. CONTEÚDO PRINCIPAL + SIDEBAR */}
        <div className="flex flex-col lg:flex-row gap-8">
          
          <main className="flex-1 flex flex-col gap-8">
            
            {/* ABA: INFORMAÇÕES GERAIS */}
            {activeTab === 'info' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-8">
                
                {/* Sobre Nós */}
                <div className="p-6 md:p-8 bg-white border border-slate-200 rounded-3xl shadow-sm">
                  <h3 className="text-lg font-black text-slate-900 mb-3">Sobre o Estabelecimento</h3>
                  <p className="text-slate-600 leading-relaxed text-sm whitespace-pre-line">
                    {company.detailedDescription || company.description || 'Nenhuma descrição detalhada informada.'}
                  </p>

                  {safeFeatures.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-slate-100">
                      {safeFeatures.map((feat, idx) => (
                        <span key={idx} className="bg-slate-100 text-slate-700 text-xs px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{feat}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Galeria de Fotos Respeitando os Limites do Plano */}
                {galleryImages.length > 0 && (
                  <div className="p-6 md:p-8 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-black text-slate-900">Galeria de Fotos</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {isDiamond ? 'Galeria expandida oficial Diamond (até 30 fotos)' : isGold ? 'Galeria exclusiva Gold VIP (até 15 fotos)' : 'Galeria de fotos (até 3 fotos)'}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                        {activeGalleryIdx + 1} de {galleryImages.length}
                      </span>
                    </div>

                    <div className="relative w-full h-[280px] md:h-[420px] bg-slate-900 rounded-2xl overflow-hidden shadow-md">
                      <img
                        src={galleryImages[activeGalleryIdx]}
                        alt={`Foto ${activeGalleryIdx + 1}`}
                        className="w-full h-full object-cover"
                      />

                      {galleryImages.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={handlePrevGallery}
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 text-white hover:bg-black/80 transition flex items-center justify-center font-bold z-10"
                          >
                            ◀
                          </button>
                          <button
                            type="button"
                            onClick={handleNextGallery}
                            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 text-white hover:bg-black/80 transition flex items-center justify-center font-bold z-10"
                          >
                            ▶
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Perguntas Frequentes (FAQ) */}
                {safeFaqs.length > 0 && (
                  <div className="p-6 md:p-8 bg-white border border-slate-200 rounded-3xl shadow-sm">
                    <h3 className="text-lg font-black text-slate-900 mb-6">Perguntas Frequentes</h3>
                    <div className="flex flex-col gap-4">
                      {safeFaqs.map(faq => (
                        <div key={faq.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                          <h4 className="font-bold text-sm text-slate-900 mb-1.5 flex items-center gap-1.5">
                            <span className="text-indigo-600">Q.</span> {faq.question}
                          </h4>
                          <p className="text-xs text-slate-600 leading-relaxed">{faq.answer}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Banner Educativo Apenas para Perfil Bronze Gratuito (Sem concorrentes em pagos) */}
                {isBronze && (
                  <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 to-indigo-950 border border-slate-800 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block mb-1">
                        Área do Lojista
                      </span>
                      <h4 className="text-base font-bold">É o proprietário desta empresa?</h4>
                      <p className="text-xs text-slate-300 mt-0.5 max-w-lg leading-relaxed">
                        Faça upgrade para os planos Gold VIP ou Diamond e ative capa personalizada, catálogo de produtos, promoções ativas e destaque rotativo na vitrine do portal.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => window.location.href = '/#pricing'}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition shrink-0 shadow-md"
                    >
                      Conhecer Planos
                    </button>
                  </div>
                )}

              </motion.div>
            )}

            {/* ABA: CATÁLOGO DE PRODUTOS / SERVIÇOS (Apenas Gold e Diamond) */}
            {activeTab === 'products' && !isBronze && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 md:p-8 bg-white border border-slate-200 rounded-3xl shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Catálogo de Produtos e Serviços</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isDiamond ? 'Capacidade estendida Diamond: até 30 produtos cadastrados' : 'Capacidade Gold VIP: até 5 produtos cadastrados'}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                    {safeProducts.length} {safeProducts.length === 1 ? 'item' : 'itens'}
                  </span>
                </div>

                {safeProducts.length === 0 ? (
                  <div className="text-center p-12 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    Nenhum produto cadastrado no momento.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {safeProducts.map(p => (
                      <div key={p.id} className="flex gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:border-indigo-200 transition group">
                        {p.imageUrl && (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="w-20 h-20 rounded-xl object-cover border border-slate-200 shrink-0 bg-white"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <h4 className="font-bold text-sm text-slate-900 group-hover:text-indigo-600 transition truncate">{p.name}</h4>
                            <p className="text-xs text-slate-500 line-clamp-2 mt-1">{p.description}</p>
                          </div>
                          
                          <div className="flex items-center justify-between mt-3">
                            {p.price != null && Number(p.price) > 0 ? (
                              <span className="text-sm font-black text-slate-900">
                                R$ {Number(p.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            ) : <div />}

                            <button
                              type="button"
                              onClick={() => handleProductWhatsAppClick(p.name)}
                              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 rounded-lg text-xs font-bold transition flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3" />
                              <span>Pedir</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* ABA: PROMOÇÕES E CUPONS (Apenas Gold e Diamond) */}
            {activeTab === 'coupons' && !isBronze && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 md:p-8 bg-white border border-slate-200 rounded-3xl shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Promoções e Cupons de Desconto</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Vantagens exclusivas oferecidas por {company.name} para moradores e visitantes de Itapoá
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {coupons.map(cp => (
                    <div key={cp.id} className="p-5 rounded-2xl bg-amber-50/50 border border-amber-200 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[10px] font-black uppercase bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded-full">
                            {cp.discountType === 'percentage' ? `${cp.discountValue}% OFF` : `R$ ${cp.discountValue} OFF`}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-slate-500">CÓDIGO: {cp.code}</span>
                        </div>
                        <h4 className="font-black text-base text-slate-900">{cp.title}</h4>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{cp.description}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-amber-200/60 flex items-center justify-between">
                        <span className="text-[10px] text-slate-500">Válido no balcão e WhatsApp</span>
                        <button
                          type="button"
                          onClick={handleLeadWhatsAppClick}
                          className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl transition shadow-sm"
                        >
                          Resgatar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ABA: AVALIAÇÕES */}
            {activeTab === 'reviews' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
                
                {/* Listagem de Avaliações */}
                <div className="p-6 md:p-8 bg-white border border-slate-200 rounded-3xl shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-6">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">Avaliações do Público</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Mostrando {filteredAndSortedReviews.length} opiniões registradas</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={ratingFilter}
                        onChange={e => setRatingFilter(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700"
                      >
                        <option value="all">Todas as Notas</option>
                        <option value="5">⭐⭐⭐⭐⭐ 5 Estrelas</option>
                        <option value="4">⭐⭐⭐⭐ 4 Estrelas</option>
                        <option value="3">⭐⭐⭐ 3 Estrelas</option>
                      </select>

                      <select
                        value={sortOption}
                        onChange={e => setSortOption(e.target.value as any)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700"
                      >
                        <option value="recent">Mais Recentes</option>
                        <option value="highest">Maior Nota</option>
                      </select>
                    </div>
                  </div>

                  {filteredAndSortedReviews.length === 0 ? (
                    <div className="text-center p-8 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs">
                      Nenhuma avaliação registrada com os filtros aplicados.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredAndSortedReviews.map(rev => (
                        <div key={rev.id} className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100 flex gap-3.5 items-start">
                          <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                            {rev.userName.slice(0, 1).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-slate-900">{rev.userName}</span>
                              <div className="flex items-center gap-0.5">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star key={i} className={`w-3 h-3 ${i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                                ))}
                              </div>
                            </div>
                            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{rev.comment}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Formulário de Nova Avaliação */}
                <div className="p-6 md:p-8 bg-white border border-slate-200 rounded-3xl shadow-sm">
                  <h3 className="text-base font-black text-slate-900 mb-4">Deixar sua Avaliação</h3>
                  <form onSubmit={handleReviewSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1">Seu Nome</label>
                        <input
                          type="text"
                          required
                          value={newReviewAuthor}
                          onChange={e => setNewReviewAuthor(e.target.value)}
                          placeholder="Digite seu nome..."
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1">Nota</label>
                        <select
                          value={newReviewRating}
                          onChange={e => setNewReviewRating(Number(e.target.value))}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="5">⭐⭐⭐⭐⭐ 5 - Excelente</option>
                          <option value="4">⭐⭐⭐⭐ 4 - Muito Bom</option>
                          <option value="3">⭐⭐⭐ 3 - Regular</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">Seu Comentário</label>
                      <textarea
                        rows={3}
                        required
                        value={newReviewComment}
                        onChange={e => setNewReviewComment(e.target.value)}
                        placeholder="Conte como foi sua experiência..."
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition"
                      >
                        Enviar Avaliação
                      </button>
                    </div>
                  </form>
                </div>

              </motion.div>
            )}

          </main>

          {/* 4. SIDEBAR OFICIAL (SEM ANÚNCIOS DE CONCORRENTES EM PERFIS PAGOS) */}
          <aside className="w-full lg:w-80 shrink-0 flex flex-col gap-6">
            
            {/* Box de Contato Direto & WhatsApp (Sem IA 24h ou promessas irreais) */}
            <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 block mb-2">
                Canal Oficial de Atendimento
              </span>
              <h3 className="text-base font-black text-slate-900 mb-4">Contato Direto</h3>

              <div className="space-y-4 text-xs text-slate-700">
                
                {/* Botão de WhatsApp */}
                <button
                  type="button"
                  onClick={handleLeadWhatsAppClick}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-2xl flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
                >
                  <Phone className="w-4 h-4 fill-slate-950" />
                  <span>Conversar no WhatsApp</span>
                </button>

                {company.hours && (
                  <div className="flex gap-3 pt-2">
                    <Clock className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-900 block">Horário de Funcionamento</span>
                      <span className="text-slate-600">{company.hours}</span>
                    </div>
                  </div>
                )}

                {company.address && (
                  <div className="flex flex-col gap-2 pt-1 border-t border-slate-100">
                    <div className="flex gap-3">
                      <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-900 block">Endereço</span>
                        <span className="text-slate-600">{company.address}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRouteClick}
                      className="w-full mt-1 py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 border border-rose-200"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Como Chegar (Traçar Rota no Mapa)</span>
                    </button>
                  </div>
                )}

                {company.phone && (
                  <div className="flex gap-3 pt-1 border-t border-slate-100">
                    <Phone className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-900 block">Telefone de Contato</span>
                      <button
                        type="button"
                        onClick={handlePhoneClick}
                        className="text-indigo-600 hover:underline font-semibold text-left p-0 bg-transparent border-none cursor-pointer"
                      >
                        {company.phone}
                      </button>
                    </div>
                  </div>
                )}

                {company.website && (
                  <div className="flex gap-3">
                    <Globe className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-900 block">Site Oficial</span>
                      <a href={company.website} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                        {company.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  </div>
                )}

                {company.instagram && (
                  <div className="flex gap-3">
                    <span className="text-pink-500 shrink-0 text-sm">📸</span>
                    <div>
                      <span className="font-bold text-slate-900 block">Instagram</span>
                      <a
                        href={`https://instagram.com/${company.instagram.replace('@', '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-pink-600 hover:underline font-semibold"
                      >
                        {company.instagram}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Mapa de Localização */}
            <div className="w-full rounded-3xl overflow-hidden border border-slate-200 shadow-sm relative h-48 bg-slate-100 flex items-center justify-center">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=600&q=80')` }}
              />
              <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px]" />
              <div className="relative z-10 flex flex-col items-center gap-1.5 p-4 text-center">
                <div className="w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center text-white font-bold text-xs shadow-md">
                  📍
                </div>
                <span className="text-white text-xs font-black drop-shadow">{company.name}</span>
                <span className="text-slate-200 text-[10px] drop-shadow max-w-xs truncate">{company.address}</span>
              </div>
            </div>

          </aside>

        </div>
      </div>

    </div>
  );
}
