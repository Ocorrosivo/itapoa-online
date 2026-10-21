import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CreditCard, QrCode, LockKeyhole, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/apiClient';
import { readPendingPurchase, clearPendingPurchase, savePendingPurchase } from '../lib/pendingPurchase';
import { BillingService, PixDetails } from '../services/BillingService';
import { MercadoPagoCard } from '../components/common/MercadoPagoCard';
import { Company } from '../types';
import { useSEO } from '../hooks/useSEO';
import { maskPhone } from '../utils/validators';

interface Gateway { publicKey: string; pixEnabled: boolean; cardEnabled: boolean }
interface Plan { id: string; name: string; price: number }
const money = (amount: number) => amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const names: Record<string, string> = { plan_bronze: 'Bronze', plan_gold_vip: 'Gold VIP', plan_diamond_extremo: 'Diamond Extremo' };

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
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [pix, setPix] = useState<PixDetails | null>(null);
  const [subscriptionId, setSubscriptionId] = useState('');
  const [active, setActive] = useState(false);
  const [copied, setCopied] = useState(false);
  const attemptKey = useRef('');
  const formRef = useRef<HTMLFormElement>(null);
  const preparedCompany = useRef('');
  const requestId = useRef(crypto.randomUUID());
  const submitLock = useRef(false);
  useSEO({ title: 'Checkout seguro — Itapoá Online', description: 'Finalize seu plano com cartão ou Pix. Complete os dados comerciais depois.' });

  useEffect(() => {
    let canceled = false;
    Promise.all([api.get<Gateway>('/api/payments/config'), api.get<Plan[]>('/api/plans')])
      .then(([config, plans]) => {
        if (canceled) return;
        setGateway(config);
        const selected = plans.find(p => p.id === intent?.planId);
        if (selected) setPlan({ ...selected, price: Number(selected.price) });
        else if (intent) setError('Este plano não está disponível. Volte e escolha outro plano.');
      }).catch(() => { if (!canceled) setError('Não foi possível carregar o checkout. Tente novamente mais tarde.'); });
    return () => { canceled = true; };
  }, [intent]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let canceled = false;
    api.get<Company[]>('/api/account/companies').then(rows => { if (!canceled) setCompanies(rows); })
      .catch(() => { if (!canceled) setError('Não foi possível carregar suas empresas. Entre novamente antes de pagar.'); });
    return () => { canceled = true; };
  }, [isAuthenticated]);

  useEffect(() => {
    if (!subscriptionId || active) return;
    let canceled = false;
    const check = async () => {
      try {
        const status = await BillingService.getSubscriptionStatusById(subscriptionId);
        if (!canceled && status === 'active') {
          setActive(true); clearPendingPurchase();
          if (attemptKey.current) sessionStorage.removeItem(attemptKey.current);
        }
      } catch { /* Do not infer payment approval from a failed status check. */ }
    };
    void check();
    const timer = window.setInterval(check, 5000);
    return () => { canceled = true; window.clearInterval(timer); };
  }, [subscriptionId, active]);

  const prepare = async () => {
    if (!formRef.current?.reportValidity()) throw new Error('Preencha nome, telefone e e-mail antes de pagar.');
    if (!isAuthenticated) throw new Error('Entre na sua conta antes de pagar.');
    if (!plan) throw new Error('Plano não disponível.');
    if (preparedCompany.current) return preparedCompany.current;
    const result = await api.post<{ companyId: string }>('/api/checkout/company', {
      contact: { name, phone, email }, planId: plan.id, ...(companyChoice ? { companyId: companyChoice } : {})
    });
    preparedCompany.current = result.companyId;
    savePendingPurchase(plan.id, result.companyId);
    return result.companyId;
  };

  const generatePix = async () => {
    if (submitLock.current || !plan) return;
    submitLock.current = true; setBusy(true); setError('');
    try {
      const companyId = await prepare();
      if (plan.price === 0) { clearPendingPurchase(); onNavigateTab('painel'); return; }
      const pixAttemptKey = `itapoa_pix_attempt_${user?.id}_${companyId}_${plan.id}`;
      let pixReqId = sessionStorage.getItem(pixAttemptKey);
      if (!pixReqId || !/^[a-f0-9-]{36}$/i.test(pixReqId)) {
        pixReqId = crypto.randomUUID();
        sessionStorage.setItem(pixAttemptKey, pixReqId);
      }
      const details = await BillingService.generatePixPayment(companyId, plan.id, 0, email, name, undefined, pixReqId);
      if (!details.qrCode) throw new Error('O Mercado Pago não retornou o código Pix. Não efetue transferência sem o código oficial.');
      setPix(details); setSubscriptionId(details.subscriptionId);
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível gerar o Pix.'); }
    finally { submitLock.current = false; setBusy(false); }
  };

  const payCard = async (formData: Record<string, unknown>) => {
    if (submitLock.current || !plan) throw new Error('Aguarde a tentativa atual.');
    submitLock.current = true; setBusy(true); setError('');
    try {
      const companyId = await prepare();
      const payer = (formData.payer || {}) as Record<string, unknown>;
      attemptKey.current = `itapoa_card_attempt_${user?.id}_${companyId}_${plan.id}`;
      const previousAttempt = sessionStorage.getItem(attemptKey.current);
      if (previousAttempt && /^[a-f0-9-]{36}$/i.test(previousAttempt)) requestId.current = previousAttempt as `${string}-${string}-${string}-${string}-${string}`;
      sessionStorage.setItem(attemptKey.current, requestId.current);
      const result = await api.post<{ subscriptionId: string; status: string }>('/api/payments/card', {
        companyId, planId: plan.id, requestId: requestId.current, formData: { ...formData, payer: { ...payer, email } }
      });
      if (result.status === 'rejected' || result.status === 'cancelled') {
        sessionStorage.removeItem(attemptKey.current);
        requestId.current = crypto.randomUUID();
        throw new Error('Pagamento não aprovado. Confira os dados ou escolha Pix.');
      }
      setSubscriptionId(result.subscriptionId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível processar o cartão.');
      throw e;
    } finally { submitLock.current = false; setBusy(false); }
  };

  if (!intent) return <section className="max-w-lg mx-auto px-5 py-16 text-center"><h1 className="text-2xl font-bold">Escolha seu plano</h1><button className="mt-6 underline" onClick={() => onNavigateTab('planos')}>Ver planos</button></section>;
  const free = plan?.price === 0;
  return <section className="max-w-4xl mx-auto px-4 py-10 md:py-14">
    <button onClick={() => { clearPendingPurchase(); onNavigateTab('planos'); }} className="flex items-center gap-2 text-sm text-slate-600 mb-6"><ArrowLeft size={16} /> Voltar aos planos</button>
    <div className="grid md:grid-cols-[1fr_260px] gap-6 items-start">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#C8102E] mb-2">Checkout seguro</p>
        <h1 className="text-2xl font-black text-slate-950">Finalize seu plano</h1>
        <p className="text-sm text-slate-500 mt-2 mb-6">Só o essencial agora. Categoria, cidade e dados da empresa ficam para depois.</p>
        {error && <p role="alert" className="rounded-xl bg-red-50 text-red-800 p-4 text-sm mb-5">{error}</p>}
        {active ? <div className="space-y-4"><CheckCircle2 className="text-emerald-600" /><h2 className="text-xl font-bold">Pagamento confirmado</h2><p>Agora complete as informações da sua empresa.</p><button onClick={() => onNavigateTab('painel')} className="w-full rounded-xl bg-slate-950 text-white p-4">Completar meu cadastro</button></div> : <>
          <form ref={formRef} onSubmit={e => e.preventDefault()} className="space-y-4" aria-label="Dados de contato">
            <label className="block text-sm font-medium">Nome<input autoComplete="name" required minLength={2} maxLength={120} value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 p-3" /></label>
            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block text-sm font-medium">Telefone<input type="tel" autoComplete="tel" required minLength={10} maxLength={15} placeholder="(47) 99999-0000" value={phone} onChange={e => setPhone(maskPhone(e.target.value))} className="mt-1 block w-full rounded-xl border border-slate-300 p-3" /></label>
              <label className="block text-sm font-medium">E-mail<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} className="mt-1 block w-full rounded-xl border border-slate-300 p-3" /></label>
            </div>
            {companies.length > 0 && <label className="block text-sm font-medium">Anúncio<select value={companyChoice} onChange={e => { setCompanyChoice(e.target.value); preparedCompany.current = ''; requestId.current = crypto.randomUUID(); }} disabled={busy || Boolean(subscriptionId)} className="mt-1 block w-full border rounded-xl p-3"><option value="">Novo anúncio — completar depois</option>{companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
          </form>
          {!isAuthenticated ? <div className="mt-6 border-t pt-5"><p className="text-sm text-slate-600 mb-4">Entre na sua conta para vincular o pagamento com segurança. Seu plano será preservado.</p><div className="flex gap-3"><button onClick={() => onNavigateTab('login')} className="flex-1 bg-slate-950 text-white rounded-xl p-3">Entrar</button><button onClick={() => onNavigateTab('cadastro')} className="flex-1 border rounded-xl p-3">Criar conta</button></div></div> : free ? <button disabled={busy} onClick={generatePix} className="w-full bg-slate-950 text-white rounded-xl p-4 mt-6">{busy ? 'Preparando…' : 'Continuar gratuitamente'}</button> : <div className="border-t mt-6 pt-6">
            {!subscriptionId && <div className="grid grid-cols-2 gap-3 mb-5" role="group" aria-label="Forma de pagamento"><button aria-pressed={method === 'card'} onClick={() => setMethod('card')} disabled={busy} className={`flex justify-center items-center gap-2 p-3 border rounded-xl ${method === 'card' ? 'border-[#C8102E] bg-red-50' : ''}`}><CreditCard size={18} /> Cartão</button><button aria-pressed={method === 'pix'} onClick={() => setMethod('pix')} disabled={busy} className={`flex justify-center items-center gap-2 p-3 border rounded-xl ${method === 'pix' ? 'border-[#C8102E] bg-red-50' : ''}`}><QrCode size={18} /> Pix</button></div>}
            {!gateway || !plan ? <p role="status">Carregando opções de pagamento…</p> : subscriptionId ? <div className="space-y-4">
              {pix && <><h2 className="font-bold">Pague com Pix</h2>{pix.qrCodeBase64 && <img src={`data:image/png;base64,${pix.qrCodeBase64}`} alt="QR Code Pix" className="w-52 h-52 mx-auto" />}<label className="block text-sm">Pix Copia e Cola<textarea readOnly value={pix.qrCode} className="w-full border rounded-xl p-3 mt-2 text-xs" /></label><button className="w-full border rounded-xl p-3" onClick={async () => { try { await navigator.clipboard.writeText(pix.qrCode); setCopied(true); } catch { setError('Selecione e copie o código acima.'); } }}>{copied ? 'Código copiado' : 'Copiar código Pix'}</button><p className="text-xs text-slate-500">Validade: {new Date(pix.expirationDate).toLocaleString('pt-BR')}. Não pague um código expirado.</p></>}
              <p role="status" className="text-sm text-slate-600">Aguardando a confirmação oficial do Mercado Pago. Não faça outro pagamento para esta compra.</p>
            </div> : method === 'card' ? gateway.cardEnabled ? <MercadoPagoCard email={user?.email} publicKey={gateway.publicKey} amount={plan.price} onSubmit={payCard} /> : <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Cartão temporariamente indisponível. A configuração segura do Mercado Pago precisa ser concluída.</p> : <><p className="text-sm text-slate-600 mb-4">Gere o QR Code para pagar. O plano será ativado após a confirmação oficial.</p><button disabled={busy || !gateway.pixEnabled} onClick={generatePix} className="w-full flex justify-center items-center gap-2 rounded-xl bg-slate-950 text-white p-4 disabled:opacity-50">{busy && <Loader2 size={18} className="animate-spin" />}{busy ? 'Gerando Pix…' : 'Gerar QR Code Pix'}</button>{!gateway.pixEnabled && <p role="status" className="text-sm text-amber-900 mt-3">Pix temporariamente indisponível. Configuração do Mercado Pago pendente.</p>}</>}
          </div>}
        </>}
      </div>
      <aside className="bg-white border rounded-2xl p-6 space-y-3"><h2 className="font-bold">Seu plano</h2><p>{names[intent.planId] || 'Plano selecionado'}</p><p className="text-2xl font-black">{plan ? money(plan.price) : '…'}</p><p className="text-xs text-slate-500">{free ? 'Sem cobrança.' : '30 dias de acesso. Sem renovação automática nesta compra.'}</p><div className="flex gap-2 text-xs text-slate-500 border-t pt-4"><LockKeyhole size={16} className="shrink-0" />Pagamento processado pelo Mercado Pago. Não armazenamos número do cartão ou CVV.</div></aside>
    </div>
  </section>;
}
