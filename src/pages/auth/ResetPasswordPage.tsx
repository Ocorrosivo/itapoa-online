import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound, ArrowLeft, CheckCircle2, AlertTriangle, LogIn, ShieldCheck } from 'lucide-react';
import { api } from '../../lib/apiClient';
import { useAuth } from '../../context/AuthContext';

export const ResetPasswordPage: React.FC<{ onNavigateTab: (tab: string) => void }> = ({ onNavigateTab }) => {
  // Mantém o segredo apenas em memória; um GET nunca consome o link
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
    <main className="min-h-screen bg-[#F6F8FC] text-[#101828] flex flex-col justify-center items-center px-4 py-12 font-sans relative">
      {/* Botão sutil de retorno no topo */}
      <div className="w-full max-w-md mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onNavigateTab('home')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#667085] hover:text-[#101828] transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
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
            Segurança da Conta
          </span>

          <h1 className="text-2xl font-black text-[#101828] tracking-tight">
            {done ? 'Senha Atualizada!' : 'Definir Nova Senha'}
          </h1>

          <p className="text-xs sm:text-sm text-[#667085] max-w-sm mx-auto leading-relaxed">
            {done
              ? 'Sua senha foi redefinida com segurança. Entre agora com sua nova credencial.'
              : 'Escolha uma nova senha forte e exclusiva para proteger o acesso à sua empresa.'}
          </p>
        </div>

        {error && (
          <div role="alert" className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2.5">
            <AlertTriangle size={16} className="text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {done ? (
          /* Estado de Sucesso */
          <div className="space-y-5 pt-1 animate-in fade-in">
            <div className="rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] p-5 text-center space-y-2">
              <div className="w-12 h-12 bg-emerald-100 text-[#00B894] rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={28} />
              </div>
              <h2 className="text-sm font-bold text-[#065F46]">Senha redefinida com sucesso!</h2>
              <p className="text-xs text-[#065F46]/90">
                Sua credencial já está ativa para autenticação no portal.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab('login')}
              className="w-full h-[48px] rounded-xl bg-[#080F24] hover:bg-slate-800 text-white font-bold transition flex items-center justify-center gap-2 text-xs sm:text-sm shadow-xs cursor-pointer"
            >
              <LogIn size={16} />
              <span>Entrar com a nova senha</span>
            </button>
          </div>
        ) : !validLink ? (
          /* Link expirado ou ausente */
          <div className="space-y-5 pt-1">
            <div className="p-5 rounded-xl bg-amber-50 border border-amber-200 text-center space-y-2">
              <AlertTriangle size={24} className="text-amber-600 mx-auto" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-900">Link expirado ou já utilizado</h2>
              <p className="text-xs text-amber-800 leading-relaxed">
                Por motivos de segurança, os links de redefinição têm uso único e validade de 15 minutos.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => onNavigateTab('esqueci-senha')}
                className="w-full h-[48px] rounded-xl bg-[#080F24] hover:bg-slate-800 text-white font-bold transition text-xs sm:text-sm shadow-xs cursor-pointer"
              >
                Solicitar novo link de recuperação
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('login')}
                className="w-full h-[44px] rounded-xl border border-[#E5EAF1] bg-white text-[#101828] font-bold hover:bg-slate-50 transition text-xs cursor-pointer"
              >
                Voltar ao login
              </button>
            </div>
          </div>
        ) : (
          /* Formulário de Criação da Nova Senha */
          <form onSubmit={submit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label htmlFor="new-password" className="block text-xs font-bold text-[#101828] uppercase tracking-wider">
                Nova Senha (mínimo 8 caracteres)
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
                  className="w-full h-[48px] rounded-xl px-4 pr-11 bg-white border border-[#E5EAF1] focus:border-[#080F24] focus:ring-1 focus:ring-[#080F24] focus:outline-none transition text-sm text-[#101828] placeholder-[#667085]/60"
                />
                <button
                  type="button"
                  aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
                  aria-pressed={visible}
                  onClick={() => setVisible(!visible)}
                  className="absolute right-3.5 top-3.5 text-[#667085] hover:text-[#101828] transition cursor-pointer"
                >
                  {visible ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirm-password" className="block text-xs font-bold text-[#101828] uppercase tracking-wider">
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
                className="w-full h-[48px] rounded-xl px-4 bg-white border border-[#E5EAF1] focus:border-[#080F24] focus:ring-1 focus:ring-[#080F24] focus:outline-none transition text-sm text-[#101828] placeholder-[#667085]/60"
              />
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full h-[48px] rounded-xl bg-[#080F24] hover:bg-slate-800 text-white font-bold transition flex items-center justify-center gap-2 text-xs sm:text-sm shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <KeyRound size={16} />
              <span>{busy ? 'Salvando com segurança…' : 'Salvar Nova Senha'}</span>
            </button>

            <div className="pt-2 text-center space-y-1.5">
              <button
                type="button"
                onClick={() => onNavigateTab('esqueci-senha')}
                className="text-xs text-[#667085] hover:text-[#101828] underline transition cursor-pointer block mx-auto"
              >
                Solicitar novo link de recuperação
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('login')}
                className="text-xs text-[#667085] hover:text-[#101828] underline transition cursor-pointer block mx-auto"
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
