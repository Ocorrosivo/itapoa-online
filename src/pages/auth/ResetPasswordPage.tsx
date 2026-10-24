import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound, ArrowLeft, CheckCircle2, AlertTriangle, LogIn, ShieldCheck } from 'lucide-react';
import { api } from '../../lib/apiClient';
import { useAuth } from '../../context/AuthContext';

export const ResetPasswordPage: React.FC<{ onNavigateTab: (tab: string) => void }> = ({ onNavigateTab }) => {
  // Keep the secret only in memory. A GET never consumes a link (mail scanners).
  const [token, setToken] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token') || '');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const { logout } = useAuth();

  useEffect(() => {
    function readLink() {
      if (!window.location.hash) return;
      const incoming = new URLSearchParams(window.location.hash.slice(1)).get('token') || '';
      setToken(incoming);
      setDone(false);
      setError('');
      setPassword('');
      setConfirmation('');
      window.history.replaceState(window.history.state, '', window.location.pathname);
    }
    readLink();
    window.addEventListener('hashchange', readLink);
    return () => window.removeEventListener('hashchange', readLink);
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError('');
    if (password.length < 8 || new TextEncoder().encode(password).length > 72) {
      setError('A senha deve conter no mínimo 8 caracteres.');
      return;
    }
    if (password !== confirmation) {
      setError('As senhas digitadas não coincidem.');
      return;
    }
    setBusy(true);
    try {
      await api.post('/api/auth/reset-password', { token, password });
      setToken('');
      setPassword('');
      setConfirmation('');
      logout();
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível redefinir a senha.');
    } finally {
      setBusy(false);
    }
  }

  const validLink = /^[a-f0-9]{64}$/.test(token);

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
          <ArrowLeft className="w-4 h-4" />
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
            SEGURANÇA & RECUPERAÇÃO DE CONTA
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {done ? 'Senha Atualizada!' : 'Definir Nova Senha'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
            {done
              ? 'Sua nova senha foi salva com segurança. Utilize-a para acessar seu painel comercial.'
              : 'Escolha uma nova senha forte e exclusiva para proteger o acesso à sua empresa.'}
          </p>
        </div>

        {/* ESTADO 1: SENHA REDEFINIDA COM SUCESSO (Visual Premium) */}
        {done ? (
          <div className="space-y-6 pt-2">
            <div className="rounded-2xl bg-emerald-950/50 border border-emerald-500/30 p-6 text-center space-y-3">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-inner border border-emerald-500/40">
                <CheckCircle2 size={36} className="animate-pulse" />
              </div>
              <h2 className="text-lg font-bold text-emerald-200">
                Acesso redefinido com sucesso!
              </h2>
              <p className="text-xs text-emerald-300/80 leading-relaxed">
                Todas as sessões anteriores foram encerradas com segurança. Você já pode fazer login com suas novas credenciais.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab('login')}
              className="w-full py-4 px-6 rounded-2xl bg-[#C8102E] hover:bg-[#A00D24] text-white font-bold transition flex items-center justify-center gap-2 text-sm shadow-lg shadow-red-950/40 cursor-pointer"
            >
              <LogIn size={18} />
              <span>Entrar no Painel Agora</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('home')}
              className="w-full text-center text-xs text-slate-400 hover:text-white transition block pt-1 cursor-pointer"
            >
              Voltar à página inicial do portal
            </button>
          </div>
        ) : !validLink ? (
          /* ESTADO 2: LINK INVÁLIDO OU EXPIRADO */
          <div className="space-y-6">
            <div className="rounded-2xl bg-amber-950/40 border border-amber-600/40 p-5 text-center space-y-3">
              <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto border border-amber-500/30">
                <AlertTriangle size={24} />
              </div>
              <p className="text-sm font-bold text-amber-200">Link expirado ou já utilizado</p>
              <p className="text-xs text-amber-300/70 leading-relaxed">
                Por motivos de segurança, os links de redefinição têm uso único e validade de 15 minutos.
              </p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => onNavigateTab('esqueci-senha')}
                className="w-full py-3.5 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition text-xs sm:text-sm cursor-pointer shadow-sm"
              >
                Solicitar novo link de recuperação
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('login')}
                className="w-full py-3 px-6 rounded-xl border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800/50 transition text-xs font-semibold cursor-pointer"
              >
                Voltar ao login
              </button>
            </div>
          </div>
        ) : (
          /* ESTADO 3: FORMULÁRIO DE NOVA SENHA */
          <form onSubmit={submit} className="space-y-5">
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 flex items-center gap-2.5">
              <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
              <span>Link válido por 15 minutos de uso único criptografado.</span>
            </div>

            {error && (
              <div role="alert" className="p-4 rounded-xl bg-red-950/70 border border-red-800/80 text-red-200 text-xs flex items-center gap-2.5">
                <AlertTriangle size={16} className="text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="new-password" className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Nova Senha (Mínimo 8 caracteres)
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={visible ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  maxLength={72}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl p-3.5 pr-12 bg-slate-950 border border-slate-800 focus:border-[#C8102E] focus:outline-none transition text-sm text-white placeholder-slate-600"
                />
                <button
                  type="button"
                  aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
                  aria-pressed={visible}
                  onClick={() => setVisible(!visible)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                >
                  {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirm-password" className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Confirmar Nova Senha
              </label>
              <input
                id="confirm-password"
                type={visible ? 'text' : 'password'}
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={72}
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl p-3.5 bg-slate-950 border border-slate-800 focus:border-[#C8102E] focus:outline-none transition text-sm text-white placeholder-slate-600"
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full py-4 px-6 rounded-2xl bg-[#C8102E] hover:bg-[#A00D24] text-white font-bold transition flex items-center justify-center gap-2 text-sm shadow-lg shadow-red-950/40 disabled:opacity-50 cursor-pointer"
            >
              <KeyRound size={18} />
              <span>{busy ? 'Salvando com segurança…' : 'Salvar Nova Senha'}</span>
            </button>

            <div className="pt-2 text-center space-y-2">
              <button
                type="button"
                onClick={() => onNavigateTab('esqueci-senha')}
                className="text-xs text-slate-400 hover:text-slate-200 underline transition cursor-pointer block mx-auto"
              >
                Solicitar novo link de recuperação
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('login')}
                className="text-xs text-slate-400 hover:text-slate-200 underline transition cursor-pointer block mx-auto"
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

