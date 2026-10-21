/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Meu Plano — Limites, Vigência, Origem do Benefício, Upgrade e Reconciliação
 *
 * Menu 5 Oficial:
 * - Exibe plano atual, limites, vigência e origem do benefício com diferenciação estrita:
 *   1. Teste de 7 dias sem autorização de cobrança (termina sem débito e retorna ao Bronze)
 *   2. Assinatura autorizada (cartão recorrente, condições claras e próxima cobrança)
 *   3. Pagamento avulso (Pix avulso de 30 dias — NÃO é renovação automática)
 *   4. Concessão administrativa (cortesia sem faturamento nem cobrança)
 * - Experiência Gold de 7 dias para novos clientes elegíveis (sem repetições indevidas)
 * - Tabela de upgrade integrada com Mercado Pago oficial e reconciliação idempotente
 */

import React, { useState, useEffect } from 'react';
import { 
  CreditCard, ShieldCheck, Sparkles, Zap, CheckCircle2, 
  ArrowUpRight, AlertCircle, Award, Clock, Calendar, Check, 
  QrCode, Copy, Loader2, Info, RefreshCw, AlertTriangle
} from 'lucide-react';
import { Company } from '../../../types';
import { api } from '../../../lib/apiClient';
import { BillingService, PixDetails } from '../../../services/BillingService';

interface BillingSubscriptionViewProps {
  company: Company | null;
}

interface PlanApiItem {
  id: string;
  name: string;
  displayName?: string;
  description: string;
  price: number;
  billingCycle: string;
  badge?: string;
  buttonText?: string;
  isRecommended?: boolean;
  features?: string[];
}

interface EntitlementDetails {
  planTier: string;
  planName: string;
  grantType: 'bronze' | 'trial' | 'paid' | 'admin_grant';
  grantDetails: {
    isTrial: boolean;
    trialEndsAt?: string | null;
    trialEligible?: boolean;
    hasUsedTrial?: boolean;
    subscriptionId?: string | null;
    subscriptionStatus?: string | null;
    paymentType?: 'subscription' | 'onetime_pix' | null;
    paymentMethod?: string | null;
    nextBillingDate?: string | null;
    contractedPrice?: number | null;
    isAdminGrant: boolean;
    adminGrantEndDate?: string | null;
    adminGrantReason?: string | null;
  };
  limits: {
    maxGalleryPhotos: number;
    maxProducts: number;
    maxCoupons: number;
    hasHomeHighlight: boolean;
    hasCrm: boolean;
    hasFullPresentation: boolean;
    hasAnalytics: boolean;
  };
}

