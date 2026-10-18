/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Dedicated Login Page Component - /login
 */

import React, { useState } from 'react';
import { Mail, Lock, LogIn, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface LoginPageProps {
  onNavigateTab: (tab: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigateTab }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      // The password goes to the API, which verifies it with bcrypt. The role
      // is whatever the server returns; the client never assigns one.
      const authenticated = await login(email, password);
      if (!authenticated) {
        setErrorMsg('Credenciais inválidas. Verifique seu e-mail e senha.');
        return;
      }

      const role = authenticated.role;
      onNavigateTab(role === 'admin_master' || role === 'admin' ? 'admin' : 'painel');
    } catch {
      setErrorMsg('Falha de conexão com o servidor de autenticação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-13rem)] bg-slate-950 text-white flex flex-col justify-center items-center px-4 py-16 font-sans relative overflow-hidden">
      
      {/* Background Subtle Gradient Blobs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#C8102E]/20 rounded-full blur-3xl pointer-events-none" />

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

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 relative z-10">
        
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <img
            src="/logotipo.png"
            alt="Itapoá Online"
            className="h-14 w-auto mx-auto object-contain drop-shadow-md cursor-pointer"
            onClick={() => { window.location.href = '/'; }}
          />
          <span className="text-[10px] font-black tracking-widest text-[#C8102E] uppercase block">
            PORTAL & MARKETPLACE PARCEIRO
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Acesso ao Painel
          </h1>
          <p className="text-xs text-slate-400">
            Entre com seus dados para gerenciar o mini-site da sua empresa ou administração.
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-950/80 border border-red-800 text-red-300 rounded-xl text-xs font-bold text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              E-mail de Acesso
            </label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu.email@empresa.com.br"
                className="w-full pl-10 pr-4 py-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C8102E]"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Senha
              </label>
              <button
                type="button"
                onClick={() => onNavigateTab('esqueci-senha')}
                className="text-[10px] text-[#C8102E] font-bold hover:underline"
              >
                Esqueceu a senha?
              </button>
            </div>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C8102E]"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-[#C8102E] hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-xl transition uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <LogIn className="w-4 h-4" />
            <span>{isSubmitting ? 'Autenticando...' : 'ENTRAR NO PAINEL ➔'}</span>
          </button>
        </form>

        {/* Footer Navigation Links */}
        <div className="pt-4 border-t border-slate-800 text-center text-xs text-slate-400 space-y-2">
          <p>
            Ainda não possui conta de parceiro?{' '}
            <button
              onClick={() => onNavigateTab('cadastro')}
              className="text-white font-bold hover:underline"
            >
              Cadastre sua Empresa
            </button>
          </p>
          <p>
            <button
              onClick={() => onNavigateTab('login/admin')}
              className="text-slate-500 hover:text-white transition text-[11px] font-mono flex items-center justify-center gap-1 mx-auto"
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Acesso Restrito Admin Master
            </button>
          </p>
        </div>

      </div>
    </div>
  );
};
