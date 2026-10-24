import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  ArrowLeft,
  CreditCard,
  QrCode,
  LockKeyhole,
  CheckCircle2,
  Loader2,
  Copy,
  Check,
  Building2,
  Clock,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Zap,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/apiClient';
import { readPendingPurchase, clearPendingPurchase, savePendingPurchase } from '../lib/pendingPurchase';
import { BillingService, PixDetails } from '../services/BillingService';
import { MercadoPagoCard } from '../components/common/MercadoPagoCard';
import { Company } from '../types';
import { useSEO } from '../hooks/useSEO';
import { maskPhone } from '../utils/validators';

interface Gateway {
  publicKey: string;
  pixEnabled: boolean;
  cardEnabled: boolean;
}

interface CheckoutQuote {
  amount: number;
  originalAmount: number;
  couponCode: string | null;
  expiresAt?: string;
  notice?: string;
}

interface Plan {
  id: string;
  name: string;
  displayName?: string;
  price: number;
  description?: string;
  trialDays?: number;
  features?: string[];
}

const money = (amount: number) =>
  amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const PLAN_DISPLAY_NAMES: Record<string, string> = {
  plan_bronze: 'Bronze (Presença Essencial)',
  plan_gold_vip: 'Gold VIP (Destaque Comercial)',
  plan_diamond_extremo: 'Diamond Extremo (Liderança Regional)'
};

type CheckoutState =
  | 'loading'
  | 'ready'
  | 'processing'
  | 'pending_pix'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'unavailable';

interface PaymentCountdownTimerProps {
  secondsRemaining: number | null;
  checkingStatus: boolean;
  onCheckStatus: () => void;
  isExpired?: boolean;
  onStartNewAttempt?: () => void;
}

function PaymentCountdownTimer({
  secondsRemaining,
  checkingStatus,
  onCheckStatus,
  isExpired,
  onStartNewAttempt
}: PaymentCountdownTimerProps) {
  const minutes = secondsRemaining !== null ? Math.floor(secondsRemaining / 60) : 5;
  const seconds = secondsRemaining !== null ? secondsRemaining % 60 : 0;
  const isExpiringSoon = secondsRemaining !== null && secondsRemaining < 60;
  const hasExpired = isExpired || (secondsRemaining !== null && secondsRemaining <= 0);

  return (
    <div className="mt-5 rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-5 sm:p-7 shadow-xl border border-slate-800 relative overflow-hidden">
      {/* Luz ambiente decorativa */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header com Status Ativo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 w-fit">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] font-black tracking-wider uppercase text-emerald-400">
            Aguardando Pagamento em Tempo Real
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
          <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
          <span>Sessão Criptografada • Pagamento Seguro</span>
        </div>
      </div>

      {/* Informações do Prazo */}
      <div className="py-4 text-center space-y-2">
        <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
          {hasExpired ? 'Tentativa expirada' : isExpiringSoon ? 'Atenção ao tempo' : 'Prazo de conclusão'}
        </div>
        <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
          Tempo restante para concluir esta tentativa de pagamento:
        </p>

        {/* Display Numérico Digital dos Minutos e Segundos */}
        {!hasExpired ? (
          <div className="flex items-center justify-center gap-2 sm:gap-3 pt-2 pb-1">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-900 border border-slate-700/80 flex items-center justify-center text-3xl sm:text-4xl font-black font-mono tracking-tight text-white shadow-inner">
                {String(minutes).padStart(2, '0')}
              </div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mt-1.5">Minutos</span>
            </div>

            <div className="text-2xl sm:text-3xl font-black text-slate-600 mb-5 animate-pulse">:</div>

            <div className="flex flex-col items-center">
              <div
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-900 border flex items-center justify-center text-3xl sm:text-4xl font-black font-mono tracking-tight shadow-inner transition-colors ${
                  isExpiringSoon
                    ? 'border-red-500 text-red-400 bg-red-950/40 animate-pulse'
                    : 'border-slate-700/80 text-emerald-400'
                }`}
              >
                {String(seconds).padStart(2, '0')}
              </div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mt-1.5">Segundos</span>
            </div>
          </div>
        ) : (
          <div className="py-3">
            <span className="px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 font-bold text-xs sm:text-sm inline-block">
              Tentativa expirada. Inicie uma nova contratação abaixo.
            </span>
          </div>
        )}

        {/* Barra sutil de progresso */}
        {!hasExpired && secondsRemaining !== null && (
          <div className="w-full max-w-xs mx-auto bg-slate-800 rounded-full h-1.5 overflow-hidden mt-3">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                isExpiringSoon ? 'bg-red-500' : 'bg-gradient-to-r from-emerald-500 to-teal-400'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, (secondsRemaining / 1800) * 100))}%` }}
            />
          </div>
        )}
      </div>

      {/* Botões de Ação */}
      <div className="pt-2 flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={onCheckStatus}
          disabled={checkingStatus || hasExpired}
          className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-sm transition-all duration-200 flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/20 active:scale-[0.99] cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={16} className={checkingStatus ? 'animate-spin text-slate-950' : 'text-slate-950'} />
          <span>{checkingStatus ? 'Consultando provedor…' : 'Verificar pagamento agora'}</span>
        </button>

        {onStartNewAttempt && (
          <button
            type="button"
            onClick={onStartNewAttempt}
            className="px-5 py-3.5 rounded-2xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm transition-all cursor-pointer"
          >
            Nova tentativa
          </button>
        )}
      </div>

      {/* Micro-benefícios de Confiança */}
      <div className="grid grid-cols-3 gap-2 pt-4 mt-4 border-t border-slate-800/60 text-center text-[10px] font-semibold text-slate-400">
        <div className="flex flex-col items-center gap-1">
          <span className="text-emerald-400 text-xs">⚡</span>
          <span>Reconhecimento Automático</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-emerald-400 text-xs">🛡️</span>
          <span>Transação Segura</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-emerald-400 text-xs">✨</span>
          <span>Ativação Instantânea</span>
        </div>
      </div>
    </div>
  );
}

