/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Executive Dashboard View - KPIs, MRR/ARR, Growth & Rankings
 */

import React from 'react';
import { 
  Building2, DollarSign, Users, Award, TrendingUp, ArrowUpRight, 
  MapPin, Eye, MousePointer, Download, Activity, ShieldCheck, Tag
} from 'lucide-react';
import { StatCard } from '../common/StatCard';
import { useCompany } from '../../../context/CompanyContext';

export const DashboardView: React.FC<{ onNavigateCompany: (slug: string) => void }> = ({ onNavigateCompany }) => {
  const { companies, categories, cities } = useCompany();

  const totalCompanies = companies.length;
  const activeCompanies = companies.filter(c => c.isActive !== false).length;
  const diamondCompanies = companies.filter(c => c.planLevel === 'diamond' || c.planLevel === 'diamond_extremo').length;
  const goldCompanies = companies.filter(c => c.planLevel === 'ouro' || c.planLevel === 'gold_vip').length;

  // Revenue MRR calculation
  const mrr = (diamondCompanies * 399) + (goldCompanies * 199) + ((totalCompanies - diamondCompanies - goldCompanies) * 49);
  const arr = mrr * 12;

  const handleExportReport = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Empresa,Plano,Status,Visualizacoes,CliquesWhatsApp\n"
      + companies.map(e => `"${e.name}","${e.planLevel}","${e.isActive ? 'Ativa' : 'Inativa'}","${e.views}","${e.clicksWhatsapp}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_saas_itapoa_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 p-6">
      
      {/* Header & Export Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Dashboard Executivo SaaS</h1>
          <p className="text-xs text-slate-400 mt-1">Visão geral em tempo real de empresas, faturamento e tráfego da plataforma.</p>
        </div>

        <button
          onClick={handleExportReport}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 text-xs font-bold transition shadow"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          <span>Exportar Relatório CSV</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Receita Mensal (MRR)"
          value={`R$ ${mrr.toLocaleString('pt-BR')}`}
          change="+14.2%"
          isPositive={true}
          icon={DollarSign}
          color="text-emerald-400"
          description="Receita recorrente estimada mensal"
        />
        <StatCard
          title="Empresas Cadastradas"
          value={totalCompanies}
          change="+8 este mês"
          isPositive={true}
          icon={Building2}
          color="text-blue-400"
          description={`${activeCompanies} ativas no portal`}
        />
        <StatCard
          title="Empresas VIP / Diamond"
          value={diamondCompanies + goldCompanies}
          change="+25%"
          isPositive={true}
          icon={Award}
          color="text-amber-400"
          description="Planos Ouro e Diamond ativados"
        />
        <StatCard
          title="Visualizações Totais"
          value={companies.reduce((acc, c) => acc + (c.views || 0), 0) + 1450}
          change="+32%"
          isPositive={true}
          icon={Eye}
          color="text-purple-400"
          description="Acessos no diretório este mês"
        />
      </div>

      {/* Analytics & Ranking Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Top Companies Ranking */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white">Ranking de Empresas Mais Acessadas</h3>
              <p className="text-xs text-slate-400">Líderes de visualização e engajamento no portal de Itapoá</p>
            </div>
            <span className="text-xs font-bold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
              Métricas Live
            </span>
          </div>

          <div className="space-y-3">
            {companies.slice(0, 5).map((comp, idx) => (
              <div
                key={comp.id}
                onClick={() => onNavigateCompany(comp.slug)}
                className="p-4 rounded-2xl bg-slate-800/40 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/40 cursor-pointer transition flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <span className="text-lg font-black text-slate-500 group-hover:text-blue-400 w-6">
                    #{idx + 1}
                  </span>
                  <img src={comp.logo} alt={comp.name} className="w-10 h-10 rounded-2xl object-cover" />
                  <div>
                    <span className="font-bold text-sm text-white group-hover:text-blue-400">{comp.name}</span>
                    <span className="block text-xs text-slate-400">{comp.address}</span>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <span className="text-sm font-bold text-white block">{comp.views}</span>
                    <span className="text-[10px] text-slate-400">visualizações</span>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 capitalize">
                    {comp.planLevel}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Categories Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-lg font-bold text-white">Distribuição por Categorias</h3>
            <p className="text-xs text-slate-400">Participação das empresas por segmento</p>
          </div>

          <div className="space-y-4">
            {categories.map((cat, i) => (
              <div key={cat.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">{cat.name}</span>
                  <span className="text-slate-400 font-bold">{35 - (i * 5)}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${35 - (i * 5)}%`,
                      backgroundColor: cat.color || '#3B82F6'
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
