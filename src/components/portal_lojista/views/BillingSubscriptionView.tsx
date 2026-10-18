/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Lojista Billing, Subscriptions & PIX Payment View
 */

import React, { useState, useEffect } from 'react';
import { 
  CreditCard, QrCode, Copy, Check, Clock, ShieldCheck, 
  ArrowUpRight, AlertCircle, Award, FileText, Download, X, HelpCircle
} from 'lucide-react';
import { Company, PlanLevel } from '../../../types';
import { SubscriptionService, Subscription } from '../../../services/subscriptionService';
import { BillingService, PixDetails } from '../../../services/BillingService';
import { PermissionButton } from '../../common/PermissionButton';

const planIdFor = (level?: string) => `plan_${level || 'bronze'}`;

interface BillingSubscriptionViewProps {
  company: Company | null;
}

export const BillingSubscriptionView: React.FC<BillingSubscriptionViewProps> = ({ company }) => {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [pixModalData, setPixModalData] = useState<PixDetails | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [payError, setPayError] = useState('');
  const [isPaying, setIsPaying] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);

  useEffect(() => {
    if (company) {
      const initialSub = SubscriptionService.createTrialSubscription(company.id, company.planLevel);
      setSub(initialSub);
      // Sync the real subscription status from the backend (source of truth).
      BillingService.getSubscriptionStatus()
        .then(status => setSub(prev => (prev ? { ...prev, status: status as any } : prev)))
        .catch(() => {});
    }
  }, [company]);

  const trialInfo = SubscriptionService.getTrialDaysRemaining(sub);

  const handleGeneratePix = async (planId: string) => {
    if (!company) return;
    setPayError('');
    setIsPaying(true);
    try {
      const pix = await BillingService.generatePixPayment(company.id, planId, 0, '');
      setPixModalData(pix);
    } catch (err: any) {
      setPayError(err?.message || 'Não foi possível gerar o pagamento PIX.');
    } finally {
      setIsPaying(false);
    }
  };

  // Re-reads the authoritative status from the backend. Activation only happens
  // server-side via the verified Mercado Pago webhook — never from the client.
  const handleCheckPaymentStatus = async () => {
    setCheckingStatus(true);
    try {
      const status = await BillingService.getSubscriptionStatus();
      if (sub) setSub({ ...sub, status: status as any });
      if (status === 'active') {
        setPixModalData(null);
      }
    } catch {
      /* keep the modal open so the user can retry */
    } finally {
      setCheckingStatus(false);
    }
  };

  const handleCopyPix = () => {
    if (!pixModalData) return;
    navigator.clipboard.writeText(pixModalData.qrCode);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  return (
    <div className="space-y-8 p-6">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Plano, Assinatura & Faturamento</h1>
        <p className="text-xs text-slate-400 mt-1">Gerencie a recorrência da sua empresa, emita PIX instantâneo e faça upgrade de plano.</p>
      </div>

      {payError && (
        <div className="p-4 bg-red-950/80 border border-red-800 text-red-300 rounded-xl text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{payError}</span>
        </div>
      )}

      {/* Trial Status Banner */}
      {sub?.status === 'trial' && (
        <div className="bg-gradient-to-r from-blue-900/60 to-indigo-900/60 border border-blue-500/40 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
              <Clock className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">Período Gratuito de Teste (7 Dias)</span>
              <h3 className="text-xl font-bold text-white mt-0.5">{trialInfo.message}</h3>
              <p className="text-xs text-slate-300">Nenhum valor será cobrado sem a sua autorização. Assine para não perder visibilidade.</p>
            </div>
          </div>

          <button
            onClick={() => handleGeneratePix(planIdFor(company?.planLevel))}
            disabled={isPaying}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-slate-950 font-black text-xs rounded-xl shadow-lg transition shrink-0"
          >
            {isPaying ? 'Gerando PIX...' : 'Assinar Agora via PIX'}
          </button>
        </div>
      )}

      {/* Current Plan Overview Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Award className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Seu Plano Ativo</span>
              <h2 className="text-2xl font-black text-white capitalize">{company?.planLevel || 'Bronze'}</h2>
              <span className="text-xs font-semibold text-emerald-400">R$ {sub?.priceMonthly || 49} / mês</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 font-bold text-xs rounded-xl text-white shadow-lg transition"
            >
              Fazer Upgrade de Plano
            </button>
            <button
              onClick={() => setShowCancelModal(true)}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-red-400 font-semibold text-xs rounded-xl border border-slate-700 transition"
            >
              Cancelar Assinatura
            </button>
          </div>
        </div>

        {/* Next Billing Date */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 font-bold uppercase">Status do Faturamento</span>
            <span className="text-sm font-bold text-emerald-400 block capitalize">{sub?.status || 'Ativo'}</span>
          </div>
          <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 font-bold uppercase">Próxima Renovação</span>
            <span className="text-sm font-bold text-white block">
              {sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString('pt-BR') : '24/08/2026'}
            </span>
          </div>
          <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 font-bold uppercase">Forma de Pagamento</span>
            <span className="text-sm font-bold text-white block">PIX Recorrente / Mercado Pago</span>
          </div>
        </div>
      </div>

      {/* PIX Modal */}
      {pixModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-6 shadow-2xl text-center">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-400" />
                <span>Pagamento via PIX Mercado Pago</span>
              </h3>
              <button onClick={() => setPixModalData(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-white p-4 rounded-2xl inline-block mx-auto shadow-inner">
              {pixModalData.qrCodeBase64 ? (
                <img
                  src={`data:image/png;base64,${pixModalData.qrCodeBase64}`}
                  alt="QR Code PIX Mercado Pago"
                  className="w-44 h-44 rounded-xl object-contain"
                />
              ) : (
                <div className="w-44 h-44 bg-slate-200 rounded-xl flex items-center justify-center font-mono text-slate-800 text-xs font-bold border-2 border-dashed border-slate-400">
                  Use o Copia e Cola abaixo
                </div>
              )}
            </div>

            <div className="space-y-2">
              <span className="text-xs text-slate-400 font-bold uppercase">Código PIX Copia e Cola</span>
              <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 flex items-center justify-between text-xs">
                <span className="truncate font-mono text-slate-300 max-w-[240px]">{pixModalData.qrCode}</span>
                <button
                  onClick={handleCopyPix}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition flex items-center gap-1 shrink-0"
                >
                  {copiedPix ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedPix ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Após o pagamento, a confirmação do Mercado Pago pode levar alguns instantes. Sua assinatura é ativada automaticamente assim que o pagamento for aprovado.
            </p>

            <button
              onClick={handleCheckPaymentStatus}
              disabled={checkingStatus}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-60 text-slate-950 font-black rounded-xl text-xs shadow-lg transition"
            >
              {checkingStatus ? 'Verificando...' : 'Já paguei — Verificar status'}
            </button>
          </div>
        </div>
      )}

      {/* Upgrade Pro-Rata Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-white">Upgrade Pro-Rata de Plano</h3>
              <button onClick={() => setShowUpgradeModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Ao realizar o upgrade hoje, você pagará apenas a <strong>diferença proporcional</strong> referente aos dias restantes do seu ciclo mensal.
            </p>

            <div className="space-y-3">
              {[
                { code: 'gold_vip', name: 'Plano Gold VIP', price: 49.9, diff: 49.9 },
                { code: 'diamond_extremo', name: 'Plano Diamond Extremo', price: 99.9, diff: 99.9 }
              ].map(p => (
                <div key={p.code} className="p-4 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white text-sm block">{p.name}</span>
                    <span className="text-xs text-emerald-400 font-semibold">Pro-Rata: R$ {p.diff} agora</span>
                  </div>
                  <button
                    onClick={() => {
                      handleGeneratePix(`plan_${p.code}`);
                      setShowUpgradeModal(false);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition"
                  >
                    Confirmar Upgrade
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-white text-red-400">Cancelar Assinatura</h3>
              <button onClick={() => setShowCancelModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Seus dados, produtos e configurações serão <strong>mantidos salvos por 90 dias</strong> sem exclusão! Conte-nos o motivo do cancelamento:
            </p>

            <textarea
              rows={3}
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="Descreva o motivo (ex: custo, mudança de cidade...)"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white"
            />

            <button
              onClick={() => {
                alert('Assinatura cancelada. Seus dados ficarão armazenados em quarentena por 90 dias.');
                setShowCancelModal(false);
                if (sub) setSub({ ...sub, status: 'canceled' });
              }}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition"
            >
              Confirmar Cancelamento
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