interface ThankYouApprovedPageProps {
  plan: Plan | null;
  companyName: string;
  subscriptionId: string;
  reservedAmount: number | null;
  method: 'card' | 'pix';
  onNavigateTab: (tab: string) => void;
}

function ThankYouApprovedPage({
  plan,
  companyName,
  subscriptionId,
  reservedAmount,
  method,
  onNavigateTab
}: ThankYouApprovedPageProps) {
  const [secondsLeft, setSecondsLeft] = useState(3);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          clearPendingPurchase();
          onNavigateTab('painel');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onNavigateTab]);

  const handleGoToPanelNow = () => {
    clearPendingPurchase();
    onNavigateTab('painel');
  };

  const isDiamond = plan?.id?.includes('diamond');
  const isGold = plan?.id?.includes('gold');

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-10 px-4 sm:px-6">
      <div className="max-w-xl w-full bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 text-center shadow-xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Glow de fundo */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Ícone de Sucesso com Pulso */}
        <div className="relative mx-auto w-20 h-20 sm:w-24 sm:h-24 mb-6">
          <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-xl animate-pulse" />
          <div className="relative w-full h-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/30">
            <CheckCircle2 size={48} strokeWidth={2.5} />
          </div>
          <div className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 p-1.5 rounded-full shadow-md">
            <Sparkles size={16} />
          </div>
        </div>

        {/* Título Oficial Exato para testes e acessibilidade */}
        <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight mb-2">
          Pagamento confirmado com sucesso!
        </h1>

        <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed mb-6">
          Obrigado por sua contratação! O plano{' '}
          <span className="font-extrabold text-slate-900">{plan?.displayName || plan?.name}</span>{' '}
          foi ativado com sucesso para{' '}
          <span className="font-extrabold text-slate-900">{companyName}</span>.
        </p>

        {/* Card Resumo da Transação */}
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-3 mb-6 text-xs sm:text-sm">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
            <span className="text-slate-500 font-medium">Plano Contratado</span>
            <span className="font-black text-slate-900 flex items-center gap-1.5">
              {plan?.displayName || plan?.name}
              <span
                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                  isDiamond
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : isGold
                    ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                    : 'bg-slate-200 text-slate-800'
                }`}
              >
                {isDiamond ? 'Diamond' : isGold ? 'Gold VIP' : 'Ativo'}
              </span>
            </span>
          </div>

          <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
            <span className="text-slate-500 font-medium">Empresa</span>
            <span className="font-bold text-slate-900 truncate max-w-[220px]">{companyName}</span>
          </div>

          <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
            <span className="text-slate-500 font-medium">Forma de Pagamento</span>
            <span className="font-semibold text-slate-800">
              {method === 'pix' ? 'Pix Oficial Instantâneo' : 'Cartão de Crédito'}
            </span>
          </div>

          {reservedAmount !== null && (
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
              <span className="text-slate-500 font-medium">Valor</span>
              <span className="font-black text-emerald-700">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reservedAmount)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-slate-500 font-medium">Status</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Ativado no Sistema
            </span>
          </div>
        </div>

        {/* Caixa de Redirecionamento Automático em 3 Segundos */}
        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 mb-6 space-y-2">
          <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-emerald-950">
            <Clock size={16} className="text-emerald-700 animate-spin" />
            <span>
              Redirecionando para o seu Painel em {secondsLeft} {secondsLeft === 1 ? 'segundo' : 'segundos'}...
            </span>
          </div>

          {/* Barra de Progresso Suave (3s -> 0s) */}
          <div className="w-full bg-emerald-200/60 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${Math.max(0, Math.min(100, ((3 - secondsLeft) / 3) * 100))}%` }}
            />
          </div>
          <p className="text-[11px] text-emerald-800">
            Você será direcionado automaticamente para personalizar seu anúncio e fotos.
          </p>
        </div>

        {/* Botão de Escape / Acesso Imediato */}
        <button
          type="button"
          onClick={handleGoToPanelNow}
          className="w-full py-4 px-6 rounded-2xl bg-slate-950 hover:bg-slate-800 text-white font-black text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-slate-950/20 active:scale-[0.99] cursor-pointer"
        >
          <span>Acessar meu painel e completar anúncio</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

