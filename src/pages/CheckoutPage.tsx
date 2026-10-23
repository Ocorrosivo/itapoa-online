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
  ExternalLink
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
    api.get<{ subscriptionId: string; status: string; paymentMethod: string; expiresAt?: string } | null>(`/api/payments/attempt/active?companyId=${encodeURIComponent(companyChoice)}&planId=${encodeURIComponent(plan.id)}`)
      .then(attempt => {
        if (!active || !attempt?.subscriptionId) return;
        setSubscriptionId(attempt.subscriptionId);
        setMethod(attempt.paymentMethod === 'pix' ? 'pix' : 'card');
        if (attempt.expiresAt) {
          setAttemptExpiresAt(attempt.expiresAt);
        }
        if (attempt.status === 'active') {
          setCheckoutState('approved');
          clearPendingPurchase();
        } else if (attempt.status === 'expired') {
          setCheckoutState('expired');
          setError('Tempo esgotado. Esta tentativa de contratação expirou. Para continuar, inicie novamente o processo.');
        } else {
          setCheckoutState(attempt.paymentMethod === 'pix' ? 'pending_pix' : 'processing');
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
        pixReqId
      );

      if (!details.qrCode) {
        throw new Error('O Mercado Pago não retornou o código Pix. Não efetue transferência sem o código oficial.');
      }

      setPix(details);
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

            <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
              Finalize a contratação
            </h1>
            <p className="text-sm text-slate-500 mt-1 mb-6">
              Complete os dados de contato. Você poderá preencher fotos, horário e cardápio logo após a confirmação.
            </p>

            {/* Alerta de erro acessível */}
            {error && (
              <div
                role="alert"
                aria-live="assertive"
                className="flex items-start gap-3 p-4 mb-6 rounded-2xl bg-red-50 border border-red-200 text-red-900 text-sm"
              >
                <AlertTriangle size={20} className="text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">Aviso no pagamento</p>
                  <p className="mt-0.5 leading-relaxed">{error}</p>
                </div>
              </div>
            )}

            {/* ESTADO: APROVADO COM SUCESSO */}
            {checkoutState === 'approved' && (
              <div className="py-8 px-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 size={36} />
                </div>
                <h2 className="text-2xl font-black text-emerald-950">Pagamento confirmado com sucesso!</h2>
                <p className="text-sm text-emerald-800 max-w-md mx-auto leading-relaxed">
                  O plano <span className="font-bold">{plan?.displayName || plan?.name}</span> foi ativado para{' '}
                  <span className="font-bold">{selectedCompanyName}</span>.
                </p>
                <div className="pt-4">
                  <button
                    onClick={() => {
                      clearPendingPurchase();
                      onNavigateTab('painel');
                    }}
                    className="w-full sm:w-auto px-8 py-4 rounded-xl bg-slate-950 text-white font-bold hover:bg-slate-800 transition shadow-sm"
                  >
                    Acessar meu painel e completar anúncio
                  </button>
                </div>
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

                  {/* Seleção de empresa vinculada (se o anunciante já tiver empresas cadastradas) */}
                  {companies.length > 0 && (
                    <div>
                      <label htmlFor="checkout-company" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Vincular ao anúncio da empresa
                      </label>
                      <div className="relative">
                        <select
                          id="checkout-company"
                          value={companyChoice}
                          onChange={(e) => {
                            setCompanyChoice(e.target.value);
                            preparedCompany.current = '';
                            requestId.current = crypto.randomUUID();
                          }}
                          disabled={busy || Boolean(subscriptionId)}
                          className="w-full px-4 py-3 text-base rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:border-transparent transition bg-slate-50/30 appearance-none"
                        >
                          <option value="">Novo anúncio comercial (completar no painel)</option>
                          {companies.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        <Building2 size={18} className="absolute right-4 top-3.5 text-slate-400 pointer-events-none" />
                      </div>
                    </div>
                  )}
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
                    {!subscriptionId && (
                      <div className="mb-6">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                          Forma de pagamento
                        </label>
                        <div className="grid grid-cols-2 gap-3" role="group" aria-label="Selecione o meio de pagamento">
                          <button
                            type="button"
                            aria-pressed={method === 'card'}
                            onClick={() => setMethod('card')}
                            disabled={busy}
                            className={`flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl font-bold border transition ${
                              method === 'card'
                                ? 'border-[#C8102E] bg-red-50/50 text-[#C8102E] shadow-sm'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <CreditCard size={18} /> Cartão de crédito
                          </button>
                          <button
                            type="button"
                            aria-pressed={method === 'pix'}
                            onClick={() => setMethod('pix')}
                            disabled={busy}
                            className={`flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl font-bold border transition ${
                              method === 'pix'
                                ? 'border-[#C8102E] bg-red-50/50 text-[#C8102E] shadow-sm'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <QrCode size={18} /> Pix oficial
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
                                  alt="QR Code Pix do Mercado Pago"
                                  className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                                />
                              </div>
                              <div className="flex items-center gap-1.5 mt-3 text-[11px] font-semibold text-slate-500">
                                <ShieldCheck size={14} className="text-emerald-600" />
                                <span>Mercado Pago Oficial • Banco Central do Brasil</span>
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

                        {/* Validade de 5 minutos e status de reconciliação */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 text-xs">
                          <div className="flex items-center gap-2.5 text-slate-600">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-xs ${
                              secondsRemaining !== null && secondsRemaining < 60
                                ? 'bg-red-100 text-red-600 border-red-300 animate-pulse'
                                : 'bg-amber-50 text-amber-600 border-amber-200/60'
                            }`}>
                              <Clock size={16} />
                            </div>
                            <div>
                              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                {secondsRemaining !== null && secondsRemaining < 60 ? 'Atenção ao tempo' : 'Prazo de conclusão'}
                              </div>
                              <div className="font-mono font-bold text-slate-900 text-sm">
                                {secondsRemaining !== null && secondsRemaining > 0 ? (
                                  <span className={secondsRemaining < 60 ? 'text-red-600 font-black' : 'text-slate-950'}>
                                    Tempo restante para concluir esta tentativa de pagamento: {formatCountdown(secondsRemaining)}
                                  </span>
                                ) : (
                                  <span className="text-red-600 font-sans text-xs font-bold">Tentativa expirada</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleCheckStatusNow}
                            disabled={checkingStatus}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition disabled:opacity-60 cursor-pointer"
                          >
                            <RefreshCw size={13} className={checkingStatus ? 'animate-spin text-emerald-600' : 'text-slate-600'} />
                            {checkingStatus ? 'Consultando provedor…' : 'Verificar pagamento agora'}
                          </button>
                        </div>
                      </div>
                    )}

                    {subscriptionId && !pix && (
                      <div role="status" className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 space-y-5 shadow-sm">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200/80 w-fit">
                          <Clock size={14} className="text-amber-600" />
                          Aguardando confirmação do pagamento
                        </div>

                        <div>
                          <h2 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight">
                            Aguardando confirmação do pagamento
                          </h2>
                          <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                            A ativação depende da confirmação do Mercado Pago e do processamento no servidor. Não refaça a cobrança enquanto esta tentativa estiver em análise.
                          </p>
                        </div>

                        {/* Contador regressivo de 5 minutos */}
                        <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                          secondsRemaining !== null && secondsRemaining < 60
                            ? 'bg-red-50 border-red-300 text-red-900 ring-2 ring-red-400/30'
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                              secondsRemaining !== null && secondsRemaining < 60
                                ? 'bg-red-600 text-white animate-pulse'
                                : 'bg-slate-900 text-white'
                            }`}>
                              <Clock size={18} />
                            </div>
                            <div>
                              <span className="text-[11px] font-bold uppercase tracking-wider block text-slate-500">
                                {secondsRemaining !== null && secondsRemaining < 60 ? 'Menos de 1 minuto restante!' : 'Prazo de conclusão'}
                              </span>
                              <span className="text-xs sm:text-sm font-semibold">
                                Tempo restante para concluir esta tentativa de pagamento:
                              </span>
                            </div>
                          </div>
                          <div className={`font-mono text-lg sm:text-xl font-black px-3.5 py-1.5 rounded-xl text-center self-start sm:self-auto ${
                            secondsRemaining !== null && secondsRemaining < 60
                              ? 'text-red-600 bg-red-100 font-black'
                              : 'text-slate-950 bg-white border border-slate-200'
                          }`}>
                            {formatCountdown(secondsRemaining)}
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                          <button
                            type="button"
                            onClick={handleCheckStatusNow}
                            disabled={checkingStatus}
                            className="flex-1 py-3 px-5 rounded-xl bg-slate-950 text-white font-bold hover:bg-slate-800 transition disabled:opacity-50 flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer shadow-sm"
                          >
                            <RefreshCw size={14} className={checkingStatus ? 'animate-spin' : ''} />
                            {checkingStatus ? 'Consultando provedor…' : 'Verificar pagamento agora'}
                          </button>
                          {checkoutState === 'rejected' && (
                            <button
                              type="button"
                              onClick={handleStartNewAttempt}
                              className="px-5 py-3 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 text-xs sm:text-sm transition cursor-pointer"
                            >
                              Iniciar nova contratação
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* CONTEÚDO QUANDO NÃO HÁ PIX PENDENTE */}
                    {!subscriptionId && (
                      <>
                        {/* Aba Cartão (mantida no DOM com visibilidade controlada para estabilidade) */}
                        <div className={method === 'card' ? 'block' : 'hidden'} aria-hidden={method !== 'card'}>
                          {gateway?.cardEnabled ? (
                            <MercadoPagoCard
                              publicKey={gateway.publicKey}
                              amount={plan.price}
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
                              disabled={busy || !gateway?.pixEnabled}
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
                    : method === 'card'
                    ? 'Assinatura mensal recorrente'
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
                  {plan ? money(plan.price) : '…'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {isFree
                  ? 'Nenhuma cobrança bancária.'
                  : method === 'card'
                  ? 'Cobrança mensal no cartão. Cancele quando quiser no painel.'
                  : 'Pagamento avulso via Pix sem renovação automática.'}
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-start gap-2 text-xs text-slate-500 leading-relaxed">
              <LockKeyhole size={16} className="text-slate-400 shrink-0 mt-0.5" />
              <span>
                Pagamento processado em ambiente seguro com certificação oficial do Mercado Pago.
              </span>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
