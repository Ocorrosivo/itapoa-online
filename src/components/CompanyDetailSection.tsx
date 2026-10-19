/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * CompanyDetailSection — defensive rendering for companies returned without
 * products/faqs arrays and with rating/features as strings.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Phone, Share2, Star, Clock, MapPin, Globe, Sparkles,
  Send, Bot, Heart, User, Filter, ArrowUpDown, Search
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

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
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
  const safeRating = toNumber((company as any).rating, 0);
  const safeFeatures = featureArray((company as any).features);
  const safeProducts: ProductOrService[] = Array.isArray((company as any).products) ? (company as any).products : [];
  const safeFaqs: FAQItem[] = Array.isArray((company as any).faqs) ? (company as any).faqs : [];

  const [activeTab, setActiveTab] = useState<'info' | 'products' | 'reviews'>('info');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewAuthor, setNewReviewAuthor] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [sortOption, setSortOption] = useState<'recent' | 'oldest' | 'highest' | 'lowest'>('recent');
  const [reviewsSearch, setReviewsSearch] = useState<string>('');

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

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [userInputMessage, setUserInputMessage] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const [activeGalleryIdx, setActiveGalleryIdx] = useState(0);

  const CATEGORY_GALLERY_IMAGES: Record<string, string[]> = useMemo(() => ({
    cat_gastronomia: [
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
    ],
    cat_hospedagem: [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=800&q=80',
    ],
    cat_servicos: [
      'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80',
    ],
    cat_saude: [
      'https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=800&q=80',
    ],
    cat_comercio: [
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80',
    ],
    cat_construcao: [
      'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800&q=80',
    ]
  }), []);

  const galleryImages = useMemo(() => {
    const images: string[] = [];
    if (company.coverImage) images.push(company.coverImage);
    if (company.logo) images.push(company.logo);
    if (safeProducts.length > 0) {
      safeProducts.forEach(p => {
        if (p.imageUrl) images.push(p.imageUrl);
      });
    }
    const catImgs = CATEGORY_GALLERY_IMAGES[company.categoryId] || [];
    images.push(...catImgs);
    return Array.from(new Set(images.filter(Boolean)));
  }, [company.coverImage, company.logo, company.categoryId, safeProducts, CATEGORY_GALLERY_IMAGES]);

  const handleNextGallery = () => {
    setActiveGalleryIdx(prev => (prev + 1) % galleryImages.length);
  };

  const handlePrevGallery = () => {
    setActiveGalleryIdx(prev => (prev - 1 + galleryImages.length) % galleryImages.length);
  };

  useEffect(() => {
    const originalTitle = document.title;
    document.title = `${company.name} | Guia Local Premium de Itapoá`;

    const setMetaTag = (nameAttr: string, valueAttr: string, content: string) => {
      let el = document.querySelector(`meta[${nameAttr}="${valueAttr}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(nameAttr, valueAttr);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMetaTag('name', 'description', company.description || `${company.name} - Encontre serviços, contatos e localização em Itapoá.`);
    setMetaTag('property', 'og:title', `${company.name} | Guia Local Itapoá`);
    setMetaTag('property', 'og:description', company.description || '');
    setMetaTag('property', 'og:image', company.coverImage || company.logo || '');
    setMetaTag('property', 'og:url', window.location.href);
    setMetaTag('property', 'og:type', 'business.business');

    let schemaScript = document.getElementById('company-jsonld') as HTMLScriptElement;
    if (!schemaScript) {
      schemaScript = document.createElement('script');
      schemaScript.id = 'company-jsonld';
      schemaScript.type = 'application/ld+json';
      document.head.appendChild(schemaScript);
    }

    const schemaData = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "name": company.name,
      "description": company.description,
      "image": [company.logo, company.coverImage].filter(Boolean),
      "telephone": company.phone,
      "address": {
        "@type": "PostalAddress",
        "streetAddress": company.address,
        "addressLocality": "Itapoá",
        "addressRegion": "SC",
        "addressCountry": "BR"
      },
      "geo": company.latitude && company.longitude ? {
        "@type": "GeoCoordinates",
        "latitude": company.latitude,
        "longitude": company.longitude
      } : undefined,
      "url": window.location.href,
      "openingHoursSpecification": {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        "opens": "08:00",
        "closes": "18:00"
      }
    };
    schemaScript.textContent = JSON.stringify(schemaData, null, 2);

    return () => {
      document.title = originalTitle;
      const scriptToRemove = document.getElementById('company-jsonld');
      if (scriptToRemove) scriptToRemove.remove();
    };
  }, [company]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/reviews?entityId=${company.id}&entityType=company`)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (cancelled) return;
        const list = Array.isArray(data) ? data : arrayFromPayload(data);
        setReviews(list);
      })
      .catch(() => {
        if (!cancelled) setReviews([]);
      });

    setChatMessages([
      {
        id: 'start',
        role: 'model',
        text: `Olá! Sou o assistente virtual inteligente do **${company.name}**. Posso tirar dúvidas sobre nosso horário de funcionamento (${company.hours}), localização, cardápio/serviços e muito mais! Como posso ajudar você hoje?`
      }
    ]);
    return () => { cancelled = true; };
  }, [company.id, company.name, company.hours]);

  const handleLeadWhatsAppClick = () => {
    fetch(`/api/companies/${company.id}/click`, { method: 'POST' })
      .then(res => {
        if (!res.ok) throw new Error(String(res.status));
      })
      .catch(() => {})
      .finally(() => {
        window.open(`https://wa.me/${company.whatsapp}?text=Olá! Encontrei você no Guia Local Premium de Itapoá e gostaria de saber mais informações.`, '_blank');
      });
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
        userName: newReviewAuthor,
        rating: newReviewRating,
        comment: newReviewComment
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
      })
      .catch(() => {});
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInputMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: `m_${Date.now()}`,
      role: 'user',
      text: userInputMessage
    };

    setChatMessages(prev => [...prev, userMessage]);
    setUserInputMessage('');
    setIsAiTyping(true);

    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyId: company.id,
          message: userMessage.text,
          conversationHistory: chatMessages.slice(-8)
        })
      });

      const data = await resp.json();
      const aiReply: ChatMessage = {
        id: `ai_${Date.now()}`,
        role: 'model',
        text: data.text
      };

      setChatMessages(prev => [...prev, aiReply]);
    } catch (err) {
      console.error('AI chat failed', err);
      setChatMessages(prev => [...prev, {
        id: `err_${Date.now()}`,
        role: 'model',
        text: 'Desculpe, tive um probleminha no sistema. Que tal falar diretamente com nossa equipe no WhatsApp?'
      }]);
    } finally {
      setIsAiTyping(false);
    }
  };

  const currentCity = cities.find(c => c.id === company.cityId);
  const currentCategory = categories.find(cat => cat.id === company.categoryId);

  return (
    <div id="company_detail_container" className="relative w-full min-h-screen bg-slate-50 pb-20">

      <section id="detail_cover" className="relative w-full h-[350px] bg-slate-900 overflow-hidden">
        <img
          src={company.coverImage}
          alt={company.name}
          className="w-full h-full object-cover opacity-70"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/10 to-transparent" />

        <div className="absolute top-6 left-6 right-6 flex items-center justify-between z-10">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 bg-slate-950/70 border border-white/10 text-white font-semibold text-xs rounded-full hover:bg-slate-950/90 transition flex items-center gap-1.5 backdrop-blur shadow cursor-pointer"
          >
            ← Voltar para o Guia
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="p-2.5 bg-slate-950/70 border border-white/10 text-white rounded-full hover:bg-slate-950/95 transition backdrop-blur shadow cursor-pointer"
              title="Copiar Link da Empresa"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onToggleFavorite(company.id)}
              className="p-2.5 bg-slate-950/70 border border-white/10 text-white rounded-full hover:bg-slate-950/95 transition backdrop-blur shadow cursor-pointer"
            >
              <Heart className={`w-4 h-4 ${isFavorited ? 'fill-red-500 text-red-500' : 'text-white'}`} />
            </button>
          </div>
        </div>

        <div className="absolute bottom-6 left-6 right-6 z-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="flex gap-4 items-center">
            <img
              src={company.logo}
              alt={company.name}
              className="w-16 h-16 md:w-20 md:h-20 rounded-3xl object-cover border-2 border-white shadow-lg bg-white shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="text-white">
              <span className="text-xs font-semibold text-teal-400 uppercase tracking-widest flex items-center gap-1">
                {currentCategory?.name} • {currentCity?.name}
              </span>
              <h1 className="text-xl md:text-3xl font-sans font-black tracking-tight mt-1">{company.name}</h1>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1 bg-amber-500 text-slate-950 px-2 py-0.5 rounded text-xs font-bold">
                  <Star className="w-3.5 h-3.5 fill-slate-950 text-slate-950" /> {safeRating.toFixed(1)}
                </div>
                <span className="text-xs text-slate-300">({toNumber(company.reviewCount, 0)} avaliações autorizadas)</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={handleLeadWhatsAppClick}
              className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs md:text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-emerald-500/10 cursor-pointer active:scale-95 shrink-0"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-slate-950">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.731-1.456L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.864-9.864.002-2.637-1.03-5.114-2.906-6.99C16.554 1.874 14.082.84 11.45.84 6.01.84 1.585 5.265 1.581 10.7a9.81 9.81 0 001.448 4.966l-.1.597-1.002 3.655 3.743-.981.577.342z" />
              </svg>
              Chamar no WhatsApp
            </button>

            <button
              type="button"
              onClick={() => window.open(`tel:${company.phone}`, '_self')}
              className="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs md:text-sm rounded-xl transition flex items-center justify-center gap-2 shadow-md shadow-blue-500/10 cursor-pointer active:scale-95 shrink-0"
            >
              <Phone className="w-4 h-4 fill-white" />
              Ligar Agora
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className={`px-5 py-3 rounded-xl font-bold text-xs md:text-sm transition flex items-center justify-center gap-2 border shadow-sm cursor-pointer active:scale-95 shrink-0 ${copiedLink ? 'bg-emerald-550 border-emerald-550 text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
            >
              <Share2 className="w-4 h-4" />
              {copiedLink ? '✓ Link Copiado!' : 'Compartilhar Link'}
            </button>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 md:px-8 mt-10">
        <div className="flex border-b border-slate-200 gap-4 md:gap-8 mb-8 overflow-x-auto whitespace-nowrap scrollbar-none">
          <button
            onClick={() => setActiveTab('info')}
            className={`pb-4 text-sm font-semibold transition inline-flex items-center gap-2 border-b-2 cursor-pointer ${activeTab === 'info' ? 'border-bold border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            Informações Gerais
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`pb-4 text-sm font-semibold transition inline-flex items-center gap-2 border-b-2 cursor-pointer ${activeTab === 'products' ? 'border-bold border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            Produtos / Serviços <span className="text-xs px-2 py-0.5 bg-slate-100 rounded text-slate-500 font-normal">{safeProducts.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-4 text-sm font-semibold transition inline-flex items-center gap-2 border-b-2 cursor-pointer ${activeTab === 'reviews' ? 'border-bold border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            Avaliações do Público <span className="text-xs px-2 py-0.5 bg-slate-100 rounded text-slate-500 font-normal">{reviews.length}</span>
          </button>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">

          <main className="flex-1 flex flex-col gap-8">
            {activeTab === 'info' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col gap-8"
              >
                <div className="p-6 md:p-8 bg-white border border-slate-200 rounded-3xl shadow-sm">
                  <h3 className="text-lg font-sans font-bold text-slate-900 mb-4">Sobre Nós</h3>
                  <p className="text-slate-600 leading-relaxed font-sans text-sm block whitespace-pre-line">
                    {company.detailedDescription || company.description}
                  </p>

                  {safeFeatures.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-8">
                      {safeFeatures.map((feat, idx) => (
                        <span key={idx} className="bg-slate-100 text-slate-700 text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1">
                          ✓ {feat}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {galleryImages.length > 0 && (
                  <div className="p-6 md:p-8 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col">
                    <h3 className="text-lg font-sans font-bold text-slate-900 mb-2">Galeria de Fotos</h3>
                    <p className="text-xs text-slate-500 mb-6 font-sans">Conheça as instalações e produtos oficiais de {company.name}</p>

                    <div className="relative w-full h-[240px] md:h-[380px] bg-slate-900 rounded-2xl overflow-hidden group shadow-md">
                      <AnimatePresence mode="wait">
                        <motion.img
                          key={activeGalleryIdx}
                          src={galleryImages[activeGalleryIdx]}
                          alt={`Galeria ${activeGalleryIdx + 1}`}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.25 }}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </AnimatePresence>

                      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent pointer-events-none" />

                      {galleryImages.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={handlePrevGallery}
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/45 backdrop-blur-md text-white hover:bg-black/65 transition flex items-center justify-center cursor-pointer select-none border border-white/10 z-10 font-bold"
                          >
                            ◀
                          </button>
                          <button
                            type="button"
                            onClick={handleNextGallery}
                            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/45 backdrop-blur-md text-white hover:bg-black/65 transition flex items-center justify-center cursor-pointer select-none border border-white/10 z-10 font-bold"
                          >
                            ▶
                          </button>
                        </>
                      )}

                      <div className="absolute top-4 right-4 bg-black/65 backdrop-blur-md px-3 py-1 rounded-full text-white text-[10px] font-bold uppercase tracking-wider border border-white/15">
                        {activeGalleryIdx + 1} / {galleryImages.length}
                      </div>
                    </div>

                    {galleryImages.length > 1 && (
                      <div className="flex justify-center gap-1.5 mt-4">
                        {galleryImages.map((_, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setActiveGalleryIdx(idx)}
                            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 cursor-pointer ${activeGalleryIdx === idx ? 'w-6 bg-blue-600' : 'bg-slate-300 hover:bg-slate-400'}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {safeFaqs.length > 0 && (
                  <div className="p-6 md:p-8 bg-white border border-slate-200 rounded-3xl shadow-sm">
                    <h3 className="text-lg font-sans font-bold text-slate-900 mb-6">Perguntas Frequentes</h3>
                    <div className="flex flex-col gap-4">
                      {safeFaqs.map(faq => (
                        <div key={faq.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                          <h4 className="font-bold text-sm text-slate-900 mb-2 font-sans flex items-center gap-1.5">
                            Q. {faq.question}
                          </h4>
                          <p className="text-xs text-slate-600 leading-relaxed font-sans">{faq.answer}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'products' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-6 md:p-8 bg-white border border-slate-200 rounded-3xl shadow-sm"
              >
                <h3 className="text-lg font-sans font-bold text-slate-900 mb-6">Menu de Serviços / Catálogo</h3>
                {safeProducts.length === 0 ? (
                  <div className="text-center p-12 text-slate-400">
                    Nenhum produto em catálogo adicionado até o momento.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {safeProducts.map(p => (
                      <div key={p.id} className="flex gap-4 p-4 rounded-2xl border border-slate-100 bg-slate-50 group hover:border-slate-200 transition">
                        {p.imageUrl && (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="w-20 h-20 rounded-xl object-cover border shrink-0 bg-white"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <div className="flex-1 flex flex-col justify-between">
                          <div>
                            <h4 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition truncate">{p.name}</h4>
                            <p className="text-xs text-slate-500 line-clamp-2 mt-1">{p.description}</p>
                          </div>
                          {p.price != null && Number(p.price) > 0 && (
                            <span className="text-sm font-sans font-bold text-blue-600 mt-2 block">R$ {Number(p.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'reviews' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col gap-8"
              >
                <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col">

                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6 mb-6">
                    <div>
                      <h3 className="text-lg font-sans font-bold text-slate-900 leading-tight">Últimos Depoimentos</h3>
                      <p className="text-xs text-slate-500 mt-1">
                        Mostrando {filteredAndSortedReviews.length} de {reviews.length} avaliações
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full md:w-auto">

                      <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl focus-within:border-blue-400 focus-within:bg-white transition flex-1 sm:w-44">
                        <Search className="absolute left-3 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Buscar no comentário..."
                          value={reviewsSearch}
                          onChange={(e) => setReviewsSearch(e.target.value)}
                          className="w-full py-2 pl-9 pr-3 bg-transparent text-slate-900 text-xs focus:outline-none placeholder:text-slate-400"
                        />
                        {reviewsSearch && (
                          <button
                            type="button"
                            onClick={() => setReviewsSearch('')}
                            className="absolute right-3 text-slate-400 hover:text-slate-600 font-sans text-[10px]"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl focus-within:border-blue-400 focus-within:bg-white transition sm:w-36 shrink-0">
                        <Filter className="absolute left-3 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        <select
                          value={ratingFilter}
                          onChange={(e) => setRatingFilter(e.target.value)}
                          className="w-full py-2.5 pl-9 pr-3 bg-transparent text-slate-900 text-xs font-semibold focus:outline-none appearance-none cursor-pointer"
                        >
                          <option value="all">Todas as Notas</option>
                          <option value="5">⭐⭐⭐⭐⭐ 5</option>
                          <option value="4">⭐⭐⭐⭐ 4</option>
                          <option value="3">⭐⭐⭐ 3</option>
                          <option value="2">⭐⭐ 2</option>
                          <option value="1">⭐ 1</option>
                        </select>
                      </div>

                      <div className="relative flex items-center bg-slate-50 border border-slate-200 rounded-xl focus-within:border-blue-400 focus-within:bg-white transition sm:w-40 shrink-0">
                        <ArrowUpDown className="absolute left-3 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        <select
                          value={sortOption}
                          onChange={(e) => setSortOption(e.target.value as any)}
                          className="w-full py-2.5 pl-9 pr-3 bg-transparent text-slate-900 text-xs font-semibold focus:outline-none appearance-none cursor-pointer"
                        >
                          <option value="recent">Mais Recentes</option>
                          <option value="oldest">Mais Antigos</option>
                          <option value="highest">Maior Nota</option>
                          <option value="lowest">Menor Nota</option>
                        </select>
                      </div>

                    </div>
                  </div>

                  {filteredAndSortedReviews.length === 0 ? (
                    <div className="text-center p-12 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      Nenhum depoimento condiz com os filtros aplicados.
                      {(reviewsSearch || ratingFilter !== 'all') && (
                        <button
                          type="button"
                          onClick={() => { setReviewsSearch(''); setRatingFilter('all'); }}
                          className="block mx-auto mt-3 text-xs text-blue-600 hover:underline font-bold"
                        >
                          Limpar Filtros
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-6 divider-y divide-slate-100">
                      {filteredAndSortedReviews.map(rev => (
                        <div key={rev.id} className="flex gap-4 items-start pb-6 border-b last:border-0 border-slate-100">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700 shrink-0">
                            {rev.userAvatar ? <img src={rev.userAvatar} className="w-full h-full rounded-full object-cover" /> : <User className="w-5 h-5" />}
                          </div>
                          <div className="flex-1 flex flex-col bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-1">
                              <span className="text-xs font-bold text-slate-900 font-sans">{rev.userName}</span>
                              <div className="flex items-center gap-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star key={i} className={`w-3 h-3 ${i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} />
                                ))}
                              </div>
                            </div>
                            <p className="text-xs text-slate-600 font-sans mt-2 whitespace-pre-wrap">{rev.comment}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm">
                  <h3 className="text-lg font-sans font-bold text-slate-900 mb-4">Deixar sua Recomendação</h3>
                  <form onSubmit={handleReviewSubmit} className="flex flex-col gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-500 mb-2 block">Seu Nome</label>
                        <input
                          type="text"
                          required
                          value={newReviewAuthor}
                          onChange={(e) => setNewReviewAuthor(e.target.value)}
                          placeholder="Digite seu nome real..."
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-400"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-500 mb-2 block">Sua Nota</label>
                        <select
                          value={newReviewRating}
                          onChange={(e) => setNewReviewRating(Number(e.target.value))}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-400 font-sans font-semibold text-slate-700"
                        >
                          <option value="5">⭐⭐⭐⭐⭐ Excelente 5/5</option>
                          <option value="4">⭐⭐⭐⭐ Muito Bom 4/5</option>
                          <option value="3">⭐⭐⭐ Regular 3/5</option>
                          <option value="2">⭐⭐ Ruim 2/5</option>
                          <option value="1">⭐ Péssimo 1/5</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-500 mb-2 block">Seu Comentário ou Crítica Construtiva</label>
                      <textarea
                        rows={4}
                        required
                        value={newReviewComment}
                        onChange={(e) => setNewReviewComment(e.target.value)}
                        placeholder="Escreva sobre sua experiência geral no local..."
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-blue-400"
                      />
                    </div>

                    <button
                      type="submit"
                      className="py-3 px-6 bg-slate-950 text-white hover:bg-slate-850 font-semibold text-xs rounded-xl self-end transition cursor-pointer"
                    >
                      Enviar Depoimento Certificado
                    </button>
                  </form>
                </div>
              </motion.div>
            )}
          </main>

          <aside className="w-full lg:w-80 shrink-0 flex flex-col gap-6">
            <div className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Informações de Contato</h3>
              <div className="flex flex-col gap-4 text-xs text-slate-700 font-sans">
                <div className="flex gap-3">
                  <Clock className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 block mb-1">Horário de Funcionamento</span>
                    {company.hours}
                  </div>
                </div>

                <div className="flex gap-3">
                  <MapPin className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 block mb-1">Endereço Completo</span>
                    {company.address}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Phone className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-900 block mb-1">Telefone Fixo</span>
                    {company.phone}
                  </div>
                </div>

                {company.website && (
                  <div className="flex gap-3">
                    <Globe className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-900 block mb-1">Sítio Oficial</span>
                      <a href={company.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{company.website.replace('https://', '')}</a>
                    </div>
                  </div>
                )}

                {company.instagram && (
                  <div className="flex gap-3">
                    <span className="text-base text-pink-500 shrink-0 -mt-0.5 select-none">📸</span>
                    <div>
                      <span className="font-bold text-slate-900 block mb-1">Instagram</span>
                      <a href={`https://instagram.com/${company.instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="text-pink-600 hover:underline font-semibold">{company.instagram}</a>
                    </div>
                  </div>
                )}

                {company.facebook && (
                  <div className="flex gap-3">
                    <span className="text-base text-blue-600 shrink-0 -mt-0.5 select-none">👥</span>
                    <div>
                      <span className="font-bold text-slate-900 block mb-1">Facebook</span>
                      <a href={`https://facebook.com/${company.facebook}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-semibold">{company.facebook}</a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="w-full rounded-3xl overflow-hidden border border-slate-200 shadow-sm relative h-52 bg-blue-100 flex items-center justify-center">
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=600&q=80')` }} />
              <div className="absolute inset-0 bg-slate-900/40" />
              <div className="relative z-10 flex flex-col items-center gap-2 p-4 text-center">
                <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white font-bold text-sm animate-bounce shadow">
                  📍
                </div>
                <span className="text-white font-sans text-xs font-bold drop-shadow">{company.name}</span>
                <span className="text-slate-200 font-sans text-[10px] drop-shadow">{company.address}</span>
              </div>
            </div>

            <div onClick={() => setIsChatOpen(true)} className="p-4 bg-gradient-to-br from-indigo-650 from-blue-600 to-indigo-600 rounded-3xl text-white shadow shadow-indigo-650/40 hover:opacity-95 transition cursor-pointer flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-bold text-xs">Fale com o Concierge AI!</h4>
                  <p className="text-[10px] text-indigo-200">Clique para abrir chat de consultoria</p>
                </div>
              </div>
              <span className="text-xs">→</span>
            </div>
          </aside>

        </div>
      </div>

      <div id="concierge_chat_panel" className="fixed bottom-6 right-6 z-40">
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 100 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 100 }}
              className="w-[360px] md:w-[400px] h-[520px] rounded-3xl bg-slate-950 text-white border border-white/10 flex flex-col shadow-2xl overflow-hidden"
            >
              <header className="p-4 bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center relative">
                    <Bot className="w-5 h-5 text-white" />
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-slate-900" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-100 flex items-center gap-1.5">
                      {company.name} <span className="text-[9px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full font-bold">CONCIERGE AI</span>
                    </h4>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">Preparo inteligente instantâneo</span>
                  </div>
                </div>

                <button
                  onClick={() => setIsChatOpen(false)}
                  className="p-1 px-2.5 rounded-full hover:bg-white/10 text-slate-400 font-bold hover:text-white transition cursor-pointer text-xs"
                >
                  ✕
                </button>
              </header>

              <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4 font-sans text-xs scrollbar-none">
                {chatMessages.map(msg => (
                  <div key={msg.id} className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}>
                    <div className={`p-3 rounded-2xl leading-relaxed whitespace-pre-line ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white/5 border border-white/10 text-slate-300 rounded-tl-none'}`}>
                      {msg.text}
                    </div>
                  </div>
                ))}

                {isAiTyping && (
                  <div className="self-start flex gap-3 max-w-[85%]">
                    <div className="p-3 rounded-2xl rounded-tl-none bg-white/5 border border-white/5 text-slate-400 italic animate-pulse flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce delay-100" />
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce delay-200" />
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce delay-300" />
                      Sintetizando resposta oficial...
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleSendMessage} className="p-4 bg-slate-900 border-t border-white/5 flex gap-2">
                <input
                  type="text"
                  value={userInputMessage}
                  onChange={(e) => setUserInputMessage(e.target.value)}
                  placeholder="Escreva sua pergunta ou dúvida aqui..."
                  className="flex-1 p-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500/55 placeholder:text-slate-500 font-sans text-xs"
                />
                <button
                  type="submit"
                  disabled={!userInputMessage.trim() || isAiTyping}
                  className="p-3 bg-gradient-to-tr from-blue-500 to-indigo-500 hover:opacity-90 disabled:opacity-40 rounded-xl transition cursor-pointer text-white flex items-center justify-center shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </motion.div>
          )}

          {!isChatOpen && (
            <motion.button
              layoutId="ai_concierge_launcher"
              onClick={() => setIsChatOpen(true)}
              className="py-4 px-6 rounded-full bg-slate-950 text-white border border-white/10 shadow-2xl hover:scale-105 transition flex items-center gap-2 cursor-pointer relative"
            >
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping absolute top-0.5 right-0.5" />
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full absolute top-0.5 right-0.5" />
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span className="font-semibold text-xs font-sans tracking-tight">Falar com o Concierge</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {copiedLink && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-slate-950 text-white border border-white/10 shadow-2xl px-6 py-3 rounded-2xl flex items-center gap-2.5 font-sans text-xs font-semibold"
          >
            <span className="text-emerald-500">✓</span> Link de {company.name} copiado com sucesso!
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
