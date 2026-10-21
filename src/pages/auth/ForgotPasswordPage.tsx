/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Dedicated Password Reset Page Component - /esqueci-senha
 */

import React, { useState } from 'react';
import { Mail, Phone, Key, ArrowLeft, CheckCircle2, MessageCircle, Send, Copy, Check } from 'lucide-react';
import { ITAPOA_CITY_CONFIG } from '../../constants/itapoaData';
import { maskPhone } from '../../utils/validators';

interface ForgotPasswordPageProps {
  onNavigateTab: (tab: string) => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onNavigateTab }) => {
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const SUPPORT_EMAIL = ITAPOA_CITY_CONFIG.contactEmail || 'contato@itapoa.online';
  const SUPPORT_PHONE = '(47) 99719-0413';
  const SUPPORT_PHONE_CLEAN = '5547997190413';

  const identifier = method === 'email' ? email.trim() : phone.trim();

  const getWhatsappUrl = () => {
    const text = encodeURIComponent(
      `Olá, Suporte do Itapoá Online! Preciso recuperar o acesso à minha conta (${identifier || 'minha empresa'}). Podem me orientar?`
    );
    return `https://wa.me/${SUPPORT_PHONE_CLEAN}?text=${text}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (method === 'email' && !email.trim()) {
      setErrorMsg('Por favor, informe seu e-mail cadastrado.');
      return;
    }

    if (method === 'phone' && phone.replace(/\D/g, '').length < 10) {
      setErrorMsg('Por favor, informe um número de telefone/WhatsApp válido com DDD.');
      return;
    }

    setIsSubmitting(true);
    // Simula envio e apresenta os canais diretos de suporte imediato
    setTimeout(() => {
      setIsSuccess(true);
      setIsSubmitting(false);
    }, 400);
  };

  const handleCopy = async () => {
    const text = `Solicitação de redefinição de senha para conta: ${identifier}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center px-4 py-16 font-sans relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#C8102E]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Back Link */}
      <div className="absolute top-6 left-6 z-20">
        <button
          type="button"
          onClick={() => onNavigateTab('login')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold transition shadow-lg backdrop-blur cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Login</span>
        </button>
      </div>

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800/90 rounded-3xl p-8 shadow-2xl space-y-6 relative z-10 backdrop-blur-xl">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-[#C8102E]/15 border border-[#C8102E]/30 text-[#C8102E] flex items-center justify-center mx-auto shadow-inner">
            <Key className="w-7 h-7" />
          </div>
          <span className="text-[10px] font-black tracking-widest text-[#C8102E] uppercase block">
            SEGURANÇA DA CONTA
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Esqueceu sua Senha?
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Recupere o acesso ao painel da sua empresa informando seu e-mail ou WhatsApp cadastrado.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-red-950/80 border border-red-800/80 text-red-300 rounded-xl text-xs font-bold text-center">
            {errorMsg}
          </div>
        )}

        {isSuccess ? (
          <div className="space-y-5">
            <div className="p-6 bg-emerald-950/60 border border-emerald-600/40 rounded-2xl text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h3 className="text-base font-bold text-white">Solicitação Encaminhada!</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Identificamos seu pedido para <strong>{identifier}</strong>. Para sua segurança e agilidade, utilize um dos canais oficiais abaixo:
              </p>
            </div>

            {/* Canal WhatsApp Direto */}
            <a
              href={getWhatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              <span>FALAR NO WHATSAPP DO SUPORTE</span>
            </a>

            {/* Canal E-mail */}
            <div className="flex gap-2">
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=Recuperação%20de%20Senha%20-%20Itapoá%20Online&body=Solicito%20a%20redefinição%20de%20senha%20para%20a%20conta:%20${encodeURIComponent(identifier)}`}
                className="flex-1 py-3 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition flex items-center justify-center gap-1.5"
              >
                <Mail className="w-4 h-4 text-slate-400" />
                <span>Enviar E-mail</span>
              </a>

              <button
                type="button"
                onClick={handleCopy}
                className="py-3 px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition flex items-center justify-center gap-1.5"
                title="Copiar texto da solicitação"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                <span>{copied ? 'Copiado!' : 'Copiar'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab('login')}
              className="w-full py-3 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-white font-bold text-xs rounded-xl transition"
            >
              Voltar à Tela de Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Seletor de canal: E-mail ou Telefone */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 border border-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => { setMethod('email'); setErrorMsg(''); }}
                className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                  method === 'email'
                    ? 'bg-slate-800 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>E-mail</span>
              </button>
              <button
                type="button"
                onClick={() => { setMethod('phone'); setErrorMsg(''); }}
                className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition ${
                  method === 'phone'
                    ? 'bg-slate-800 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
            </div>

            {method === 'email' ? (
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
            ) : (
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  WhatsApp com DDD
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
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-[#C8102E] hover:bg-red-700 text-white font-black text-xs rounded-xl shadow-xl transition uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer mt-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'Verificando...' : 'RECUPERAR MINHA SENHA ➔'}</span>
            </button>

            {/* Atalho Direto WhatsApp */}
            <div className="pt-3 border-t border-slate-800/80 text-center space-y-2">
              <span className="text-[11px] text-slate-400 block">Precisa de suporte urgente?</span>
              <a
                href={getWhatsappUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-bold transition"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Atendimento no WhatsApp: {SUPPORT_PHONE}</span>
              </a>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
