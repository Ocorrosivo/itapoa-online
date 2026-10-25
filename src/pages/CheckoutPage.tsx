import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  ArrowLeft,
  ArrowRight,
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
  Shield,
  FileText,
  BadgeCheck,
  HelpCircle,
  ChevronRight
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

const PLAN_FEATURES: Record<string, string[]> = {
  plan_bronze: [
    'Perfil com informações essenciais no guia',
    'Canal direto para WhatsApp e telefone',
    'Presença na busca local de Itapoá'
  ],
  plan_gold_vip: [
    'Destaque no carrossel de empresas da Home',
    'Vitrine comercial ampliada com galeria de fotos',
    'Canal direto para WhatsApp com métricas de cliques',
    'Selo Gold VIP verificado no perfil da empresa',
    'Prioridade na busca comercial por categoria'
  ],
  plan_diamond_extremo: [
    'Topo absoluto nas buscas de Itapoá',
    'Máxima exposição em todas as páginas do portal',
    'Galeria completa de fotos e cardápio/catálogo',
    'Selo Diamond Extremo exclusivo de alta relevância',
    'Suporte prioritário e relatórios detalhados'
  ]
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

/* =========================================================================
   COMPONENTE: NOVO CRONÔMETRO COMPACTO (Fintech Premium)
   Substitui o card gigante por um componente elegante e informativo.
   ========================================================================= */
interface CompactCountdownTimerProps {
  secondsRemaining: number | null;
  isExpired?: boolean;
}

function CompactCountdownTimer({ secondsRemaining, isExpired }: CompactCountdownTimerProps) {
  const minutes = secondsRemaining !== null ? Math.floor(secondsRemaining / 60) : 5;
  const seconds = secondsRemaining !== null ? secondsRemaining % 60 : 0;
  const isExpiringSoon = secondsRemaining !== null && secondsRemaining < 60;
  const hasExpired = isExpired || (secondsRemaining !== null && secondsRemaining <= 0);

  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const progressPercent = secondsRemaining !== null ? Math.min(100, Math.max(0, (secondsRemaining / 1800) * 100)) : 100;

  if (hasExpired) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-3 flex items-center gap-2.5 text-xs text-red-800">
        <AlertTriangle size={16} className="text-red-600 shrink-0" />
        <span className="font-semibold">Este Pix expirou. Gere uma nova tentativa para pagar.</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-[#F6F8FC] border border-[#E5EAF1] p-3 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-[#667085] font-medium">
          <Clock size={14} className={isExpiringSoon ? 'text-red-500 animate-pulse' : 'text-[#00B894]'} />
          <span>Este Pix expira em:</span>
        </div>
        <span
          className={`font-mono font-bold text-sm tracking-tight ${
            isExpiringSoon ? 'text-red-600 animate-pulse' : 'text-[#101828]'
          }`}
        >
          {formattedTime}
        </span>
      </div>
      <div className="w-full bg-[#E5EAF1] rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            isExpiringSoon ? 'bg-red-500' : 'bg-[#00B894]'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}

/* =========================================================================
   COMPONENTE: PÁGINA DE OBRIGADO / APROVADO (3 Segundos -> Painel)
   ========================================================================= */
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
      <div className="max-w-xl w-full bg-white border border-[#E5EAF1] rounded-2xl p-6 sm:p-10 text-center shadow-lg relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Glow sutil */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#00B894]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Ícone de Sucesso */}
        <div className="relative mx-auto w-20 h-20 sm:w-24 sm:h-24 mb-6">
          <div className="absolute inset-0 bg-[#00B894]/20 rounded-full blur-xl animate-pulse" />
          <div className="relative w-full h-full bg-[#00B894] text-white rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/25">
            <CheckCircle2 size={48} strokeWidth={2.5} />
          </div>
          <div className="absolute -top-1 -right-1 bg-amber-400 text-slate-950 p-1.5 rounded-full shadow-md">
            <Sparkles size={16} />
          </div>
        </div>

        {/* Título Oficial Exato para testes e acessibilidade */}
        <h1 className="text-2xl sm:text-3xl font-black text-[#101828] tracking-tight mb-2">
          Pagamento confirmado com sucesso!
        </h1>

        <p className="text-sm text-[#667085] max-w-md mx-auto leading-relaxed mb-6">
          Obrigado por sua contratação! O plano{' '}
          <span className="font-bold text-[#101828]">{plan?.displayName || plan?.name}</span>{' '}
          foi ativado com sucesso para{' '}
          <span className="font-bold text-[#101828]">{companyName}</span>.
        </p>

        {/* Card Resumo da Transação */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#F6F8FC] border border-[#E5EAF1] text-left space-y-3 mb-6 text-xs sm:text-sm">
          <div className="flex items-center justify-between pb-2.5 border-b border-[#E5EAF1]">
            <span className="text-[#667085] font-medium">Plano Contratado</span>
            <span className="font-bold text-[#101828] flex items-center gap-1.5">
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

          <div className="flex items-center justify-between pb-2.5 border-b border-[#E5EAF1]">
            <span className="text-[#667085] font-medium">Empresa Vinculada</span>
            <span className="font-bold text-[#101828] truncate max-w-[220px]">{companyName}</span>
          </div>

          <div className="flex items-center justify-between pb-2.5 border-b border-[#E5EAF1]">
            <span className="text-[#667085] font-medium">Forma de Pagamento</span>
            <span className="font-semibold text-[#101828]">
              {method === 'pix' ? 'Pix Oficial Instantâneo' : 'Cartão de Crédito'}
            </span>
          </div>

          {reservedAmount !== null && (
            <div className="flex items-center justify-between pb-2.5 border-b border-[#E5EAF1]">
              <span className="text-[#667085] font-medium">Valor Total</span>
              <span className="font-extrabold text-[#00B894] text-base">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(reservedAmount)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-[#667085] font-medium">Status</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00B894]"></span>
              Ativado no Sistema
            </span>
          </div>
        </div>

        {/* Caixa de Redirecionamento Automático */}
        <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200/80 mb-6 space-y-2">
          <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-emerald-950">
            <Clock size={16} className="text-emerald-700 animate-spin" />
            <span>
              Redirecionando para o seu Painel em {secondsLeft} {secondsLeft === 1 ? 'segundo' : 'segundos'}...
            </span>
          </div>

          <div className="w-full bg-emerald-200/60 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-[#00B894] rounded-full transition-all duration-1000 ease-linear"
              style={{ width: `${Math.max(0, Math.min(100, ((3 - secondsLeft) / 3) * 100))}%` }}
            />
          </div>
        </div>

        {/* Botão de Escape / Acesso Imediato */}
        <button
          type="button"
          onClick={handleGoToPanelNow}
          className="w-full py-3.5 px-6 rounded-xl bg-[#080F24] hover:bg-slate-800 text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
        >
          <span>Acessar meu painel e completar anúncio</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

/* =========================================================================
   COMPONENTE: CABEÇALHO DEDICADO DO CHECKOUT (Checkout Seguro & Stepper)
   ========================================================================= */
interface DedicatedCheckoutHeaderProps {
  onBack: () => void;
  step: 'dados' | 'pagamento' | 'confirmacao';
}

function DedicatedCheckoutHeader({ onBack, step }: DedicatedCheckoutHeaderProps) {
  return (
    <header className="border-b border-[#E5EAF1] bg-white sticky top-0 z-30 shadow-xs">
      <div className="max-w-[1220px] mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
        {/* Esquerda: Logo + Link Voltar aos Planos */}
        <div className="flex items-center gap-3 sm:gap-6">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onBack();
            }}
            className="flex items-center gap-2.5 transition opacity-90 hover:opacity-100 cursor-pointer"
            title="Voltar ao início do Itapoá Online"
          >
            <img
              src="/logotipo.png"
              alt="Itapoá Online"
              className="h-8 sm:h-9 w-auto object-contain"
              onError={(e) => {
                // Fallback elegante caso a imagem falhe
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <span className="font-extrabold text-[#080F24] tracking-tight text-base sm:text-lg hidden xs:inline">
              Itapoá<span className="text-[#C8102E]">Online</span>
            </span>
          </a>

          <div className="h-4 w-px bg-[#E5EAF1] hidden sm:block" />

          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#667085] hover:text-[#101828] transition cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Voltar aos planos</span>
          </button>
        </div>

        {/* Direita: Indicador de Conexão Segura */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#F6F8FC] border border-[#E5EAF1] text-[11px] font-semibold text-[#101828]">
          <ShieldCheck size={14} className="text-[#00B894] shrink-0" />
          <span>Checkout seguro</span>
          <span className="text-[#667085] hidden md:inline">• Conexão SSL 256-bit</span>
        </div>
      </div>
    </header>
  );
}

/* =========================================================================
   COMPONENTE: RODAPÉ DEDICADO DO CHECKOUT (Compacto, sem repetições)
   ========================================================================= */
interface DedicatedCheckoutFooterProps {
  onNavigateTab: (tab: string) => void;
}

function DedicatedCheckoutFooter({ onNavigateTab }: DedicatedCheckoutFooterProps) {
  return (
    <footer className="mt-16 border-t border-[#E5EAF1] bg-white py-8 text-xs text-[#667085]">
      <div className="max-w-[1220px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
          <span className="font-extrabold text-[#080F24]">Itapoá Online</span>
          <span className="hidden sm:inline text-slate-300">•</span>
          <span>© 2026 Conecta Você ao que Importa. Todos os direitos reservados.</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] font-medium">
          <button
            type="button"
            onClick={() => onNavigateTab('termos-de-uso')}
            className="hover:text-[#101828] transition cursor-pointer"
          >
            Termos de Uso
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => onNavigateTab('politica-de-privacidade')}
            className="hover:text-[#101828] transition cursor-pointer"
          >
            Política de Privacidade
          </button>
          <span>•</span>
          <span className="text-[#667085] flex items-center gap-1">
            <LockKeyhole size={12} className="text-[#00B894]" /> Processamento seguro via Mercado Pago
          </span>
        </div>
      </div>
    </footer>
  );
}

/* =========================================================================
   COMPONENTE PRINCIPAL: CHECKOUT PAGE
   ========================================================================= */
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

  const handleStartNewAttempt = async () => {
    if (companyChoice && plan) {
      try { await BillingService.cancelAttempt(companyChoice, plan.id); }
      catch (error) {
        setError(error instanceof Error ? error.message : 'Não foi possível confirmar o encerramento da tentativa.');
        return;
      }
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
      .catch(() => {
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

  // 4. Recuperação automática de Pix ativo para a empresa/plano
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
      }).catch(() => {});
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
        // Falhas transitórias
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

  const selectedCompanyName = useMemo(() => {
    if (companyChoice) {
      const found = companies.find((c) => c.id === companyChoice);
      if (found) return found.name;
    }
    return name ? `${name} (Novo anúncio)` : 'Novo anúncio comercial';
  }, [companyChoice, companies, name]);

  const planFeatures = useMemo(() => {
    if (plan?.features && plan.features.length > 0) return plan.features;
    if (plan?.id && PLAN_FEATURES[plan.id]) return PLAN_FEATURES[plan.id];
    return [
      'Presença comercial garantida no catálogo de Itapoá',
      'Canal de contato direto via WhatsApp',
      'Painel de controle exclusivo para o lojista'
    ];
  }, [plan]);

  // Se não houver plano selecionado
  if (!intent) {
    return (
      <div className="min-h-screen bg-[#F6F8FC] flex flex-col font-sans">
        <DedicatedCheckoutHeader onBack={() => onNavigateTab('planos')} step="dados" />
        <section className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="max-w-md w-full bg-white border border-[#E5EAF1] rounded-2xl p-8 text-center shadow-sm">
            <div className="w-14 h-14 bg-red-50 text-[#C8102E] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Sparkles size={26} />
            </div>
            <h1 className="text-2xl font-black text-[#101828]">Escolha seu plano</h1>
            <p className="text-sm text-[#667085] mt-2 mb-6">
              Selecione uma opção de destaque para sua empresa no catálogo comercial de Itapoá.
            </p>
            <button
              onClick={() => onNavigateTab('planos')}
              className="w-full py-3.5 px-6 rounded-xl bg-[#080F24] text-white font-bold hover:bg-slate-800 transition cursor-pointer"
            >
              Ver catálogo de planos
            </button>
          </div>
        </section>
        <DedicatedCheckoutFooter onNavigateTab={onNavigateTab} />
      </div>
    );
  }

  const isFree = plan?.price === 0;

  if (checkoutState === 'approved') {
    return (
      <div className="min-h-screen bg-[#F6F8FC] flex flex-col font-sans">
        <DedicatedCheckoutHeader onBack={() => onNavigateTab('painel')} step="confirmacao" />
        <main className="flex-1">
          <ThankYouApprovedPage
            plan={plan}
            companyName={selectedCompanyName}
            subscriptionId={subscriptionId}
            reservedAmount={reservedAmount}
            method={method}
            onNavigateTab={onNavigateTab}
          />
        </main>
        <DedicatedCheckoutFooter onNavigateTab={onNavigateTab} />
      </div>
    );
  }

  const currentStep = subscriptionId ? 'pagamento' : 'dados';

  return (
    <div className="min-h-screen bg-[#F6F8FC] flex flex-col font-sans text-[#101828]">
      {/* 1. CABEÇALHO DEDICADO DO CHECKOUT */}
      <DedicatedCheckoutHeader
        onBack={() => {
          clearPendingPurchase();
          onNavigateTab('planos');
        }}
        step={currentStep}
      />

      <main className="flex-1 py-8 md:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1220px] mx-auto space-y-6">

          {/* TÍTULO PRINCIPAL & STEPPER COMPACTO */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 mb-2">
                <ShieldCheck size={14} className="text-[#00B894]" /> Finalização de Assinatura
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#101828] tracking-tight">
                Finalize sua assinatura
              </h1>
              <p className="text-sm sm:text-base text-[#667085] mt-1">
                Você está a poucos passos de ativar os benefícios do seu plano.
              </p>
            </div>

            {/* Stepper Visual Elegante (Seus dados -> Pagamento -> Confirmação) */}
            <div className="flex items-center gap-2 text-xs font-semibold">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition ${
                currentStep === 'dados'
                  ? 'bg-[#080F24] text-white shadow-xs'
                  : 'bg-emerald-100 text-emerald-900'
              }`}>
                {currentStep === 'pagamento' ? (
                  <Check size={14} className="text-emerald-700" />
                ) : (
                  <span className="w-4 h-4 rounded-full bg-white/20 text-white flex items-center justify-center text-[10px]">1</span>
                )}
                <span>1. Seus dados</span>
              </div>

              <ChevronRight size={14} className="text-[#667085]" />

              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition ${
                currentStep === 'pagamento'
                  ? 'bg-[#080F24] text-white shadow-xs'
                  : 'bg-[#E5EAF1] text-[#667085]'
              }`}>
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                  currentStep === 'pagamento' ? 'bg-[#00B894] text-white font-bold' : 'bg-slate-200 text-slate-600'
                }`}>2</span>
                <span>2. Pagamento</span>
              </div>

              <ChevronRight size={14} className="text-[#667085]" />

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#E5EAF1] text-[#667085]">
                <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px]">3</span>
                <span>3. Confirmação</span>
              </div>
            </div>
          </div>

          {/* ALERTA DE ERRO OU AVISO NO PAGAMENTO COM AÇÃO DE DESCARTE */}
          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="p-5 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-sm space-y-3 shadow-xs animate-in fade-in"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-red-950">Aviso no pagamento</p>
                  <p className="mt-0.5 leading-relaxed text-red-900 text-xs sm:text-sm">{error}</p>
                </div>
              </div>
              {(error.toLowerCase().includes('tentativa') ||
                error.toLowerCase().includes('cobrança') ||
                error.toLowerCase().includes('andamento') ||
                error.toLowerCase().includes('reconciliação') ||
                error.toLowerCase().includes('terminou')) && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-red-200/70">
                  <button
                    type="button"
                    onClick={handleStartNewAttempt}
                    className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white font-bold text-xs transition cursor-pointer shadow-xs"
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

          {/* ESTADO: TEMPO ESGOTADO */}
          {checkoutState === 'expired' && (
            <div className="py-10 px-6 bg-white border border-amber-200 rounded-2xl text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 bg-amber-50 text-amber-700 border border-amber-200 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <Clock size={32} />
              </div>
              <h2 className="text-2xl font-bold text-[#101828]">Tempo esgotado</h2>
              <p className="text-sm text-[#667085] max-w-md mx-auto leading-relaxed">
                Tempo esgotado. Esta tentativa de contratação expirou. Para continuar, inicie novamente o processo.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleStartNewAttempt}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#080F24] text-white font-bold hover:bg-slate-800 transition shadow-xs cursor-pointer"
                >
                  Iniciar nova contratação
                </button>
              </div>
            </div>
          )}

          {/* ESTRUTURA PRINCIPAL: 2 COLUNAS (65% Esquerda / 35% Direita) */}
          {checkoutState !== 'expired' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

              {/* =========================================================
                  COLUNA ESQUERDA (65%): Form de Contato, Seleção & Pagamento
                  ========================================================= */}
              <div className="lg:col-span-7 xl:col-span-7 space-y-6">

                {/* CARD 1: DADOS PARA CONFIRMAÇÃO */}
                <div className="bg-white border border-[#E5EAF1] rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
                  <div className="flex items-center justify-between border-b border-[#E5EAF1] pb-4">
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-[#101828] flex items-center gap-2">
                        <BadgeCheck size={18} className="text-[#00B894]" /> Dados para confirmação
                      </h2>
                      <p className="text-xs text-[#667085] mt-0.5">
                        Informe os dados do responsável pelo anúncio comercial.
                      </p>
                    </div>
                  </div>

                  <form
                    ref={formRef}
                    onSubmit={(e) => e.preventDefault()}
                    className="space-y-4"
                    aria-label="Dados de contato do contratante"
                  >
                    <div>
                      <label htmlFor="checkout-name" className="block text-xs font-bold text-[#101828] uppercase tracking-wider mb-1.5">
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
                        className="w-full px-4 py-3 h-[48px] text-sm rounded-xl border border-[#E5EAF1] bg-white text-[#101828] placeholder-[#667085]/60 focus:outline-none focus:ring-2 focus:ring-[#080F24] focus:border-transparent transition"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="checkout-phone" className="block text-xs font-bold text-[#101828] uppercase tracking-wider mb-1.5">
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
                          className="w-full px-4 py-3 h-[48px] text-sm rounded-xl border border-[#E5EAF1] bg-white text-[#101828] placeholder-[#667085]/60 focus:outline-none focus:ring-2 focus:ring-[#080F24] focus:border-transparent transition font-medium"
                        />
                      </div>

                      <div>
                        <label htmlFor="checkout-email" className="block text-xs font-bold text-[#101828] uppercase tracking-wider mb-1.5">
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
                          className="w-full px-4 py-3 h-[48px] text-sm rounded-xl border border-[#E5EAF1] bg-white text-[#101828] placeholder-[#667085]/60 focus:outline-none focus:ring-2 focus:ring-[#080F24] focus:border-transparent transition font-medium"
                        />
                      </div>
                    </div>

                    {/* Vínculo de Empresa (Caso o usuário tenha múltiplas cadastradas) */}
                    {isAuthenticated && companies.length > 1 && !subscriptionId && (
                      <div className="pt-2">
                        <label htmlFor="checkout-company" className="block text-xs font-bold text-[#101828] uppercase tracking-wider mb-1.5">
                          Vincular à empresa
                        </label>
                        <select
                          id="checkout-company"
                          value={companyChoice}
                          onChange={(e) => setCompanyChoice(e.target.value)}
                          className="w-full px-4 py-3 h-[48px] text-sm rounded-xl border border-[#E5EAF1] bg-white text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#080F24] transition cursor-pointer"
                        >
                          {companies.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </form>

                  {/* Usuário não autenticado: Ação guiada de acesso sem perder os dados */}
                  {!isAuthenticated && (
                    <div className="pt-4 border-t border-[#E5EAF1] space-y-3">
                      <div className="bg-[#F6F8FC] border border-[#E5EAF1] rounded-xl p-4 text-xs text-[#667085] leading-relaxed">
                        <strong className="text-[#101828] block mb-0.5">Autenticação necessária</strong>
                        Entre ou crie sua conta para vincular o plano com segurança à sua empresa. Seus dados preenchidos acima serão mantidos.
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <button
                          type="button"
                          onClick={() => onNavigateTab('login')}
                          className="flex-1 py-3 px-5 rounded-xl bg-[#080F24] text-white font-bold text-xs hover:bg-slate-800 transition text-center cursor-pointer"
                        >
                          Já tenho conta (Entrar)
                        </button>
                        <button
                          type="button"
                          onClick={() => onNavigateTab('cadastro')}
                          className="flex-1 py-3 px-5 rounded-xl border border-[#E5EAF1] bg-white text-[#101828] font-bold text-xs hover:bg-slate-50 transition text-center cursor-pointer"
                        >
                          Criar nova conta
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* CARD 2: MEIOS DE PAGAMENTO (SELEÇÃO + ÁREA PIX OU CARTÃO) */}
                {isAuthenticated && (
                  <div className="bg-white border border-[#E5EAF1] rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">

                    {/* SELEÇÃO DO MÉTODO (Quando ainda não há transação pendente iniciada) */}
                    {!subscriptionId && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="block text-xs font-bold uppercase tracking-wider text-[#101828]">
                            Selecione a forma de pagamento
                          </label>
                          <span className="text-[11px] text-[#667085]">Sem fidelidade ou renovação automática</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="group" aria-label="Selecione o meio de pagamento">
                          {/* Botão Pix */}
                          <button
                            type="button"
                            aria-label="Pix oficial"
                            aria-pressed={method === 'pix'}
                            onClick={() => setMethod('pix')}
                            disabled={busy}
                            className={`flex items-center gap-3.5 p-4 rounded-xl font-bold border-2 transition text-left cursor-pointer ${
                              method === 'pix'
                                ? 'border-[#00B894] bg-[#00B894]/5 text-[#101828] shadow-xs'
                                : 'border-[#E5EAF1] bg-white text-[#667085] hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              method === 'pix' ? 'bg-[#00B894] text-white' : 'bg-[#F6F8FC] text-[#667085]'
                            }`}>
                              <QrCode size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-extrabold text-[#101828]">PIX</span>
                                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                  Instantâneo
                                </span>
                              </div>
                              <span className="text-xs text-[#667085] font-normal block truncate mt-0.5">
                                Liberação imediata via QR Code
                              </span>
                            </div>
                          </button>

                          {/* Botão Cartão */}
                          <button
                            type="button"
                            aria-label="Cartão de crédito"
                            aria-pressed={method === 'card'}
                            onClick={() => setMethod('card')}
                            disabled={busy}
                            className={`flex items-center gap-3.5 p-4 rounded-xl font-bold border-2 transition text-left cursor-pointer ${
                              method === 'card'
                                ? 'border-[#080F24] bg-slate-50 text-[#101828] shadow-xs'
                                : 'border-[#E5EAF1] bg-white text-[#667085] hover:border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                              method === 'card' ? 'bg-[#080F24] text-white' : 'bg-[#F6F8FC] text-[#667085]'
                            }`}>
                              <CreditCard size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-extrabold text-[#101828]">CARTÃO DE CRÉDITO</span>
                                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-slate-100 text-[#101828]">
                                  Seguro
                                </span>
                              </div>
                              <span className="text-xs text-[#667085] font-normal block truncate mt-0.5">
                                Pagamento único sem renovação
                              </span>
                            </div>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* =========================================================
                        ÁREA PIX REDESENHADA (Desktop lado a lado / Mobile empilhado)
                        ========================================================= */}
                    {subscriptionId && pix ? (
                      <div className="space-y-6 pt-1">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00B894]"></span>
                              </span>
                              Aguardando pagamento
                            </span>
                            <span className="text-xs font-semibold text-[#667085]">Mercado Pago Oficial</span>
                          </div>
                          <h3 className="text-xl sm:text-2xl font-black text-[#101828] tracking-tight">
                            Pague com Pix
                          </h3>
                          <p className="text-xs sm:text-sm text-[#667085] mt-0.5 leading-relaxed">
                            Escaneie o QR Code ou copie o código para pagar pelo aplicativo do seu banco.
                          </p>
                        </div>

                        {/* Layout Responsivo: 2 colunas no desktop, empilhado no mobile */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                          {/* Coluna Esquerda: QR Code centralizado */}
                          <div className="md:col-span-5 flex flex-col items-center justify-center">
                            <div className="p-3.5 bg-white border border-[#E5EAF1] rounded-2xl shadow-xs flex flex-col items-center">
                              {pix.qrCodeBase64 ? (
                                <img
                                  src={`data:image/png;base64,${pix.qrCodeBase64}`}
                                  alt="QR Code Pix Oficial"
                                  className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
                                />
                              ) : (
                                <div className="w-48 h-48 sm:w-52 sm:h-52 flex items-center justify-center bg-slate-50 rounded-xl text-slate-400">
                                  <QrCode size={48} />
                                </div>
                              )}
                              <span className="text-[11px] font-medium text-[#667085] mt-2">
                                Aponte a câmera no app bancário
                              </span>
                            </div>
                          </div>

                          {/* Coluna Direita: Valor, Copia e Cola, Cronômetro e Botões */}
                          <div className="md:col-span-7 space-y-4">
                            <div className="p-3 rounded-xl bg-[#F6F8FC] border border-[#E5EAF1] flex items-center justify-between">
                              <span className="text-xs font-bold text-[#667085] uppercase">Total do Pix</span>
                              <span className="text-lg font-black text-[#00B894]">
                                {money(reservedAmount ?? payableAmount)}
                              </span>
                            </div>

                            {/* Campo Copia e Cola */}
                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-[#101828] uppercase tracking-wider flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                  <Copy size={13} className="text-[#667085]" /> Código Pix Copia e Cola
                                </span>
                                <span className="text-[11px] font-medium text-[#667085]">
                                  {copied ? 'Código copiado!' : 'Clique para copiar'}
                                </span>
                              </label>

                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  readOnly
                                  aria-label="Pix Copia e Cola"
                                  value={pix.qrCode}
                                  onClick={(e) => (e.target as HTMLInputElement).select()}
                                  className="w-full px-3.5 py-2.5 text-xs font-mono bg-white border border-[#E5EAF1] rounded-xl text-[#101828] select-all focus:outline-none focus:ring-1 focus:ring-[#080F24]"
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
                                  className={`shrink-0 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs ${
                                    copied
                                      ? 'bg-[#00B894] text-white'
                                      : 'bg-[#080F24] text-white hover:bg-slate-800'
                                  }`}
                                >
                                  {copied ? <Check size={14} /> : <Copy size={14} />}
                                  <span>{copied ? 'Copiado!' : 'Copiar'}</span>
                                </button>
                              </div>
                            </div>

                            {/* Novo Cronômetro Compacto */}
                            <CompactCountdownTimer
                              secondsRemaining={secondsRemaining}
                              isExpired={checkoutState === 'expired'}
                            />

                            {/* Botão Verificar Pagamento Agora */}
                            <div className="pt-1 flex flex-col sm:flex-row gap-2.5">
                              <button
                                type="button"
                                onClick={handleCheckStatusNow}
                                disabled={checkingStatus}
                                className="flex-1 py-3 px-5 rounded-xl bg-[#00B894] hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                              >
                                <RefreshCw size={14} className={checkingStatus ? 'animate-spin' : ''} />
                                <span>{checkingStatus ? 'Consultando provedor…' : 'Verificar pagamento agora'}</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Botão de Escape / Trocar Método */}
                        <div className="pt-2 border-t border-[#E5EAF1] text-center">
                          <button
                            type="button"
                            onClick={handleStartNewAttempt}
                            className="text-xs font-bold text-[#667085] hover:text-[#080F24] underline transition cursor-pointer"
                          >
                            Escolher outra forma de pagamento ou gerar novo código Pix
                          </button>
                        </div>
                      </div>
                    ) : subscriptionId && !pix && checkoutState !== 'approved' ? (
                      /* SESSÃO DO CARTÃO EM PROCESSAMENTO */
                      <div role="status" className="rounded-xl border border-[#E5EAF1] bg-[#F6F8FC] p-6 text-center space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 mx-auto">
                          <Loader2 size={14} className="animate-spin text-amber-600" />
                          Processando pagamento
                        </div>

                        <div>
                          <h2 className="text-lg sm:text-xl font-bold text-[#101828]">
                            Aguardando confirmação do pagamento
                          </h2>
                          <p className="text-xs text-[#667085] mt-1 max-w-sm mx-auto leading-relaxed">
                            A ativação depende da confirmação da operadora do cartão e do processamento no servidor.
                          </p>
                        </div>

                        <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
                          <button
                            type="button"
                            onClick={handleCheckStatusNow}
                            disabled={checkingStatus}
                            className="py-2.5 px-5 rounded-xl bg-[#080F24] text-white font-bold hover:bg-slate-800 text-xs transition cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                          >
                            <RefreshCw size={14} className={checkingStatus ? 'animate-spin' : ''} />
                            <span>{checkingStatus ? 'Consultando provedor…' : 'Verificar pagamento agora'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleStartNewAttempt}
                            className="py-2.5 px-4 rounded-xl border border-[#E5EAF1] bg-white text-[#101828] font-bold hover:bg-slate-50 text-xs transition cursor-pointer"
                          >
                            Trocar método de pagamento
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* SE NENHUMA TRANSAÇÃO AINDA FOI GERADA */
                      <div>
                        {/* Aba Cartão */}
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
                            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900 leading-relaxed">
                              <p className="font-bold mb-0.5">Cartão temporariamente indisponível</p>
                              O pagamento com cartão de crédito não está disponível no momento. Por favor, utilize o <strong>Pix oficial</strong> para ativação da sua assinatura.
                            </div>
                          )}
                        </div>

                        {/* Aba Pix Inicial */}
                        <div className={method === 'pix' ? 'block' : 'hidden'} aria-hidden={method !== 'pix'}>
                          <div className="bg-[#F6F8FC] border border-[#E5EAF1] rounded-xl p-6 text-center space-y-4">
                            <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-xl flex items-center justify-center mx-auto">
                              <QrCode size={24} />
                            </div>

                            <div className="space-y-1">
                              <h3 className="text-base font-bold text-[#101828]">Ativação instantânea via Pix</h3>
                              <p className="text-xs text-[#667085] max-w-sm mx-auto leading-relaxed">
                                Clique no botão abaixo para gerar o QR Code oficial do Mercado Pago. Seu plano será liberado após a confirmação.
                              </p>
                            </div>

                            <button
                              type="button"
                              disabled={busy || !gateway?.pixEnabled || !currentQuote || Boolean(quoteError)}
                              onClick={generatePix}
                              className="w-full py-3.5 px-6 rounded-xl bg-[#00B894] hover:bg-emerald-600 text-white font-bold text-sm transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                            >
                              {busy && <Loader2 size={16} className="animate-spin" />}
                              <span>{busy ? 'Gerando QR Code Pix…' : 'Gerar QR Code Pix'}</span>
                            </button>

                            {!gateway?.pixEnabled && (
                              <p className="text-xs text-amber-700">
                                Pagamento via Pix em configuração no gateway.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* =========================================================
                  COLUNA DIREITA (35%): Resumo do Pedido (Sticky no Desktop)
                  ========================================================= */}
              <aside className="lg:col-span-5 xl:col-span-5 bg-white border border-[#E5EAF1] rounded-2xl p-6 sm:p-7 shadow-xs sticky top-20 space-y-5">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#667085]">
                    Resumo do pedido
                  </span>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <h2 className="text-xl font-black text-[#101828]">
                      {plan ? plan.displayName || PLAN_DISPLAY_NAMES[plan.id] || plan.name : 'Plano'}
                    </h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#080F24] text-white">
                      30 Dias
                    </span>
                  </div>
                  {plan?.description && (
                    <p className="text-xs text-[#667085] mt-1 leading-relaxed">{plan.description}</p>
                  )}
                </div>

                {/* Vantagens / Recursos inclusos no plano */}
                <div className="pt-3 border-t border-[#E5EAF1] space-y-2">
                  <span className="text-xs font-bold text-[#101828] uppercase tracking-wider block mb-2">
                    Recursos incluídos
                  </span>
                  <ul className="space-y-2 text-xs text-[#101828]">
                    {planFeatures.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 size={15} className="text-[#00B894] shrink-0 mt-0.5" />
                        <span className="leading-tight text-[#667085]">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Detalhes da contratação */}
                <div className="pt-3 border-t border-[#E5EAF1] space-y-2 text-xs">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[#667085]">Empresa vinculada:</span>
                    <span className="font-bold text-[#101828] truncate max-w-[170px]" title={selectedCompanyName}>
                      {selectedCompanyName}
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline">
                    <span className="text-[#667085]">Período de acesso:</span>
                    <span className="font-semibold text-[#101828]">30 dias corridos</span>
                  </div>

                  <div className="flex justify-between items-baseline">
                    <span className="text-[#667085]">Modalidade:</span>
                    <span className="font-semibold text-[#101828]">
                      {isFree ? 'Gratuito (Sem renovação)' : 'Pagamento avulso (30 dias)'}
                    </span>
                  </div>
                </div>

                {/* Bloco de Valor Total */}
                <div className="pt-4 border-t border-[#E5EAF1] bg-[#F6F8FC] -mx-6 -mb-6 p-6 rounded-b-2xl space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm font-bold text-[#101828]">Total a pagar:</span>
                    <span className="text-2xl sm:text-3xl font-black text-[#101828] tracking-tight">
                      {plan ? money(payableAmount) : '…'}
                    </span>
                  </div>

                  {isAuthenticated && !subscriptionId && (
                    <div aria-live="polite" className="text-xs text-[#101828]">
                      {!currentQuote && !quoteError && <p className="text-[#667085]">Confirmando valor no servidor…</p>}
                      {quoteError && <p role="alert" className="text-red-700">{quoteError}</p>}
                      {currentQuote?.couponCode && (
                        <p className="text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                          Cupom {currentQuote.couponCode} aplicado automaticamente: de {money(currentQuote.originalAmount)} por {money(currentQuote.amount)}.
                        </p>
                      )}
                      {currentQuote?.notice && <p className="text-[#667085] mt-1">{currentQuote.notice}</p>}
                    </div>
                  )}

                  <p className="text-[11px] text-[#667085] leading-relaxed">
                    {isFree
                      ? 'Nenhuma cobrança bancária.'
                      : method === 'card'
                      ? 'Pagamento único no cartão, sem renovação automática.'
                      : 'Pagamento avulso via Pix sem renovação automática.'}
                  </p>

                  <div className="pt-2 flex items-start gap-2 text-[11px] text-[#667085] leading-relaxed">
                    <ShieldCheck size={15} className="text-[#00B894] shrink-0 mt-0.5" />
                    <span>
                      Seu plano será ativado após a confirmação do pagamento pelo gateway oficial Mercado Pago.
                    </span>
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>
      </main>

      {/* 3. RODAPÉ DEDICADO DO CHECKOUT */}
      <DedicatedCheckoutFooter onNavigateTab={onNavigateTab} />
    </div>
  );
}
