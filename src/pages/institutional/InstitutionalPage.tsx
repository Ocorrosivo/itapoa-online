/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Institutional Pages Hub - Official Itapoá SC Portal
 */

import React from 'react';
import { ArrowLeft, Building2, HelpCircle, Phone, Mail, ShieldCheck, FileText, Sparkles, CheckCircle2 } from 'lucide-react';
import { ITAPOA_CITY_CONFIG } from '../../constants/itapoaData';

interface InstitutionalPageProps {
  type: 'about' | 'contact' | 'advertise' | 'how-it-works' | 'faq' | 'privacy' | 'terms' | 'help';
  onNavigateBack: () => void;
  onOpenAuthModal: () => void;
}

export const InstitutionalPage: React.FC<InstitutionalPageProps> = ({
  type,
  onNavigateBack,
  onOpenAuthModal
}) => {
  const titles = {
    about: 'Sobre o Portal Oficial de Itapoá SC',
    contact: 'Atendimento & Fale Conosco',
    advertise: 'Anuncie Sua Empresa em Itapoá SC',
    'how-it-works': 'Como Funciona a Plataforma',
    faq: 'Perguntas Frequentes (FAQ)',
    privacy: 'Política de Privacidade',
    terms: 'Termos de Uso',
    help: 'Central de Ajuda & Suporte'
  };

  return (
    <div className="min-h-[calc(100vh-13rem)] bg-[#090D16] text-white py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Navigation */}
        <button
          onClick={onNavigateBack}
          className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-2 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Portal</span>
        </button>

        {/* Page Title Header */}
        <div className="bg-gradient-to-r from-red-950/60 via-slate-900 to-slate-900 border border-slate-800 rounded-3xl p-8 space-y-3 shadow-2xl">
          <span className="px-3 py-1 bg-[#C8102E] text-white text-[10px] font-black uppercase tracking-wider rounded-full">
            {ITAPOA_CITY_CONFIG.portalName}
          </span>
          <h1 className="text-3xl font-black text-white">{titles[type]}</h1>
          <p className="text-xs text-slate-300">
            A.M.E. ITAPOÁ — Associação das Mulheres Empreendedoras de Itapoá SC
          </p>
        </div>

        {/* Content Box according to Type */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-xs text-slate-300 space-y-6 leading-relaxed shadow-2xl">
          
          {type === 'about' && (
            <div className="space-y-4">
              <h2 className="text-lg font-black text-white">Nossa Missão em Itapoá</h2>
              <p>
                O Portal Oficial de Itapoá foi desenvolvido em parceria com a A.M.E. ITAPOÁ (Associação das Mulheres Empreendedoras) com o objetivo de centralizar e impulsionar todo o ecossistema comercial, gastronômico, turístico e imobiliário do município de Itapoá - Santa Catarina.
              </p>
              <p>
                Com mais de 30 km de praias paradisíacas e o próspero Porto Itapoá, nossa cidade é um dos polos que mais cresce no litoral sul do Brasil. Nossa missão é conectar visitantes e moradores às melhores empresas locais.
              </p>
            </div>
          )}

          {type === 'advertise' && (
            <div className="space-y-6">
              <h2 className="text-lg font-black text-white">Por que Anunciar no Portal de Itapoá?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                  <span className="font-bold text-white block text-sm">Alcance Regional Exclusivo</span>
                  <p className="text-slate-400 text-[11px]">Milhares de visitantes pesquisando restaurantes, pousadas e serviços em Itapoá.</p>
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                  <span className="font-bold text-white block text-sm">Leads no WhatsApp</span>
                  <p className="text-slate-400 text-[11px]">Cliques de chamadas e mensagens de orçamento vão direto para o seu celular.</p>
                </div>
              </div>
              <button
                onClick={onOpenAuthModal}
                className="w-full py-4 bg-[#C8102E] text-white font-extrabold rounded-2xl shadow-xl text-xs uppercase tracking-wider"
              >
                Cadastrar Minha Empresa Agora (7 Dias Grátis)
              </button>
            </div>
          )}

          {type === 'contact' && (
            <div className="space-y-4">
              <h2 className="text-lg font-black text-white">Fale Conosco</h2>
              <p>Dúvidas, suporte ao anunciante ou parcerias institucionais em Itapoá SC:</p>
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <a
                  href={`mailto:${ITAPOA_CITY_CONFIG.contactEmail}`}
                  className="flex items-center gap-2 text-white font-bold hover:text-emerald-300 transition"
                >
                  <Mail className="w-4 h-4 text-[#C8102E]" />
                  <span>{ITAPOA_CITY_CONFIG.contactEmail}</span>
                </a>
                <div className="flex items-center gap-2 text-white font-bold">
                  <Phone className="w-4 h-4 text-[#C8102E]" />
                  <span>WhatsApp Suporte: (47) 99719-0413</span>
                </div>
                <p className="text-slate-400">Atendimento de Segunda a Sexta das 08h às 18h em Itapoá SC.</p>
                <p className="text-[11px] text-slate-500">
                  Preferimos e-mail para registro e acompanhamento. Mensagens para{' '}
                  <a href={`mailto:${ITAPOA_CITY_CONFIG.contactEmail}`} className="text-emerald-400 underline font-semibold">
                    {ITAPOA_CITY_CONFIG.contactEmail}
                  </a>{' '}
                  são respondidas no mesmo horário comercial.
                </p>
              </div>
            </div>
          )}

          {(type === 'privacy' || type === 'terms') && (
            <div className="space-y-4">
              <h2 className="text-lg font-black text-white">Termos & Privacidade LGPD</h2>
              <p>
                Este portal respeita integralmente a Lei Geral de Proteção de Dados (LGPD). Todos os dados cadastrados pelas empresas de Itapoá SC são mantidos em ambiente seguro com criptografia e isolamento na Hostinger.
              </p>
            </div>
          )}

          {type === 'faq' && (
            <div className="space-y-4">
              <h2 className="text-lg font-black text-white">Dúvidas Frequentes</h2>
              <div className="space-y-3">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                  <span className="font-bold text-white block">Como cadastrar minha empresa em Itapoá?</span>
                  <p className="text-slate-400">Clique no botão "ANUNCIANTE" no topo, crie sua conta e ganhe 7 dias de teste grátis sem cartão de crédito.</p>
                </div>
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1">
                  <span className="font-bold text-white block">A cidade é apenas Itapoá SC?</span>
                  <p className="text-slate-400">Sim! O portal é 100% focado no comércio, praias, bairros e turismo de Itapoá SC.</p>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
