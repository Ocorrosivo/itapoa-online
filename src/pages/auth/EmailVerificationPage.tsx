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
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4 py-16">
      <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="text-center space-y-3">
          {success ? (
            <CheckCircle2 className="mx-auto text-emerald-500" size={48} />
          ) : error ? (
            <AlertTriangle className="mx-auto text-amber-500" size={48} />
          ) : (
            <Mail className="mx-auto text-blue-500" size={48} />
          )}

          <h1 className="text-2xl font-bold">
            {success ? 'E-mail Confirmado!' : 'Confirmação de E-mail'}
          </h1>
          <p className="text-sm text-slate-400">
            {success
              ? 'Sua conta foi ativada com sucesso. Você já pode continuar.'
              : 'Clique no botão abaixo para ativar sua conta e liberar o acesso com segurança.'}
          </p>
        </div>

        {error && (
          <div role="alert" className="p-4 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-sm">
            {error}
          </div>
        )}

        {success ? (
          <div className="space-y-4 pt-2">
            {pending ? (
              <button
                onClick={() => onNavigateTab('checkout')}
                className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold transition"
              >
                <span>Continuar para o Pagamento</span>
                <ArrowRight size={18} />
              </button>
            ) : (
              <button
                onClick={() => onNavigateTab('painel')}
                className="w-full p-4 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold transition"
              >
                Acessar meu Painel
              </button>
            )}
            <button
              onClick={() => onNavigateTab('home')}
              className="w-full text-center text-xs text-slate-400 hover:underline pt-2 block"
            >
              Voltar ao início
            </button>
          </div>
        ) : validTokenFormat ? (
          <div className="space-y-4">
            <p className="text-xs text-slate-400 text-center">
              A confirmação exige sua ação direta para evitar ativações acidentais por antivírus ou scanners de e-mail.
            </p>
            <button
              disabled={busy}
              onClick={handleConfirm}
              className="w-full p-4 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold transition disabled:opacity-50"
            >
              {busy ? 'Confirmando...' : 'Confirmar meu E-mail'}
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-sm space-y-3">
              <p className="font-semibold text-slate-300">Precisa de um novo link?</p>
              <p className="text-xs text-slate-400">
                Se você não recebeu o e-mail ou o link expirou, informe seu endereço abaixo para receber uma nova mensagem:
              </p>
              <form onSubmit={handleResend} className="space-y-3 pt-2">
                <input
                  type="email"
                  required
                  placeholder="seu-email@empresa.com.br"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
                />
                <button
                  type="submit"
                  disabled={resendBusy || !resendEmail}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-semibold text-sm transition disabled:opacity-50"
                >
                  <RefreshCw size={16} className={resendBusy ? 'animate-spin' : ''} />
                  <span>{resendBusy ? 'Reenviando...' : 'Reenviar Confirmação'}</span>
                </button>
              </form>
              {resendMsg && (
                <p role="status" className="text-xs text-emerald-400 mt-2">
                  {resendMsg}
                </p>
              )}
            </div>

            <div className="flex justify-between items-center text-xs text-slate-400 pt-2">
              <button onClick={() => onNavigateTab('login')} className="hover:underline">
                Ir para Login
              </button>
              <button onClick={() => onNavigateTab('home')} className="hover:underline">
                Página Inicial
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
};
