import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, Mail, ArrowRight, RefreshCw, ShieldCheck } from 'lucide-react';
import { api } from '../../lib/apiClient';
import { readPendingPurchase } from '../../lib/pendingPurchase';

export const EmailVerificationPage: React.FC<{ onNavigateTab: (tab: string) => void }> = ({ onNavigateTab }) => {
  // O token fica no fragmento da URL (#token=...), prevenindo consumo em GET por scanners de e-mail
  const [token, setToken] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token') || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [resendBusy, setResendBusy] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  const pending = readPendingPurchase();

  useEffect(() => {
    function readLink() {
      if (!window.location.hash) return;
      const incoming = new URLSearchParams(window.location.hash.slice(1)).get('token') || '';
      if (incoming) {
        setToken(incoming);
        setSuccess(false);
        setError('');
        window.history.replaceState(window.history.state, '', window.location.pathname);
      }
    }
    readLink();
    window.addEventListener('hashchange', readLink);
    return () => window.removeEventListener('hashchange', readLink);
  }, []);

  async function handleConfirm() {
    if (!token || busy) return;
    setBusy(true);
    setError('');

    try {
      await api.post('/api/auth/verify-email', { token });
      setSuccess(true);
      setToken('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível confirmar o e-mail. Solicite um novo link.');
    } finally {
      setBusy(false);
    }
  }

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    if (!resendEmail || resendBusy) return;
    setResendBusy(true);
    setResendMsg('');
    setError('');

    try {
      await api.post('/api/auth/resend-verification', { email: resendEmail });
      setResendMsg('Um novo link de confirmação foi enviado para o seu e-mail.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao reenviar e-mail de confirmação.');
    } finally {
      setResendBusy(false);
    }
  }

  const validTokenFormat = /^[a-f0-9]{64}$/i.test(token);

  return (
    <main className="min-h-screen bg-[#F6F8FC] text-[#101828] flex flex-col justify-center items-center px-4 py-12 font-sans relative">
      {/* Botão sutil de retorno no topo */}
      <div className="w-full max-w-md mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onNavigateTab('home')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#667085] hover:text-[#101828] transition cursor-pointer"
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
          <span>Voltar ao Portal</span>
        </button>

        <div className="flex items-center gap-1.5 text-[11px] font-medium text-[#667085]">
          <ShieldCheck size={14} className="text-[#00B894]" />
          <span>Ambiente Seguro</span>
        </div>
      </div>

      {/* Card Principal — Tema Claro & Minimalista */}
      <div className="w-full max-w-md bg-white border border-[#E5EAF1] rounded-2xl p-7 sm:p-9 shadow-xs space-y-6">
        
        {/* Logotipo e Cabeçalho */}
        <div className="text-center space-y-3">
          <button
            type="button"
            onClick={() => onNavigateTab('home')}
            className="mx-auto block transition-opacity hover:opacity-85 cursor-pointer"
            aria-label="Voltar à página inicial"
          >
            <img
              src="/logotipo.png"
              alt="Itapoá Online"
              className="h-12 w-auto object-contain mx-auto"
            />
          </button>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-[#080F24]">
            Confirmação de Conta
          </span>

          <h1 className="text-2xl font-black text-[#101828] tracking-tight">
            {success ? 'E-mail Confirmado!' : 'Validar seu E-mail'}
          </h1>

          <p className="text-xs sm:text-sm text-[#667085] max-w-sm mx-auto leading-relaxed">
            {success
              ? 'Sua conta foi ativada com sucesso no Itapoá Online. Você já pode acessar todos os recursos do portal.'
              : 'Clique no botão abaixo para concluir a validação e ativar os recursos comerciais da sua empresa.'}
          </p>
        </div>

        {error && (
          <div role="alert" className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2.5">
            <AlertTriangle size={16} className="text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {resendMsg && (
          <div role="status" className="p-3.5 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-xs flex items-center gap-2.5">
            <CheckCircle2 size={16} className="text-[#00B894] shrink-0" />
            <span>{resendMsg}</span>
          </div>
        )}

        {success ? (
          /* Estado de Sucesso */
          <div className="space-y-4 pt-1 animate-in fade-in">
            <div className="rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] p-5 text-center space-y-2">
              <div className="w-12 h-12 bg-emerald-100 text-[#00B894] rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={28} />
              </div>
              <h2 className="text-sm font-bold text-[#065F46]">E-mail verificado com sucesso!</h2>
              <p className="text-xs text-[#065F46]/90">
                Sua empresa agora tem acesso total ao catálogo e painel administrativo.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab(pending ? 'checkout' : 'painel')}
              className="w-full h-[48px] rounded-xl bg-[#080F24] hover:bg-slate-800 text-white font-bold transition flex items-center justify-center gap-2 text-xs sm:text-sm shadow-xs cursor-pointer"
            >
              <span>{pending ? 'Continuar com o plano selecionado' : 'Acessar meu painel'}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        ) : validTokenFormat ? (
          /* Token presente para confirmação */
          <div className="space-y-4 pt-1">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={busy}
              className="w-full h-[48px] rounded-xl bg-[#080F24] hover:bg-slate-800 text-white font-bold transition flex items-center justify-center gap-2 text-xs sm:text-sm shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 size={16} />
              <span>{busy ? 'Validando e-mail…' : 'Confirmar e ativar minha conta'}</span>
            </button>
          </div>
        ) : (
          /* Solicitar Reenvio */
          <form onSubmit={handleResend} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label htmlFor="resend-email" className="block text-xs font-bold text-[#101828] uppercase tracking-wider">
                E-mail para reenvio
              </label>
              <div className="relative">
                <input
                  id="resend-email"
                  type="email"
                  required
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="seuemail@empresa.com.br"
                  className="w-full h-[48px] rounded-xl px-4 pr-11 bg-white border border-[#E5EAF1] focus:border-[#080F24] focus:ring-1 focus:ring-[#080F24] focus:outline-none transition text-sm text-[#101828] placeholder-[#667085]/60"
                />
                <Mail size={16} className="absolute right-3.5 top-3.5 text-[#667085] pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={resendBusy}
              className="w-full h-[48px] rounded-xl bg-[#080F24] hover:bg-slate-800 text-white font-bold transition flex items-center justify-center gap-2 text-xs sm:text-sm shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw size={15} className={resendBusy ? 'animate-spin' : ''} />
              <span>{resendBusy ? 'Enviando…' : 'Reenviar link de confirmação'}</span>
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => onNavigateTab('login')}
                className="text-xs text-[#667085] hover:text-[#101828] underline transition cursor-pointer"
              >
                Voltar ao login
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
};
