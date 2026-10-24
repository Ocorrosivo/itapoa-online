/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Dedicated Advertiser Registration Page Component - /cadastro
 */

import React, { useState } from 'react';
import { Building2, Mail, Phone, MapPin, Lock, ArrowLeft, UserCheck, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api, ApiError } from '../../lib/apiClient';
import { readPendingPurchase } from '../../lib/pendingPurchase';
import { User } from '../../types';
import { maskPhone } from '../../utils/validators';

interface RegisterPageProps {
  onNavigateTab: (tab: string) => void;
}

const MIN_PASSWORD_LENGTH = 8;

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
      // Never claim delivery or expose payment before ownership is confirmed.
      onNavigateTab('confirmar-email');
    } catch (err) {
      setErrorMsg(err instanceof ApiError ? err.message : 'Erro de conexão ao realizar cadastro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center px-4 py-16 font-sans relative overflow-hidden">

      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="absolute top-6 left-6">
        <button
          onClick={() => onNavigateTab('home')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold transition shadow"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Portal</span>
        </button>
      </div>

      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 relative z-10">

        <div className="text-center space-y-2">
          <button
            type="button"
            onClick={() => onNavigateTab('home')}
            className="mx-auto block"
            aria-label="Voltar à página inicial"
          >
            <img
              src="/logotipo.png"
              alt="Itapoá Online"
              className="h-12 w-auto object-contain"
            />
          </button>
          <span className="text-[10px] font-black tracking-widest text-emerald-400 uppercase block">
            CADASTRO DE PARCEIRO COMERCIAL
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Divulgue sua Empresa em Itapoá
          </h1>
          <p className="text-xs text-slate-400">
            Crie sua conta para obter seu mini-site, catálogo de ofertas e leads automatizados.
          </p>
          {pending && (
            <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs text-left">
              Seu plano <strong>{pending.planId}</strong> está reservado. Após o cadastro você retornará direto à compra — sem nova seleção e sem cobrança até o pagamento.
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-950/80 border border-red-800 text-red-300 rounded-xl text-xs font-bold text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Nome da Empresa ou Marca
            </label>
            <div className="relative flex items-center">
              <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5" />
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Restaurante Sabor do Mar"
                className="w-full pl-10 pr-4 py-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C8102E]"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              E-mail Comercial
            </label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="contato@empresa.com.br"
                className="w-full pl-10 pr-4 py-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C8102E]"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                WhatsApp Comercial
              </label>
              <div className="relative flex items-center">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3.5" />
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(maskPhone(e.target.value))}
                  placeholder="(47) 99999-0000"
                  maxLength={15}
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C8102E]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Cidade Principal
              </label>
              <div className="relative flex items-center">
                <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5" />
                <input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className="w-full pl-10 pr-4 py-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Senha de Acesso
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  minLength={MIN_PASSWORD_LENGTH}
                  autoComplete="new-password"
                  className="w-full pl-10 pr-11 py-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C8102E]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 p-1 text-slate-400 hover:text-white transition cursor-pointer"
                  title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                  aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Confirmar Senha
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  minLength={MIN_PASSWORD_LENGTH}
                  autoComplete="new-password"
                  className="w-full pl-10 pr-11 py-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#C8102E]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 p-1 text-slate-400 hover:text-white transition cursor-pointer"
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
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-xl transition uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <UserCheck className="w-4 h-4" />
            <span>{isSubmitting ? 'Cadastrando...' : 'CONCLUIR CADASTRO DA EMPRESA ➔'}</span>
          </button>
        </form>

        <div className="pt-4 border-t border-slate-800 text-center text-xs text-slate-400">
          <p>
            Já possui uma conta ativa?{' '}
            <button
              onClick={() => onNavigateTab('login')}
              className="text-white font-bold hover:underline"
            >
              Fazer Login
            </button>
          </p>
        </div>

      </div>
    </div>
  );
};
