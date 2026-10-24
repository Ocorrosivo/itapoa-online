import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, Mail, ArrowRight, RefreshCw } from 'lucide-react';
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
    <main className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center px-4 py-16 font-sans relative overflow-hidden">
      {/* Luz ambiente de fundo */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[30rem] h-[30rem] bg-[#C8102E]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Botão de retorno superior */}
      <div className="absolute top-6 left-6 z-20">
        <button
          type="button"
          onClick={() => onNavigateTab('home')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold transition shadow-sm cursor-pointer hover:bg-slate-800"
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
          <span>Voltar ao Portal</span>
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
            ATIVAÇÃO SEGURA DE CONTA
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {success ? 'E-mail Confirmado!' : 'Confirmação de E-mail'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
            {success
              ? 'Sua conta empresarial foi ativada com sucesso. Você já pode prosseguir para seu painel ou pagamento.'
              : 'Clique no botão abaixo para validar seu endereço de e-mail e liberar o acesso com segurança.'}
          </p>
        </div>

        {error && (
          <div role="alert" className="p-4 rounded-xl bg-red-950/70 border border-red-800/80 text-red-200 text-xs flex items-center gap-2.5">
            <AlertTriangle size={16} className="text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="space-y-4 pt-2">
            <div className="rounded-2xl bg-emerald-950/50 border border-emerald-500/30 p-6 text-center space-y-3">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner border border-emerald-500/40">
                <CheckCircle2 size={36} className="animate-pulse" />
              </div>
              <h2 className="text-lg font-bold text-emerald-200">Conta Ativada com Sucesso!</h2>
              <p className="text-xs text-emerald-300/80 leading-relaxed">
                Seu e-mail foi validado no portal. Seu plano e dados cadastrais estão preservados.
              </p>
            </div>

            {pending ? (
              <button
                type="button"
                onClick={() => onNavigateTab('checkout')}
                className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-[#C8102E] hover:bg-[#A00D24] text-white font-bold transition text-sm shadow-lg shadow-red-950/40 cursor-pointer"
              >
                <span>Continuar para o Pagamento</span>
                <ArrowRight size={18} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onNavigateTab('painel')}
                className="w-full py-4 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition text-sm cursor-pointer shadow-sm"
              >
                Acessar meu Painel
              </button>
            )}

            <button
              type="button"
              onClick={() => onNavigateTab('home')}
              className="w-full text-center text-xs text-slate-400 hover:text-white transition block pt-1 cursor-pointer"
            >
              Voltar à página inicial do portal
            </button>
          </div>
        ) : validTokenFormat ? (
          <div className="space-y-4">
            <p className="text-xs text-slate-400 text-center leading-relaxed">
              A confirmação exige sua ação direta para evitar ativações acidentais por antivírus ou scanners de e-mail.
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={handleConfirm}
              className="w-full py-4 px-6 rounded-2xl bg-[#C8102E] hover:bg-[#A00D24] text-white font-bold transition flex items-center justify-center gap-2 text-sm shadow-lg shadow-red-950/40 disabled:opacity-50 cursor-pointer"
            >
              <CheckCircle2 size={18} />
              <span>{busy ? 'Validando token…' : 'Confirmar meu E-mail Agora'}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 text-sm space-y-3">
              <p className="font-semibold text-slate-200">Precisa de um novo link?</p>
              <p className="text-xs text-slate-400 leading-relaxed">
                Se você não recebeu a mensagem ou o link expirou, informe seu e-mail comercial abaixo para reenviarmos:
              </p>
              <form onSubmit={handleResend} className="space-y-3 pt-1">
                <input
                  type="email"
                  required
                  placeholder="seu-email@empresa.com.br"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  className="w-full p-3.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:border-[#C8102E] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={resendBusy || !resendEmail}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-xs sm:text-sm transition disabled:opacity-50 cursor-pointer"
                >
                  <RefreshCw size={16} className={resendBusy ? 'animate-spin' : ''} />
                  <span>{resendBusy ? 'Reenviando…' : 'Reenviar E-mail de Confirmação'}</span>
                </button>
              </form>
              {resendMsg && (
                <p role="status" className="text-xs text-emerald-400 mt-2 font-medium">
                  {resendMsg}
                </p>
              )}
            </div>

            <div className="flex justify-between items-center text-xs text-slate-400 pt-1">
              <button
                type="button"
                onClick={() => onNavigateTab('login')}
                className="hover:text-white underline transition cursor-pointer"
              >
                Ir para Login
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('home')}
                className="hover:text-white underline transition cursor-pointer"
              >
                Página Inicial
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};
