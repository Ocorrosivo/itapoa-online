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
  companies?: Company[];
  onNavigateCompany?: (slug: string) => void;
}

export default function CompanyDetailSection({
  company,
  cities,
  categories,
  currentUserId,
  isFavorited,
  onToggleFavorite,
  onBack,
  companies = [],
  onNavigateCompany
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

  // Modal de Reivindicação de Perfil (Campanha 7 Dias Grátis)
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimName, setClaimName] = useState('');
  const [claimPhone, setClaimPhone] = useState('');
  const [claimDocument, setClaimDocument] = useState('');
  const [claimTermsAccepted, setClaimTermsAccepted] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimSuccessMessage, setClaimSuccessMessage] = useState<string | null>(null);

  const isClaimed = (company as any).claim_status === 'claimed' || Boolean(company.ownerId && company.ownerId !== 'admin_master');

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
    }).catch(() => { });
  };

  // Registra visualização real na montagem
  useEffect(() => {
    trackTelemetry('view');
  }, [company.id]);

  const handleLeadWhatsAppClick = () => {
    trackTelemetry('whatsapp');
    fetch(`/api/companies/${company.id}/click`, { method: 'POST' }).catch(() => { });
    const cleanPhone = (company.whatsapp || company.phone || '').replace(/\D/g, '');
    const textMsg = encodeURIComponent(
      `Olá! Encontrei o perfil de ${company.name} no Guia Comercial de Itapoá e gostaria de saber mais informações.`
    );
    window.open(`https://wa.me/55${cleanPhone}?text=${textMsg}`, '_blank');
  };

  const handleProductWhatsAppClick = (productName: string) => {
    trackTelemetry('whatsapp');
    fetch(`/api/companies/${company.id}/click`, { method: 'POST' }).catch(() => { });
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

  const currentCity = cities.find(c => c.id === company.cityId);
  const currentCategory = categories.find(cat => cat.id === company.categoryId);

  // Validação rigorosa da localização cadastrada
  const hasCoords = useMemo(() => {
    const lat = Number(company.latitude);
    const lng = Number(company.longitude);
    return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
  }, [company.latitude, company.longitude]);

  const rawAddress = (company.address || '').trim();
  const hasAddress = rawAddress.length > 3;
  const hasValidLocation = hasCoords || hasAddress;

  const locationQuery = useMemo(() => {
    const cityName = currentCity?.name || 'Itapoá';
    if (hasCoords) {
      return `${company.latitude},${company.longitude}`;
    }
    if (hasAddress) {
      return `${company.name ? company.name + ', ' : ''}${rawAddress}, ${cityName}, SC`;
    }
    return '';
  }, [hasCoords, hasAddress, company.latitude, company.longitude, company.name, rawAddress, currentCity]);

  const embedUrl = useMemo(() => {
    if (!hasValidLocation || !locationQuery) return '';
    return `https://maps.google.com/maps?q=${encodeURIComponent(locationQuery)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  }, [hasValidLocation, locationQuery]);

  const directionsUrl = useMemo(() => {
    if (!hasValidLocation || !locationQuery) return '';
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(locationQuery)}`;
  }, [hasValidLocation, locationQuery]);

  const handleRouteClick = () => {
    if (!hasValidLocation || !directionsUrl) return;
    trackTelemetry('route');
    window.open(directionsUrl, '_blank', 'noopener,noreferrer');
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

  // Empresas recomendadas da mesma categoria ou cidade para preencher a página
  const relatedCompanies = useMemo(() => {
    if (!companies || companies.length === 0) return [];
    return companies
      .filter(c => c.id !== company.id && (c.categoryId === company.categoryId || c.cityId === company.cityId))
      .slice(0, 3);
  }, [companies, company]);

  return (
    <div id="company_detail_container" className="relative w-full min-h-screen bg-slate-50 pb-20">

      {/* 1. CABEÇALHO PANORÂMICO PREMIUM (Conexão contínua com a barra superior, sem faixa branca) */}
      <div className="w-full bg-[#0A0915] border-b border-slate-800/80 pt-2 sm:pt-4 pb-8 sm:pb-10 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <section
            id="detail_cover_header"
            className="group relative w-full min-h-[340px] sm:min-h-[380px] md:min-h-[430px] rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-slate-950 flex flex-col justify-between p-6 sm:p-8 md:p-10"
          >
            {/* Background Image: Capa da empresa - Nítida, iluminada e vívida */}
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-[1.02]"
              style={{
                backgroundImage: `url('${company.coverImage || '/hero-itapoa.jpg'}')`,
              }}
              aria-hidden="true"
            />

            {/* Gradientes equilibrados: foto clara e bem visível, escurecendo apenas a base onde ficam os textos */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/25 to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent pointer-events-none" />

            {/* Top Bar Actions */}
            <div className="relative z-10 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onBack}
                className="px-4 py-2 bg-slate-950/70 hover:bg-slate-900 border border-white/20 text-white font-bold text-xs rounded-full transition flex items-center gap-1.5 backdrop-blur-md cursor-pointer shadow-lg active:scale-95"
              >
                <span>← Voltar ao Guia</span>
              </button>

              <div className="flex items-center gap-2">
                {/* Badges de Plano / Selo */}
                {isDiamond ? (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 border border-amber-300 shadow-md">
                    <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                    <span>PARCEIRO DIAMOND OFICIAL</span>
                  </span>
                ) : isGold ? (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-[#C8102E] to-red-600 text-white border border-red-400 shadow-md">
                    <Zap className="w-3.5 h-3.5 fill-white" />
                    <span>PARCEIRO VIP GOLD</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 backdrop-blur-md shadow-md">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>PERFIL OFICIAL VERIFICADO</span>
                  </span>
                )}

                {!isClaimed && (
                  <button
                    type="button"
                    onClick={() => setShowClaimModal(true)}
                    className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[11px] rounded-full transition flex items-center gap-1.5 shadow-lg active:scale-95 cursor-pointer"
                    title="Esta é sua empresa? Reivindique o perfil e ganhe 7 dias gratuitos"
                  >
                    <Award className="w-3.5 h-3.5 text-slate-950" />
                    <span>Reivindicar Perfil (7 Dias Grátis)</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="p-2.5 bg-slate-950/70 hover:bg-slate-900 border border-white/20 text-white rounded-full transition backdrop-blur-md shadow cursor-pointer active:scale-95"
                  title="Compartilhar Link Oficial"
                  aria-label="Compartilhar"
                >
                  <Share2 className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => onToggleFavorite(company.id)}
                  className="p-2.5 bg-slate-950/70 hover:bg-slate-900 border border-white/20 text-white rounded-full transition backdrop-blur-md shadow cursor-pointer active:scale-95"
                  title="Favoritar Empresa"
                  aria-label="Favoritar"
                >
                  <Heart className={`w-4 h-4 ${isFavorited ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                </button>
              </div>
            </div>

            {/* Bottom Content: Logo, Título, Categoria, Avaliação e CTAs */}
            <div className="relative z-10 pt-8 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                {/* Logo Avatar — foto preenche 100% do quadrado sem fundo branco */}
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 shrink-0 overflow-visible">
                  <div className="h-full w-full overflow-hidden rounded-2xl md:rounded-3xl bg-transparent shadow-2xl">
                    <img
                      src={company.logo || '/logotipo.png'}
                      alt={company.name}
                      className="h-full w-full object-cover object-center"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/logotipo.png';
                      }}
                    />
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white text-[10px] font-bold shadow" title="Empresa Ativa">
                    ✓
                  </span>
                </div>

                {/* Informações Principais */}
                <div className="text-white space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md bg-[#C8102E] text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                      {currentCategory?.name || 'Comércio Local'}
                    </span>
                    <span className="text-xs text-slate-300 font-medium flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-red-400" />
                      {currentCity?.name || 'Itapoá - SC'}
                    </span>
                  </div>

                  <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight drop-shadow-md">
                    {company.name}
                  </h1>

                  {company.description && (
                    <p className="text-xs sm:text-sm text-slate-200 max-w-2xl font-medium leading-relaxed drop-shadow line-clamp-2">
                      {company.description}
                    </p>
                  )}

                  {/* Avaliação e Status */}
                  <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-300">
                    <div className="flex items-center gap-1.5 bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-lg font-black text-xs shadow-sm">
                      <Star className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                      <span>{safeRating > 0 ? safeRating.toFixed(1) : '5.0'}</span>
                    </div>
                    <span className="font-semibold text-slate-200">
                      ({reviews.length} {reviews.length === 1 ? 'avaliação' : 'avaliações no portal'})
                    </span>
                    <span className="text-slate-400 hidden sm:inline">•</span>
                    <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Canal Oficial Aberto
                    </span>
                  </div>
                </div>
              </div>

              {/* Ações Rápidas de Contato */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleLeadWhatsAppClick}
                  className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-[#C8102E] to-[#990B22] hover:from-[#990B22] hover:to-[#7A081B] text-white font-black text-xs sm:text-sm tracking-wider uppercase rounded-xl transition flex items-center justify-center gap-2 shadow-xl shadow-red-900/25 active:scale-95 cursor-pointer"
                >
                  <Phone className="w-4 h-4 fill-white text-white" />
                  <span>Conversar no WhatsApp</span>
                </button>

                {company.phone && (
                  <button
                    type="button"
                    onClick={handlePhoneClick}
                    className="w-full sm:w-auto px-4 py-3.5 bg-slate-900/80 hover:bg-slate-800 text-white border border-white/20 font-bold text-xs sm:text-sm rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer backdrop-blur-md shadow-md active:scale-95"
                  >
                    <span>Ligar</span>
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* 2. BARRA DE NAVEGAÇÃO DE ABAS */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-8">
        <div className="flex border-b border-slate-200 gap-4 md:gap-8 mb-8 overflow-x-auto whitespace-nowrap scrollbar-none">
          <button
            onClick={() => setActiveTab('info')}
            className={`pb-4 text-sm font-bold transition inline-flex items-center gap-2 border-b-2 cursor-pointer ${activeTab === 'info' ? 'border-[#C8102E] text-[#C8102E] font-black' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
          >
            <span>Informações Gerais</span>
          </button>

          {/* Catálogo de Produtos: apenas Gold e Diamond */}
          {!isBronze && (
            <button
              onClick={() => setActiveTab('products')}
              className={`pb-4 text-sm font-bold transition inline-flex items-center gap-2 border-b-2 cursor-pointer ${activeTab === 'products' ? 'border-[#C8102E] text-[#C8102E] font-black' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Catálogo ({safeProducts.length})</span>
            </button>
          )}

          {/* Cupons e Promoções: apenas Gold e Diamond */}
          {!isBronze && coupons.length > 0 && (
            <button
              onClick={() => setActiveTab('coupons')}
              className={`pb-4 text-sm font-bold transition inline-flex items-center gap-2 border-b-2 cursor-pointer ${activeTab === 'coupons' ? 'border-[#C8102E] text-[#C8102E] font-black' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
            >
              <Tag className="w-4 h-4 text-amber-500" />
              <span>Promoções Ativas ({coupons.length})</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-4 text-sm font-bold transition inline-flex items-center gap-2 border-b-2 cursor-pointer ${activeTab === 'reviews' ? 'border-[#C8102E] text-[#C8102E] font-black' : 'border-transparent text-slate-500 hover:text-slate-800'
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
                <div className="p-6 md:p-8 bg-white border border-slate-200/90 rounded-3xl shadow-sm">
                  <div className="flex items-center gap-2.5 mb-4">
                    <Sparkles className="w-5 h-5 text-[#C8102E]" />
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Sobre o Estabelecimento</h3>
                  </div>
                  <p className="text-slate-700 leading-relaxed text-sm sm:text-base whitespace-pre-line font-medium">
                    {company.detailedDescription || company.description || 'Estabelecimento cadastrado e atuante no município de Itapoá SC.'}
                  </p>

                  {/* Destaques / Diferenciais */}
                  <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-slate-100">
                    {(safeFeatures.length > 0 ? safeFeatures : [
                      'Atendimento Oficial em Itapoá',
                      'Canal Direto de WhatsApp',
                      'Estabelecimento Cadastrado',
                      'Segurança e Privacidade LGPD'
                    ]).map((feat, idx) => (
                      <span key={idx} className="bg-slate-100 text-slate-700 text-xs px-3.5 py-1.5 rounded-xl font-bold flex items-center gap-1.5 border border-slate-200/60 shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{feat}</span>
                      </span>
                    ))}
                  </div>
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
                            <span className="text-[#C8102E]">Q.</span> {faq.question}
                          </h4>
                          <p className="text-xs text-slate-600 leading-relaxed">{faq.answer}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Card de Apoio Comunitário e Avaliação */}
                <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-slate-800 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-800 text-[10px] font-black uppercase tracking-wider">
                      <Star className="w-3 h-3 fill-red-400" />
                      <span>AVALIAÇÃO VERIFICADA</span>
                    </div>
                    <h4 className="text-lg font-black tracking-tight">Você conhece ou já utilizou os serviços desta empresa?</h4>
                    <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                      Sua avaliação no Itapoá Online ajuda moradores e turistas a escolherem os melhores parceiros e fortalece o comércio da nossa cidade.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('reviews')}
                    className="px-6 py-3 bg-[#C8102E] hover:bg-red-700 text-white font-bold text-xs rounded-xl transition shrink-0 shadow-lg cursor-pointer active:scale-95"
                  >
                    Deixar Avaliação
                  </button>
                </div>

                {/* Outras Empresas Recomendadas (Preenche todo o espaço faltante com valor real!) */}
                {relatedCompanies.length > 0 && (
                  <div className="p-6 md:p-8 bg-white border border-slate-200/90 rounded-3xl shadow-sm space-y-5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-[10px] font-black text-[#C8102E] uppercase tracking-wider">CONEXÕES LOCAIS</span>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight">Outras Empresas e Serviços em Destaque</h3>
                      </div>
                      <span className="text-xs font-bold text-slate-400">Itapoá - SC</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {relatedCompanies.map((rel) => (
                        <div
                          key={rel.id}
                          onClick={() => onNavigateCompany && onNavigateCompany(rel.slug)}
                          className="group p-3.5 rounded-2xl border border-slate-200/80 hover:border-[#C8102E]/40 hover:shadow-lg transition-all duration-300 bg-slate-50/50 hover:bg-white cursor-pointer flex flex-col justify-between"
                        >
                          <div className="space-y-2.5">
                            <div className="w-full h-28 rounded-xl overflow-hidden bg-slate-200 relative">
                              <img
                                src={rel.coverImage || rel.logo || '/hero-itapoa.jpg'}
                                alt={rel.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src = '/hero-itapoa.jpg';
                                }}
                              />
                              <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-white text-[9px] font-bold">
                                {categories.find(c => c.id === rel.categoryId)?.name || 'Comércio'}
                              </span>
                            </div>
                            <div>
                              <h4 className="font-bold text-sm text-slate-900 group-hover:text-[#C8102E] transition line-clamp-1">
                                {rel.name}
                              </h4>
                              <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">
                                {rel.description || 'Atendimento em Itapoá SC.'}
                              </p>
                            </div>
                          </div>
                          <div className="pt-3 mt-2 border-t border-slate-200/60 flex items-center justify-between text-xs font-bold text-[#C8102E]">
                            <span>Ver perfil completo</span>
                            <span>→</span>
                          </div>
                        </div>
                      ))}
                    </div>
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
                              className="px-3 py-1.5 bg-red-50 hover:bg-[#C8102E] text-[#C8102E] hover:text-white border border-red-200 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
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

            {/* Box de Contato Direto & WhatsApp */}
            <div className="p-6 bg-white border border-slate-200/90 rounded-3xl shadow-sm flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#C8102E] block mb-2">
                Canal Oficial de Atendimento
              </span>
              <h3 className="text-base font-black text-slate-900 mb-4">Contato Direto</h3>

              <div className="space-y-4 text-xs text-slate-700">

                {/* Botão de WhatsApp */}
                <button
                  type="button"
                  onClick={handleLeadWhatsAppClick}
                  className="w-full py-3.5 bg-gradient-to-r from-[#C8102E] to-[#990B22] hover:from-[#990B22] hover:to-[#7A081B] text-white font-black text-xs tracking-wider uppercase rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-red-900/20 transition cursor-pointer active:scale-95"
                >
                  <Phone className="w-4 h-4 fill-white text-white" />
                  <span>Conversar no WhatsApp</span>
                </button>

                {company.hours && (
                  <div className="flex gap-3 pt-2">
                    <Clock className="w-4 h-4 text-[#C8102E] shrink-0 mt-0.5" />
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
                      className="w-full mt-1 py-2 px-3 bg-red-50 hover:bg-red-100 text-[#C8102E] font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 border border-red-200 cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Como Chegar (Traçar Rota no Mapa)</span>
                    </button>
                  </div>
                )}

                {company.phone && (
                  <div className="flex gap-3 pt-1 border-t border-slate-100">
                    <Phone className="w-4 h-4 text-[#C8102E] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-900 block">Telefone de Contato</span>
                      <button
                        type="button"
                        onClick={handlePhoneClick}
                        className="text-[#C8102E] hover:underline font-semibold text-left p-0 bg-transparent border-none cursor-pointer"
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
                      <a href={company.website} target="_blank" rel="noreferrer" className="text-[#C8102E] hover:underline">
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

            {/* Mapa de Localização Oficial Contextualizado */}
            {hasValidLocation ? (
              <div className="w-full rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-white relative flex flex-col">
                <div className="w-full h-52 relative bg-slate-100 overflow-hidden">
                  <iframe
                    title={`Mapa de localização de ${company.name}`}
                    src={embedUrl}
                    className="w-full h-full border-0"
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>

                <div className="p-4 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 truncate">
                      <MapPin className="w-3.5 h-3.5 text-[#C8102E] shrink-0" />
                      <span className="truncate">{company.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-sans truncate mt-0.5">
                      {company.address || `${currentCity?.name || 'Itapoá'} - SC`}
                    </p>
                  </div>

                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackTelemetry('route')}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#C8102E] hover:bg-[#A00D24] text-white text-[11px] font-bold shadow-sm transition shrink-0 cursor-pointer"
                    title="Abrir rota no Google Maps em nova aba"
                  >
                    <span>Ver rota</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="w-full rounded-3xl border border-dashed border-slate-300 p-6 bg-slate-50 flex flex-col items-center justify-center text-center gap-2">
                <div className="w-10 h-10 rounded-full bg-slate-200/80 flex items-center justify-center text-slate-500">
                  <MapPin className="w-5 h-5 text-slate-400" />
                </div>
                <h4 className="text-xs font-bold text-slate-700">Localização ainda não cadastrada</h4>
                <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                  Este estabelecimento ainda não cadastrou o endereço físico completo no guia.
                </p>
                {currentUserId && (
                  <span className="text-[10px] text-indigo-600 font-semibold mt-1">
                    Responsável pela empresa? Atualize o endereço no Painel do Lojista.
                  </span>
                )}
              </div>
            )}

            {/* Selo Oficial de Verificação do Portal */}
            <div className="p-5 bg-gradient-to-br from-slate-900 to-slate-950 text-white border border-slate-800 rounded-3xl shadow-sm space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[9px] font-black uppercase tracking-wider text-emerald-400">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>PORTAL SEGURO SSL VERIFICADO</span>
              </div>
              <h4 className="text-xs font-bold text-white">Canal Direto de Atendimento</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Todas as conexões no Itapoá Online conectam você diretamente ao responsável pelo estabelecimento, sem comissões ou taxas ocultas.
              </p>
            </div>

          </aside>

        </div>
      </div>

      {/* MODAL DE REIVINDICAÇÃO DE PERFIL COM CAMPANHA 7 DIAS GRÁTIS */}
      <AnimatePresence>
        {showClaimModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-white shadow-2xl space-y-6 relative"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950">
                    <Award className="w-3.5 h-3.5 fill-slate-950" />
                    <span>Campanha Guia Itapoá 7 Dias</span>
                  </div>
                  <h3 className="text-xl font-black text-white">Reivindicar Perfil Comercial</h3>
                  <p className="text-xs text-slate-400">
                    {company.name} — Itapoá/SC
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowClaimModal(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {claimSuccessMessage ? (
                <div className="p-4 bg-emerald-950/80 border border-emerald-500/50 rounded-2xl text-center space-y-3">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <h4 className="text-sm font-bold text-emerald-200">{claimSuccessMessage}</h4>
                  <p className="text-xs text-slate-300">
                    Seu perfil já está habilitado com os benefícios completos do período de teste de 7 dias sem qualquer cobrança.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowClaimModal(false);
                      window.location.reload();
                    }}
                    className="w-full py-2.5 bg-[#C8102E] hover:bg-[#A00D24] text-white font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Ir para Minha Empresa
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!claimName || !claimPhone) {
                      alert('Por favor, informe seu nome e telefone comercial.');
                      return;
                    }
                    if (!claimTermsAccepted) {
                      alert('É obrigatório aceitar os termos da campanha promocional de 7 dias.');
                      return;
                    }

                    const token = localStorage.getItem('itpoa_auth_token');
                    if (!token) {
                      alert('Para reivindicar este perfil com segurança, faça login ou cadastre-se no portal primeiro.');
                      return;
                    }

                    setClaimLoading(true);
                    try {
                      const res = await fetch(`/api/companies/${company.id}/claim`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                          responsibleName: claimName,
                          responsiblePhone: claimPhone,
                          documentNumber: claimDocument,
                          acceptCampaignTerms: true
                        })
                      });
                      const data = await res.json();
                      if (!res.ok) {
                        throw new Error(data.error || 'Erro ao reivindicar perfil.');
                      }
                      setClaimSuccessMessage(data.message || 'Perfil reivindicado com sucesso!');
                    } catch (err: any) {
                      alert(err.message || 'Falha na reivindicação do perfil.');
                    } finally {
                      setClaimLoading(false);
                    }
                  }}
                  className="space-y-4"
                >
                  <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-2xl text-xs text-slate-300 space-y-1">
                    <p className="font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Regras da Campanha Promocional:
                    </p>
                    <ul className="list-disc list-inside text-[11px] text-slate-400 space-y-0.5">
                      <li>7 dias corridos gratuitos com recursos VIP (degustação).</li>
                      <li>Sem necessidade de cartão de crédito.</li>
                      <li>Sem renovação automática ou cobrança surpresa ao término.</li>
                    </ul>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300">Seu Nome Completo (Responsável)</label>
                    <input
                      type="text"
                      value={claimName}
                      onChange={(e) => setClaimName(e.target.value)}
                      placeholder="Ex: João da Silva"
                      required
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">Telefone / WhatsApp Comercial</label>
                      <input
                        type="text"
                        value={claimPhone}
                        onChange={(e) => setClaimPhone(e.target.value)}
                        placeholder="Ex: (47) 99999-9999"
                        required
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">CNPJ ou CPF (Opcional)</label>
                      <input
                        type="text"
                        value={claimDocument}
                        onChange={(e) => setClaimDocument(e.target.value)}
                        placeholder="Documento para verificação"
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <label className="flex items-start gap-2 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={claimTermsAccepted}
                      onChange={(e) => setClaimTermsAccepted(e.target.checked)}
                      className="mt-0.5 rounded border-slate-700 text-amber-500 focus:ring-0"
                    />
                    <span className="text-[11px] text-slate-300">
                      Declaro ser o proprietário ou representante legal desta empresa e aceito participar da campanha promocional de 7 dias gratuitos no portal Itapoá Online.
                    </span>
                  </label>

                  <div className="flex items-center justify-end gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowClaimModal(false)}
                      className="px-4 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800 transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={claimLoading}
                      className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs transition flex items-center gap-1.5 shadow-lg active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      {claimLoading ? (
                        <span>Validando...</span>
                      ) : (
                        <>
                          <Award className="w-3.5 h-3.5" />
                          <span>Confirmar e Ativar 7 Dias Grátis</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
