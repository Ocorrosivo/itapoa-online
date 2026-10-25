/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Dedicated Advertiser Registration Page Component - /cadastro
 * Tema Claro & Minimalista — Redesign Premium
 */

import React, { useState } from 'react';
import { Building2, Mail, Phone, MapPin, Lock, ArrowLeft, UserCheck, ShieldCheck, Eye, EyeOff, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api, ApiError } from '../../lib/apiClient';
import { readPendingPurchase } from '../../lib/pendingPurchase';
import { User } from '../../types';
import { maskPhone } from '../../utils/validators';

interface RegisterPageProps {
  onNavigateTab: (tab: string) => void;
}

const MIN_PASSWORD_LENGTH = 8;

const PLAN_PRETTY_NAMES: Record<string, string> = {
  plan_bronze: 'Bronze (Presença Essencial)',
  plan_gold_vip: 'Gold VIP (Destaque Comercial)',
  plan_diamond_extremo: 'Diamond Extremo (Liderança Regional)'
};

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigateTab }) => {
  const { adoptSession } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Itapoá');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pending = readPendingPurchase();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (password.length < MIN_PASSWORD_LENGTH) {
      setErrorMsg(`A senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('A senha e a confirmação não coincidem.');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await api.post<{ success: boolean; token: string; user: User; verificationEmailSent: boolean }>(
        '/api/auth/register',
        { name, email, phone, city, password, role: 'advertiser', planId: pending?.planId }
      );

      if (!data?.token || !data?.user) {
        setErrorMsg('Erro ao realizar cadastro.');
        return;
      }

      adoptSession(data.token, data.user);
      onNavigateTab('confirmar-email');
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Erro de conexão ao realizar cadastro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const planName = pending?.planId ? (PLAN_PRETTY_NAMES[pending.planId] || pending.planId) : null;

  return (
    <main className="min-h-screen bg-[#F6F8FC] text-[#101828] flex flex-col justify-center items-center px-4 py-12 font-sans relative">
      {/* Barra superior de navegação */}
      <div className="w-full max-w-lg mb-4 flex items-center justify-between">
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
          <span>Cadastro Seguro • Criptografia SSL</span>
        </div>
      </div>

      {/* Card Principal — Tema Claro & Minimalista */}
      <div className="w-full max-w-lg bg-white border border-[#E5EAF1] rounded-2xl p-7 sm:p-9 shadow-xs space-y-6">
        
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
            Cadastro de Parceiro Comercial
          </span>

          <h1 className="text-2xl font-black text-[#101828] tracking-tight">
            Divulgue sua Empresa em Itapoá
          </h1>

          <p className="text-xs sm:text-sm text-[#667085] max-w-sm mx-auto leading-relaxed">
            Crie sua conta para obter seu mini-site, catálogo de ofertas e leads automatizados.
          </p>

          {/* Alerta de Plano Reservado */}
          {planName && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs text-left flex items-start gap-2.5">
              <Sparkles size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                Seu plano <strong className="font-extrabold text-amber-950">{planName}</strong> está reservado. Após o cadastro você retornará direto à finalização — sem nova seleção e sem cobrança até o pagamento.
              </div>
            </div>
          )}
        </div>

        {errorMsg && (
          <div role="alert" className="p-3.5 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold text-center">
            {errorMsg}
          </div>
        )}

        {/* Formulário de Cadastro */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-[11px] font-bold text-[#101828] uppercase tracking-wider block mb-1.5">
              Nome da Empresa ou Marca *
            </label>
            <div className="relative flex items-center">
              <Building2 className="w-4 h-4 text-[#667085] absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Restaurante Sabor do Mar"
                className="w-full h-[48px] pl-10 pr-4 bg-white border border-[#E5EAF1] rounded-xl text-sm text-[#101828] placeholder-[#667085]/60 focus:outline-none focus:border-[#080F24] focus:ring-1 focus:ring-[#080F24] transition"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#101828] uppercase tracking-wider block mb-1.5">
              E-mail Comercial *
            </label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-[#667085] absolute left-3.5 pointer-events-none" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="contato@empresa.com.br"
                className="w-full h-[48px] pl-10 pr-4 bg-white border border-[#E5EAF1] rounded-xl text-sm text-[#101828] placeholder-[#667085]/60 focus:outline-none focus:border-[#080F24] focus:ring-1 focus:ring-[#080F24] transition"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-[#101828] uppercase tracking-wider block mb-1.5">
                WhatsApp Comercial *
              </label>
              <div className="relative flex items-center">
                <Phone className="w-4 h-4 text-[#667085] absolute left-3.5 pointer-events-none" />
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(maskPhone(e.target.value))}
                  placeholder="(47) 99999-0000"
                  maxLength={15}
                  className="w-full h-[48px] pl-10 pr-4 bg-white border border-[#E5EAF1] rounded-xl text-sm text-[#101828] placeholder-[#667085]/60 focus:outline-none focus:border-[#080F24] focus:ring-1 focus:ring-[#080F24] transition font-medium"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#101828] uppercase tracking-wider block mb-1.5">
                Cidade Principal *
              </label>
              <div className="relative flex items-center">
                <MapPin className="w-4 h-4 text-[#667085] absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className="w-full h-[48px] pl-10 pr-4 bg-white border border-[#E5EAF1] rounded-xl text-sm text-[#101828] focus:outline-none focus:border-[#080F24] focus:ring-1 focus:ring-[#080F24] transition font-medium"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-[#101828] uppercase tracking-wider block mb-1.5">
                Senha de Acesso *
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-[#667085] absolute left-3.5 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  minLength={MIN_PASSWORD_LENGTH}
                  autoComplete="new-password"
                  className="w-full h-[48px] pl-10 pr-10 bg-white border border-[#E5EAF1] rounded-xl text-sm text-[#101828] placeholder-[#667085]/60 focus:outline-none focus:border-[#080F24] focus:ring-1 focus:ring-[#080F24] transition"
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

            <div>
              <label className="text-[11px] font-bold text-[#101828] uppercase tracking-wider block mb-1.5">
                Confirmar Senha *
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-[#667085] absolute left-3.5 pointer-events-none" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  minLength={MIN_PASSWORD_LENGTH}
                  autoComplete="new-password"
                  className="w-full h-[48px] pl-10 pr-10 bg-white border border-[#E5EAF1] rounded-xl text-sm text-[#101828] placeholder-[#667085]/60 focus:outline-none focus:border-[#080F24] focus:ring-1 focus:ring-[#080F24] transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 p-1 text-[#667085] hover:text-[#101828] transition cursor-pointer"
                  title={showConfirmPassword ? 'Ocultar senha' : 'Ver senha'}
                  aria-label={showConfirmPassword ? 'Ocultar senha' : 'Ver senha'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-[48px] bg-[#00B894] hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer mt-3 disabled:opacity-50"
          >
            <UserCheck className="w-4 h-4" />
            <span>{isSubmitting ? 'Cadastrando empresa…' : 'Concluir cadastro da empresa →'}</span>
          </button>
        </form>

        <div className="pt-4 border-t border-[#E5EAF1] text-center text-xs text-[#667085]">
          <p>
            Já possui uma conta ativa?{' '}
            <button
              onClick={() => onNavigateTab('login')}
              className="text-[#101828] font-bold hover:underline cursor-pointer"
            >
              Fazer Login
            </button>
          </p>
        </div>

      </div>
    </main>
  );
};
