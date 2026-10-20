/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * SaaS Pricing — VIP→cadastro/login→pagamento com preservação de seleção.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Check, Award, Zap, Sparkles, AlertCircle,
  CreditCard, Loader2, CheckCircle, Smartphone, Copy, QrCode, LogIn, UserPlus
} from 'lucide-react';
import { City, Category, Company } from '../types';
import { BillingService, PixDetails } from '../services/BillingService';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { savePendingPurchase, readPendingPurchase, clearPendingPurchase } from '../lib/pendingPurchase';
import { getToken } from '../lib/apiClient';

interface SaaSPricingProps {
  cities: City[];
  categories: Category[];
  onListingCreated: () => void;
  onNavigateTab?: (tab: string) => void;
}

export default function SaaSPricing({
  cities,
  categories,
  onListingCreated,
  onNavigateTab = () => {},
}: SaaSPricingProps) {
  const { isAuthenticated, user } = useAuth();
  const { companies } = useCompany();
  const [selectedPlan, setSelectedPlan] = useState<'bronze' | 'gold_vip' | 'diamond_extremo' | null>(null);

  const [compName, setCompName] = useState('');
  const [compDesc, setCompDesc] = useState('');
  const [compPhone, setCompPhone] = useState('');
  const [compAddress, setCompAddress] = useState('');
  const [compCat, setCompCat] = useState('');
  const [compCity, setCompCity] = useState('');

  const [selectedExistingCompanyId, setSelectedExistingCompanyId] = useState<string>('');
  const [useExistingCompany, setUseExistingCompany] = useState(false);

  const [payMethod, setPayMethod] = useState<'card' | 'pix'>('card');
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [pixDetails, setPixDetails] = useState<PixDetails | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const [authGate, setAuthGate] = useState(false);

  const ownedCompanies: Company[] = isAuthenticated
    ? (companies as unknown as Company[]).filter(() => true)
    : [];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedPlan(null);
        setAuthGate(false);
      }
    };
    if (selectedPlan) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectedPlan]);

  useEffect(() => {
    const pending = readPendingPurchase();
    if (pending && isAuthenticated) {
      const raw = pending.planId.replace(/^plan_/, '') as 'bronze' | 'gold_vip' | 'diamond_extremo';
      if (['bronze', 'gold_vip', 'diamond_extremo'].includes(raw)) {
        setSelectedPlan(raw);
      }
    }
  }, [isAuthenticated]);

  const handlePlanClick = (planId: 'bronze' | 'gold_vip' | 'diamond_extremo') => {
    setCheckoutError('');
    setPixDetails(null);
    setSuccess(false);
    setAuthGate(false);
    if (!isAuthenticated) {
      savePendingPurchase(`plan_${planId}`);
      setSelectedPlan(planId);
      setAuthGate(true);
      return;
    }
    savePendingPurchase(`plan_${planId}`);
    setSelectedPlan(planId);
  };

  const PLANS = [
    {
      id: 'bronze' as const,
      name: 'Bronze (Básico)',
      price: 'Grátis',
      subtext: 'Ideal para experimentar o portal hoje',
      features: [
        'Cadastro padrão no guia',
        'Telefone fixo para contato',
        'Horário comercial convencional',
        'Visualização simples na lista'
      ],
      icon: Award,
      color: 'border-slate-200 bg-white text-slate-700',
      badgeColor: 'bg-slate-100 text-slate-600',
      btnText: 'Começar Gratuitamente'
    },
    {
      id: 'gold_vip' as const,
      name: 'Gold VIP',
      price: 'R$ 49,90',
      period: '/mês',
      subtext: 'Alta visibilidade e leads qualificados',
      features: [
        'Badge "Gold VIP" na foto de capa',
        'Prioridade de exibição na pesquisa',
        'Galeria de fotos expandida',
        'Link direto para WhatsApp e Redes',
        'Catálogo de produtos (até 5 itens)',
        'Estatísticas de visualização mensais'
      ],
      icon: Zap,
      color: 'border-indigo-400 bg-indigo-50/5 ring-1 ring-indigo-400/20',
      badgeColor: 'bg-indigo-600 text-white',
      btnText: 'Assinar Plano Gold'
    },
    {
      id: 'diamond_extremo' as const,
      name: 'Diamond Extremo',
      price: 'R$ 99,90',
      period: '/mês',
      subtext: 'Inteligência Artificial e Domínio Total',
      features: [
        'Badge de Ouro "Diamante Premium" nos banners',
        'Primeiro lugar garantido em todas as buscas',
        'CONCIERGE DE INTELIGÊNCIA ARTIFICIAL',
        'Chat virtual que responde sozinho 24/7',
        'Catálogo ilimitado de ofertas',
        'Painel analítico SaaS avançado',
        'Suporte dedicado com gerente de conta'
      ],
      icon: Sparkles,
      color: 'border-amber-400 bg-amber-500/5 ring-1 ring-amber-400/20 shadow-lg',
      badgeColor: 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900',
      btnText: 'Ativar Escopo Diamante'
    }
  ];

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    if (!isAuthenticated) {
      savePendingPurchase(`plan_${selectedPlan}`);
      setAuthGate(true);
      setCheckoutError('Entre na sua conta para continuar — sua seleção foi preservada.');
      return;
    }

    let companyId = '';
    if (useExistingCompany && selectedExistingCompanyId) {
      companyId = selectedExistingCompanyId;
    } else {
      if (!compName || !compCat || !compCity) return;
      setIsProcessing(true);
      setCheckoutError('');
      try {
        const token = getToken();
        const resp = await fetch('/api/companies/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            name: compName,
            categoryId: compCat,
            cityId: compCity,
            description: compDesc,
            phone: compPhone,
            whatsapp: compPhone,
            address: compAddress
          })
        });

        const body = await resp.json().catch(() => ({} as any));
        if (!resp.ok) {
          throw new Error(body.error || (resp.status === 401
            ? 'Entre na sua conta antes de cadastrar a empresa.'
            : 'Não foi possível cadastrar a empresa.'));
        }

        companyId = body.company?.id;
        if (!companyId) throw new Error('A empresa foi criada sem um identificador válido.');
      } catch (err: any) {
        setCheckoutError(err?.message || 'Não foi possível concluir o cadastro.');
        setIsProcessing(false);
        return;
      }
      setIsProcessing(false);
    }

    if (selectedPlan === 'bronze') {
      clearPendingPurchase();
      setSuccess(true);
      setTimeout(() => onListingCreated(), 1500);
      return;
    }

    const planId = `plan_${selectedPlan}`;
    setIsProcessing(true);
    setCheckoutError('');
    try {
      if (payMethod === 'pix') {
        const pix = await BillingService.generatePixPayment(companyId, planId, 0, user?.email || '');
        (pix as any)._companyId = companyId;
        (pix as any)._planId = planId;
        setPixDetails(pix);
      } else {
        const checkoutUrl = await BillingService.generateCheckoutPreference(companyId, planId, 0, user?.email || '');
        window.location.assign(checkoutUrl);
      }
    } catch (err: any) {
      setCheckoutError(err?.message || 'Não foi possível iniciar o pagamento.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div id="pricing_pricing_container" className="py-16 px-4 md:px-8 bg-slate-50 min-h-screen flex flex-col">
      <div className="max-w-6xl mx-auto flex flex-col w-full">

        <section className="text-center mb-10 max-w-2xl mx-auto">
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-widest block mb-1">Monetização SaaS</span>
          <h1 className="text-2xl md:text-3xl font-sans font-black text-slate-900 tracking-tight leading-none mb-3">Escolha o plano ideal para escalar</h1>
          <p className="text-slate-500 text-xs font-sans">
            Ative hoje o seu perfil de negócios e comece a impactar milhares de clientes locais de forma rápida e automatizada com robôs geradores de leads.
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20 items-stretch">
          {PLANS.map(plan => {
            const IconComp = plan.icon;
            return (
              <div
                key={plan.id}
                className={`p-6 md:p-8 rounded-3xl border flex flex-col justify-between transition-all ${plan.color}`}
              >
                <div className="flex flex-col">
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <span className={`text-[10px] font-extrabold uppercase px-3 py-1 rounded-full ${plan.badgeColor}`}>
                      {plan.id === 'diamond_extremo' ? '👑 DIAMOND' : plan.name}
                    </span>
                    <IconComp className="w-5 h-5 text-slate-400 shrink-0" />
                  </div>

                  <div className="flex items-baseline mb-2">
                    <span className="text-3xl md:text-4xl font-sans font-black text-slate-900">{plan.price}</span>
                    {plan.period && <span className="text-slate-500 text-xs font-semibold font-sans ml-1">{plan.period}</span>}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 mb-8 font-sans">{plan.subtext}</p>

                  <div className="flex flex-col gap-3 border-t border-slate-150 pt-6">
                    {plan.features.map((feat, idx) => (
                      <span key={idx} className="flex gap-2 text-xs text-slate-600 leading-normal font-sans">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /> {feat}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handlePlanClick(plan.id)}
                  className={`py-3.5 w-full mt-10 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-90 ${plan.id === 'diamond_extremo' ? 'bg-amber-500 text-slate-950 shadow-md' : 'bg-slate-900 text-white'}`}
                >
                  {plan.btnText}
                </button>
              </div>
            );
          })}
        </div>

        <AnimatePresence>
          {selectedPlan && (
            <div
              onClick={() => { setSelectedPlan(null); setAuthGate(false); }}
              className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
            >
              <motion.div
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl p-6 md:p-8 relative max-h-[90vh] overflow-y-auto cursor-default"
              >
                <button
                  onClick={() => { setSelectedPlan(null); setAuthGate(false); }}
                  className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 font-bold text-sm cursor-pointer"
                >
                  ✕
                </button>

                {pixDetails ? (
                  <div className="p-4 md:p-8 text-center flex flex-col items-center gap-5">
                    <QrCode className="w-12 h-12 text-emerald-500" />
                    <div>
                      <h3 className="text-xl font-sans font-black text-slate-950">PIX gerado pelo Mercado Pago</h3>
                      <p className="text-xs text-slate-500 mt-2">O destaque será ativado somente depois da confirmação do pagamento via webhook.</p>
                    </div>
                    {pixDetails.qrCodeBase64 ? (
                      <img
                        src={`data:image/png;base64,${pixDetails.qrCodeBase64}`}
                        alt="QR Code PIX"
                        className="w-48 h-48 object-contain border border-slate-200 rounded-2xl p-2"
                      />
                    ) : (
                      <div className="w-48 h-48 flex items-center justify-center border border-dashed border-slate-300 rounded-2xl text-[10px] text-slate-500">
                        Use o Copia e Cola abaixo
                      </div>
                    )}
                    <div className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-600 truncate flex-1">{pixDetails.qrCode}</span>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(pixDetails.qrCode);
                          } catch {
                            const el = document.createElement('textarea');
                            el.value = pixDetails.qrCode;
                            document.body.appendChild(el);
                            el.select();
                            document.execCommand('copy');
                            document.body.removeChild(el);
                          }
                          setPixCopied(true);
                          setTimeout(() => setPixCopied(false), 2000);
                        }}
                        className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                      >
                        <Copy className="w-3.5 h-3.5" /> {pixCopied ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>
                    <div className="w-full flex flex-col gap-2">
                      <div className="text-[11px] text-slate-500">
                        Expira em {Math.max(0, Math.floor((new Date(pixDetails.expirationDate).getTime() - Date.now())/60000))} min — ao expirar, gere novamente. Recarregou a página? Clique em Pagar com Pix de novo para recuperar o mesmo QR.
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const s = await BillingService.getSubscriptionStatusById(pixDetails.subscriptionId);
                            if (s === 'active') {
                              setPixDetails(null);
                              setSuccess(true);
                              clearPendingPurchase();
                              setTimeout(() => onListingCreated(), 1200);
                            }
                          } catch {}
                        }}
                        className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-bold"
                      >
                        Já paguei — Verificar status
                      </button>
                      <p className="text-[10px] text-slate-400">A confirmação oficial ocorre somente após o webhook do Mercado Pago. Este botão apenas verifica o status.</p>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const fresh = await BillingService.generatePixPayment(
                              (pixDetails as any)._companyId ?? '',
                              (pixDetails as any)._planId ?? `plan_${selectedPlan}`,
                              0, user?.email || ''
                            );
                            if ((pixDetails as any)._companyId) (fresh as any)._companyId = (pixDetails as any)._companyId;
                            (fresh as any)._planId = (pixDetails as any)._planId ?? `plan_${selectedPlan}`;
                            setPixDetails(fresh);
                          } catch {}
                        }}
                        className="text-[11px] text-slate-500 underline"
                      >
                        Gerar novo PIX (se expirado)
                      </button>
                    </div>
                  </div>
                ) : success ? (
                  <div className="p-16 text-center flex flex-col items-center">
                    <CheckCircle className="w-16 h-16 text-emerald-500 mb-4 animate-bounce" />
                    <h3 className="text-xl font-sans font-black text-slate-950">Empresa cadastrada!</h3>
                    <p className="text-xs text-slate-500 mt-2 max-w-sm">Seu perfil básico foi criado e já pode ser gerenciado no painel.</p>
                  </div>
                ) : authGate && !isAuthenticated ? (
                  <div className="flex flex-col gap-6">
                    <div>
                      <span className="text-xs font-semibold text-indigo-600 uppercase tracking-widest block">Continue sua compra</span>
                      <h3 className="text-xl font-sans font-black text-slate-950 mt-0.5">Entrar ou criar conta</h3>
                      <p className="text-xs text-slate-500 mt-1">Seu plano <strong>{selectedPlan}</strong> foi preservado. Entre para concluir o pagamento ou crie sua conta — você retornará exatamente a esta etapa, sem perder a seleção.</p>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                      Nenhuma cobrança foi criada até aqui. O valor só é calculado e validado no servidor no momento do pagamento.
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        onClick={() => { setAuthGate(false); onNavigateTab('login'); }}
                        className="py-3.5 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-2"
                      >
                        <LogIn className="w-4 h-4" /> Já tenho conta — Entrar
                      </button>
                      <button
                        onClick={() => { setAuthGate(false); onNavigateTab('cadastro'); }}
                        className="py-3.5 rounded-xl bg-[#C8102E] text-white font-bold text-xs flex items-center justify-center gap-2"
                      >
                        <UserPlus className="w-4 h-4" /> Criar conta
                      </button>
                    </div>
                    <button
                      onClick={() => setAuthGate(false)}
                      className="text-xs text-slate-500 underline text-center"
                    >
                      Voltar ao preenchimento
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleCheckoutSubmit} className="flex flex-col gap-6">
                    <div>
                      <span className="text-xs font-semibold text-indigo-600 uppercase tracking-widest block">Checkout</span>
                      <h3 className="text-xl font-sans font-black text-slate-950 mt-0.5">Configurar Novo Anúncio</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Se você já tem empresa cadastrada, selecione-a abaixo. Caso contrário, preencha os dados para registrar seu ponto no marketplace.</p>
                    </div>

                    {checkoutError && (
                      <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" /> {checkoutError}
                      </div>
                    )}

                    {isAuthenticated && ownedCompanies.length > 0 && (
                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                          <input type="checkbox" checked={useExistingCompany} onChange={e => setUseExistingCompany(e.target.checked)} />
                          Usar empresa já cadastrada
                        </label>
                        {useExistingCompany && (
                          <select
                            value={selectedExistingCompanyId}
                            onChange={e => setSelectedExistingCompanyId(e.target.value)}
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs"
                            required={useExistingCompany}
                          >
                            <option value="">Selecione a empresa</option>
                            {ownedCompanies.slice(0, 20).map((c: any) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        )}
                        <p className="text-[10px] text-slate-500">Sua seleção de plano permanece preservada mesmo ao alternar entre cadastro e login.</p>
                      </div>
                    )}

                    {!useExistingCompany && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wide mb-1.5 block">Nome da Empresa</label>
                            <input
                              type="text"
                              required={!useExistingCompany}
                              placeholder="Ex: Maré Alta Bistrô"
                              value={compName}
                              onChange={(e) => setCompName(e.target.value)}
                              className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wide mb-1.5 block">Telefone Comercial / WhatsApp</label>
                            <input
                              type="tel"
                              required={!useExistingCompany}
                              placeholder="Ex: (47) 99912-1020"
                              value={compPhone}
                              onChange={(e) => setCompPhone(e.target.value)}
                              className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wide mb-1.5 block">Escolher Categoria</label>
                            <select
                              required={!useExistingCompany}
                              value={compCat}
                              onChange={(e) => setCompCat(e.target.value)}
                              className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs focus:outline-none text-slate-700 cursor-pointer"
                            >
                              <option value="">Selecione categoria</option>
                              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wide mb-1.5 block">Cidade</label>
                            <select
                              required={!useExistingCompany}
                              value={compCity}
                              onChange={(e) => setCompCity(e.target.value)}
                              className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs focus:outline-none text-slate-700 cursor-pointer"
                            >
                              <option value="">Selecione cidade</option>
                              {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wide mb-1.5 block">Endereço Completo</label>
                          <input
                            type="text"
                            required={!useExistingCompany}
                            placeholder="Ex: Av. Beira Mar, 100 - Itapoá - SC"
                            value={compAddress}
                            onChange={(e) => setCompAddress(e.target.value)}
                            className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wide mb-1.5 block">Resumo Curto das Atividades</label>
                          <textarea
                            rows={2}
                            required={!useExistingCompany}
                            placeholder="Ex: O melhor chopp e petiscos de Itapoá, vista para a baía de Babitonga..."
                            value={compDesc}
                            onChange={(e) => setCompDesc(e.target.value)}
                            className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs focus:outline-none"
                          />
                        </div>
                      </>
                    )}

                    {selectedPlan !== 'bronze' && (
                      <div className="border-t border-slate-100 pt-6 mt-2">
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wide mb-3 block">Método de Cobrança</label>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <button
                            type="button"
                            onClick={() => setPayMethod('card')}
                            className={`p-4 rounded-xl border flex items-center gap-3 justify-center text-xs font-semibold cursor-pointer transition ${payMethod === 'card' ? 'border-indigo-500 bg-indigo-50/40 text-indigo-600' : 'border-slate-200 text-slate-600'}`}
                          >
                            <CreditCard className="w-4 h-4" /> Cartão de Crédito
                          </button>
                          <button
                            type="button"
                            onClick={() => setPayMethod('pix')}
                            className={`p-4 rounded-xl border flex items-center gap-3 justify-center text-xs font-semibold cursor-pointer transition ${payMethod === 'pix' ? 'border-emerald-500 bg-emerald-50/40 text-emerald-600' : 'border-slate-200 text-slate-600'}`}
                          >
                            <Smartphone className="w-4 h-4" /> Pagamento Instantâneo PIX
                          </button>
                        </div>

                        {payMethod === 'card' ? (
                          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col gap-3 font-sans text-xs text-slate-600">
                            <span className="font-bold text-slate-900 block">Checkout seguro Mercado Pago</span>
                            <span>Você será redirecionado para informar o cartão diretamente no ambiente protegido do Mercado Pago (Checkout Pro). Não apresentamos o pagamento como inteiramente interno.</span>
                          </div>
                        ) : (
                          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center flex flex-col items-center gap-2">
                            <QrCode className="w-12 h-12 text-emerald-500" />
                            <span className="text-[10px] text-slate-500">O QR Code oficial será emitido pelo Mercado Pago após o cadastro. Não enviamos o código a serviços externos; a renderização é local a partir do payload oficial.</span>
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isProcessing || (useExistingCompany && !selectedExistingCompanyId)}
                      className="py-4 px-6 rounded-xl bg-slate-950 hover:bg-slate-900 text-white font-extrabold text-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Processando...
                        </>
                      ) : (
                        selectedPlan === 'bronze' ? 'Criar Anúncio Gratuito' : 'Consolidar Anúncio e Pagar'
                      )}
                    </button>
                    <p className="text-[10px] text-slate-400 text-center">Preço e elegibilidade validados no servidor. Recorrência automática permanece desabilitada até confirmação das regras comerciais.</p>
                  </form>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