export function CheckoutPage({ onNavigateTab }: { onNavigateTab: (tab: string) => void }) {
  const { user, isAuthenticated } = useAuth();
  const [intent] = useState(readPendingPurchase);

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [method, setMethod] = useState<'card' | 'pix'>('card');

  const [gateway, setGateway] = useState<Gateway | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyChoice, setCompanyChoice] = useState(intent?.companyId || '');

  const [checkoutState, setCheckoutState] = useState<CheckoutState>('loading');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);

  const [pix, setPix] = useState<PixDetails | null>(null);
  const [subscriptionId, setSubscriptionId] = useState('');
  const [copied, setCopied] = useState(false);
  const [attemptExpiresAt, setAttemptExpiresAt] = useState<string | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);
  const [quoteState, setQuoteState] = useState<{ scope: string; quote: CheckoutQuote } | null>(null);
  const [quoteError, setQuoteError] = useState('');
  const [reservedAmount, setReservedAmount] = useState<number | null>(null);
  const quoteScope = `${user?.id || ''}:${plan?.id || ''}:${method}`;
  const currentQuote = quoteState?.scope === quoteScope ? quoteState.quote : null;
  const payableAmount = reservedAmount ?? currentQuote?.amount ?? plan?.price ?? 0;

  useEffect(() => {
    setQuoteError('');
    if (!isAuthenticated || !plan) return;
    let active = true;
    api.get<CheckoutQuote>(`/api/payments/quote?planId=${encodeURIComponent(plan.id)}&method=${method}`)
      .then(quote => {
        if (!Number.isFinite(quote.amount) || quote.amount < 0) throw new Error('Valor indisponível.');
        if (active) setQuoteState({ scope: quoteScope, quote });
      })
      .catch(() => { if (active) { setQuoteState(null); setQuoteError('Não foi possível confirmar o valor. Recarregue antes de pagar.'); } });
    return () => { active = false; };
  }, [isAuthenticated, quoteScope]);

  const formRef = useRef<HTMLFormElement>(null);
  const preparedCompany = useRef('');
  const attemptKey = useRef('');
  const requestId = useRef(crypto.randomUUID());
  const submitLock = useRef(false);

  const formatCountdown = (secs: number | null) => {
    if (secs === null) return '05:00';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleStartNewAttempt = () => {
    if (companyChoice && plan) {
      BillingService.cancelAttempt(companyChoice, plan.id).catch(() => {});
    }
    setReservedAmount(null);
    setSubscriptionId('');
    setPix(null);
    setAttemptExpiresAt(null);
    setSecondsRemaining(null);
    setError('');
    setCheckoutState('ready');
    if (attemptKey.current) sessionStorage.removeItem(attemptKey.current);
    const pixAttemptKey = companyChoice && plan ? `itapoa_pix_attempt_${user?.id}_${companyChoice}_${plan.id}` : '';
    if (pixAttemptKey) sessionStorage.removeItem(pixAttemptKey);
    requestId.current = crypto.randomUUID();
  };

  useSEO({
    title: 'Checkout Seguro — Finalize seu Plano no Itapoá Online',
    description: 'Contrate seu plano de presença comercial no Itapoá Online com segurança via Cartão ou Pix oficial.'
  });

  // 1. Carregar configuração do Gateway e Dados do Plano
  useEffect(() => {
    let canceled = false;
    Promise.all([
      api.get<Gateway>('/api/payments/config').catch(() => null),
      api.get<Plan[]>('/api/plans').catch(() => [])
    ])
      .then(([config, plans]) => {
        if (canceled) return;
        if (!config) {
          setCheckoutState('unavailable');
          setError('Sistema de pagamentos temporariamente indisponível. Tente novamente mais tarde.');
          return;
        }

        setGateway(config);

        // Se cartão estiver desabilitado e Pix ativo, ajusta aba padrão para Pix
        if (!config.cardEnabled && config.pixEnabled) {
          setMethod('pix');
        }

        const selected = plans.find((p) => p.id === intent?.planId);
        if (selected) {
          setPlan({ ...selected, price: Number(selected.price) });
          setCheckoutState('ready');
        } else if (intent) {
          setCheckoutState('unavailable');
          setError('O plano selecionado não está mais disponível. Volte e escolha outro plano.');
        } else {
          setCheckoutState('ready');
        }
      })
      .catch((e: any) => {
        if (!canceled) {
          setCheckoutState('unavailable');
          setError('Não foi possível carregar as opções de pagamento.');
        }
      });

    return () => {
      canceled = true;
    };
  }, [intent]);

  // 2. Carregar empresas do usuário autenticado para vinculação
  useEffect(() => {
    if (!isAuthenticated) return;
    let canceled = false;
    api
      .get<Company[]>('/api/account/companies')
      .then((rows) => {
        if (!canceled && Array.isArray(rows)) {
          setCompanies(rows);
          if (!companyChoice && rows.length > 0) {
            setCompanyChoice(rows[0].id);
          }
        }
      })
      .catch(() => {});
    return () => {
      canceled = true;
    };
  }, [isAuthenticated]);

  // 3. Atualizar dados de contato caso o usuário logue durante o checkout
  useEffect(() => {
    if (user) {
      if (!name && user.name) setName(user.name);
      if (!email && user.email) setEmail(user.email);
      if (!phone && user.phone) setPhone(user.phone);
    }
  }, [user]);

  // 4. Recuperação automática de Pix ativo para a empresa/plano (resiliência após reload)
  useEffect(() => {
    if (!isAuthenticated || !plan || !companyChoice || pix || subscriptionId) return;

    let canceled = false;
    BillingService.getActivePix(companyChoice, plan.id)
      .then((existing) => {
        if (!canceled && existing && existing.qrCode) {
          setPix(existing);
          setReservedAmount(existing.amount);
          setSubscriptionId(existing.subscriptionId);
          setAttemptExpiresAt(existing.expirationDate);
          setMethod('pix');
          setCheckoutState('pending_pix');
        }
      })
      .catch(() => {});

    return () => {
      canceled = true;
    };
  }, [isAuthenticated, plan, companyChoice]);

  // Resume the server-owned card attempt; never replay card details on reload.
  useEffect(() => {
    if (!isAuthenticated || !plan || !companyChoice || pix || subscriptionId) return;
    let active = true;
    api.get<{ subscriptionId: string; status: string; paymentMethod: string; amount: number; expiresAt?: string } | null>(`/api/payments/attempt/active?companyId=${encodeURIComponent(companyChoice)}&planId=${encodeURIComponent(plan.id)}`)
      .then(attempt => {
        if (!active || !attempt?.subscriptionId) return;
        if (attempt.status === 'active') {
          setSubscriptionId(attempt.subscriptionId);
          setReservedAmount(Number(attempt.amount));
          setCheckoutState('approved');
          clearPendingPurchase();
        } else if (attempt.status === 'pending' && (attempt.paymentMethod === 'card' || attempt.paymentMethod === 'credit_card')) {
          setSubscriptionId(attempt.subscriptionId);
          setReservedAmount(Number(attempt.amount));
          setMethod('card');
          if (attempt.expiresAt) setAttemptExpiresAt(attempt.expiresAt);
          setCheckoutState('processing');
        }
      }).catch(() => { /* Preserve the selected purchase during a transient failure. */ });
    return () => { active = false; };
  }, [isAuthenticated, plan, companyChoice, pix, subscriptionId]);

  // 5. Polling contínuo do status da assinatura enquanto estiver pendente
  useEffect(() => {
    if (!subscriptionId || checkoutState === 'approved' || checkoutState === 'expired') return;

    let canceled = false;
    const check = async () => {
      try {
        const details = await BillingService.getSubscriptionStatusDetails(subscriptionId);
        if (canceled) return;
        if (details.expiresAt) {
          setAttemptExpiresAt(details.expiresAt);
        }
        if (details.status === 'active') {
          setCheckoutState('approved');
          clearPendingPurchase();
          if (attemptKey.current) sessionStorage.removeItem(attemptKey.current);
        } else if (details.status === 'canceled' || details.status === 'rejected') {
          setCheckoutState('rejected');
          setError('Pagamento não concluído. Você pode tentar novamente com outro cartão ou via Pix.');
        } else if (details.status === 'expired') {
          setCheckoutState('expired');
          setError('Tempo esgotado. Esta tentativa de contratação expirou. Para continuar, inicie novamente o processo.');
        }
      } catch {
        // Falhas transitórias de rede não alteram estado
      }
    };

    void check();
    const interval = window.setInterval(check, 3000);
    return () => {
      canceled = true;
      window.clearInterval(interval);
    };
  }, [subscriptionId, checkoutState]);

  // Countdown is informational: only the gateway can settle/cancel a charge.
  useEffect(() => {
    if (!attemptExpiresAt || checkoutState === 'approved' || checkoutState === 'ready' || checkoutState === 'expired') return;

    const target = new Date(attemptExpiresAt).getTime();
    const tick = () => {
      const remainingSecs = Math.max(0, Math.floor((target - Date.now()) / 1000));
      setSecondsRemaining(remainingSecs);
      if (remainingSecs <= 0) {
        setError('O prazo informado terminou. Confirme o status do pagamento antes de iniciar outra cobrança.');
      }
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [attemptExpiresAt, checkoutState]);

  // Preparação idempotente da empresa
  const prepare = async (): Promise<string> => {
    if (!formRef.current?.reportValidity()) {
      throw new Error('Por favor, preencha nome, telefone e e-mail antes de prosseguir.');
    }
    if (!isAuthenticated) {
      throw new Error('Entre na sua conta para vincular o pagamento à sua empresa.');
    }
    if (!plan) {
      throw new Error('Plano indisponível. Volte e selecione um plano válido.');
    }
    if (preparedCompany.current) {
      return preparedCompany.current;
    }

    const result = await api.post<{ companyId: string }>('/api/checkout/company', {
      contact: { name, phone, email },
      planId: plan.id,
      ...(companyChoice ? { companyId: companyChoice } : {})
    });

    preparedCompany.current = result.companyId;
    savePendingPurchase(plan.id, result.companyId);
    return result.companyId;
  };

  // Gerar QR Code Pix Oficial
  const generatePix = async () => {
    if (submitLock.current || !plan) return;
    if (!currentQuote) { setError('Aguarde a confirmação do valor antes de pagar.'); return; }
    const purchaseQuote = currentQuote;
    submitLock.current = true;
    setBusy(true);
    setError('');

    try {
      const companyId = await prepare();

      // Planos gratuitos não geram cobrança bancária
      if (plan.price === 0) {
        clearPendingPurchase();
        onNavigateTab('painel');
        return;
      }

      const pixAttemptKey = `itapoa_pix_attempt_${user?.id}_${companyId}_${plan.id}`;
      let pixReqId = sessionStorage.getItem(pixAttemptKey);
      if (!pixReqId || !/^[a-f0-9-]{36}$/i.test(pixReqId)) {
        pixReqId = crypto.randomUUID();
        sessionStorage.setItem(pixAttemptKey, pixReqId);
      }

      const details = await BillingService.generatePixPayment(
        companyId,
        plan.id,
        0,
        email,
        name,
        undefined,
        pixReqId,
        purchaseQuote.couponCode || undefined,
        purchaseQuote.amount
      );

      if (!details.qrCode) {
        throw new Error('O Mercado Pago não retornou o código Pix. Não efetue transferência sem o código oficial.');
      }

      setPix(details);
      setReservedAmount(details.amount);
      setSubscriptionId(details.subscriptionId);
      setAttemptExpiresAt(details.expirationDate || null);
      setCheckoutState('pending_pix');
    } catch (e: any) {
      setError(e?.message || 'Não foi possível gerar a cobrança Pix no momento.');
    } finally {
      submitLock.current = false;
      setBusy(false);
    }
  };

  // Pagar com Cartão de Crédito
  const payCard = async (formData: Record<string, unknown>) => {
    if (submitLock.current || !plan) {
      throw new Error('Aguarde o processamento da tentativa atual.');
    }
    if (!currentQuote) throw new Error('Aguarde a confirmação do valor antes de pagar.');
    const purchaseQuote = currentQuote;
    submitLock.current = true;
    setBusy(true);
    setCheckoutState('processing');
    setError('');

    try {
      const companyId = await prepare();
      const payer = (formData.payer || {}) as Record<string, unknown>;

      attemptKey.current = `itapoa_card_attempt_${user?.id}_${companyId}_${plan.id}`;
      const previousAttempt = sessionStorage.getItem(attemptKey.current);
      if (previousAttempt && /^[a-f0-9-]{36}$/i.test(previousAttempt)) {
        requestId.current = previousAttempt as `${string}-${string}-${string}-${string}-${string}`;
      }
      sessionStorage.setItem(attemptKey.current, requestId.current);

      const result = await api.post<{ subscriptionId: string; status: string; expiresAt?: string }>(
        '/api/payments/card',
        {
          companyId,
          planId: plan.id,
          requestId: requestId.current,
          couponCode: purchaseQuote.couponCode || undefined,
          quotedAmount: purchaseQuote.amount,
          formData: { ...formData, payer: { ...payer, email } }
        }
      );

      if (result.status === 'rejected' || result.status === 'cancelled') {
        sessionStorage.removeItem(attemptKey.current);
        requestId.current = crypto.randomUUID();
        setCheckoutState('rejected');
        throw new Error('Pagamento recusado pela operadora. Confira os dados do cartão ou escolha pagar com Pix.');
      }

      setSubscriptionId(result.subscriptionId);
      setReservedAmount(purchaseQuote.amount);
      setAttemptExpiresAt(result.expiresAt || null);
      // Gateway approval alone is not proof of activation. Only the backend
      // status poll/reconciliation may show success after the DB transaction.
      setCheckoutState('processing');
    } catch (e: any) {
      setError(e?.message || 'Não foi possível processar o pagamento com cartão.');
      if (checkoutState !== 'approved') {
        setCheckoutState('ready');
      }
      throw e;
    } finally {
      submitLock.current = false;
      setBusy(false);
    }
  };

  // Verificação manual de status (Reconciliação imediata)
  const handleCheckStatusNow = async () => {
    if (!subscriptionId || checkingStatus) return;
    setCheckingStatus(true);
    try {
      const res = await BillingService.reconcilePayment(subscriptionId);
      if (res.status === 'active') {
        setCheckoutState('approved');
        clearPendingPurchase();
      } else {
        if (res.status === 'canceled' || res.status === 'rejected') setCheckoutState('rejected');
        if (method === 'pix' && !pix && companyChoice && plan) {
          const recovered = await BillingService.getActivePix(companyChoice, plan.id);
          if (recovered?.qrCode) { setPix(recovered); setCheckoutState('pending_pix'); }
        }
        setError(res.message || 'Ainda não foi possível confirmar a ativação. Aguarde antes de tentar outra cobrança.');
      }
    } catch {
      setError('Ainda aguardando a compensação bancária oficial.');
    } finally {
      setCheckingStatus(false);
    }
  };

  // Nome formatado da empresa vinculada
  const selectedCompanyName = useMemo(() => {
    if (companyChoice) {
      const found = companies.find((c) => c.id === companyChoice);
      if (found) return found.name;
    }
    return name ? `${name} (Novo anúncio)` : 'Novo anúncio comercial';
  }, [companyChoice, companies, name]);

  // Se não houver plano selecionado na sessão
  if (!intent) {
    return (
      <section className="min-h-[70vh] flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-sm">
          <div className="w-16 h-16 bg-red-50 text-[#C8102E] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles size={28} />
          </div>
          <h1 className="text-2xl font-black text-slate-900">Escolha seu plano</h1>
          <p className="text-sm text-slate-500 mt-2 mb-6">
            Selecione uma opção de destaque para sua empresa no catálogo comercial de Itapoá.
          </p>
          <button
            onClick={() => onNavigateTab('planos')}
            className="w-full py-3.5 px-6 rounded-xl bg-slate-950 text-white font-bold hover:bg-slate-800 transition"
          >
            Ver catálogo de planos
          </button>
        </div>
      </section>
    );
  }

  const isFree = plan?.price === 0;

  if (checkoutState === 'approved') {
    return (
      <div className="min-h-screen bg-slate-50/50 py-8 md:py-14 px-4 sm:px-6">
        <ThankYouApprovedPage
          plan={plan}
          companyName={selectedCompanyName}
          subscriptionId={subscriptionId}
          reservedAmount={reservedAmount}
          method={method}
          onNavigateTab={onNavigateTab}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 md:py-14 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        {/* Botão de retorno seguro */}
        <button
          onClick={() => {
            clearPendingPurchase();
            onNavigateTab('planos');
          }}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950 transition mb-6"
        >
          <ArrowLeft size={16} /> Voltar para todos os planos
        </button>

        {/* Layout Grid Responsivo: 360px -> 1920px */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px] gap-6 lg:gap-8 items-start">
          {/* COLUNA PRINCIPAL: Formulário & Meios de Pagamento */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 md:p-10 shadow-sm">
            <div className="flex items-center justify-between gap-4 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-red-50 text-[#C8102E]">
                <ShieldCheck size={14} /> Checkout Seguro
              </span>
              <span className="text-xs text-slate-400 font-medium">Itapoá Online</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight uppercase">
              Finalize sua assinatura
            </h1>
            <p className="text-sm text-slate-500 mt-1 mb-6">
              Complete os dados de contato. Você poderá preencher fotos, horário e cardápio logo após a confirmação.
            </p>

            {/* Alerta de erro acessível com ação de descarte automático */}
            {error && (
              <div
                role="alert"
                aria-live="assertive"
                className="p-5 mb-6 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-sm space-y-3"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle size={20} className="text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold text-red-950">Aviso no pagamento</p>
                    <p className="mt-0.5 leading-relaxed text-red-900 text-xs sm:text-sm">{error}</p>
                  </div>
                </div>
                {(error.toLowerCase().includes('tentativa') || error.toLowerCase().includes('cobrança') || error.toLowerCase().includes('andamento') || error.toLowerCase().includes('reconciliação')) && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-red-200/70">
                    <button
                      type="button"
                      onClick={async () => {
                        if (companyChoice && plan) {
                          await BillingService.cancelAttempt(companyChoice, plan.id);
                        }
                        handleStartNewAttempt();
                      }}
                      className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white font-bold text-xs transition cursor-pointer shadow-sm"
                    >
                      Descartar tentativa anterior e tentar novamente
                    </button>
                    {subscriptionId && (
                      <button
                        type="button"
                        onClick={handleCheckStatusNow}
                        disabled={checkingStatus}
                        className="px-3.5 py-2 rounded-xl bg-white border border-red-300 text-red-950 hover:bg-red-100 font-bold text-xs transition cursor-pointer"
                      >
                        {checkingStatus ? 'Consultando provedor…' : 'Consultar status no provedor'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ESTADO: EXPIRADO (Prazo de 5 minutos esgotado) */}
            {checkoutState === 'expired' && (
              <div className="py-8 px-6 bg-amber-50 border border-amber-200 rounded-3xl text-center space-y-4 shadow-sm">
                <div className="w-16 h-16 bg-amber-500 text-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <Clock size={36} />
                </div>
                <h2 className="text-2xl font-black text-amber-950">Tempo esgotado</h2>
                <p className="text-sm text-amber-900 max-w-md mx-auto leading-relaxed">
                  Tempo esgotado. Esta tentativa de contratação expirou. Para continuar, inicie novamente o processo.
                </p>
                <div className="pt-4">
                  <button
                    type="button"
                    onClick={handleStartNewAttempt}
                    className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-slate-950 text-white font-bold hover:bg-slate-800 transition shadow-sm cursor-pointer"
                  >
                    Iniciar nova contratação
                  </button>
                </div>
              </div>
            )}

            {/* ESTADO: FORMULÁRIO DE CONTRATAÇÃO (NÃO APROVADO E NÃO EXPIRADO) */}
            {checkoutState !== 'approved' && checkoutState !== 'expired' && (
              <>
                {/* 1. Dados Básicos do Titular */}
                <form
                  ref={formRef}
                  onSubmit={(e) => e.preventDefault()}
                  className="space-y-4"
                  aria-label="Dados de contato do contratante"
                >
                  <div>
                    <label htmlFor="checkout-name" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Nome completo do responsável *
                    </label>
                    <input
                      id="checkout-name"
                      type="text"
                      autoComplete="name"
                      required
                      minLength={2}
                      maxLength={120}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: João da Silva"
                      disabled={busy || Boolean(subscriptionId)}
                      className="w-full px-4 py-3 text-base rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:border-transparent transition bg-slate-50/30"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="checkout-phone" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        WhatsApp / Telefone *
                      </label>
                      <input
                        id="checkout-phone"
                        type="tel"
                        autoComplete="tel"
                        required
                        minLength={14}
                        maxLength={15}
                        placeholder="(47) 99999-0000"
                        value={phone}
                        onChange={(e) => setPhone(maskPhone(e.target.value))}
                        disabled={busy || Boolean(subscriptionId)}
                        className="w-full px-4 py-3 text-base rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:border-transparent transition bg-slate-50/30"
                      />
                    </div>
                    <div>
                      <label htmlFor="checkout-email" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        E-mail de confirmação *
                      </label>
                      <input
                        id="checkout-email"
                        type="email"
                        autoComplete="email"
                        required
                        maxLength={254}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="contato@suaempresa.com.br"
                        disabled={busy || Boolean(subscriptionId)}
                        className="w-full px-4 py-3 text-base rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:border-transparent transition bg-slate-50/30"
                      />
                    </div>
                  </div>
                </form>

                {/* Bloco de Autenticação Necessária */}
                {!isAuthenticated ? (
                  <div className="mt-8 pt-6 border-t border-slate-200">
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-4 text-center sm:text-left">
                      <p className="text-sm font-semibold text-slate-900">Autenticação necessária</p>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Entre na sua conta para garantir que o plano seja vinculado com segurança à sua empresa. Seu plano e dados digitados serão preservados.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={() => onNavigateTab('login')}
                        className="flex-1 py-3.5 px-6 rounded-xl bg-slate-950 text-white font-bold hover:bg-slate-800 transition text-center"
                      >
                        Já tenho conta (Entrar)
                      </button>
                      <button
                        onClick={() => onNavigateTab('cadastro')}
                        className="flex-1 py-3.5 px-6 rounded-xl border border-slate-300 text-slate-900 font-bold hover:bg-slate-50 transition text-center"
                      >
                        Criar nova conta
                      </button>
                    </div>
                  </div>
                ) : isFree ? (
                  /* Plano Gratuito */
                  <div className="mt-8 pt-6 border-t border-slate-200">
                    <button
                      disabled={busy}
                      onClick={generatePix}
                      className="w-full py-4 px-6 rounded-xl bg-slate-950 text-white font-bold hover:bg-slate-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {busy && <Loader2 size={18} className="animate-spin" />}
                      {busy ? 'Ativando plano gratuito…' : 'Continuar com plano gratuito'}
                    </button>
                  </div>
                ) : (
                  /* Pagamento Pago: Cartão ou Pix */
                  <div className="mt-8 pt-6 border-t border-slate-200">
                    {/* Seletor de método de pagamento (Cartão vs Pix) */}
                    {/* Seletor de método de pagamento (Cartão vs Pix) */}
                    {!subscriptionId && (
                      <div className="mb-6">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5">
                          Forma de pagamento
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="group" aria-label="Selecione o meio de pagamento">
                          <button
                            type="button"
                            aria-label="Pix oficial"
                            aria-pressed={method === 'pix'}
                            onClick={() => setMethod('pix')}
                            disabled={busy}
                            className={`flex items-center gap-3 p-4 rounded-2xl font-bold border-2 transition text-left cursor-pointer ${
                              method === 'pix'
                                ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 shadow-sm'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              method === 'pix' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                            }`}>
                              <QrCode size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black">PIX</span>
                                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Instantâneo</span>
                              </div>
                              <span className="text-xs text-slate-500 font-normal block truncate">Pagamento instantâneo via QR Code</span>
                            </div>
                          </button>

                          <button
                            type="button"
                            aria-label="Cartão de crédito"
                            aria-pressed={method === 'card'}
                            onClick={() => setMethod('card')}
                            disabled={busy}
                            className={`flex items-center gap-3 p-4 rounded-2xl font-bold border-2 transition text-left cursor-pointer ${
                              method === 'card'
                                ? 'border-[#C8102E] bg-red-50/50 text-slate-950 shadow-sm'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              method === 'card' ? 'bg-[#C8102E] text-white' : 'bg-slate-100 text-slate-600'
                            }`}>
                              <CreditCard size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-black">CARTÃO DE CRÉDITO</span>
                                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">Seguro</span>
                              </div>
                              <span className="text-xs text-slate-500 font-normal block truncate">Pagamento seguro sem renovação</span>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* SESSÃO DO PIX PENDENTE (Quando um Pix foi gerado) */}
                    {subscriptionId && pix && (
                      <div className="relative overflow-hidden bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-900/5 space-y-6">
                        {/* Indicador superior de acabamento gradiente */}
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />

                        {/* Cabeçalho com indicador de pulso em tempo real */}
                        <div className="text-center space-y-2 pt-1">
                          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200/70 shadow-sm">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            Aguardando pagamento
                          </div>
                          <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                            Pague com Pix Oficial
                          </h2>
                          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                            Abra o app do seu banco, aponte a câmera para o QR Code abaixo ou copie a chave para ativação instantânea da sua assinatura.
                          </p>
                        </div>

                        {/* 3 Passos Guiados */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 py-1">
                          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                            <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 font-black text-xs shadow-xs">
                              1
                            </div>
                            <span className="text-xs font-semibold text-slate-700 leading-tight">
                              Abra o app do seu banco
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                            <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 font-black text-xs shadow-xs">
                              2
                            </div>
                            <span className="text-xs font-semibold text-slate-700 leading-tight">
                              Escaneie ou copie a chave
                            </span>
                          </div>
                          <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                            <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 font-black text-xs shadow-xs">
                              3
                            </div>
                            <span className="text-xs font-semibold text-slate-700 leading-tight">
                              Confirmação automática
                            </span>
                          </div>
                        </div>

                        {/* Moldura do QR Code Oficial com guias de foco */}
                        {pix.qrCodeBase64 && (
                          <div className="flex flex-col items-center justify-center pt-1">
                            <div className="relative group bg-gradient-to-b from-slate-50 to-white p-5 rounded-3xl border-2 border-slate-200/90 shadow-md flex flex-col items-center transition hover:border-emerald-400">
                              {/* Marcadores de canto estilo mira de scanner */}
                              <div className="absolute top-2.5 left-2.5 w-4 h-4 border-t-2 border-l-2 border-emerald-500 rounded-tl-lg" />
                              <div className="absolute top-2.5 right-2.5 w-4 h-4 border-t-2 border-r-2 border-emerald-500 rounded-tr-lg" />
                              <div className="absolute bottom-2.5 left-2.5 w-4 h-4 border-b-2 border-l-2 border-emerald-500 rounded-bl-lg" />
                              <div className="absolute bottom-2.5 right-2.5 w-4 h-4 border-b-2 border-r-2 border-emerald-500 rounded-br-lg" />

                              <div className="bg-white p-3 rounded-2xl shadow-inner border border-slate-100">
                                <img
                                  src={`data:image/png;base64,${pix.qrCodeBase64}`}
                                  alt="QR Code Pix Oficial"
                                  className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Código Pix Copia e Cola */}
                        <div className="space-y-2 pt-1">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                              <Copy size={13} className="text-slate-500" /> Pix Copia e Cola
                            </label>
                            <span className="text-[11px] font-medium text-slate-500">
                              {copied ? 'Código copiado!' : 'Clique para copiar'}
                            </span>
                          </div>

                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="text"
                              readOnly
                              aria-label="Pix Copia e Cola"
                              value={pix.qrCode}
                              onClick={(e) => (e.target as HTMLInputElement).select()}
                              className="w-full px-4 py-3 text-xs font-mono bg-slate-50/70 border border-slate-300 rounded-xl text-slate-800 select-all focus:outline-none focus:ring-2 focus:ring-emerald-500 transition shadow-inner"
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(pix.qrCode);
                                  setCopied(true);
                                  setTimeout(() => setCopied(false), 3000);
                                } catch {
                                  setError('Selecione e copie o texto manualmente.');
                                }
                              }}
                              className={`shrink-0 flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-bold transition shadow-sm ${
                                copied
                                  ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                                  : 'bg-slate-950 text-white hover:bg-slate-800'
                              }`}
                            >
                              {copied ? <Check size={16} className="text-white" /> : <Copy size={16} />}
                              {copied ? 'Código Pix copiado!' : 'Copiar código Pix'}
                            </button>
                          </div>
                        </div>

                        {/* Redesign Premium: Contador e Status em Tempo Real (exibido EXCLUSIVAMENTE para PIX válido) */}
                        <PaymentCountdownTimer
                          secondsRemaining={secondsRemaining}
                          checkingStatus={checkingStatus}
                          onCheckStatus={handleCheckStatusNow}
                          isExpired={checkoutState === 'expired'}
                        />

                        {/* Botão de escape para alternar método */}
                        <div className="pt-2 text-center">
                          <button
                            type="button"
                            onClick={handleStartNewAttempt}
                            className="text-xs font-bold text-slate-500 hover:text-slate-800 underline transition cursor-pointer"
                          >
                            Escolher outra forma de pagamento ou gerar novo código Pix
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Tentativa de Cartão em processamento (sem cronômetro de 5 minutos) */}
                    {subscriptionId && !pix && checkoutState !== 'approved' && (
                      <div role="status" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-5 shadow-sm text-center">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200/80 mx-auto">
                          <Loader2 size={14} className="animate-spin text-amber-600" />
                          Processando pagamento
                        </div>

                        <div>
                          <h2 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                            Aguardando confirmação do pagamento
                          </h2>
                          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
                            A ativação depende da confirmação da operadora e do processamento no servidor.
                          </p>
                        </div>

                        <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
                          <button
                            type="button"
                            onClick={handleCheckStatusNow}
                            disabled={checkingStatus}
                            className="py-3 px-6 rounded-xl bg-slate-950 text-white font-bold hover:bg-slate-800 transition disabled:opacity-50 flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer shadow-sm"
                          >
                            <RefreshCw size={14} className={checkingStatus ? 'animate-spin' : ''} />
                            {checkingStatus ? 'Consultando provedor…' : 'Verificar pagamento agora'}
                          </button>
                          <button
                            type="button"
                            onClick={handleStartNewAttempt}
                            className="py-3 px-5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 text-xs sm:text-sm transition cursor-pointer"
                          >
                            Trocar método de pagamento
                          </button>
                        </div>
                      </div>
                    )}

                    {/* CONTEÚDO QUANDO NÃO HÁ PIX PENDENTE */}
                    {!subscriptionId && (
                      <>
                        {/* Aba Cartão (mantida no DOM com visibilidade controlada para estabilidade) */}
                        <div className={method === 'card' ? 'block' : 'hidden'} aria-hidden={method !== 'card'}>
                          {gateway?.cardEnabled && currentQuote && !quoteError ? (
                            <MercadoPagoCard
                              publicKey={gateway.publicKey}
                              amount={currentQuote.amount}
                              email={user?.email || email}
                              disabled={busy}
                              onSubmit={payCard}
                            />
                          ) : (
                            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5 text-sm text-amber-900 leading-relaxed">
                              <p className="font-bold mb-1">Cartão temporariamente indisponível</p>
                              O pagamento com cartão de crédito não está disponível no momento. Por favor, utilize o <strong>Pix oficial</strong> para ativação da sua assinatura.
                            </div>
                          )}
                        </div>

                        {/* Aba Pix */}
                        <div className={method === 'pix' ? 'block' : 'hidden'} aria-hidden={method !== 'pix'}>
                          <div className="bg-gradient-to-b from-slate-50 to-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-sm">
                            <div className="w-14 h-14 bg-emerald-100 text-emerald-800 rounded-2xl flex items-center justify-center mx-auto shadow-xs border border-emerald-200/60">
                              <QrCode size={28} />
                            </div>

                            <div className="space-y-1.5">
                              <h3 className="text-xl font-black text-slate-950 tracking-tight">Ativação instantânea via Pix</h3>
                              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                                Clique no botão abaixo para gerar o QR Code oficial do Mercado Pago. Seu plano será liberado após a confirmação do pagamento pelo provedor e processamento no servidor.
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center justify-center gap-2 pt-1 pb-1">
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                                <CheckCircle2 size={13} className="text-emerald-600" /> Sem renovação automática
                              </span>
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                                <Sparkles size={13} className="text-amber-500" /> Liberação em segundos
                              </span>
                            </div>

                            <button
                              type="button"
                              disabled={busy || !gateway?.pixEnabled || !currentQuote || Boolean(quoteError)}
                              onClick={generatePix}
                              className="w-full py-4 px-6 rounded-2xl bg-slate-950 text-white font-bold hover:bg-slate-800 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                            >
                              {busy && <Loader2 size={18} className="animate-spin" />}
                              {busy ? 'Gerando QR Code Pix…' : 'Gerar QR Code Pix'}
                            </button>

                            {!gateway?.pixEnabled && (
                              <p className="text-xs text-amber-700">
                                Pagamento via Pix em configuração no gateway.
                              </p>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* COLUNA LATERAL: Resumo do Pedido & Condições Reais */}
          <aside className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-sm sticky top-6 space-y-5">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Resumo da contratação
              </span>
              <h2 className="text-xl font-black text-slate-950 mt-1">
                {plan ? plan.displayName || PLAN_DISPLAY_NAMES[plan.id] || plan.name : 'Plano'}
              </h2>
              {plan?.description && (
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{plan.description}</p>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-slate-600">Empresa vinculada:</span>
                <span className="text-xs font-bold text-slate-900 truncate max-w-[160px]" title={selectedCompanyName}>
                  {selectedCompanyName}
                </span>
              </div>

              <div className="flex justify-between items-baseline">
                <span className="text-xs text-slate-600">Período de acesso:</span>
                <span className="text-xs font-semibold text-slate-900">30 dias corridos</span>
              </div>

              <div className="flex justify-between items-baseline">
                <span className="text-xs text-slate-600">Modalidade:</span>
                <span className="text-xs font-semibold text-slate-900">
                  {isFree
                    ? 'Gratuito (Sem renovação)'
                    : 'Pagamento avulso (30 dias)'}
                </span>
              </div>

              {plan?.trialDays && plan.trialDays > 0 ? (
                <div className="flex justify-between items-baseline text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg text-xs font-semibold">
                  <span>Experiência Gold:</span>
                  <span>{plan.trialDays} dias de teste</span>
                </div>
              ) : null}
            </div>

            <div className="pt-4 border-t border-slate-100">
              <div className="flex justify-between items-baseline">
                <span className="text-sm font-bold text-slate-900">Total a pagar:</span>
                <span className="text-2xl font-black text-slate-950">
                  {plan ? money(payableAmount) : '…'}
                </span>
              </div>
              {isAuthenticated && !subscriptionId && (
                <div aria-live="polite" className="mt-3 text-xs text-slate-700">
                  {!currentQuote && !quoteError && <p>Confirmando valor no servidor…</p>}
                  {quoteError && <p role="alert">{quoteError}</p>}
                  {currentQuote?.couponCode && <p>Cupom {currentQuote.couponCode} aplicado automaticamente: de {money(currentQuote.originalAmount)} por {money(currentQuote.amount)}. Uma tentativa nesta modalidade; válido até {new Date(currentQuote.expiresAt!).toLocaleString('pt-BR')}.</p>}
                  {currentQuote?.notice && <p>{currentQuote.notice}</p>}
                </div>
              )}
              <p className="text-[11px] text-slate-400 mt-1">
                {isFree
                  ? 'Nenhuma cobrança bancária.'
                  : method === 'card'
                  ? 'Pagamento único no cartão, sem renovação automática.'
                  : 'Pagamento avulso via Pix sem renovação automática.'}
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-start gap-2 text-xs text-slate-500 leading-relaxed">
              <LockKeyhole size={16} className="text-slate-400 shrink-0 mt-0.5" />
              <span>
                Pagamento processado pelo Mercado Pago. A ativação depende da confirmação do pagamento.
              </span>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
