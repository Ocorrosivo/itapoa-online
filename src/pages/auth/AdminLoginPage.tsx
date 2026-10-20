/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Dedicated Admin Master Login Page Component - /login/admin
 */

import React, { useState } from 'react';
import { Mail, Lock, ShieldCheck, ArrowLeft, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AdminLoginPageProps {
  onNavigateTab: (tab: string) => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onNavigateTab }) => {
  const { login, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onNavigateTab('home');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNavigateTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const authenticated = await login(email, password);
      if (!authenticated) {
        setErrorMsg('Credenciais de Administrador Master incorretas.');
        return;
      }

      // The role comes from the database via the API. Logging in through this
      // page does not grant privileges — a non-admin account is refused here.
      if (authenticated.role !== 'admin_master' && authenticated.role !== 'admin') {
        setErrorMsg('Esta conta não possui privilégios de Administrador Master.');
        logout();
        return;
      }

      onNavigateTab('admin');
    } catch {
      setErrorMsg('Falha de comunicação com o servidor master.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-4 font-sans relative overflow-hidden">
      
      {/* Red Glowing Security Aura */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[min(450px,92vw)] h-[min(450px,92vw)] bg-red-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Back Link */}
      <div className="absolute top-6 left-6">
        <button
          onClick={() => onNavigateTab('home')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold transition shadow"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Portal</span>
        </button>
      </div>

      <div className="w-full max-w-md bg-slate-900 border border-red-900/50 rounded-3xl p-8 shadow-2xl space-y-6 relative z-10">
        
        {/* Master Badge Header */}
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-red-600/20 text-[#C8102E] flex items-center justify-center mx-auto shadow-lg border border-red-600/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <span className="px-3 py-1 bg-[#C8102E] text-white text-[9px] font-black uppercase tracking-widest rounded-full inline-block shadow">
            ACESSO EXCLUSIVO • MASTER ADMIN
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Painel Executivo
          </h1>
          <p className="text-xs text-slate-400">
            Ambiente restrito de gestão do sistema, bancos de dados e faturamento SaaS.
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-950/90 border border-red-700 text-red-200 rounded-xl text-xs font-bold text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              E-mail de Administrador Master
            </label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Senha Master
            </label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-[#C8102E] hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-xl transition uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <KeyRound className="w-4 h-4" />
            <span>{isSubmitting ? 'Verificando Permissões...' : 'ENTRAR NO ADMIN MASTER ➔'}</span>
          </button>
        </form>

        <div className="pt-4 border-t border-slate-800 text-center text-xs text-slate-500">
          <span>Dúvidas ou suporte de infraestrutura? Fale com a equipe de engenharia.</span>
        </div>

      </div>
    </div>
  );
};
