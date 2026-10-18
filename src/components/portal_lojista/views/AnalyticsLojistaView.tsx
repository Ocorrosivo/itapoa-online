/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Lojista BI Analytics View Component - Funnel, Sources & Peak Hours
 */

import React, { useState } from 'react';
import { 
  BarChart3, Eye, MessageSquare, Phone, MapPin, Download, 
  Filter, Smartphone, Globe, ArrowDown, Bell, Sparkles, TrendingUp, Calendar
} from 'lucide-react';
import { Company } from '../../../types';
import { AnalyticsBiService } from '../../../services/analyticsBiService';
import { StatCard } from '../../admin_master/common/StatCard';

interface AnalyticsLojistaViewProps {
  company: Company | null;
}

export const AnalyticsLojistaView: React.FC<AnalyticsLojistaViewProps> = ({ company }) => {
  const [period, setPeriod] = useState<'7days' | '30days' | '90days'>('30days');

  if (!company) return null;

  const funnel = AnalyticsBiService.getConversionFunnel(
    company.views || 450,
    company.clicksWhatsapp || 68,
    company.clicksPhone || 24,
    company.clicksRoutes || 32
  );

  const sources = AnalyticsBiService.getTrafficSources();
  const alerts = AnalyticsBiService.getSmartAlerts();

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Metrica,Valor\n"
      + `Visualizacoes,${funnel.views}\n`
      + `CliquesWhatsapp,${funnel.whatsapp}\n`
      + `Ligacoes,${funnel.calls}\n`
      + `Rotas,${funnel.routes}\n`
      + `TaxaConversao,${funnel.conversionRate}%\n`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `analytics_bi_${company.slug}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 p-6">
      
      {/* View Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Business Intelligence & Analytics</h1>
          <p className="text-xs text-slate-400 mt-1">Análise estratégica de funil de conversão, origens de tráfego e inteligência de vendas.</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={e => setPeriod(e.target.value as any)}
            className="bg-slate-900 border border-slate-800 text-white text-xs font-semibold rounded-xl px-3 py-2.5 focus:outline-none"
          >
            <option value="7days">Últimos 7 Dias</option>
            <option value="30days">Últimos 30 Dias</option>
            <option value="90days">Últimos 90 Dias</option>
          </select>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-lg"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Relatório</span>
          </button>
        </div>
      </div>

      {/* Smart BI Alerts */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <Bell className="w-3.5 h-3.5 text-blue-400" />
          <span>Alertas Inteligentes & Recomendações BI</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {alerts.map(alt => (
            <div key={alt.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  {alt.title}
                </span>
                <span className="text-[10px] text-slate-500">{alt.timestamp}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{alt.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Visual Conversion Funnel */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-bold text-white">Funil Visual de Conversão de Clientes</h3>
            <p className="text-xs text-slate-400">Jornada do visitante desde o primeiro clique até a chamada final</p>
          </div>
          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            Taxa Geral: {funnel.conversionRate}%
          </span>
        </div>

        <div className="space-y-4 max-w-3xl mx-auto">
          
          {/* Step 1: Views */}
          <div className="bg-gradient-to-r from-blue-600/30 to-blue-600/10 border border-blue-500/30 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye className="w-5 h-5 text-blue-400" />
              <span className="font-bold text-white text-sm">1. Visualizações no Mini-Site</span>
            </div>
            <span className="text-lg font-black text-white">{funnel.views}</span>
          </div>

          <ArrowDown className="w-5 h-5 text-slate-600 mx-auto" />

          {/* Step 2: Clicks */}
          <div className="bg-gradient-to-r from-indigo-600/30 to-indigo-600/10 border border-indigo-500/30 rounded-2xl p-4 flex items-center justify-between w-[90%] mx-auto">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-5 h-5 text-indigo-400" />
              <span className="font-bold text-white text-sm">2. Contatos no WhatsApp</span>
            </div>
            <span className="text-lg font-black text-emerald-400">{funnel.whatsapp}</span>
          </div>

          <ArrowDown className="w-5 h-5 text-slate-600 mx-auto" />

          {/* Step 3: Calls & Routes */}
          <div className="bg-gradient-to-r from-emerald-600/30 to-emerald-600/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between w-[80%] mx-auto">
            <div className="flex items-center gap-3">
              <Phone className="w-5 h-5 text-emerald-400" />
              <span className="font-bold text-white text-sm">3. Ligações & Solicitações de Rota</span>
            </div>
            <span className="text-lg font-black text-emerald-300">{funnel.calls + funnel.routes}</span>
          </div>

        </div>
      </div>

      {/* Traffic Sources & Devices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Traffic Sources */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-lg font-bold text-white">Origem dos Visitantes</h3>
            <p className="text-xs text-slate-400">Canais que estão atraindo mais clientes para você</p>
          </div>

          <div className="space-y-4">
            {sources.map((s, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">{s.source}</span>
                  <span className="text-blue-400 font-bold">{s.percentage}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${s.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Peak Hours Histogram */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-lg font-bold text-white">Horários de Pico de Acessos</h3>
            <p className="text-xs text-slate-400">Distribuição de acessos por período do dia</p>
          </div>

          <div className="grid grid-cols-4 gap-3 text-center pt-2">
            {[
              { label: 'Manhã (08h-12h)', val: '22%' },
              { label: 'Tarde (12h-18h)', val: '41%' },
              { label: 'Noite (18h-22h)', val: '32%' },
              { label: 'Madrugada', val: '5%' }
            ].map((p, i) => (
              <div key={i} className="bg-slate-800/40 p-4 rounded-2xl border border-slate-800 space-y-1">
                <span className="text-xl font-black text-emerald-400">{p.val}</span>
                <span className="text-[10px] text-slate-400 font-bold block">{p.label}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