export const BillingSubscriptionView: React.FC<BillingSubscriptionViewProps> = ({ company }) => {
  const [plans, setPlans] = useState<PlanApiItem[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [entitlements, setEntitlements] = useState<EntitlementDetails | null>(null);
  const [loadingEntitlements, setLoadingEntitlements] = useState(false);

  // Modal Pix e Reconciliação
  const [pixModalData, setPixModalData] = useState<PixDetails | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [payError, setPayError] = useState('');
  const [isReconciling, setIsReconciling] = useState(false);
  const [reconcileResult, setReconcileResult] = useState<string | null>(null);

  // Ativação do Trial de 7 dias
  const [startingTrial, setStartingTrial] = useState(false);
  const [trialSuccessMsg, setTrialSuccessMsg] = useState('');

  if (!company) return null;

  const rawPlan = (entitlements?.planTier || company.planLevel || 'bronze').toLowerCase();
  const isDiamond = rawPlan === 'diamond' || rawPlan === 'diamond_extremo';
  const isGold = rawPlan === 'gold_vip' || rawPlan === 'ouro';
  const isBronze = !isDiamond && !isGold;

  // Origem do Benefício
  const grantType = entitlements?.grantType || (company as any).access_grant_type || (isDiamond || isGold ? 'paid' : 'bronze');
  const isTrial = grantType === 'trial';
  const isAdminGrant = grantType === 'admin_grant';
  const isPaidSubscription = grantType === 'paid';
  const isOrganicBronze = grantType === 'bronze' || isBronze;

  const isPixOnetime = entitlements?.grantDetails?.paymentType === 'onetime_pix' || entitlements?.grantDetails?.paymentMethod === 'pix';
  const trialEndsAt = entitlements?.grantDetails?.trialEndsAt || (company as any).trial_ends_at;
  const trialEligible = entitlements?.grantDetails?.trialEligible ?? false;
  const hasUsedTrial = entitlements?.grantDetails?.hasUsedTrial ?? Boolean((company as any).has_used_trial || (company as any).trial_ends_at);
  const nextBillingDate = entitlements?.grantDetails?.nextBillingDate;
  const contractedPrice = entitlements?.grantDetails?.contractedPrice;

  // Limites estruturais
  const maxPhotos = isDiamond ? 30 : isGold ? 15 : 3;
  const maxProducts = isDiamond ? 30 : isGold ? 5 : 0;
  const maxCoupons = isDiamond ? 3 : isGold ? 1 : 0;

  const fetchEntitlements = async () => {
    setLoadingEntitlements(true);
    try {
      const data = await api.get<EntitlementDetails>(`/api/companies/${encodeURIComponent(company.id)}/entitlements`);
      setEntitlements(data);
    } catch {
      // Degradação graciosa
    } finally {
      setLoadingEntitlements(false);
    }
  };

  useEffect(() => {
    fetchEntitlements();
    setLoadingPlans(true);
    api.get<PlanApiItem[]>('/api/plans')
      .then(rows => setPlans(rows || []))
      .catch(() => {})
      .finally(() => setLoadingPlans(false));
  }, [company.id]);

  const handleStartSevenDayTrial = async () => {
    setStartingTrial(true);
    setPayError('');
    setTrialSuccessMsg('');
    try {
      const res = await BillingService.startSevenDayGoldTrial(company.id);
      setTrialSuccessMsg(res.message || 'Experiência Gold de 7 dias ativada com sucesso!');
      await fetchEntitlements();
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setPayError(err?.message || 'Não foi possível ativar o período de teste.');
    } finally {
      setStartingTrial(false);
    }
  };

  const handleGeneratePix = async (planKey: string) => {
    setPayError('');
    setReconcileResult(null);
    setIsPaying(true);
    try {
      const planId = planKey === 'diamond' ? 'plan_diamond_extremo' : planKey === 'gold' ? 'plan_gold_vip' : 'plan_bronze';
      const pix = await BillingService.generatePixPayment(company.id, planId, 0, '');
      setPixModalData(pix);
    } catch (err: any) {
      setPayError(err?.message || 'Não foi possível gerar a contratação via Mercado Pago.');
    } finally {
      setIsPaying(false);
    }
  };

  const handleCopyPix = () => {
    if (!pixModalData) return;
    navigator.clipboard.writeText(pixModalData.qrCode);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  const handleReconcile = async () => {
    if (!pixModalData) return;
    setIsReconciling(true);
    setReconcileResult(null);
    try {
      const res = await BillingService.reconcilePayment(pixModalData.subscriptionId);
      if (res.reconciled) {
        setReconcileResult('Pagamento aprovado no Mercado Pago! Atualizando seu plano...');
        await fetchEntitlements();
        setTimeout(() => {
          setPixModalData(null);
          window.location.reload();
        }, 1500);
      } else {
        setReconcileResult(res.message || 'Pagamento ainda não identificado no Mercado Pago. Se já realizou o Pix, aguarde alguns instantes.');
      }
    } catch (err: any) {
      setReconcileResult(err?.message || 'Não foi possível consultar o Mercado Pago no momento.');
    } finally {
      setIsReconciling(false);
    }
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return null;
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return null;
    }
  };

  const formatDateTime = (isoString?: string | null) => {
    if (!isoString) return null;
    try {
      const d = new Date(isoString);
      return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return null;
    }
  };

  return (
    <div className="space-y-8 p-4 sm:p-6 max-w-7xl">
      
      {/* Header */}
      <div>
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
          Contratação & Direitos
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Meu Plano & Benefícios</h1>
        <p className="text-xs text-slate-400 mt-1">
          Consulte limites de catálogo, vigência, origem do benefício e opções de upgrade da sua empresa.
        </p>
      </div>

      {payError && (
        <div className="p-4 bg-red-950/80 border border-red-800 text-red-300 rounded-2xl text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{payError}</span>
        </div>
      )}

      {trialSuccessMsg && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{trialSuccessMsg}</span>
        </div>
      )}

      {/* Convite para 7 dias de Experiência Gold (Apenas para novos clientes elegíveis) */}
      {isBronze && trialEligible && !isTrial && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-transparent border border-amber-500/30 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-full text-[10px] font-black uppercase tracking-wide flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Cortesia para Novos Clientes
                </span>
              </div>
              <h3 className="text-lg font-black text-white">Experimente o Plano Gold VIP por 7 dias grátis</h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
                Tenha 15 fotos na galeria, catálogo com 5 produtos, 1 promoção ativa e destaque na página inicial.
                <strong> Sem necessidade de cartão de crédito e sem débito automático.</strong> Ao término dos 7 dias, seu perfil retorna ao Bronze gratuito sem cobrança.
              </p>
            </div>

            <button
              type="button"
              onClick={handleStartSevenDayTrial}
              disabled={startingTrial}
              className="px-5 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs rounded-2xl transition shadow-lg flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
            >
              {startingTrial ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              <span>{startingTrial ? 'Ativando experiência...' : 'Ativar 7 dias de experiência Gold'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Card Principal: Plano Ativo e Origem do Benefício com Diferenciação Rigorosa */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${
              isDiamond 
                ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30' 
                : isGold 
                  ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-400/30' 
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}>
              {isDiamond ? <Sparkles className="w-7 h-7" /> : isGold ? <Zap className="w-7 h-7" /> : <Award className="w-7 h-7" />}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Plano Vigente</span>
                
                {/* Badge Diferenciado por Origem do Benefício */}
                {isTrial && (
                  <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Experiência Gold (7 Dias)
                  </span>
                )}
                {isAdminGrant && (
                  <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                    Concessão Administrativa
                  </span>
                )}
                {isPaidSubscription && isPixOnetime && (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                    Acesso Pago (Pix Avulso)
                  </span>
                )}
                {isPaidSubscription && !isPixOnetime && (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CreditCard className="w-3 h-3" /> Assinatura Ativa (Cartão)
                  </span>
                )}
                {isOrganicBronze && !isTrial && (
                  <span className="bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                    Bronze Gratuito
                  </span>
                )}
              </div>

              <h2 className="text-2xl font-black text-white mt-1">
                {isDiamond ? 'Diamond' : isGold ? 'Gold VIP' : 'Bronze Gratuito'}
              </h2>
              
              <p className="text-xs text-slate-400 mt-0.5">
                {isTrial 
                  ? 'Teste sem cobrança — Retorna ao Bronze gratuito ao término.' 
                  : isDiamond 
                    ? `R$ ${contractedPrice ? contractedPrice.toFixed(2).replace('.', ',') : '99,90'} / mês` 
                    : isGold 
                      ? `R$ ${contractedPrice ? contractedPrice.toFixed(2).replace('.', ',') : '49,90'} / mês` 
                      : 'Gratuito — Presença essencial no guia'}
              </p>
            </div>
          </div>

          {/* Vigência / Próxima Cobrança */}
          <div className="flex flex-col sm:items-end text-xs text-slate-400 gap-1 bg-slate-800/40 p-4 rounded-2xl border border-slate-800">
            {isTrial && (
              <>
                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Término do Teste:
                </span>
                <span className="text-white font-mono font-bold">
                  {formatDateTime(trialEndsAt) || 'Em até 7 dias'}
                </span>
                <span className="text-[10px] text-slate-400">Sem débito automático</span>
              </>
            )}

            {isPaidSubscription && isPixOnetime && (
              <>
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                  Vigência do Acesso:
                </span>
                <span className="text-white font-mono font-bold">
                  {formatDate(nextBillingDate) || 'Vigência de 30 dias'}
                </span>
                <span className="text-[10px] text-slate-400">Pix avulso — sem renovação automática</span>
              </>
            )}

            {isPaidSubscription && !isPixOnetime && (
              <>
                <span className="font-bold text-blue-400 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-blue-400" />
                  Próxima Cobrança:
                </span>
                <span className="text-white font-mono font-bold">
                  {formatDate(nextBillingDate) || 'Em 30 dias'}
                </span>
                <span className="text-[10px] text-slate-400">
                  R$ {contractedPrice ? contractedPrice.toFixed(2).replace('.', ',') : '49,90'} / mês
                </span>
              </>
            )}

            {isAdminGrant && (
              <>
                <span className="font-bold text-purple-300 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-purple-400" />
                  Cortesia Institucional:
                </span>
                <span className="text-white font-mono font-bold">
                  {formatDate(entitlements?.grantDetails?.adminGrantEndDate) || 'Concessão da administração'}
                </span>
                <span className="text-[10px] text-slate-400">Sem cobrança para sua empresa</span>
              </>
            )}

            {isOrganicBronze && !isTrial && (
              <>
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Vigência:
                </span>
                <span className="text-slate-300 font-bold">Acesso Contínuo</span>
                <span className="text-[10px] text-slate-500">Presença essencial garantida</span>
              </>
            )}
          </div>
        </div>

        {/* Diagnóstico de Limites Consumidos vs Máximos */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">
            Capacidade e Limites do Plano
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Fotos */}
            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-2">
              <span className="text-xs text-slate-400 font-bold block">Galeria de Fotos</span>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black text-white">{maxPhotos} fotos</span>
                <span className="text-[10px] text-slate-500">Logo e capa à parte</span>
              </div>
            </div>

            {/* Produtos */}
            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-2">
              <span className="text-xs text-slate-400 font-bold block">Catálogo de Produtos</span>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black text-white">
                  {maxProducts > 0 ? `Até ${maxProducts} itens` : 'Não incluído'}
                </span>
                <span className="text-[10px] text-slate-500">{isBronze ? 'Bronze essencial' : 'Publicáveis'}</span>
              </div>
            </div>

            {/* Promoções */}
            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 space-y-2">
              <span className="text-xs text-slate-400 font-bold block">Promoções Ativas</span>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black text-white">
                  {maxCoupons > 0 ? `Até ${maxCoupons} ativa` : 'Não incluído'}
                </span>
                <span className="text-[10px] text-slate-500">{isBronze ? 'Requer VIP' : 'Na vitrine'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recursos Exclusivos */}
        <div className="p-4 rounded-2xl bg-slate-800/20 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className={!isBronze ? 'text-emerald-400' : 'text-slate-600'}>
              {!isBronze ? '✓' : '✗'}
            </span>
            <span className={!isBronze ? 'text-white font-semibold' : 'text-slate-500'}>
              Destaque rotativo na Home
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={!isBronze ? 'text-emerald-400' : 'text-slate-600'}>
              {!isBronze ? '✓' : '✗'}
            </span>
            <span className={!isBronze ? 'text-white font-semibold' : 'text-slate-500'}>
              Selo oficial de verificação
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={!isBronze ? 'text-emerald-400' : 'text-slate-600'}>
              {!isBronze ? '✓' : '✗'}
            </span>
            <span className={!isBronze ? 'text-white font-semibold' : 'text-slate-500'}>
              Perfil exclusivo sem concorrentes
            </span>
          </div>
        </div>
      </div>

      {/* Tabela de Upgrade Oficial com Dados da API do Mercado Pago */}
      <div className="space-y-4">
        <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-black text-white">Opções de Upgrade & Planos</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Condições oficiais com integração direta ao Mercado Pago. Contratos antigos são preservados.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Ambiente seguro Mercado Pago</span>
          </div>
        </div>

        {loadingPlans ? (
          <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> Carregando planos oficiais…
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Bronze */}
            <div className={`rounded-3xl p-6 border flex flex-col justify-between ${
              isBronze && !isTrial
                ? 'bg-slate-900 border-blue-500/40 shadow-xl' 
                : 'bg-slate-900/60 border-slate-800'
            }`}>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Gratuito</span>
                <h3 className="text-xl font-black text-white mt-1">Bronze</h3>
                <p className="text-xs text-slate-400 mt-1">Presença essencial no guia.</p>
                <div className="my-4 text-2xl font-black text-white">
                  R$ 0,00 <span className="text-xs font-normal text-slate-400">/mês</span>
                </div>

                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">✓ Presença essencial no guia</li>
                  <li className="flex items-center gap-2">✓ Até <strong>3 fotos</strong> na galeria</li>
                  <li className="flex items-center gap-2">✓ CRM básico de contatos</li>
                  <li className="flex items-center gap-2">✓ Métricas essenciais (7 dias)</li>
                  <li className="flex items-center gap-2 text-slate-500">✗ Sem novos produtos ou promoções</li>
                  <li className="flex items-center gap-2 text-slate-500">✗ Sem destaque na home</li>
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800">
                {isBronze && !isTrial ? (
                  <span className="block text-center text-xs font-bold text-blue-300 py-2 bg-blue-950/60 border border-blue-800 rounded-xl">
                    Plano Atual
                  </span>
                ) : (
                  <span className="block text-center text-xs font-bold text-slate-500 py-2 bg-slate-800/40 border border-slate-800 rounded-xl">
                    Base Gratuita
                  </span>
                )}
              </div>
            </div>

            {/* Gold VIP */}
            <div className={`rounded-3xl p-6 border flex flex-col justify-between relative ${
              isGold || isTrial
                ? 'bg-slate-900 border-indigo-500/50 shadow-2xl' 
                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
            }`}>
              <div className="absolute -top-3 right-6 bg-gradient-to-r from-indigo-500 to-blue-600 text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow">
                Mais Popular
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400">VIP</span>
                <h3 className="text-xl font-black text-white mt-1">Gold VIP</h3>
                <p className="text-xs text-slate-400 mt-1">Mais exposição e vitrine ampliada.</p>
                <div className="my-4 text-2xl font-black text-white">
                  R$ 49,90 <span className="text-xs font-normal text-slate-400">/mês</span>
                </div>

                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">✓ <strong>Destaque rotativo</strong> na página inicial</li>
                  <li className="flex items-center gap-2">✓ Vitrine ampliada com foto de capa</li>
                  <li className="flex items-center gap-2">✓ Até <strong>15 fotos</strong> na galeria</li>
                  <li className="flex items-center gap-2">✓ Catálogo com até <strong>5 produtos</strong></li>
                  <li className="flex items-center gap-2">✓ <strong>1 promoção ativa</strong> com cupom</li>
                  <li className="flex items-center gap-2">✓ Histórico de métricas de 7, 30 e 90 dias</li>
                  <li className="flex items-center gap-2">✓ Perfil exclusivo sem concorrentes</li>
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 space-y-2">
                {isGold && !isTrial ? (
                  <span className="block text-center text-xs font-bold text-indigo-300 py-2 bg-indigo-950/60 border border-indigo-800 rounded-xl">
                    Plano Ativo
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleGeneratePix('gold')}
                    disabled={isPaying}
                    className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl transition shadow cursor-pointer text-center disabled:opacity-50"
                  >
                    {isPaying ? 'Gerando cobrança...' : 'Contratar Gold VIP'}
                  </button>
                )}
                <span className="block text-center text-[10px] text-slate-500">
                  Pagamento avulso via Pix ou assinatura mensal
                </span>
              </div>
            </div>

            {/* Diamond */}
            <div className={`rounded-3xl p-6 border flex flex-col justify-between ${
              isDiamond 
                ? 'bg-slate-900 border-amber-500/50 shadow-2xl' 
                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
            }`}>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">Exclusivo</span>
                <h3 className="text-xl font-black text-white mt-1">Diamond</h3>
                <p className="text-xs text-slate-400 mt-1">Recursos Gold com maior capacidade de catálogo, fotos e promoções.</p>
                <div className="my-4 text-2xl font-black text-white">
                  R$ 99,90 <span className="text-xs font-normal text-slate-400">/mês</span>
                </div>

                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">✓ Todos os benefícios do plano Gold VIP</li>
                  <li className="flex items-center gap-2">✓ Até <strong>30 fotos</strong> em alta resolução</li>
                  <li className="flex items-center gap-2">✓ Catálogo ampliado com até <strong>30 produtos</strong></li>
                  <li className="flex items-center gap-2">✓ Até <strong>3 promoções simultâneas</strong></li>
                  <li className="flex items-center gap-2">✓ <strong>Selo Diamante</strong> oficial</li>
                  <li className="flex items-center gap-2">✓ Prioridade máxima na vitrine e buscas</li>
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 space-y-2">
                {isDiamond ? (
                  <span className="block text-center text-xs font-bold text-amber-300 py-2 bg-amber-950/60 border border-amber-800 rounded-xl">
                    Plano Ativo
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleGeneratePix('diamond')}
                    disabled={isPaying}
                    className="w-full py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl transition shadow cursor-pointer text-center disabled:opacity-50"
                  >
                    {isPaying ? 'Gerando cobrança...' : 'Contratar Diamond'}
                  </button>
                )}
                <span className="block text-center text-[10px] text-slate-500">
                  Pagamento avulso via Pix ou assinatura mensal
                </span>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Modal de Pagamento PIX com Transparência e Reconciliação em Tempo Real */}
      {pixModalData && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-black text-white">Pagamento Avulso via PIX</h3>
              </div>
              <button
                type="button"
                onClick={() => setPixModalData(null)}
                className="text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col items-center justify-center space-y-4">
              {pixModalData.qrCodeBase64 && (
                <div className="p-3 bg-white rounded-2xl shadow">
                  <img
                    src={`data:image/png;base64,${pixModalData.qrCodeBase64}`}
                    alt="QR Code PIX Mercado Pago"
                    className="w-48 h-48"
                  />
                </div>
              )}

              <div className="w-full space-y-2">
                <label className="text-[11px] font-bold text-slate-400 block">PIX Copia e Cola:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={pixModalData.qrCode}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-300 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyPix}
                    className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black rounded-xl transition flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    {copiedPix ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedPix ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              {/* Aviso estrito sobre ausência de renovação automática no Pix avulso */}
              <div className="p-3 bg-slate-800/60 border border-slate-700 rounded-xl w-full text-[11px] text-slate-300 space-y-1">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-blue-400" />
                  Transparência de Cobrança:
                </div>
                <p className="text-slate-400 leading-tight">
                  Este pagamento é <strong>avulso</strong> e garante 30 dias de acesso. 
                  <strong> Não há renovação automática nem débitos futuros na sua conta.</strong>
                </p>
              </div>

              {reconcileResult && (
                <div className="p-3 bg-blue-950/80 border border-blue-800 rounded-xl w-full text-xs text-blue-200">
                  {reconcileResult}
                </div>
              )}

              {/* Botão de Reconciliação / Verificação Instantânea */}
              <button
                type="button"
                onClick={handleReconcile}
                disabled={isReconciling}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition border border-slate-700 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isReconciling ? <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> : <RefreshCw className="w-4 h-4 text-emerald-400" />}
                <span>{isReconciling ? 'Consultando Mercado Pago...' : 'Já realizei o Pix! Confirmar pagamento agora'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
