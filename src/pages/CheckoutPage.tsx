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
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const preparedCompany = useRef('');
  const attemptKey = useRef('');
  const requestId = useRef(crypto.randomUUID());
  const submitLock = useRef(false);

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
          setMethod('pix');
          setCheckoutState('pending_pix');
        }
      })
      .catch(() => {});

    return () => {
      canceled = true;
    };
  }, [isAuthenticated, plan, companyChoice]);

  // 5. Polling contínuo do status da assinatura enquanto estiver pendente
  useEffect(() => {
    if (!subscriptionId || checkoutState === 'approved') return;

    let canceled = false;
    const check = async () => {
      try {
        const status = await BillingService.getSubscriptionStatusById(subscriptionId);
        if (canceled) return;
        if (status === 'active') {
          setCheckoutState('approved');
          clearPendingPurchase();
          if (attemptKey.current) sessionStorage.removeItem(attemptKey.current);
        } else if (status === 'canceled' || status === 'rejected') {
          setCheckoutState('rejected');
          setError('Pagamento não concluído. Você pode tentar novamente com outro cartão ou via Pix.');
        }
      } catch {
        // Falhas transitórias de rede não alteram estado
      }
    };

    void check();
    const interval = window.setInterval(check, 4000);
    return () => {
      canceled = true;
      window.clearInterval(interval);
    };
  }, [subscriptionId, checkoutState]);

  // 6. Contagem regressiva da validade do Pix
  useEffect(() => {
    if (!pix?.expirationDate || checkoutState !== 'pending_pix') return;

    const target = new Date(pix.expirationDate).getTime();
    const tick = () => {
      const remainingSecs = Math.max(0, Math.floor((target - Date.now()) / 1000));
      setTimeLeft(remainingSecs);
      if (remainingSecs <= 0) {
        setCheckoutState('expired');
        setError('Este QR Code Pix expirou. Gere um novo código para concluir o pagamento.');
      }
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [pix, checkoutState]);

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

      const result = await api.post<{ subscriptionId: string; status: string }>(
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
      // Se já vier aprovado do gateway, aguardamos confirmação do webhook / polling
      if (result.status === 'approved') {
        setCheckoutState('approved');
        clearPendingPurchase();
      }
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
        setError('O pagamento ainda consta como pendente no Mercado Pago. O processamento bancário pode levar alguns instantes.');
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

            {/* ESTADO: FORMULÁRIO DE CONTRATAÇÃO (NÃO APROVADO) */}
            {checkoutState !== 'approved' && (
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
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 sm:p-8 space-y-6">
                        <div className="text-center">
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 mb-2">
                            <Clock size={14} /> Aguardando pagamento
                          </div>
                          <h2 className="text-xl sm:text-2xl font-black text-slate-900">Pague com Pix Oficial</h2>
                          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                            Abra o aplicativo do seu banco, escolha a opção Pix e aponte a câmera para o QR Code abaixo:
                          </p>
                        </div>

                        {/* Imagem do QR Code Oficial */}
                        {pix.qrCodeBase64 && (
                          <div className="bg-white p-4 rounded-2xl border border-slate-200 inline-block mx-auto max-w-[240px] shadow-sm flex flex-col items-center">
                            <img
                              src={`data:image/png;base64,${pix.qrCodeBase64}`}
                              alt="QR Code Pix do Mercado Pago"
                              className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
                            />
                            <span className="text-[10px] text-slate-400 mt-2 font-mono">Mercado Pago Oficial</span>
                          </div>
                        )}

                        {/* Código Pix Copia e Cola */}
                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                            Pix Copia e Cola
                          </label>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <input
                              type="text"
                              readOnly
                              value={pix.qrCode}
                              className="w-full px-3 py-2.5 text-xs font-mono bg-white border border-slate-300 rounded-xl text-slate-800 select-all"
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
                              className="shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition"
                            >
                              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                              {copied ? 'Copiado!' : 'Copiar código'}
                            </button>
                          </div>
                        </div>

                        {/* Validade e status */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200 text-xs text-slate-500">
                          <span className="flex items-center gap-1.5">
                            <Clock size={14} className="text-amber-600" />
                            {timeLeft !== null && timeLeft > 0 ? (
                              <>
                                Expira em:{' '}
                                <strong className="font-mono text-slate-900">
                                  {Math.floor(timeLeft / 60)}m {timeLeft % 60}s
                                </strong>
                              </>
                            ) : (
                              'Código expirado'
                            )}
                          </span>

                          <button
                            type="button"
                            onClick={handleCheckStatusNow}
                            disabled={checkingStatus}
                            className="inline-flex items-center gap-1.5 text-slate-700 hover:text-slate-950 font-bold underline"
                          >
                            <RefreshCw size={12} className={checkingStatus ? 'animate-spin' : ''} />
                            {checkingStatus ? 'Consultando…' : 'Verificar pagamento agora'}
                          </button>
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
                              A opção de cartão está em processo de homologação técnica. Por favor, selecione <strong>Pix oficial</strong> para liberação imediata da sua assinatura.
                            </div>
                          )}
                        </div>

                        {/* Aba Pix */}
                        <div className={method === 'pix' ? 'block' : 'hidden'} aria-hidden={method !== 'pix'}>
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center space-y-4">
                            <div className="w-12 h-12 bg-red-100 text-[#C8102E] rounded-xl flex items-center justify-center mx-auto">
                              <QrCode size={24} />
                            </div>
                            <div>
                              <h3 className="text-base font-bold text-slate-900">Ativação instantânea via Pix</h3>
                              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                                Clique no botão abaixo para gerar o QR Code oficial do Mercado Pago. O valor será creditado e seu plano liberado automaticamente.
                              </p>
                            </div>
                            <button
                              type="button"
                              disabled={busy || !gateway?.pixEnabled}
                              onClick={generatePix}
                              className="w-full py-4 px-6 rounded-xl bg-slate-950 text-white font-bold hover:bg-slate-800 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
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
