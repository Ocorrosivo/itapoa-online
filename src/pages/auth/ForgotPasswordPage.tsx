import React, { useEffect, useState } from 'react';
import { KeyRound, ArrowLeft, Mail, MessageCircle, AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { api } from '../../lib/apiClient';

interface Props {
  onNavigateTab: (tab: string) => void;
}

export const ForgotPasswordPage: React.FC<Props> = ({ onNavigateTab }) => {
  const [email, setEmail] = useState('');
  const [available, setAvailable] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get<{ available: boolean }>('/api/auth/recovery-status')
      .then((data) => {
        if (active) setAvailable(data.available === true);
      })
      .catch(() => {
        if (active) setAvailable(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting || !available) return;
    setSubmitting(true);
    setError('');
    try {
      const data = await api.post<{ message: string }>('/api/auth/forgot-password', { email: email.trim() });
      setMessage(data.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível solicitar a recuperação.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F6F8FC] text-[#101828] flex flex-col justify-center items-center px-4 py-12 font-sans relative">
      {/* Botão sutil de retorno no topo */}
      <div className="w-full max-w-md mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onNavigateTab('login')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#667085] hover:text-[#101828] transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao login</span>
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
            Recuperação de Acesso
          </span>

          <h1 className="text-2xl font-black text-[#101828] tracking-tight">
            Esqueceu sua senha?
          </h1>

          <p className="text-xs sm:text-sm text-[#667085] max-w-sm mx-auto leading-relaxed">
            Informe o e-mail cadastrado da sua empresa para receber o link seguro de redefinição.
          </p>
        </div>

        {available === false && (
          <div role="alert" className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              Recuperação por e-mail temporariamente indisponível. Fale diretamente com o suporte abaixo.
            </span>
          </div>
        )}

        {error && (
          <div role="alert" className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2.5">
            <AlertTriangle size={16} className="text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {message ? (
          /* Estado de Sucesso — Card Minimalista Claro */
          <div className="space-y-5 pt-1 animate-in fade-in">
            <div className="rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] p-5 text-left space-y-2">
              <div className="flex items-center gap-2 text-[#065F46] font-bold text-sm">
                <CheckCircle2 size={18} className="text-[#00B894] shrink-0" />
                <span>Solicitação recebida</span>
              </div>
              <p className="text-xs text-[#065F46]/90 leading-relaxed">
                {message}
              </p>
              <p className="text-[11px] text-[#047857] pt-1">
                Confira também a pasta de spam. O link é válido por 15 minutos.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab('login')}
              className="w-full py-3.5 px-5 rounded-xl bg-[#080F24] hover:bg-slate-800 text-white font-bold text-xs sm:text-sm transition cursor-pointer shadow-xs"
            >
              Voltar ao login
            </button>
          </div>
        ) : (
          /* Formulário de Envio */
          <form onSubmit={submit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label htmlFor="recovery-email" className="block text-xs font-bold text-[#101828] uppercase tracking-wider">
                E-mail cadastrado
              </label>
              <div className="relative">
                <input
                  id="recovery-email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contato@suaempresa.com.br"
                  className="w-full h-[48px] rounded-xl px-4 pr-11 bg-white border border-[#E5EAF1] focus:border-[#080F24] focus:ring-1 focus:ring-[#080F24] focus:outline-none transition text-sm text-[#101828] placeholder-[#667085]/60"
                />
                <Mail size={16} className="absolute right-3.5 top-3.5 text-[#667085] pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={!available || submitting}
              className="w-full h-[48px] rounded-xl bg-[#080F24] hover:bg-slate-800 text-white font-bold transition flex items-center justify-center gap-2 text-xs sm:text-sm shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <KeyRound size={16} />
              <span>{submitting ? 'Enviando link seguro…' : 'Enviar link de recuperação'}</span>
            </button>
          </form>
        )}

        {/* Atendimento e Suporte Manual */}
        <div className="border-t border-[#E5EAF1] pt-5 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#667085]">
            Atendimento manual (não envia o link automaticamente)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <a
              href="https://wa.me/5547997190413"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2.5 rounded-xl bg-[#F0FDF4] border border-[#DCFCE7] text-[#15803D] hover:bg-[#DCFCE7] transition cursor-pointer font-semibold"
            >
              <MessageCircle size={15} className="text-[#16A34A] shrink-0" />
              <span className="truncate">WhatsApp do suporte</span>
            </a>
            <a
              href="mailto:contato@itapoa.online?subject=Ajuda%20para%20recuperar%20acesso"
              className="flex items-center gap-2 p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E5EAF1] text-[#334155] hover:bg-[#F1F5F9] transition cursor-pointer font-semibold"
            >
              <Mail size={15} className="text-[#64748B] shrink-0" />
              <span className="truncate">Escrever para o suporte</span>
            </a>
          </div>
        </div>
      </div>
    </main>
  );
};
