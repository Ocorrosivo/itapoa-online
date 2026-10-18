/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Lojista Main Dashboard View - Real-time Conversions, Rankings & Traffic
 */

import React from 'react';
import { 
  Eye, MessageSquare, Phone, MapPin, Heart, Star, 
  TrendingUp, Award, Smartphone, Globe, ShoppingBag, Plus
} from 'lucide-react';
import { Company } from '../../../types';
import { StatCard } from '../../admin_master/common/StatCard';
import { PermissionButton } from '../../common/PermissionButton';

interface LojistaDashboardViewProps {
  company: Company | null;
  onNavigateTab: (tab: string) => void;
}

export const LojistaDashboardView: React.FC<LojistaDashboardViewProps> = ({ company, onNavigateTab }) => {
  if (!company) return null;

  return (
    <div className="space-y-8 p-6">
      
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Painel de Vendas & Desempenho</h1>
          <p className="text-xs text-slate-400 mt-1">Acompanhe visualizações, conversões em WhatsApp e engajamento em tempo real.</p>
        </div>

        <PermissionButton
          permission="products.create"
          onClick={() => onNavigateTab('products')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-lg"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Produto / Serviço</span>
        </PermissionButton>
      </div>

      {/* KPI Conversion Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Visualizações no Mini-Site"
          value={company.views || 142}
          change="+24%"
          isPositive={true}
          icon={Eye}
          color="text-blue-400"
          description="Acessos totais à sua página"
        />
        <StatCard
          title="Cliques no WhatsApp"
          value={company.clicksWhatsapp || 38}
          change="+18%"
          isPositive={true}
          icon={MessageSquare}
          color="text-emerald-400"
          description="Contatos diretos iniciados"
        />
        <StatCard
          title="Chamadas de Telefone"
          value={company.clicksPhone || 19}
          change="+12%"
          isPositive={true}
          icon={Phone}
          color="text-amber-400"
          description="Ligações de clientes"
        />
        <StatCard
          title="Solicitações de Rota"
          value={company.clicksRoutes || 27}
          change="+30%"
          isPositive={true}
          icon={MapPin}
          color="text-purple-400"
          description="Buscas de localização no mapa"
        />
      </div>

      {/* Local Rankings & Traffic Origins */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Local Category Position */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white">Posicionamento Local em Itapoá SC</h3>
              <p className="text-xs text-slate-400">Classificação da sua empresa comparada ao segmento</p>
            </div>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              #2 Na Categoria
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-800 text-center space-y-1">
              <span className="text-xs text-slate-400 font-bold uppercase">Nota Média</span>
              <div className="flex items-center justify-center gap-1 text-amber-400 text-xl font-black">
                <Star className="w-5 h-5 fill-current" />
                <span>{company.rating || 4.9}</span>
              </div>
              <span className="text-[10px] text-slate-500 block">({company.reviewCount || 12} avaliações)</span>
            </div>

            <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-800 text-center space-y-1">
              <span className="text-xs text-slate-400 font-bold uppercase">Favoritados</span>
              <div className="flex items-center justify-center gap-1 text-red-400 text-xl font-black">
                <Heart className="w-5 h-5 fill-current" />
                <span>{company.favoritesCount || 42}</span>
              </div>
              <span className="text-[10px] text-slate-500 block">Clientes salvaram</span>
            </div>

            <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-800 text-center space-y-1">
              <span className="text-xs text-slate-400 font-bold uppercase">Taxa de Resposta</span>
              <div className="flex items-center justify-center gap-1 text-emerald-400 text-xl font-black">
                <TrendingUp className="w-5 h-5" />
                <span>98%</span>
              </div>
              <span className="text-[10px] text-slate-500 block">Atendimento rápido</span>
            </div>
          </div>
        </div>

        {/* Traffic Devices */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-lg font-bold text-white">Dispositivos dos Clientes</h3>
            <p className="text-xs text-slate-400">Origem de acesso aos seus produtos</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-blue-400" />
                <span className="font-bold text-white">Celulares / Mobile</span>
              </div>
              <span className="font-black text-blue-400">82%</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full w-[82%]"></div>
            </div>

            <div className="flex items-center justify-between text-xs pt-2">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-purple-400" />
                <span className="font-bold text-white">Computador / Desktop</span>
              </div>
              <span className="font-black text-purple-400">18%</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div className="bg-purple-500 h-full rounded-full w-[18%]"></div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
