/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Lojista Main Dashboard View — Métricas Reais e Histórico por Plano
 *
 * Requisitos estritos:
 * - 4 Métricas reais: visualizações, cliques no WhatsApp, telefone e rotas.
 * - Histórico Bronze de 7 dias; Gold/Diamond de 7, 30 e 90 dias.
 * - Zero números simulados/fabricados: dados antigos ausentes retornam 0.
 * - Bloqueios por plano explicados de forma clara e amigável.
 */

import React, { useEffect, useState } from 'react';
import { 
  Eye, MessageSquare, Phone, MapPin, 
  Sparkles, Zap, Lock, RefreshCw, AlertCircle, 
  ExternalLink, ArrowUpRight, BarChart3, Building2, Package, Users
} from 'lucide-react';
import { Company } from '../../../types';
import { api } from '../../../lib/apiClient';

interface LojistaDashboardViewProps {
  company: Company | null;
  onNavigateTab: (tab: any) => void;
}

interface AnalyticsData {
  companyId: string;
  plan: string;
  planDisplayName: string;
  days: number;
  allowedDays: number[];
  planRestricted: boolean;
  restrictionMessage: string | null;
  totals: {
    views: number;
    whatsapp: number;
    phone: number;
    route: number;
  };
  periodTotals: {
    views: number;
    whatsapp: number;
    phone: number;
    route: number;
  };
  timeline: {
    date: string;
    views: number;
    whatsapp: number;
    phone: number;
    route: number;
  }[];
}

