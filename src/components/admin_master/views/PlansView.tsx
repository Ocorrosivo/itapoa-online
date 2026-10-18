/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Plans SaaS Management View - Strictly Enforced 4 Canonical Plans
 */

import React, { useState } from 'react';
import { Award, Check, Edit2, Save, X, ShieldCheck, Zap, Layers, BarChart2, Briefcase } from 'lucide-react';

export interface PlanItem {
  id: string;
  code: string;
  name: string;
  description: string;
  priceMonthly: number;
  isPriceEditable: boolean;
  durationDays?: number;
  maxProducts: number;
  maxImages: number;
  maxUsers: number;
  hasSEO: boolean;
  hasAnalytics: boolean;
  hasCRM: boolean;
  features: string[];
}

export const PlansView: React.FC = () => {
  const [plans, setPlans] = useState<PlanItem[]>([
    {
      id: 'plan_trial',
      code: 'TRIAL',
      name: 'Trial de Degustação',
      description: 'Teste completo da plataforma por 7 dias sem custos.',
      priceMonthly: 0,
      isPriceEditable: false,
      durationDays: 7,
      maxProducts: 5,
      maxImages: 3,
      maxUsers: 1,
      hasSEO: false,
      hasAnalytics: false,
      hasCRM: false,
      features: ['Acesso por 7 dias', 'Até 5 produtos no catálogo', 'Até 3 fotos de galeria', 'Página no Guia']
    },
    {
      id: 'plan_essencial',
      code: 'ESSENCIAL',
      name: 'Plano Essencial',
      description: 'Ideal para pequenos comércios e prestadores de serviços locais.',
      priceMonthly: 19.99,
      isPriceEditable: true,
      maxProducts: 15,
      maxImages: 10,
      maxUsers: 2,
      hasSEO: true,
      hasAnalytics: false,
      hasCRM: false,
      features: ['Até 15 produtos cadastrados', 'Até 10 fotos no catálogo', 'Link direto para WhatsApp', 'Otimização para busca local (SEO)']
    },
    {
      id: 'plan_profissional',
      code: 'PROFISSIONAL',
      name: 'Plano Profissional',
      description: 'Para empresas em expansão com catálogo amplo e cupons.',
      priceMonthly: 49.99,
      isPriceEditable: true,
      maxProducts: 50,
      maxImages: 25,
      maxUsers: 5,
      hasSEO: true,
      hasAnalytics: true,
      hasCRM: true,
      features: ['Até 50 produtos cadastrados', 'Até 25 fotos no catálogo', 'Mídias e Vídeos demonstrativos', 'CRM de Leads Kanban', 'Analytics de Tráfego']
    },
    {
      id: 'plan_premium',
      code: 'PREMIUM',
      name: 'Plano Premium',
      description: 'Destaque VIP absoluto no topo do portal com IA e limites estendidos.',
      priceMonthly: 129.99,
      isPriceEditable: true,
      maxProducts: 999,
      maxImages: 999,
      maxUsers: 20,
      hasSEO: true,
      hasAnalytics: true,
      hasCRM: true,
      features: ['Produtos & Imagens ilimitados', 'Selo VIP no topo do portal', 'CRM completo com IA Concierge', 'Suporte prioritário 24/7', 'SEO avançado + Schemas']
    }
  ]);

  const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null);

  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    setPlans(prev => prev.map(p => p.id === editingPlan.id ? editingPlan : p));
    setEditingPlan(null);
  };

  return (
    <div className="space-y-6 p-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Gestão de Planos SaaS</h1>
          <p className="text-xs text-slate-400 mt-1">
            Gerencie os 4 planos oficiais da plataforma: Trial (Gratuito 7 dias), Essencial (R$ 19,99), Profissional (R$ 49,99) e Premium (R$ 129,99).
          </p>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map(p => (
          <div
            key={p.id}
            className={`bg-slate-900 border rounded-3xl p-6 flex flex-col justify-between space-y-6 shadow-xl relative overflow-hidden ${
              p.code === 'PREMIUM' ? 'border-[#C8102E]/60 shadow-red-950/20' : 'border-slate-800'
            }`}
          >
            {p.code === 'PREMIUM' && (
              <div className="absolute top-0 right-0 bg-[#C8102E] text-white text-[8px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-wider">
                DESTAQUE VIP
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#C8102E] bg-red-950/40 px-2.5 py-1 rounded-md border border-red-900/30">
                  {p.code}
                </span>
                <Award className="w-5 h-5 text-amber-400" />
              </div>

              <div>
                <h3 className="text-lg font-black text-white">{p.name}</h3>
                <p className="text-[11px] text-slate-400 leading-relaxed mt-1">{p.description}</p>
              </div>

              <div className="flex items-baseline gap-1 py-2 border-y border-slate-800">
                <span className="text-3xl font-black text-white">
                  R$ {p.priceMonthly.toFixed(2).replace('.', ',')}
                </span>
                <span className="text-xs text-slate-400">/mês</span>
              </div>

              {/* Resource Limits List */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span>Limite Produtos:</span>
                  <span className="font-bold text-white">{p.maxProducts >= 999 ? 'Ilimitado' : p.maxProducts}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Limite Imagens:</span>
                  <span className="font-bold text-white">{p.maxImages >= 999 ? 'Ilimitadas' : p.maxImages}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span>Usuários:</span>
                  <span className="font-bold text-white">{p.maxUsers}</span>
                </div>
              </div>

              {/* Features List */}
              <ul className="space-y-2 pt-3 border-t border-slate-800/80">
                {p.features.map((feat, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={() => setEditingPlan({ ...p })}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer border border-slate-700"
            >
              <Edit2 className="w-4 h-4 text-blue-400" />
              <span>Editar Configurações</span>
            </button>

          </div>
        ))}
      </div>

      {/* Edit Plan Modal */}
      {editingPlan && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl p-6 md:p-8 space-y-6 shadow-2xl relative my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <span className="text-[10px] font-bold text-[#C8102E] uppercase tracking-wider">EDITAR PLANO SAAS</span>
                <h2 className="text-xl font-bold text-white">{editingPlan.name}</h2>
              </div>
              <button
                onClick={() => setEditingPlan(null)}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlan} className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nome do Plano</label>
                <input
                  type="text"
                  value={editingPlan.name}
                  onChange={e => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Descrição Comercial</label>
                <textarea
                  rows={2}
                  value={editingPlan.description}
                  onChange={e => setEditingPlan({ ...editingPlan, description: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Preço Mensal (R$) {editingPlan.code === 'TRIAL' && '(Gratuito - Não Editável)'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    disabled={!editingPlan.isPriceEditable}
                    value={editingPlan.priceMonthly}
                    onChange={e => setEditingPlan({ ...editingPlan, priceMonthly: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white disabled:opacity-50 focus:outline-none focus:border-[#C8102E]"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Limite de Produtos</label>
                  <input
                    type="number"
                    value={editingPlan.maxProducts}
                    onChange={e => setEditingPlan({ ...editingPlan, maxProducts: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Limite de Imagens</label>
                  <input
                    type="number"
                    value={editingPlan.maxImages}
                    onChange={e => setEditingPlan({ ...editingPlan, maxImages: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Limite de Usuários</label>
                  <input
                    type="number"
                    value={editingPlan.maxUsers}
                    onChange={e => setEditingPlan({ ...editingPlan, maxUsers: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Recursos & Feature Flags</span>
                <div className="grid grid-cols-3 gap-3">
                  <label className="flex items-center gap-2 p-3 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingPlan.hasSEO}
                      onChange={e => setEditingPlan({ ...editingPlan, hasSEO: e.target.checked })}
                      className="accent-[#C8102E]"
                    />
                    <span className="text-xs text-white font-bold">SEO</span>
                  </label>

                  <label className="flex items-center gap-2 p-3 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingPlan.hasAnalytics}
                      onChange={e => setEditingPlan({ ...editingPlan, hasAnalytics: e.target.checked })}
                      className="accent-[#C8102E]"
                    />
                    <span className="text-xs text-white font-bold">Analytics</span>
                  </label>

                  <label className="flex items-center gap-2 p-3 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingPlan.hasCRM}
                      onChange={e => setEditingPlan({ ...editingPlan, hasCRM: e.target.checked })}
                      className="accent-[#C8102E]"
                    />
                    <span className="text-xs text-white font-bold">CRM</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#C8102E] hover:bg-red-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
