/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Saúde Digital — diagnóstico real baseado nos dados da empresa
 */

import React from 'react';
import {
  Activity, CheckCircle2, AlertCircle, ArrowRight, ExternalLink, TrendingUp
} from 'lucide-react';
import { Company } from '../../../types';

interface HealthViewProps {
  company: Company | null;
  onNavigateTab: (tab: string) => void;
  onNavigateCompany?: (slug: string) => void;
}

export const HealthView: React.FC<HealthViewProps> = ({ company, onNavigateTab, onNavigateCompany }) => {
  if (!company) return null;

  const checks = [
    {
      label: 'Logomarca cadastrada',
      description: 'A logo aparece no mini-site e no diretório.',
      ok: !!company.logo,
      points: 10,
      action: 'Adicionar logo',
      tab: 'profile',
    },
    {
      label: 'Imagem de capa (banner)',
      description: 'Destaque visual no topo do mini-site.',
      ok: !!company.coverImage,
      points: 10,
      action: 'Adicionar capa',
      tab: 'profile',
    },
    {
      label: 'Descrição da empresa preenchida',
      description: 'Texto que explica o que você oferece aos clientes.',
      ok: !!(company.description && company.description.length > 30),
      points: 10,
      action: 'Completar descrição',
      tab: 'profile',
    },
    {
      label: 'WhatsApp de contato',
      description: 'Principal canal de conversão — clique direto para o cliente.',
      ok: !!company.whatsapp,
      points: 15,
      action: 'Informar WhatsApp',
      tab: 'profile',
    },
    {
      label: 'Horários de funcionamento',
      description: 'Clientes precisam saber quando podem entrar em contato.',
      ok: !!company.hours,
      points: 10,
      action: 'Informar horários',
      tab: 'profile',
    },
    {
      label: 'Endereço e localização',
      description: 'Essencial para buscas locais no Google e Maps.',
      ok: !!company.address,
      points: 10,
      action: 'Informar endereço',
      tab: 'profile',
    },
    {
      label: 'Catálogo de produtos/serviços',
      description: 'Mostre o que você oferece para aumentar conversões.',
      ok: (company.products?.length ?? 0) > 0,
      points: 15,
      action: 'Cadastrar produtos',
      tab: 'products',
    },
    {
      label: 'Redes sociais vinculadas',
      description: 'Instagram e Facebook aumentam credibilidade.',
      ok: !!(company.instagram || company.facebook),
      points: 10,
      action: 'Adicionar redes sociais',
      tab: 'profile',
    },
    {
      label: 'Avaliações recebidas',
      description: 'Avaliações acima de 4.5 aumentam a confiança dos clientes.',
      ok: (company.rating ?? 0) >= 4.0,
      points: 10,
      action: 'Ver avaliações',
      tab: 'reviews',
    },
  ];

  const score = checks.reduce((acc, c) => c.ok ? acc + c.points : acc, 0);
  const completed = checks.filter(c => c.ok).length;
  const pending = checks.filter(c => !c.ok);

  const scoreColor =
    score >= 80 ? 'text-emerald-400' :
    score >= 50 ? 'text-amber-400' :
    'text-red-400';

  const scoreLabel =
    score >= 80 ? 'Excelente' :
    score >= 60 ? 'Bom' :
    score >= 40 ? 'Em progresso' :
    'Precisa de atenção';

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Saúde Digital</h1>
        <p className="text-xs text-slate-400 mt-1">
          Diagnóstico baseado nos dados reais do seu cadastro. Complete os itens para melhorar sua visibilidade.
        </p>
      </div>

      {/* Score hero */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800/60 border border-slate-700 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
        <div className="relative w-28 h-28 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-800" />
            <circle
              cx="60" cy="60" r="50" fill="none" strokeWidth="8"
              strokeDasharray={`${2 * Math.PI * 50}`}
              strokeDashoffset={`${2 * Math.PI * 50 * (1 - score / 100)}`}
              strokeLinecap="round"
              className={scoreColor}
              style={{ stroke: 'currentColor', transition: 'stroke-dashoffset 0.8s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-black ${scoreColor}`}>{score}</span>
            <span className="text-[10px] text-slate-400 font-bold">/ 100</span>
          </div>
        </div>

        <div className="text-center sm:text-left">
          <div className={`text-xl font-black ${scoreColor}`}>{scoreLabel}</div>
          <p className="text-sm text-slate-300 mt-1">
            {completed} de {checks.length} critérios concluídos
          </p>
          <p className="text-xs text-slate-400 mt-2 max-w-sm">
            {score >= 80
              ? 'Seu perfil está bem otimizado! Continue mantendo os dados atualizados.'
              : `Complete os ${pending.length} item(s) abaixo para melhorar sua posição no diretório de Itapoá.`}
          </p>
          {company.slug && onNavigateCompany && (
            <button
              onClick={() => onNavigateCompany(company.slug)}
              className="mt-3 flex items-center gap-1.5 text-xs font-bold text-blue-400 hover:text-blue-300 transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ver mini-site público
            </button>
          )}
        </div>
      </div>

      {/* Pending items first */}
      {pending.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
            O que melhorar ({pending.length} itens)
          </h3>
          {pending.map((check, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onNavigateTab(check.tab)}
              className="w-full flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl hover:bg-amber-500/20 transition text-left group"
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <span className="text-sm font-bold text-white block">{check.label}</span>
                  <span className="text-xs text-slate-400">{check.description} · +{check.points} pts</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold shrink-0 group-hover:translate-x-1 transition-transform">
                <span>{check.action}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Completed items */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
          Concluído ({completed} itens)
        </h3>
        {checks.filter(c => c.ok).map((check, i) => (
          <div key={i} className="flex items-center gap-3 p-4 bg-emerald-500/5 border border-emerald-800/30 rounded-2xl">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="text-sm font-semibold text-white block">{check.label}</span>
              <span className="text-xs text-slate-400">+{check.points} pontos conquistados</span>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-slate-800/40 border border-slate-700 rounded-2xl">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="w-4 h-4 text-blue-400" />
          <span className="text-xs font-bold text-white">Como o Score é calculado</span>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          O Score de Saúde Digital avalia a completude do seu perfil com base em critérios objetivos. Ele não reflete seu posicionamento real no Google — isso depende de algoritmos externos. O objetivo é ajudá-lo a ter um perfil mais completo e confiável para os clientes.
        </p>
      </div>
    </div>
  );
};
