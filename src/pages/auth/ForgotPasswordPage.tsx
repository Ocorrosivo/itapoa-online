/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Dedicated Password Reset Page Component - /esqueci-senha
 */

import React, { useState } from 'react';
import { Mail, Key, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { ITAPOA_CITY_CONFIG } from '../../constants/itapoaData';


interface ForgotPasswordPageProps {
  onNavigateTab: (tab: string) => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onNavigateTab }) => {
  const [email, setEmail] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const SUPPORT_EMAIL = ITAPOA_CITY_CONFIG.contactEmail;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);
    // Self-service reset requires e-mail delivery, which is not configured yet.
    // Rather than pretend a link was sent, we route the request to support.
    setIsSuccess(true);
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center px-4 py-16 font-sans relative overflow-hidden">

      {/* Top Back Link */}
      <div className="absolute top-6 left-6">
        <button
          onClick={() => onNavigateTab('login')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold transition shadow"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Login</span>
        </button>
      </div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 relative z-10">
        
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#C8102E]/20 text-[#C8102E] flex items-center justify-center mx-auto shadow-lg">
            <Key className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Recuperação de Senha
          </h1>
          <p className="text-xs text-slate-400">
            Digite seu e-mail cadastrado para receber as instruções de redefinição de acesso.
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 bg-red-950/80 border border-red-800 text-red-300 rounded-xl text-xs font-bold text-center">
            {errorMsg}
          </div>
        )}

        {isSuccess ? (
          <div className="p-6 bg-emerald-950/80 border border-emerald-600/50 rounded-2xl text-center space-y-4">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h3 className="text-base font-bold text-white">Solicitação Recebida</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Para redefinir a senha de <strong>{email}</strong>, envie um e-mail para{' '}
              <a href={`mailto:${SUPPORT_EMAIL}?subject=Recupera%C3%A7%C3%A3o%20de%20senha&body=Solicito%20a%20redefini%C3%A7%C3%A3o%20de%20senha%20da%20conta%3A%20${encodeURIComponent(email)}`} className="text-emerald-400 font-bold underline">
                {SUPPORT_EMAIL}
              </a>{' '}
              e nossa equipe fará a redefinição manualmente.
            </p>
            <button
              onClick={() => onNavigateTab('login')}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl transition"
            >
              Ir para o Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                E-mail Cadastrado
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

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-[#C8102E] hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-xl transition uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              <span>{isSubmitting ? 'Enviando...' : 'ENVIAR LINK DE RECUPERAÇÃO ➔'}</span>
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
