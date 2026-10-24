import React, { useEffect, useState } from 'react';
import { KeyRound, ArrowLeft, Mail, MessageCircle, AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { api } from '../../lib/apiClient';

interface Props {
  onNavigateTab: (tab: string) => void;
}

export const ForgotPasswordPage: React.FC<Props> = ({ onNavigateTab }) => {
  const [email, setEmail] = useState('');
  const [available, setAvailable] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get<{ available: boolean }>('/api/auth/recovery-status')
      .then((data) => {
        if (active) setAvailable(data.available === true);
      })
      .catch(() => {
        if (active) setAvailable(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting || !available) return;
    setSubmitting(true);
    setError('');
    try {
      const data = await api.post<{ message: string }>('/api/auth/forgot-password', { email: email.trim() });
      setMessage(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível solicitar a recuperação.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center px-4 py-16 font-sans relative overflow-hidden">
      {/* Luz ambiente de fundo */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[30rem] h-[30rem] bg-[#C8102E]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Botão de retorno superior */}
      <div className="absolute top-6 left-6 z-20">
        <button
          type="button"
          onClick={() => onNavigateTab('login')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold transition shadow-sm cursor-pointer hover:bg-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Login</span>
        </button>
      </div>

      <div className="w-full max-w-md bg-slate-900/95 backdrop-blur-xl border border-slate-800/90 rounded-3xl p-8 sm:p-10 shadow-2xl space-y-6 relative z-10">
        {/* Logotipo e Cabeçalho */}
        <div className="text-center space-y-3">
          <button
            type="button"
            onClick={() => onNavigateTab('home')}
            className="mx-auto block transition-transform hover:scale-105"
            aria-label="Voltar à página inicial"
          >
            <img
              src="/logotipo.png"
              alt="Itapoá Online"
              className="h-14 w-auto object-contain drop-shadow-md mx-auto"
            />
          </button>
          <span className="text-[10px] font-black tracking-widest text-[#C8102E] uppercase block">
            RECUPERAÇÃO DE ACESSO
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Esqueceu sua senha?
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
            Informe o e-mail cadastrado da sua empresa para receber o link seguro de redefinição de senha.
          </p>
        </div>

        {available === false && (
          <div role="alert" className="p-4 rounded-xl bg-amber-950/50 border border-amber-600/50 text-amber-200 text-xs flex items-start gap-2.5">
            <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <span>Recuperação por e-mail temporariamente em manutenção. Utilize o suporte direto no final desta tela.</span>
          </div>
        )}

        {error && (
          <div role="alert" className="p-4 rounded-xl bg-red-950/70 border border-red-800/80 text-red-200 text-xs flex items-center gap-2.5">
            <AlertTriangle size={16} className="text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {message ? (
          <div className="space-y-6 pt-2">
            <div className="rounded-2xl bg-emerald-950/50 border border-emerald-500/30 p-6 text-center space-y-3">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40">
                <CheckCircle2 size={36} />
              </div>
              <h2 className="text-lg font-bold text-emerald-200">Solicitação Enviada!</h2>
              <p className="text-xs text-emerald-300/80 leading-relaxed">
                {message}
              </p>
              <p className="text-[11px] text-slate-400 pt-1">
                Verifique sua caixa de entrada e pasta de spam. O link possui validade de 15 minutos.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab('login')}
              className="w-full py-4 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition text-xs sm:text-sm cursor-pointer shadow-sm"
            >
              Voltar ao Login
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="recovery-email" className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                E-mail Comercial Cadastrado
              </label>
              <div className="relative">
                <input
                  id="recovery-email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contato@suaempresa.com.br"
                  className="w-full rounded-xl p-3.5 pr-12 bg-slate-950 border border-slate-800 focus:border-[#C8102E] focus:outline-none transition text-sm text-white placeholder-slate-600"
                />
                <Mail size={18} className="absolute right-3.5 top-3.5 text-slate-500 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={!available || submitting}
              className="w-full py-4 px-6 rounded-2xl bg-[#C8102E] hover:bg-[#A00D24] text-white font-bold transition flex items-center justify-center gap-2 text-sm shadow-lg shadow-red-950/40 disabled:opacity-50 cursor-pointer"
            >
              <KeyRound size={18} />
              <span>{submitting ? 'Enviando link seguro…' : 'Enviar Link de Recuperação'}</span>
            </button>
          </form>
        )}

        {/* Suporte Direto e Atendimento */}
        <div className="border-t border-slate-800/80 pt-5 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Precisa de auxílio imediato?
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <a
              href="https://wa.me/5547997190413"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 hover:bg-emerald-900/40 transition cursor-pointer font-semibold"
            >
              <MessageCircle size={16} className="text-emerald-400" />
              <span>WhatsApp Suporte</span>
            </a>
            <a
              href="mailto:contato@itapoa.online?subject=Ajuda%20para%20recuperar%20acesso"
              className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 hover:bg-slate-800 transition cursor-pointer font-semibold"
            >
              <Mail size={16} className="text-slate-400" />
              <span>E-mail Oficial</span>
            </a>
          </div>
        </div>
      </div>
    </main>
  );
};

