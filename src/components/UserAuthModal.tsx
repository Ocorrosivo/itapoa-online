/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, User, Mail, Phone, Lock, Sparkles } from 'lucide-react';
import { api, ApiError } from '../lib/apiClient';
import { useAuth } from '../context/AuthContext';

interface UserAuthModalProps {
  onClose: () => void;
  onLoginSuccess: (user: any) => void;
}

const MIN_PASSWORD_LENGTH = 8;

export default function UserAuthModal({
  onClose,
  onLoginSuccess
}: UserAuthModalProps) {
  const { adoptSession } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Itapoá');
  const [role, setRole] = useState<'advertiser' | 'user'>('advertiser');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (isRegisterMode && password.length < MIN_PASSWORD_LENGTH) {
      setErrorMsg(`A senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }

    const url = isRegisterMode ? '/api/auth/register' : '/api/auth/login';
    // The password is always sent; the API verifies it with bcrypt.
    const payload = isRegisterMode
      ? { name, email, phone, city, role, password }
      : { email, password };

    try {
      const data = await api.post<{ success: boolean; token: string; user: any }>(url, payload);
      if (!data?.token || !data?.user) {
        setErrorMsg('Não foi possível concluir a autenticação.');
        return;
      }

      adoptSession(data.token, data.user);
      onLoginSuccess(data.user);
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof ApiError ? err.message : 'Houve uma falha de conexão com o servidor.'
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-white rounded-3xl overflow-hidden p-6 md:p-8 shadow-2xl relative"
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition font-bold text-sm cursor-pointer"
        >
          ✕
        </button>

        <div className="text-center mb-6">
          <img 
            src="/logotipo.png" 
            alt="Itapoá Online" 
            className="h-12 w-auto mx-auto mb-3 object-contain"
          />
          <span className="text-[10px] font-bold text-[#C8102E] uppercase tracking-widest block mb-1">
            ITAPOÁ ONLINE • PORTAL & MARKETPLACE
          </span>
          <h2 className="text-xl font-sans font-black text-slate-900 tracking-tight">
            {isRegisterMode ? 'Cadastro de Anunciante' : 'Login do Parceiro'}
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Acesse seu painel administrativo, gerencie seu mini-site e acompanhe seus leads.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-sans text-center mb-4">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
          
          {isRegisterMode && (
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 block">Nome Comercial ou Fantasia</label>
              <div className="relative flex items-center bg-slate-50 border rounded-xl focus-within:border-blue-400">
                <User className="w-4 h-4 text-slate-400 absolute left-3" />
                <input 
                  type="text" 
                  required
                  placeholder="Nome Fantasia..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-3 bg-transparent text-slate-800 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 block">E-mail Corporativo</label>
            <div className="relative flex items-center bg-slate-50 border rounded-xl focus-within:border-blue-400">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3" />
              <input 
                type="email" 
                required
                placeholder="nome@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-3 bg-transparent text-slate-800 focus:outline-none"
              />
            </div>
          </div>

          {isRegisterMode && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 block">Telefone / Whats</label>
                <div className="relative flex items-center bg-slate-50 border rounded-xl">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-2.5" />
                  <input 
                    type="tel" 
                    required
                    placeholder="(47) 9..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-8 pr-2 py-3 bg-transparent text-slate-800 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 block">Cidade Sede</label>
                <select 
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-slate-50 border p-3 rounded-xl focus:outline-none text-slate-500"
                >
                  <option value="Itapoá">Itapoá - SC</option>
                  <option value="Joinville">Joinville - SC</option>
                  <option value="Curitiba">Curitiba - PR</option>
                  <option value="Florianópolis">Florianópolis - SC</option>
                </select>
              </div>
            </div>
          )}

          {/* Required in both modes: registration defines the password, login verifies it. */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 block">
              {isRegisterMode ? 'Crie sua Senha (mín. 8 caracteres)' : 'Senha Segura'}
            </label>
            <div className="relative flex items-center bg-slate-50 border rounded-xl focus-within:border-blue-400">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3" />
              <input
                type="password"
                required
                placeholder="••••••••"
                minLength={isRegisterMode ? MIN_PASSWORD_LENGTH : undefined}
                autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-3 bg-transparent text-slate-800 focus:outline-none"
              />
            </div>
          </div>

          {isRegisterMode && (
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 block">Perfil de Acesso</label>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  type="button" 
                  onClick={() => setRole('advertiser')}
                  className={`p-3 border rounded-xl font-bold font-sans transition cursor-pointer ${role === 'advertiser' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200 text-slate-500'}`}
                >
                  Anunciante VIP
                </button>
                <button 
                  type="button" 
                  onClick={() => setRole('user')}
                  className={`p-3 border rounded-xl font-bold font-sans transition cursor-pointer ${role === 'user' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200 text-slate-500'}`}
                >
                  Visitante Local
                </button>
              </div>
            </div>
          )}

          <button 
            type="submit"
            className="py-3.5 w-full mt-4 bg-slate-950 hover:bg-slate-850 font-bold text-white rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {isRegisterMode ? 'Completar Cadastro de Anúncio' : 'Entrar no Hub Analítico'}
          </button>
        </form>

        <footer className="text-center mt-6 border-t border-slate-100 pt-4">
          <button 
            onClick={() => setIsRegisterMode(!isRegisterMode)}
            className="text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
          >
            {isRegisterMode ? 'Já possui uma conta? Conectar-se agora' : 'Não possui cadastro? Criar contra de Anunciante'}
          </button>
        </footer>

      </motion.div>
    </div>
  );
}
