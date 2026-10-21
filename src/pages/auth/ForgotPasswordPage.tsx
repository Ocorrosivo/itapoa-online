import React, { useEffect, useState } from 'react';
import { KeyRound, ArrowLeft, Mail, MessageCircle } from 'lucide-react';
import { api } from '../../lib/apiClient';

interface Props { onNavigateTab: (tab: string) => void }
export const ForgotPasswordPage: React.FC<Props> = ({ onNavigateTab }) => {
  const [email, setEmail] = useState('');
  const [available, setAvailable] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    api.get<{ available: boolean }>('/api/auth/recovery-status')
      .then(data => { if (active) setAvailable(data.available === true); })
      .catch(() => { if (active) setAvailable(false); });
    return () => { active = false; };
  }, []);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting || !available) return;
    setSubmitting(true); setError('');
    try {
      const data = await api.post<{ message: string }>('/api/auth/forgot-password', { email: email.trim() });
      setMessage(data.message);
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível solicitar a recuperação.'); }
    finally { setSubmitting(false); }
  }
  return <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4 py-16">
    <section className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
      <button type="button" onClick={() => onNavigateTab('login')} className="flex gap-2 text-sm text-slate-300"><ArrowLeft size={18} />Voltar ao login</button>
      <KeyRound className="text-rose-500 mx-auto" size={36} />
      <h1 className="text-2xl font-bold text-center">Esqueceu sua senha?</h1>
      <p className="text-sm text-slate-300">Informe o e-mail cadastrado para receber um link e escolher uma nova senha.</p>
      {available === null && <p role="status" className="text-sm text-slate-300">Verificando disponibilidade…</p>}
      {available === false && <p role="alert" className="text-sm text-amber-200">Recuperação por e-mail temporariamente indisponível. Utilize o suporte abaixo.</p>}
      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      {message ? <div role="status" className="rounded-xl p-4 bg-emerald-950 text-emerald-100 space-y-3">
        <h2 className="font-bold">Solicitação recebida</h2><p className="text-sm">{message}</p>
        <p className="text-xs">Caso não receba em alguns minutos, fale com o suporte ou tente novamente mais tarde.</p>
      </div> : <form onSubmit={submit} className="space-y-4">
        <label htmlFor="recovery-email" className="block text-sm">E-mail cadastrado</label>
        <input id="recovery-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)}
          className="w-full rounded-xl p-3 bg-slate-950 border border-slate-700" />
        <button disabled={!available || submitting} className="w-full rounded-xl p-3 bg-rose-700 font-bold disabled:opacity-50">
          {submitting ? 'Solicitando…' : 'Enviar link de recuperação'}
        </button>
      </form>}
      <div className="border-t border-slate-700 pt-4 space-y-3 text-sm">
        <p className="text-slate-400">Atendimento manual (não envia o link automaticamente):</p>
        <a href="https://wa.me/5547997190413" target="_blank" rel="noopener noreferrer" className="flex gap-2 text-emerald-300"><MessageCircle size={18} />WhatsApp do suporte</a>
        <a href="mailto:contato@itapoa.online?subject=Ajuda%20para%20recuperar%20acesso" className="flex gap-2 text-slate-300"><Mail size={18} />Escrever para o suporte</a>
      </div>
    </section>
  </main>;
};
