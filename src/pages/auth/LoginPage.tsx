/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Dedicated Login Page Component - /login
 * Tema Claro & Minimalista — Redesign Premium
 */

import React, { useState } from 'react';
import { Mail, Lock, LogIn, ArrowLeft, ShieldCheck, Eye, EyeOff, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { readPendingPurchase } from '../../lib/pendingPurchase';

interface LoginPageProps {
  onNavigateTab: (tab: string) => void;
}

const PLAN_PRETTY_NAMES: Record<string, string> = {
  plan_bronze: 'Bronze (Presença Essencial)',
  plan_gold_vip: 'Gold VIP (Destaque Comercial)',
  plan_diamond_extremo: 'Diamond Extremo (Liderança Regional)'
};

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigateTab }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const pending = readPendingPurchase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const authenticated = await login(email, password);
      if (!authenticated) {
        setErrorMsg('Credenciais inválidas. Verifique seu e-mail e senha.');
        return;
      }

      if (readPendingPurchase()) {
        onNavigateTab('checkout');
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

  const planName = pending?.planId ? (PLAN_PRETTY_NAMES[pending.planId] || pending.planId) : null;

  return (
    <main className="min-h-screen bg-[#F6F8FC] text-[#101828] flex flex-col justify-center items-center px-4 py-12 font-sans relative">
      {/* Barra superior de navegação */}
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
            Portal & Marketplace Parceiro
          </span>

          <h1 className="text-2xl font-black text-[#101828] tracking-tight">
            Acesso ao Painel
          </h1>

          <p className="text-xs sm:text-sm text-[#667085] max-w-sm mx-auto leading-relaxed">
            Entre com seus dados para gerenciar o mini-site da sua empresa ou administração.
          </p>

          {planName && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs text-left flex items-start gap-2.5">
              <Sparkles size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                Você tem o plano <strong className="font-extrabold text-amber-950">{planName}</strong> reservado. Após entrar, voltará direto à finalização sem nova seleção.
              </div>
            </div>
          )}
        </div>

        {errorMsg && (
          <div role="alert" className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-[11px] font-bold text-[#101828] uppercase tracking-wider block mb-1.5">
              E-mail de Acesso
            </label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-[#667085] absolute left-3.5 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu.email@empresa.com.br"
                className="w-full h-[48px] pl-10 pr-4 bg-white border border-[#E5EAF1] rounded-xl text-sm text-[#101828] placeholder-[#667085]/60 focus:outline-none focus:border-[#080F24] focus:ring-1 focus:ring-[#080F24] transition"
                required
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-[#101828] uppercase tracking-wider block">
                Senha
              </label>
              <button
                type="button"
                onClick={() => onNavigateTab('esqueci-senha')}
                className="text-xs text-[#080F24] font-bold hover:underline cursor-pointer"
              >
                Esqueceu a senha?
              </button>
            </div>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-[#667085] absolute left-3.5 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-[48px] pl-10 pr-11 bg-white border border-[#E5EAF1] rounded-xl text-sm text-[#101828] placeholder-[#667085]/60 focus:outline-none focus:border-[#080F24] focus:ring-1 focus:ring-[#080F24] transition"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 p-1 text-[#667085] hover:text-[#101828] transition cursor-pointer"
                title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-[48px] bg-[#080F24] hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer mt-3 disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" />
            <span>{isSubmitting ? 'Autenticando…' : 'Entrar no painel →'}</span>
          </button>
        </form>

        <div className="pt-4 border-t border-[#E5EAF1] text-center text-xs text-[#667085] space-y-2">
          <p>
            Ainda não possui conta de parceiro?{' '}
            <button
              onClick={() => onNavigateTab('cadastro')}
              className="text-[#101828] font-bold hover:underline cursor-pointer"
            >
              Cadastre sua Empresa
            </button>
          </p>
          <p>
            <button
              onClick={() => onNavigateTab('login/admin')}
              className="text-[#667085] hover:text-[#101828] transition text-[11px] font-medium flex items-center justify-center gap-1 mx-auto cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#00B894]" /> Acesso Restrito Admin Master
            </button>
          </p>
        </div>

      </div>
    </main>
  );
};
