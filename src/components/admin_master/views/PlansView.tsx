/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Plans SaaS Management View - Gestão de Planos, Benefícios, Direitos e Auditoria
 */

import React, { useState, useEffect } from 'react';
import { 
  Award, Check, Edit2, Save, X, ShieldCheck, Zap, Layers, 
  BarChart2, Briefcase, Eye, History, Sparkles, AlertCircle, Plus, Trash2, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

export interface AdminPlanItem {
  id: string;
  name: string;
  displayName?: string;
  description: string;
  price: number;
  billingCycle: 'monthly';
  version: number;
  maxGalleryPhotos: number;
  maxProducts: number;
  maxCoupons: number;
  hasHomeHighlight: boolean;
  hasCrm: boolean;
  hasFullPresentation: boolean;
  hasAnalytics: boolean;
  priorityLevel: number;
  badge?: string;
  buttonText?: string;
  sortOrder?: number;
  isRecommended?: boolean;
  allowNewSubscriptions?: boolean;
  trialDays?: number;
  features: string[];
}

export interface PlanAuditLog {
  id: string;
  plan_id: string;
  action: string;
  changed_by_user_id?: string;
  changed_by_email?: string;
  changes_json: string | Record<string, { before: any; after: any }>;
  ip_address?: string;
  created_at: string;
}

export const PlansView: React.FC = () => {
  const { token } = useAuth();
  const [plans, setPlans] = useState<AdminPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal de Edição
  const [editingPlan, setEditingPlan] = useState<AdminPlanItem | null>(null);
  const [activeTab, setActiveTab] = useState<'marketing' | 'tech' | 'preview'>('marketing');
  const [newFeatureText, setNewFeatureText] = useState('');
  const [saving, setSaving] = useState(false);

  // Modal de Auditoria
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditLogs, setAuditLogs] = useState<PlanAuditLog[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const getAuthHeaders = () => {
    const activeToken = token || localStorage.getItem('itpoa_auth_token') || '';
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${activeToken}`
    };
  };

  const loadPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/plans', {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setPlans(data);
        } else {
          const pubRes = await fetch('/api/plans');
          if (pubRes.ok) {
            setPlans(await pubRes.json());
          }
        }
      } else {
        const pubRes = await fetch('/api/plans');
        if (pubRes.ok) {
          setPlans(await pubRes.json());
        }
      }
    } catch {
      setError('Não foi possível carregar os planos. Verifique a conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, [token]);

  const handleOpenEdit = (plan: AdminPlanItem) => {
    setEditingPlan({
      ...plan,
      displayName: plan.displayName || plan.name,
      features: Array.isArray(plan.features) ? [...plan.features] : []
    });
    setActiveTab('marketing');
    setNewFeatureText('');
  };

  const handleAddFeature = () => {
    if (!newFeatureText.trim() || !editingPlan) return;
    setEditingPlan({
      ...editingPlan,
      features: [...editingPlan.features, newFeatureText.trim()]
    });
    setNewFeatureText('');
  };

  const handleRemoveFeature = (idx: number) => {
    if (!editingPlan) return;
    setEditingPlan({
      ...editingPlan,
      features: editingPlan.features.filter((_, i) => i !== idx)
    });
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    if (!editingPlan.displayName?.trim()) {
      alert('O nome do plano é obrigatório.');
      return;
    }
    if (editingPlan.price < 0) {
      alert('O preço não pode ser negativo.');
      return;
    }
    if (editingPlan.maxGalleryPhotos < 0 || editingPlan.maxProducts < 0 || editingPlan.maxCoupons < 0) {
      alert('Os limites de recursos não podem ser números negativos.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/plans/${editingPlan.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          displayName: editingPlan.displayName.trim(),
          description: editingPlan.description?.trim(),
          price: Number(editingPlan.price),
          maxGalleryPhotos: Number(editingPlan.maxGalleryPhotos),
          maxProducts: Number(editingPlan.maxProducts),
          maxCoupons: Number(editingPlan.maxCoupons),
          hasHomeHighlight: Boolean(editingPlan.hasHomeHighlight),
          hasCrm: Boolean(editingPlan.hasCrm),
          hasFullPresentation: Boolean(editingPlan.hasFullPresentation),
          hasAnalytics: Boolean(editingPlan.hasAnalytics),
          badge: editingPlan.badge?.trim() || null,
          buttonText: editingPlan.buttonText?.trim() || null,
          sortOrder: Number(editingPlan.sortOrder ?? 0),
          isRecommended: Boolean(editingPlan.isRecommended),
          allowNewSubscriptions: editingPlan.allowNewSubscriptions !== false,
          trialDays: Number(editingPlan.trialDays ?? 0),
          features: editingPlan.features
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Erro ao salvar alterações do plano.');
      }

      setSuccessMsg(`Plano "${editingPlan.displayName}" atualizado com sucesso no banco de dados.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      setEditingPlan(null);
      await loadPlans();
    } catch (err: any) {
      alert(err.message || 'Falha ao salvar plano.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenAudit = async () => {
    setShowAuditModal(true);
    setLoadingAudit(true);
    try {
      const res = await fetch('/api/admin/plans-audit', {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        setAuditLogs(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setLoadingAudit(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">Planos e Benefícios</h1>
            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              Tempo Real sem Deploy
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Configure nomes, descrições, preços, limites técnicos de banco, badges, botões e disponibilidade de adesões. As alterações têm efeito imediato nas telas públicas e de contratação.
          </p>
        </div>

        <button
          onClick={handleOpenAudit}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 text-xs font-bold transition shadow-sm"
        >
          <History className="w-4 h-4 text-indigo-400" />
          <span>Auditoria de Alterações</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid de Planos */}
      {loading ? (
        <div className="py-20 text-center text-slate-400 text-xs">Carregando catálogo de planos...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map(p => {
            const isGold = p.name === 'gold_vip' || p.id === 'plan_gold_vip';
            const isDiamond = p.name === 'diamond_extremo' || p.id === 'plan_diamond_extremo';

            return (
              <div
                key={p.id}
                className={`bg-slate-900 border rounded-3xl p-6 flex flex-col justify-between space-y-6 shadow-xl relative overflow-hidden transition-all hover:border-slate-700 ${
                  p.isRecommended ? 'ring-2 ring-indigo-500/50 border-indigo-500/40 shadow-indigo-950/30' : 'border-slate-800'
                }`}
              >
                {/* Badges do Card */}
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border ${
                    isDiamond 
                      ? 'bg-amber-950/40 text-amber-400 border-amber-800/40' 
                      : isGold
                      ? 'bg-indigo-950/40 text-indigo-400 border-indigo-800/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {p.badge || (isDiamond ? '👑 DIAMOND' : isGold ? '⭐ GOLD VIP' : 'BRONZE')}
                  </span>

                  {p.isRecommended && (
                    <span className="text-[9px] font-black uppercase bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                      Recomendado
                    </span>
                  )}

                  {!p.allowNewSubscriptions && (
                    <span className="text-[9px] font-black uppercase bg-rose-950/80 text-rose-300 border border-rose-800/50 px-2 py-0.5 rounded-full">
                      Adesões Encerradas
                    </span>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-black text-white">{p.displayName || p.name}</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-2">{p.description}</p>
                  </div>

                  {/* Preço */}
                  <div className="flex items-baseline gap-1 py-3 border-y border-slate-800/80">
                    <span className="text-3xl font-black text-white">
                      {p.price === 0 ? 'Grátis' : `R$ ${Number(p.price).toFixed(2).replace('.', ',')}`}
                    </span>
                    {p.price > 0 && <span className="text-xs text-slate-400 font-semibold">/mês</span>}
                    {p.trialDays && p.trialDays > 0 ? (
                      <span className="ml-auto text-[10px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/30">
                        {p.trialDays} dias trial
                      </span>
                    ) : null}
                  </div>

                  {/* Limites Técnicos Reais */}
                  <div className="space-y-2 text-xs bg-slate-950/40 p-3.5 rounded-2xl border border-slate-800/60">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Galeria de Fotos:</span>
                      <span className="font-bold text-white">{p.maxGalleryPhotos} fotos</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Produtos / Serviços:</span>
                      <span className="font-bold text-white">{p.maxProducts > 0 ? `Até ${p.maxProducts}` : 'Nenhum (0)'}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Promoções / Cupons:</span>
                      <span className="font-bold text-white">{p.maxCoupons > 0 ? `Até ${p.maxCoupons} ativos` : 'Nenhum (0)'}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Destaque na Vitrine:</span>
                      <span className={`font-bold ${p.hasHomeHighlight ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {p.hasHomeHighlight ? 'Sim (Rotativo)' : 'Não'}
                      </span>
                    </div>
                  </div>

                  {/* Lista de Benefícios Comerciais */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Benefícios Comerciais ({p.features?.length || 0}):
                    </span>
                    <ul className="space-y-1">
                      {(p.features || []).slice(0, 4).map((feat, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-[11px] text-slate-300">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate">{feat}</span>
                        </li>
                      ))}
                      {(p.features?.length || 0) > 4 && (
                        <li className="text-[10px] text-slate-500 pl-5">
                          +{(p.features?.length || 0) - 4} outros benefícios...
                        </li>
                      )}
                    </ul>
                  </div>
                </div>

                {/* Botão de Ação */}
                <button
                  onClick={() => handleOpenEdit(p)}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/50"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Editar Plano & Benefícios</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE EDIÇÃO COMPLETO */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl p-6 shadow-2xl relative my-8">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-black text-white">
                  Editar Plano: {editingPlan.displayName || editingPlan.name}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  ID canônico: <code className="text-indigo-400 bg-slate-800 px-1.5 py-0.5 rounded">{editingPlan.id}</code>
                </p>
              </div>
              <button
                onClick={() => setEditingPlan(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs de Navegação */}
            <div className="flex items-center gap-2 mt-4 border-b border-slate-800 pb-3">
              <button
                type="button"
                onClick={() => setActiveTab('marketing')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  activeTab === 'marketing'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-800/60 text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>1. Apresentação & Marketing</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('tech')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  activeTab === 'tech'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-800/60 text-slate-400 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>2. Limites Técnicos & Direitos</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  activeTab === 'preview'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-800/60 text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-4 h-4" />
                <span>3. Pré-Visualização ao Vivo</span>
              </button>
            </div>

            {/* Conteúdo das Abas */}
            <form onSubmit={handleSavePlan} className="mt-6 space-y-6">
              
              {/* ABA 1: MARKETING */}
              {activeTab === 'marketing' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1.5">Nome Comercial de Exibição</label>
                      <input
                        type="text"
                        value={editingPlan.displayName || ''}
                        onChange={e => setEditingPlan({ ...editingPlan, displayName: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                        placeholder="Ex: Gold VIP"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1.5">Preço Mensal (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editingPlan.price}
                        onChange={e => setEditingPlan({ ...editingPlan, price: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1.5">Descrição Curta</label>
                    <textarea
                      rows={2}
                      value={editingPlan.description || ''}
                      onChange={e => setEditingPlan({ ...editingPlan, description: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                      placeholder="Resumo das vantagens deste plano..."
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1.5">Selo / Badge</label>
                      <input
                        type="text"
                        value={editingPlan.badge || ''}
                        onChange={e => setEditingPlan({ ...editingPlan, badge: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                        placeholder="Ex: Mais Popular"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1.5">Texto do Botão</label>
                      <input
                        type="text"
                        value={editingPlan.buttonText || ''}
                        onChange={e => setEditingPlan({ ...editingPlan, buttonText: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                        placeholder="Ex: Assinar Gold VIP"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1.5">Ordem de Exibição</label>
                      <input
                        type="number"
                        value={editingPlan.sortOrder ?? 0}
                        onChange={e => setEditingPlan({ ...editingPlan, sortOrder: parseInt(e.target.value, 10) || 0 })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <label className="flex items-center gap-2 p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(editingPlan.isRecommended)}
                        onChange={e => setEditingPlan({ ...editingPlan, isRecommended: e.target.checked })}
                        className="rounded text-indigo-600 focus:ring-0"
                      />
                      <span className="text-xs font-bold text-slate-200">Plano Recomendado</span>
                    </label>

                    <label className="flex items-center gap-2 p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingPlan.allowNewSubscriptions !== false}
                        onChange={e => setEditingPlan({ ...editingPlan, allowNewSubscriptions: e.target.checked })}
                        className="rounded text-indigo-600 focus:ring-0"
                      />
                      <span className="text-xs font-bold text-slate-200">Disponível para Novas Adesões</span>
                    </label>

                    <div className="flex items-center gap-2 p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
                      <span className="text-xs font-bold text-slate-300">Dias de Teste Grátis:</span>
                      <input
                        type="number"
                        min="0"
                        value={editingPlan.trialDays ?? 0}
                        onChange={e => setEditingPlan({ ...editingPlan, trialDays: parseInt(e.target.value, 10) || 0 })}
                        className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white text-center"
                      />
                    </div>
                  </div>

                  {/* Lista de Benefícios Dinâmicos */}
                  <div className="pt-3 border-t border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-slate-300">
                        Benefícios Comerciais Exibidos ao Cliente
                      </label>
                      <span className="text-[10px] text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/40">
                        Texto informativo (não altera permissões de banco)
                      </span>
                    </div>

                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={newFeatureText}
                        onChange={e => setNewFeatureText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddFeature(); } }}
                        placeholder="Digite um novo benefício e pressione Adicionar..."
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddFeature}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Adicionar</span>
                      </button>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {editingPlan.features.map((feat, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/60 text-xs text-slate-200">
                          <div className="flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span>{feat}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFeature(idx)}
                            className="p-1 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-700 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 2: LIMITES TÉCNICOS & PERMISSÕES */}
              {activeTab === 'tech' && (
                <div className="space-y-5">
                  <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Regras Estritas de Segurança e Backend:</p>
                      <p className="mt-0.5 text-amber-200/80 leading-relaxed">
                        Estes campos controlam as travas de limites reais da API (`EntitlementService`). Logo e Capa são isentos e não contam no limite de galeria. O conteúdo excedente existente de empresas nunca é deletado.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700/60">
                      <label className="text-xs font-bold text-slate-300 block mb-1">
                        Limite Fotos de Galeria
                      </label>
                      <p className="text-[10px] text-slate-400 mb-2">Logo e Capa não contam</p>
                      <input
                        type="number"
                        min="0"
                        value={editingPlan.maxGalleryPhotos}
                        onChange={e => setEditingPlan({ ...editingPlan, maxGalleryPhotos: parseInt(e.target.value, 10) || 0 })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>

                    <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700/60">
                      <label className="text-xs font-bold text-slate-300 block mb-1">
                        Limite Produtos / Serviços
                      </label>
                      <p className="text-[10px] text-slate-400 mb-2">Bronze = 0 (bloqueia novos)</p>
                      <input
                        type="number"
                        min="0"
                        value={editingPlan.maxProducts}
                        onChange={e => setEditingPlan({ ...editingPlan, maxProducts: parseInt(e.target.value, 10) || 0 })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>

                    <div className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700/60">
                      <label className="text-xs font-bold text-slate-300 block mb-1">
                        Limite Promoções / Cupons
                      </label>
                      <p className="text-[10px] text-slate-400 mb-2">Promoções simultâneas</p>
                      <input
                        type="number"
                        min="0"
                        value={editingPlan.maxCoupons}
                        onChange={e => setEditingPlan({ ...editingPlan, maxCoupons: parseInt(e.target.value, 10) || 0 })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Recursos e Funcionalidades Habilitadas</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <label className="flex items-center gap-3 p-3.5 bg-slate-800/40 rounded-xl border border-slate-700/60 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingPlan.hasHomeHighlight}
                          onChange={e => setEditingPlan({ ...editingPlan, hasHomeHighlight: e.target.checked })}
                          className="rounded text-indigo-600 focus:ring-0"
                        />
                        <div>
                          <span className="text-xs font-bold text-white block">Destaque Rotativo na Home</span>
                          <span className="text-[10px] text-slate-400">Exibe empresa no carrossel VIP</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-3.5 bg-slate-800/40 rounded-xl border border-slate-700/60 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingPlan.hasCrm}
                          onChange={e => setEditingPlan({ ...editingPlan, hasCrm: e.target.checked })}
                          className="rounded text-indigo-600 focus:ring-0"
                        />
                        <div>
                          <span className="text-xs font-bold text-white block">CRM de Leads Integrado</span>
                          <span className="text-[10px] text-slate-400">Kanban de clientes e mensagens</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-3.5 bg-slate-800/40 rounded-xl border border-slate-700/60 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingPlan.hasFullPresentation}
                          onChange={e => setEditingPlan({ ...editingPlan, hasFullPresentation: e.target.checked })}
                          className="rounded text-indigo-600 focus:ring-0"
                        />
                        <div>
                          <span className="text-xs font-bold text-white block">Apresentação Completa</span>
                          <span className="text-[10px] text-slate-400">Página enriquecida e selo visual</span>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-3.5 bg-slate-800/40 rounded-xl border border-slate-700/60 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editingPlan.hasAnalytics}
                          onChange={e => setEditingPlan({ ...editingPlan, hasAnalytics: e.target.checked })}
                          className="rounded text-indigo-600 focus:ring-0"
                        />
                        <div>
                          <span className="text-xs font-bold text-white block">Métricas & Analytics</span>
                          <span className="text-[10px] text-slate-400">Painel de visualizações e cliques</span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* ABA 3: PRÉ-VISUALIZAÇÃO AO VIVO */}
              {activeTab === 'preview' && (
                <div className="space-y-4">
                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-400">
                    Prévia em tempo real de como este plano aparecerá na página pública de planos e contratação:
                  </div>

                  <div className="flex justify-center p-6 bg-slate-950/40 rounded-2xl border border-slate-800/80">
                    <div className="w-full max-w-sm p-6 rounded-3xl border border-indigo-400 bg-slate-900 shadow-2xl flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-4 mb-4">
                          <span className="text-[10px] font-extrabold uppercase px-3 py-1 rounded-full bg-indigo-600 text-white">
                            {editingPlan.badge || editingPlan.displayName}
                          </span>
                          <Zap className="w-5 h-5 text-indigo-400" />
                        </div>

                        <div className="flex items-baseline mb-2">
                          <span className="text-3xl font-black text-white">
                            {editingPlan.price === 0 ? 'Grátis' : `R$ ${Number(editingPlan.price).toFixed(2).replace('.', ',')}`}
                          </span>
                          {editingPlan.price > 0 && <span className="text-xs text-slate-400 ml-1">/mês</span>}
                        </div>
                        <p className="text-xs text-slate-400 mb-6">{editingPlan.description}</p>

                        <div className="flex flex-col gap-2.5 border-t border-slate-800 pt-5">
                          {editingPlan.features.map((feat, idx) => (
                            <span key={idx} className="flex gap-2 text-xs text-slate-300">
                              <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                              <span>{feat}</span>
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={editingPlan.allowNewSubscriptions === false}
                        className="w-full mt-8 py-3 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-lg"
                      >
                        {editingPlan.allowNewSubscriptions === false
                          ? 'Adesões Encerradas'
                          : editingPlan.buttonText || 'Assinar Plano'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-emerald-950/50"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Gravando no Banco...' : 'Salvar e Atualizar Telas'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE HISTÓRICO DE AUDITORIA */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl p-6 shadow-2xl relative my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-black text-white">Histórico de Auditoria de Planos</h2>
              </div>
              <button
                onClick={() => setShowAuditModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 max-h-96 overflow-y-auto">
              {loadingAudit ? (
                <div className="py-12 text-center text-slate-400 text-xs">Carregando logs de auditoria...</div>
              ) : auditLogs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">Nenhuma alteração registrada até o momento.</div>
              ) : (
                <div className="space-y-3">
                  {auditLogs.map(log => {
                    let changes: any = {};
                    try {
                      changes = typeof log.changes_json === 'string' ? JSON.parse(log.changes_json) : log.changes_json;
                    } catch {
                      changes = {};
                    }

                    return (
                      <div key={log.id} className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800 text-xs space-y-2">
                        <div className="flex items-center justify-between text-slate-400">
                          <span className="font-bold text-indigo-400">Plano: {log.plan_id}</span>
                          <span className="text-[11px]">{new Date(log.created_at).toLocaleString('pt-BR')}</span>
                        </div>
                        <div className="text-slate-300">
                          Alterado por: <span className="font-medium text-white">{log.changed_by_email || 'Administrador Master'}</span>
                        </div>
                        <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800/80 text-[11px] font-mono text-slate-300">
                          {Object.entries(changes).map(([k, v]: any) => (
                            <div key={k} className="flex gap-2">
                              <span className="text-amber-400 font-bold">{k}:</span>
                              <span className="text-red-400">{JSON.stringify(v?.before)}</span>
                              <span>&rarr;</span>
                              <span className="text-emerald-400">{JSON.stringify(v?.after)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800 mt-4">
              <button
                onClick={() => setShowAuditModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
