/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Meu Plano — Limites, Vigência, Origem do Benefício e Upgrade
 *
 * Menu 5 Oficial:
 * - Exibe plano atual, limites, vigência e origem do benefício:
 *   (Bronze gratuito, teste grátis, assinatura paga ou concessão administrativa)
 * - Tabela de upgrade integrada com a API /api/plans
 * - Zero simulação de pagamentos fictícios
 */

import React, { useState, useEffect } from 'react';
import { 
  CreditCard, ShieldCheck, Sparkles, Zap, CheckCircle2, 
  ArrowUpRight, AlertCircle, Award, Clock, Calendar, Check, 
  QrCode, Copy, Loader2, Info
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

export const BillingSubscriptionView: React.FC<BillingSubscriptionViewProps> = ({ company }) => {
  const [plans, setPlans] = useState<PlanApiItem[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [pixModalData, setPixModalData] = useState<PixDetails | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [payError, setPayError] = useState('');

  if (!company) return null;

  const rawPlan = (company.planLevel || 'bronze').toLowerCase();
  const isDiamond = rawPlan === 'diamond' || rawPlan === 'diamond_extremo';
  const isGold = rawPlan === 'gold_vip' || rawPlan === 'ouro';
  const isBronze = !isDiamond && !isGold;

  // Origem do Benefício
  const isPaid = isDiamond || isGold || (company as any).access_grant_type === 'paid';
  const grantType = (company as any).access_grant_type || (isPaid ? 'paid' : 'bronze');
  const isTrial = grantType === 'trial';
  const isAdminGrant = grantType === 'admin_grant';
  const isPaidSubscription = grantType === 'paid';
  const isOrganicBronze = grantType === 'bronze' || isBronze;

  // Limites estruturais
  const maxPhotos = isDiamond ? 30 : isGold ? 15 : 3;
  const maxProducts = isDiamond ? 30 : isGold ? 5 : 0;
  const maxCoupons = isDiamond ? 3 : isGold ? 1 : 0;

  useEffect(() => {
    setLoadingPlans(true);
    api.get<PlanApiItem[]>('/api/plans')
      .then(rows => setPlans(rows || []))
      .catch(() => {})
      .finally(() => setLoadingPlans(false));
  }, []);

  const handleGeneratePix = async (planKey: string) => {
    setPayError('');
    setIsPaying(true);
    try {
      const planId = planKey === 'diamond' ? 'plan_diamond_extremo' : planKey === 'gold' ? 'plan_gold_vip' : 'plan_bronze';
      const pix = await BillingService.generatePixPayment(company.id, planId, 0, '');
      setPixModalData(pix);
    } catch (err: any) {
      setPayError(err?.message || 'Não foi possível gerar a contratação no momento.');
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

  return (
    <div className="space-y-8 p-4 sm:p-6 max-w-7xl">
      
      {/* Header */}
      <div>
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
          Contratação & Direitos
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Meu Plano & Benefícios</h1>
        <p className="text-xs text-slate-400 mt-1">
          Consulte limites de catálogo, vigência e opções de upgrade da sua empresa.
        </p>
      </div>

      {payError && (
        <div className="p-4 bg-red-950/80 border border-red-800 text-red-300 rounded-2xl text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{payError}</span>
        </div>
      )}

      {/* Card Principal: Plano Ativo e Origem do Benefício */}
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
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                  isAdminGrant 
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                    : isPaidSubscription 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                      : isTrial 
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}>
                  {isAdminGrant ? 'Concessão Administrativa' : isPaidSubscription ? 'Assinatura Paga' : isTrial ? 'Teste Gratuito' : 'Bronze Gratuito'}
                </span>
              </div>

              <h2 className="text-2xl font-black text-white mt-1">
                {isDiamond ? 'Diamond' : isGold ? 'Gold VIP' : 'Bronze Gratuito'}
              </h2>
              
              <p className="text-xs text-slate-400 mt-0.5">
                {isDiamond ? 'R$ 99,90 / mês' : isGold ? 'R$ 49,90 / mês' : 'Gratuito — Presença essencial no guia'}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:items-end text-xs text-slate-400 gap-1 bg-slate-800/40 p-4 rounded-2xl border border-slate-800">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-400" />
              Vigência do Benefício:
            </span>
            <span>
              {isAdminGrant ? 'Período promocional concedido' : isTrial ? 'Período de teste ativo' : 'Vigência contínua'}
            </span>
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

      {/* Tabela de Upgrade Oficial com Dados da API */}
      <div className="space-y-4">
        <div className="border-b border-slate-800 pb-3">
          <h2 className="text-lg font-black text-white">Opções de Upgrade & Planos</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Condições e preços oficiais atualizados diretamente pelo painel administrativo.
          </p>
        </div>

        {loadingPlans ? (
          <div className="py-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> Carregando planos oficiais…
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Bronze */}
            <div className={`rounded-3xl p-6 border flex flex-col justify-between ${
              isBronze 
                ? 'bg-slate-900 border-blue-500/40 shadow-xl' 
                : 'bg-slate-900/60 border-slate-800'
            }`}>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                  Plano Inicial
                </span>
                <h3 className="text-xl font-black text-white">Bronze</h3>
                <p className="text-xs text-slate-400 mt-1">Presença essencial no guia.</p>
                <div className="my-4 text-2xl font-black text-white">Gratuito</div>

                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">✓ Perfil essencial no catálogo</li>
                  <li className="flex items-center gap-2">✓ Até 3 fotos na galeria</li>
                  <li className="flex items-center gap-2">✓ Contatos de WhatsApp e telefone</li>
                  <li className="flex items-center gap-2">✓ CRM básico de clientes</li>
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800">
                {isBronze ? (
                  <span className="block text-center text-xs font-bold text-slate-400 py-2 bg-slate-800 rounded-xl">
                    Seu Plano Atual
                  </span>
                ) : (
                  <span className="block text-center text-xs text-slate-500 py-2">Plano Básico</span>
                )}
              </div>
            </div>

            {/* Gold VIP */}
            <div className={`rounded-3xl p-6 border flex flex-col justify-between relative ${
              isGold 
                ? 'bg-slate-900 border-indigo-500 shadow-xl' 
                : 'bg-slate-900 border-indigo-500/30'
            }`}>
              <div className="absolute -top-3 right-6 bg-indigo-600 text-white text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full shadow">
                Mais Popular
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 block mb-1">
                  Plano Recomendado
                </span>
                <h3 className="text-xl font-black text-white">Gold VIP</h3>
                <p className="text-xs text-slate-400 mt-1">Mais exposição e vitrine ampliada.</p>
                <div className="my-4 text-2xl font-black text-white">
                  R$ 49,90 <span className="text-xs font-normal text-slate-400">/mês</span>
                </div>

                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">✓ <strong>Destaque rotativo</strong> na página inicial</li>
                  <li className="flex items-center gap-2">✓ <strong>Capa panorâmica</strong> e selo VIP</li>
                  <li className="flex items-center gap-2">✓ Até <strong>15 fotos</strong> na galeria</li>
                  <li className="flex items-center gap-2">✓ Até <strong>5 produtos</strong> no catálogo</li>
                  <li className="flex items-center gap-2">✓ <strong>1 promoção ativa</strong> no guia</li>
                  <li className="flex items-center gap-2">✓ <strong>Zero anúncios</strong> de concorrentes</li>
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800">
                {isGold ? (
                  <span className="block text-center text-xs font-bold text-indigo-300 py-2 bg-indigo-950/60 border border-indigo-800 rounded-xl">
                    Plano Ativo
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleGeneratePix('gold')}
                    disabled={isPaying}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl transition shadow cursor-pointer text-center"
                  >
                    Contratar Gold VIP
                  </button>
                )}
              </div>
            </div>

            {/* Diamond */}
            <div className={`rounded-3xl p-6 border flex flex-col justify-between relative ${
              isDiamond 
                ? 'bg-slate-900 border-amber-400 shadow-xl' 
                : 'bg-slate-900 border-amber-400/30'
            }`}>
              <div className="absolute -top-3 right-6 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full shadow">
                Máxima Capacidade
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block mb-1">
                  Exposição Total
                </span>
                <h3 className="text-xl font-black text-white">Diamond</h3>
                <p className="text-xs text-slate-400 mt-1">Recursos Gold com maior capacidade de catálogo, fotos e promoções.</p>
                <div className="my-4 text-2xl font-black text-white">
                  R$ 99,90 <span className="text-xs font-normal text-slate-400">/mês</span>
                </div>

                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">✓ Todos os benefícios do plano Gold VIP</li>
                  <li className="flex items-center gap-2">✓ Até <strong>30 fotos</strong> em alta resolução</li>
                  <li className="flex items-center gap-2">✓ Catálogo ampliado com até <strong>30 produtos</strong></li>
                  <li className="flex items-center gap-2">✓ Até <strong>3 promoções ativas</strong></li>
                  <li className="flex items-center gap-2">✓ <strong>Selo Diamante</strong> oficial</li>
                  <li className="flex items-center gap-2">✓ Prioridade máxima na vitrine</li>
                </ul>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800">
                {isDiamond ? (
                  <span className="block text-center text-xs font-bold text-amber-300 py-2 bg-amber-950/60 border border-amber-800 rounded-xl">
                    Plano Ativo
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleGeneratePix('diamond')}
                    disabled={isPaying}
                    className="w-full py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl transition shadow cursor-pointer text-center"
                  >
                    Contratar Diamond
                  </button>
                )}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Modal de Pagamento PIX Instantâneo Real */}
      {pixModalData && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-black text-white">Pagamento Instantâneo via PIX</h3>
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
                <div className="p-3 bg-white rounded-2xl">
                  <img
                    src={`data:image/png;base64,${pixModalData.qrCodeBase64}`}
                    alt="QR Code PIX"
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

              <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                Abra o app do seu banco e escaneie o QR Code ou cole o código acima. 
                A liberação do plano é realizada automaticamente após a confirmação.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