export const LojistaDashboardView: React.FC<LojistaDashboardViewProps> = ({ company, onNavigateTab }) => {
  if (!company) return null;

  const rawPlan = (company.planLevel || 'bronze').toLowerCase();
  const isDiamond = rawPlan === 'diamond' || rawPlan === 'diamond_extremo';
  const isGold = rawPlan === 'gold_vip' || rawPlan === 'ouro';
  const isBronze = !isDiamond && !isGold;

  const [selectedDays, setSelectedDays] = useState<number>(7);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorType, setErrorType] = useState<'permission' | 'network' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showPlanLockModal, setShowPlanLockModal] = useState<boolean>(false);

  const fetchAnalytics = async (days: number) => {
    setLoading(true);
    setErrorType(null);
    setErrorMessage('');
    try {
      const res = await api.get<AnalyticsData>(`/api/companies/${encodeURIComponent(company.id)}/analytics?days=${days}`);
      setData(res);
    } catch (err: any) {
      if (err?.status === 403 || err?.message?.includes('permissão') || err?.status === 401) {
        setErrorType('permission');
        setErrorMessage('Você não possui permissão para acessar os dados analíticos desta empresa.');
      } else {
        setErrorType('network');
        setErrorMessage('Falha ao carregar as métricas em tempo real. Verifique sua conexão e tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(selectedDays);
  }, [company.id, selectedDays]);

  const handleSelectDays = (days: number) => {
    if (isBronze && days > 7) {
      setShowPlanLockModal(true);
      return;
    }
    setSelectedDays(days);
  };

  return (
    <div className="space-y-8 p-4 sm:p-6 max-w-7xl">
      
      {/* Cabeçalho da Visão Geral */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Painel do Estabelecimento
            </span>
            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 ${
              isDiamond 
                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' 
                : isGold 
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30' 
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
            }`}>
              {isDiamond && <Sparkles className="w-2.5 h-2.5 fill-amber-300" />}
              {isGold && <Zap className="w-2.5 h-2.5 fill-indigo-300" />}
              Plano {isDiamond ? 'Diamond' : isGold ? 'Gold VIP' : 'Bronze'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{company.name}</h1>
          <p className="text-xs text-slate-400 mt-1">
            Métricas reais de interação dos clientes no Guia Comercial de Itapoá.
          </p>
        </div>

        {/* Seletor de Período Oficial */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-2xl shrink-0 shadow-lg">
          <button
            type="button"
            onClick={() => handleSelectDays(7)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              selectedDays === 7 
                ? 'bg-blue-600 text-white shadow' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            7 dias
          </button>

          <button
            type="button"
            onClick={() => handleSelectDays(30)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              selectedDays === 30 
                ? 'bg-blue-600 text-white shadow' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>30 dias</span>
            {isBronze && <Lock className="w-3 h-3 text-amber-400" />}
          </button>

          <button
            type="button"
            onClick={() => handleSelectDays(90)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
              selectedDays === 90 
                ? 'bg-blue-600 text-white shadow' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>90 dias</span>
            {isBronze && <Lock className="w-3 h-3 text-amber-400" />}
          </button>
        </div>
      </div>

      {/* Alerta de Erro de Permissão */}
      {errorType === 'permission' && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex items-start gap-3">
          <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <span className="font-black block text-amber-300">Acesso Restrito</span>
            <p>{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Alerta de Falha Técnica */}
      {errorType === 'network' && (
        <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 text-xs">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-black block text-rose-300">Falha na Conexão</span>
              <p>{errorMessage}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchAnalytics(selectedDays)}
            className="px-3 py-1.5 bg-rose-900/60 hover:bg-rose-900 text-rose-200 text-xs font-bold rounded-xl flex items-center gap-1 transition shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Tentar novamente
          </button>
        </div>
      )}

      {/* Alerta de Limite Comercial Bronze */}
      {isBronze && (
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-base">💡</span>
            <span className="text-xs text-slate-300">
              Seu plano <strong>Bronze</strong> inclui histórico dos <strong>últimos 7 dias</strong>.
              Planos Gold VIP e Diamond têm acesso ampliado de até 90 dias e destaque na página inicial.
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('plan')}
            className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <span>Conhecer Planos VIP</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* As 4 Métricas Reais Exigidas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
        {/* 1. Visualizações */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400">Visualizações</span>
            <div className="w-9 h-9 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">
              {loading ? '…' : (data?.periodTotals?.views ?? data?.totals?.views ?? 0)}
            </span>
            <span className="text-[11px] text-slate-500 font-semibold">no período</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Total acumulado:</span>
            <span className="font-bold text-slate-200">{data?.totals?.views ?? 0}</span>
          </div>
        </div>

        {/* 2. Cliques no WhatsApp */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400">Cliques no WhatsApp</span>
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">
              {loading ? '…' : (data?.periodTotals?.whatsapp ?? data?.totals?.whatsapp ?? 0)}
            </span>
            <span className="text-[11px] text-slate-500 font-semibold">no período</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Total acumulado:</span>
            <span className="font-bold text-slate-200">{data?.totals?.whatsapp ?? 0}</span>
          </div>
        </div>

        {/* 3. Cliques no Telefone */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400">Cliques no Telefone</span>
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Phone className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">
              {loading ? '…' : (data?.periodTotals?.phone ?? data?.totals?.phone ?? 0)}
            </span>
            <span className="text-[11px] text-slate-500 font-semibold">no período</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Total acumulado:</span>
            <span className="font-bold text-slate-200">{data?.totals?.phone ?? 0}</span>
          </div>
        </div>

        {/* 4. Cliques em Rotas / Como Chegar */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400">Cliques em Rotas</span>
            <div className="w-9 h-9 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">
              {loading ? '…' : (data?.periodTotals?.route ?? data?.totals?.route ?? 0)}
            </span>
            <span className="text-[11px] text-slate-500 font-semibold">no período</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Total acumulado:</span>
            <span className="font-bold text-slate-200">{data?.totals?.route ?? 0}</span>
          </div>
        </div>

      </div>

      {/* Gráfico / Evolução Diária das 4 Métricas Reais */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4 mb-6">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              Evolução Diária Real ({selectedDays} dias)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Eventos coletados diretamente da navegação dos clientes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 text-blue-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> Visualizações
            </span>
            <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> WhatsApp
            </span>
            <span className="inline-flex items-center gap-1.5 text-amber-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Telefone
            </span>
            <span className="inline-flex items-center gap-1.5 text-purple-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> Rotas
            </span>
          </div>
        </div>

        {/* Tabela / Grid Cronológica dos Dias */}
        <div className="space-y-3">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-500">Carregando métricas reais…</div>
          ) : !data?.timeline || data.timeline.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">Nenhum evento registrado no período.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
              {data.timeline.map(item => {
                const dayLabel = item.date.slice(5); // MM-DD
                const dayTotal = item.views + item.whatsapp + item.phone + item.route;
                return (
                  <div key={item.date} className="bg-slate-800/40 border border-slate-800/80 rounded-2xl p-3 flex flex-col justify-between">
                    <span className="text-[10px] font-mono font-bold text-slate-400 block mb-2">{dayLabel}</span>
                    <div className="space-y-1 text-[11px]">
                      <div className="flex items-center justify-between text-blue-300">
                        <span>👁️</span> <span className="font-bold">{item.views}</span>
                      </div>
                      <div className="flex items-center justify-between text-emerald-300">
                        <span>💬</span> <span className="font-bold">{item.whatsapp}</span>
                      </div>
                      <div className="flex items-center justify-between text-amber-300">
                        <span>📞</span> <span className="font-bold">{item.phone}</span>
                      </div>
                      <div className="flex items-center justify-between text-purple-300">
                        <span>🗺️</span> <span className="font-bold">{item.route}</span>
                      </div>
                    </div>
                    <div className="mt-2 pt-1.5 border-t border-slate-800 flex justify-between text-[10px] text-slate-500 font-bold">
                      <span>Total:</span>
                      <span className="text-white">{dayTotal}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Atalhos Rápidos para as Demais Áreas do Menu */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => onNavigateTab('company')}
          className="p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-left transition flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Minha Empresa</span>
              <span className="text-[11px] text-slate-400">Editar perfil e fotos da galeria</span>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('products_services')}
          className="p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-left transition flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">Produtos & Serviços</span>
              <span className="text-[11px] text-slate-400">Catálogo e promoções ativas</span>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('clients')}
          className="p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-left transition flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">CRM de Clientes</span>
              <span className="text-[11px] text-slate-400">Contatos e acompanhamentos</span>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
        </button>
      </div>

      {/* Modal Educativo de Bloqueio por Plano (30 e 90 dias) */}
      {showPlanLockModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-white">Histórico de 30 e 90 dias</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                O acompanhamento estendido de métricas por 30 e 90 dias é exclusivo para assinantes dos planos <strong>Gold VIP</strong> e <strong>Diamond</strong>.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700 text-xs text-slate-300 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span>
                <span>Relatórios completos de 30 e 90 dias</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span>
                <span>Destaque rotativo na vitrine principal</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span>
                <span>Catálogo de produtos e cupons de desconto</span>
              </div>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowPlanLockModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Permanecer em 7 dias
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPlanLockModal(false);
                  onNavigateTab('plan');
                }}
                className="flex-1 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black rounded-xl transition shadow-lg cursor-pointer"
              >
                Conhecer Planos
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
