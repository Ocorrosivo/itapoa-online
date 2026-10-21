import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
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
      setToken(incoming); setDone(false); setError(''); setPassword(''); setConfirmation('');
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
      setError('Use pelo menos 8 caracteres e no máximo 72 bytes.'); return;
    }
    if (password !== confirmation) { setError('As senhas não coincidem.'); return; }
    setBusy(true);
    try {
      await api.post('/api/auth/reset-password', { token, password });
      setToken(''); setPassword(''); setConfirmation(''); logout(); setDone(true);
    } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível redefinir a senha.'); }
    finally { setBusy(false); }
  }
  const validLink = /^[a-f0-9]{64}$/.test(token);
  return <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4 py-16">
    <section className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 space-y-6">
      <KeyRound className="mx-auto text-rose-500" size={36} /><h1 className="text-2xl font-bold text-center">Definir nova senha</h1>
      {done ? <div role="status" className="text-emerald-200">Senha redefinida. Entre novamente com sua nova senha.</div>
        : !validLink ? <p role="alert" className="text-amber-200">Link inválido. Abra o link recebido por e-mail ou solicite uma nova recuperação.</p>
        : <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-slate-300">O link expira em 15 minutos e pode ser usado apenas uma vez.</p>
          {error && <p role="alert" className="text-rose-300 text-sm">{error}</p>}
          <label htmlFor="new-password" className="block text-sm">Nova senha</label>
          <div className="relative"><input id="new-password" type={visible ? 'text' : 'password'} autoComplete="new-password" required minLength={8}
            value={password} onChange={e => setPassword(e.target.value)} className="w-full rounded-xl p-3 pr-14 bg-slate-950 border border-slate-700" />
            <button type="button" aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={visible} onClick={() => setVisible(!visible)} className="absolute right-3 top-3">
              {visible ? <EyeOff /> : <Eye />}</button></div>
          <label htmlFor="confirm-password" className="block text-sm">Confirmar nova senha</label>
          <input id="confirm-password" type={visible ? 'text' : 'password'} autoComplete="new-password" required minLength={8}
            value={confirmation} onChange={e => setConfirmation(e.target.value)} className="w-full rounded-xl p-3 bg-slate-950 border border-slate-700" />
          <button disabled={busy} className="w-full rounded-xl p-3 bg-rose-700 font-bold disabled:opacity-50">{busy ? 'Salvando…' : 'Salvar nova senha'}</button>
        </form>}
      {!done && <button type="button" onClick={() => onNavigateTab('esqueci-senha')} className="text-sm text-slate-300 underline">Solicitar novo link</button>}
      <button type="button" onClick={() => onNavigateTab('login')} className="block text-sm text-slate-300 underline">Voltar ao login</button>
    </section>
  </main>;
};
