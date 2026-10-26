/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Companies Management View - Search, Filter, Impersonate, Block, Export & Admin Plan Grants
 */

import React, { useState } from 'react';
import { 
  Building2, Search, Filter, Download, UserCheck, ShieldAlert, 
  Trash2, Edit3, Eye, CheckCircle2, XCircle, ArrowUpDown, Plus,
  Award, Zap, Sparkles, Calendar, RotateCcw, Ban, History, X, AlertCircle,
  ShieldCheck, Loader2
} from 'lucide-react';
import { useCompany } from '../../../context/CompanyContext';
import { useAuth } from '../../../context/AuthContext';
import { CompanyRepository } from '../../../repositories/companyRepository';
import { Company, PlanLevel } from '../../../types';
import { PermissionButton } from '../../common/PermissionButton';

interface GrantHistoryItem {
  id: string;
  company_id: string;
  granted_plan: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: 'active' | 'revoked' | 'expired';
  granted_by_email?: string;
  revoked_at?: string;
  revoked_reason?: string;
  created_at: string;
}

export const CompaniesView: React.FC<{ onNavigateCompany: (slug: string) => void }> = ({ onNavigateCompany }) => {
  const { companies, refreshData } = useCompany();
  const { impersonateCompany, token } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('todos');
  const [originFilter, setOriginFilter] = useState<string>('todos');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // Modal de Concessão de Plano
  const [grantModalCompany, setGrantModalCompany] = useState<Company | null>(null);
  const [grantedPlan, setGrantedPlan] = useState<'gold_vip' | 'diamond_extremo'>('gold_vip');
  const [grantStartDate, setGrantStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [grantEndDate, setGrantEndDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [grantReason, setGrantReason] = useState('');
  const [grantActionLoading, setGrantActionLoading] = useState(false);
  const [grantHistory, setGrantHistory] = useState<GrantHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Modal de Renovação
  const [renewEndDate, setRenewEndDate] = useState(
    new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [renewReason, setRenewReason] = useState('');

  // Modal de Importação CSV
  const [showImportModal, setShowImportModal] = useState(false);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importPreview, setImportPreview] = useState<any | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importExecutionResult, setImportExecutionResult] = useState<any | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [resettingPlans, setResettingPlans] = useState(false);

  const getAuthHeaders = () => {
    const activeToken = token || localStorage.getItem('itpoa_auth_token') || '';
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${activeToken}`
    };
  };

  const handleResetAllToBronze = async () => {
    if (!window.confirm('Deseja realmente redefinir todas as empresas cadastradas para o Plano Gratuito (Bronze)? Esta ação unifica todos os perfis no plano gratuito sem distinção.')) {
      return;
    }
    setResettingPlans(true);
    try {
      const res = await fetch('/api/admin/companies/reset-plans-bronze', {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao redefinir planos');
      alert(`Sucesso! ${data.affectedRows} empresa(s) unificada(s) no plano gratuito (Bronze).`);
      if (refreshData) await refreshData();
    } catch (err: any) {
      alert(`Erro: ${err?.message || 'Falha na operação'}`);
    } finally {
      setResettingPlans(false);
    }
  };

  const filtered = companies.filter(comp => {
    const matchesSearch = comp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          comp.address.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Normalização de plano
    const rawPlan = (comp.planLevel || 'bronze').toLowerCase();
    const isGold = rawPlan === 'gold_vip' || rawPlan === 'ouro';
    const isDiamond = rawPlan === 'diamond' || rawPlan === 'diamond_extremo';
    const isBronze = !isGold && !isDiamond;

    let matchesPlan = true;
    if (planFilter === 'bronze') matchesPlan = isBronze;
    else if (planFilter === 'gold_vip') matchesPlan = isGold;
    else if (planFilter === 'diamond_extremo') matchesPlan = isDiamond;

    // Filtro por origem
    const origin = comp.access_grant_type || (comp.isSponsored ? 'admin_grant' : 'bronze');
    const matchesOrigin = originFilter === 'todos' || origin === originFilter;

    const matchesStatus = statusFilter === 'todos' || 
                          (statusFilter === 'ativas' && comp.isActive !== false) ||
                          (statusFilter === 'bloqueadas' && comp.isActive === false);

    return matchesSearch && matchesPlan && matchesOrigin && matchesStatus;
  });

  const handleToggleBlock = async (comp: Company) => {
    const newStatus = !(comp.isActive !== false);
    await CompanyRepository.save({ ...comp, isActive: newStatus });
    refreshData();
    alert(`Empresa ${comp.name} foi ${newStatus ? 'Desbloqueada/Ativada' : 'Bloqueada'} com sucesso.`);
  };

  const handleImpersonate = async (comp: Company) => {
    const ok = await impersonateCompany(comp.id, comp.name);
    if (ok) {
      onNavigateCompany(comp.slug);
    }
  };

  // Abrir Modal de Concessão
  const handleOpenGrantModal = async (comp: Company) => {
    setGrantModalCompany(comp);
    setGrantReason('');
    setGrantedPlan('gold_vip');
    setGrantStartDate(new Date().toISOString().slice(0, 10));
    setGrantEndDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    setRenewEndDate(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    setRenewReason('');
    
    // Carregar histórico
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/admin/companies/${comp.id}/grants-history`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        setGrantHistory(await res.json());
      }
    } catch {
      setGrantHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Executar Concessão Promocional
  const handleGrantPromoPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantModalCompany) return;

    if (!grantReason.trim() || grantReason.trim().length < 5) {
      alert('Por favor, informe um motivo justificando a concessão (mínimo 5 caracteres).');
      return;
    }

    setGrantActionLoading(true);
    try {
      const res = await fetch(`/api/admin/companies/${grantModalCompany.id}/grant`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          grantedPlan,
          startDate: grantStartDate,
          endDate: grantEndDate,
          reason: grantReason.trim()
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Erro ao conceder plano.');
      }

      alert(`Plano ${grantedPlan === 'diamond_extremo' ? 'Diamond' : 'Gold VIP'} concedido promocionalmente com sucesso para ${grantModalCompany.name}.`);
      setGrantModalCompany(null);
      refreshData();
    } catch (err: any) {
      alert(err.message || 'Falha ao conceder plano.');
    } finally {
      setGrantActionLoading(false);
    }
  };

  // Executar Revogação de Concessão
  const handleRevokeGrant = async () => {
    if (!grantModalCompany) return;
    const reason = prompt('Informe o motivo da revogação da concessão:', 'Encerramento de promoção');
    if (reason === null) return;

    setGrantActionLoading(true);
    try {
      const res = await fetch(`/api/admin/companies/${grantModalCompany.id}/revoke-grant`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Erro ao revogar concessão.');
      }

      alert(`Concessão revogada com sucesso. A empresa foi restaurada para o plano base ou contratação paga anterior.`);
      setGrantModalCompany(null);
      refreshData();
    } catch (err: any) {
      alert(err.message || 'Falha ao revogar concessão.');
    } finally {
      setGrantActionLoading(false);
    }
  };

  // Executar Renovação de Concessão
  const handleRenewGrant = async () => {
    if (!grantModalCompany) return;

    setGrantActionLoading(true);
    try {
      const res = await fetch(`/api/admin/companies/${grantModalCompany.id}/renew-grant`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          endDate: renewEndDate,
          reason: renewReason || 'Prazo estendido pelo administrador'
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Erro ao renovar prazo da concessão.');
      }

      alert(`Concessão renovada com sucesso até ${new Date(renewEndDate).toLocaleDateString('pt-BR')}.`);
      setGrantModalCompany(null);
      refreshData();
    } catch (err: any) {
      alert(err.message || 'Falha ao renovar concessão.');
    } finally {
      setGrantActionLoading(false);
    }
  };

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "ID,Nome,Plano,Origem,Status,WhatsApp,Views\n"
      + filtered.map(e => `"${e.id}","${e.name}","${e.planLevel}","${e.access_grant_type || (e.isSponsored ? 'admin_grant' : 'bronze')}","${e.isActive !== false ? 'Ativa' : 'Bloqueada'}","${e.whatsapp}","${e.views}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `empresas_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 p-6">
      
      {/* View Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Gestão Global de Empresas</h1>
          <p className="text-xs text-slate-400 mt-1">
            Filtre por plano e origem de acesso, conceda Gold VIP ou Diamond promocional, renove ou revogue concessões administrativas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setShowImportModal(true);
              setImportPreview(null);
              setImportExecutionResult(null);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>Importar Empresas (CSV)</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={handleResetAllToBronze}
            disabled={resettingPlans}
            title="Garante que todas as empresas cadastradas fiquem no plano gratuito (Bronze) sem distinção"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-amber-400 text-xs font-bold transition shadow-sm cursor-pointer"
          >
            {resettingPlans ? <Loader2 className="w-4 h-4 animate-spin text-amber-400" /> : <ShieldCheck className="w-4 h-4 text-amber-400" />}
            <span>Unificar no Grátis</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por nome da empresa, endereço ou WhatsApp..."
            className="w-full bg-slate-800 border border-slate-700/80 rounded-2xl pl-11 pr-4 py-3 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          
          {/* Plan Filter */}
          <select
            value={planFilter}
            onChange={e => setPlanFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white text-xs font-semibold rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500"
          >
            <option value="todos">Todos os Planos</option>
            <option value="bronze">Bronze (Gratuito)</option>
            <option value="gold_vip">Gold VIP</option>
            <option value="diamond_extremo">Diamond</option>
          </select>

          {/* Origin Filter */}
          <select
            value={originFilter}
            onChange={e => setOriginFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white text-xs font-semibold rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500"
          >
            <option value="todos">Todas as Origens</option>
            <option value="bronze">Gratuito (Bronze)</option>
            <option value="trial">Degustação (Trial)</option>
            <option value="paid">Assinatura Paga</option>
            <option value="admin_grant">Concessão Admin</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white text-xs font-semibold rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-500"
          >
            <option value="todos">Todos os Status</option>
            <option value="ativas">Apenas Ativas</option>
            <option value="bloqueadas">Apenas Bloqueadas</option>
          </select>
        </div>

      </div>

      {/* Companies Interactive Data Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/60 border-b border-slate-800 uppercase font-bold text-[10px] text-slate-400">
              <tr>
                <th className="p-4">Empresa</th>
                <th className="p-4">Plano & Origem</th>
                <th className="p-4">Status</th>
                <th className="p-4">Visualizações</th>
                <th className="p-4">WhatsApp</th>
                <th className="p-4 text-right">Ações Gerenciais</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map(comp => {
                const rawPlan = (comp.planLevel || 'bronze').toLowerCase();
                const isDiamond = rawPlan === 'diamond' || rawPlan === 'diamond_extremo';
                const isGold = rawPlan === 'gold_vip' || rawPlan === 'ouro';
                const origin = comp.access_grant_type || (comp.isSponsored ? 'admin_grant' : 'bronze');

                return (
                  <tr key={comp.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img src={comp.logo} alt={comp.name} className="w-10 h-10 rounded-2xl object-cover border border-slate-700" />
                        <div>
                          <span className="font-bold text-white text-sm block">{comp.name}</span>
                          <span className="text-[11px] text-slate-400">{comp.address}</span>
                        </div>
                      </div>
                    </td>

                    {/* Plano & Origem com Badges */}
                    <td className="p-4">
                      <div className="space-y-1">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase border ${
                          isDiamond 
                            ? 'bg-amber-950/40 text-amber-300 border-amber-800/40' 
                            : isGold 
                            ? 'bg-indigo-950/40 text-indigo-300 border-indigo-800/40' 
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {isDiamond ? <Sparkles className="w-3 h-3 text-amber-400" /> : isGold ? <Zap className="w-3 h-3 text-indigo-400" /> : <Award className="w-3 h-3" />}
                          <span>{isDiamond ? 'Diamond' : isGold ? 'Gold VIP' : 'Bronze'}</span>
                        </span>

                        <span className={`block text-[10px] font-semibold ${
                          origin === 'admin_grant'
                            ? 'text-purple-400'
                            : origin === 'paid'
                            ? 'text-emerald-400'
                            : origin === 'trial'
                            ? 'text-cyan-400'
                            : 'text-slate-500'
                        }`}>
                          Origem: {
                            origin === 'admin_grant' ? 'Concessão Admin' :
                            origin === 'paid' ? 'Assinatura Paga' :
                            origin === 'trial' ? 'Degustação (Trial)' : 'Gratuito'
                          }
                        </span>
                      </div>
                    </td>

                    <td className="p-4">
                      {comp.isActive !== false ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Ativa</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 text-red-300 text-[10px] font-bold">
                          <XCircle className="w-3 h-3" />
                          <span>Bloqueada</span>
                        </span>
                      )}
                    </td>
                    <td className="p-4 font-bold text-white">{comp.views}</td>
                    <td className="p-4 text-slate-400">{comp.whatsapp || comp.phone}</td>
                    
                    <td className="p-4 text-right space-x-2">
                      {/* Botão Gestão de Plano & Concessão */}
                      <button
                        onClick={() => handleOpenGrantModal(comp)}
                        title="Gerenciar Plano Promocional ou Concessão"
                        className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 font-bold transition text-[11px] inline-flex items-center gap-1"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>Plano & Concessão</span>
                      </button>

                      {/* Impersonation Button */}
                      <button
                        onClick={() => handleImpersonate(comp)}
                        title="Assumir Sessão (Impersonate)"
                        className="px-3 py-1.5 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-300 hover:bg-purple-600/30 font-bold transition text-[11px] inline-flex items-center gap-1"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Impersonar</span>
                      </button>

                      {/* Block/Unblock Button */}
                      <PermissionButton
                        permission="companies.edit"
                        onClick={() => handleToggleBlock(comp)}
                        className={`px-3 py-1.5 rounded-xl font-bold transition text-[11px] inline-flex items-center gap-1 ${
                          comp.isActive !== false
                            ? 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                        }`}
                      >
                        {comp.isActive !== false ? 'Bloquear' : 'Desbloquear'}
                      </PermissionButton>

                      {/* View Mini Site Button */}
                      <button
                        onClick={() => onNavigateCompany(comp.slug)}
                        title="Ver Mini-Site"
                        className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE GESTÃO DE CONCESSÃO PROMO */}
      {grantModalCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl p-6 shadow-2xl relative my-8">
            
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-black text-white">
                  Plano e Concessões: {grantModalCompany.name}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Plano Atual: <span className="font-bold text-white uppercase">{grantModalCompany.planLevel || 'Bronze'}</span> • 
                  Origem: <span className="font-bold text-indigo-400">{grantModalCompany.access_grant_type || (grantModalCompany.isSponsored ? 'admin_grant' : 'bronze')}</span>
                </p>
              </div>
              <button
                onClick={() => setGrantModalCompany(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-5 space-y-6">
              
              {/* Box Informativo de Concessão Administrativa */}
              <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 text-indigo-200 text-xs flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Concessões administrativas não geram cobrança nem pagamento fictício. Ao expirar ou ser revogada, qualquer assinatura paga válida existente é preservada e restaurada automaticamente.
                </p>
              </div>

              {/* Seção 1: Formulário de Concessão de Gold ou Diamond Promocional */}
              <form onSubmit={handleGrantPromoPlan} className="space-y-4 bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">
                  Nova Concessão Promocional
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Plano Concedido</label>
                    <select
                      value={grantedPlan}
                      onChange={e => setGrantedPlan(e.target.value as any)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="gold_vip">⭐ Gold VIP</option>
                      <option value="diamond_extremo">👑 Diamond</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Data Início</label>
                    <input
                      type="date"
                      value={grantStartDate}
                      onChange={e => setGrantStartDate(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Data Término</label>
                    <input
                      type="date"
                      value={grantEndDate}
                      onChange={e => setGrantEndDate(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Motivo / Justificativa da Concessão</label>
                  <input
                    type="text"
                    value={grantReason}
                    onChange={e => setGrantReason(e.target.value)}
                    placeholder="Ex: Campanha promocional de ativação do guia..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={grantActionLoading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-md"
                  >
                    <Award className="w-4 h-4" />
                    <span>{grantActionLoading ? 'Processando...' : 'Conceder Plano Promocional'}</span>
                  </button>
                </div>
              </form>

              {/* Seção 2: Revogação e Renovação Rápida */}
              {(grantModalCompany.access_grant_type === 'admin_grant' || grantModalCompany.isSponsored) && (
                <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800 space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">
                    Ações de Concessão Vigente
                  </h3>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex-1 flex gap-2">
                      <input
                        type="date"
                        value={renewEndDate}
                        onChange={e => setRenewEndDate(e.target.value)}
                        className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                      />
                      <button
                        type="button"
                        onClick={handleRenewGrant}
                        disabled={grantActionLoading}
                        className="px-3.5 py-2 bg-emerald-600/30 border border-emerald-500/40 hover:bg-emerald-600/40 text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Renovar Prazo</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleRevokeGrant}
                      disabled={grantActionLoading}
                      className="px-3.5 py-2 bg-rose-600/20 border border-rose-500/40 hover:bg-rose-600/30 text-rose-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Revogar Concessão</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Seção 3: Histórico de Concessões */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Histórico de Concessões desta Empresa</span>
                </h3>

                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {loadingHistory ? (
                    <div className="py-4 text-center text-slate-500 text-xs">Carregando histórico...</div>
                  ) : grantHistory.length === 0 ? (
                    <div className="py-4 text-center text-slate-500 text-xs bg-slate-950/30 rounded-xl border border-slate-800/60">
                      Nenhuma concessão registrada para esta empresa.
                    </div>
                  ) : (
                    grantHistory.map(g => (
                      <div key={g.id} className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white uppercase tracking-wider">
                            {g.granted_plan === 'diamond_extremo' ? 'Diamond' : 'Gold VIP'}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            g.status === 'active' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                            g.status === 'revoked' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                            'bg-slate-800 text-slate-400'
                          }`}>
                            {g.status === 'active' ? 'Ativa' : g.status === 'revoked' ? 'Revogada' : 'Expirada'}
                          </span>
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          Vigência: {new Date(g.start_date).toLocaleDateString('pt-BR')} até {new Date(g.end_date).toLocaleDateString('pt-BR')}
                        </div>
                        <div className="text-slate-300 text-[11px]">
                          Motivo: <span className="text-slate-200">{g.reason}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800 mt-6">
              <button
                type="button"
                onClick={() => setGrantModalCompany(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE IMPORTAÇÃO ADMINISTRATIVA DE EMPRESAS VIA CSV */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-4xl w-full text-white shadow-2xl space-y-6 max-h-[90vh] flex flex-col">
            
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Importador Administrativo Master</span>
                </div>
                <h3 className="text-xl font-black text-white mt-1">Importar Empresas em Lote (CSV)</h3>
                <p className="text-xs text-slate-400">
                  Faça upload de arquivos CSV de prospecção. O sistema valida dados, detecta duplicatas e mapeia categorias canônicas automaticamente.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pr-1">
              {/* Resultado de Execução */}
              {importExecutionResult ? (
                <div className="p-6 bg-slate-800/80 border border-slate-700 rounded-2xl text-center space-y-4">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                  <h4 className="text-lg font-black text-white">Importação Concluída com Sucesso!</h4>
                  <div className="flex justify-center gap-6 text-xs">
                    <span className="text-emerald-400 font-bold">Importadas: {importExecutionResult.importedCount}</span>
                    <span className="text-slate-400">Ignoradas (Duplicadas): {importExecutionResult.skippedCount}</span>
                    <span className="text-rose-400 font-bold">Erros: {importExecutionResult.errors.length}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowImportModal(false);
                      refreshData();
                    }}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                  >
                    Fechar e Atualizar Lista
                  </button>
                </div>
              ) : (
                <>
                  {/* Etapa 1: Upload do Arquivo CSV */}
                  <div className="p-4 bg-slate-800/50 border border-dashed border-slate-700 rounded-2xl flex flex-col items-center justify-center text-center space-y-3">
                    <Download className="w-8 h-8 text-indigo-400 rotate-180" />
                    <div>
                      <p className="text-xs font-bold text-white">Selecione o arquivo CSV de prospecção</p>
                      <p className="text-[11px] text-slate-400">
                        Compatível com empresas_itapoa_verificadas.csv e similares (colunas: nome, categoria, bairro, cidade, telefone, whatsapp, endereco)
                      </p>
                    </div>
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = async (evt) => {
                          const text = String(evt.target?.result || '');
                          const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
                          if (lines.length < 2) {
                            alert('Arquivo CSV vazio ou sem cabeçalho.');
                            return;
                          }
                          const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
                          const parsedRows: any[] = [];
                          for (let i = 1; i < lines.length; i++) {
                            // Regex seguro para quebra por vírgula respeitando aspas
                            const rowValues = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.trim().replace(/^"|"$/g, ''));
                            const rowObj: any = {};
                            headers.forEach((h, idx) => {
                              rowObj[h] = rowValues[idx] || '';
                            });
                            parsedRows.push(rowObj);
                          }

                          setImportRows(parsedRows);
                          setImportLoading(true);
                          try {
                            const res = await fetch('/api/admin/companies/import/preview', {
                              method: 'POST',
                              headers: getAuthHeaders(),
                              body: JSON.stringify({ rows: parsedRows })
                            });
                            const data = await res.json();
                            if (!res.ok) throw new Error(data.error || 'Erro na pré-visualização.');
                            setImportPreview(data);
                          } catch (err: any) {
                            alert(err.message || 'Falha ao processar arquivo.');
                          } finally {
                            setImportLoading(false);
                          }
                        };
                        reader.readAsText(file, 'utf-8');
                      }}
                      className="text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                    />
                  </div>

                  {/* Etapa 2: Pré-visualização e Validação dos Registros */}
                  {importLoading && (
                    <div className="py-8 text-center text-xs text-indigo-400 font-bold">
                      Validando registros e checando duplicatas no banco...
                    </div>
                  )}

                  {importPreview && !importLoading && (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-800 rounded-2xl border border-slate-700">
                        <div className="flex items-center gap-4 text-xs font-bold">
                          <span className="text-white">Total: {importPreview.totalRows}</span>
                          <span className="text-emerald-400">Válidos: {importPreview.validRows}</span>
                          <span className="text-amber-400">Duplicados: {importPreview.duplicateRows}</span>
                          {importPreview.invalidRows > 0 && (
                            <span className="text-rose-400">Inválidos: {importPreview.invalidRows}</span>
                          )}
                        </div>

                        <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={skipDuplicates}
                            onChange={(e) => setSkipDuplicates(e.target.checked)}
                            className="rounded border-slate-700 text-indigo-600 focus:ring-0"
                          />
                          <span>Ignorar duplicatas automaticamente</span>
                        </label>
                      </div>

                      <div className="border border-slate-800 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                        <table className="w-full text-left text-[11px] text-slate-300">
                          <thead className="bg-slate-800 text-slate-400 font-bold sticky top-0">
                            <tr>
                              <th className="p-2.5">#</th>
                              <th className="p-2.5">Empresa</th>
                              <th className="p-2.5">Categoria</th>
                              <th className="p-2.5">Cidade</th>
                              <th className="p-2.5">WhatsApp</th>
                              <th className="p-2.5">Status Validação</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                            {importPreview.items.map((item: any) => (
                              <tr key={item.rowNumber} className={item.isDuplicate ? 'bg-amber-950/20' : item.errors.length > 0 ? 'bg-rose-950/20' : ''}>
                                <td className="p-2.5 text-slate-500">{item.rowNumber}</td>
                                <td className="p-2.5 font-bold text-white">{item.data.nome || item.data.name}</td>
                                <td className="p-2.5 text-slate-400">{item.categoryId}</td>
                                <td className="p-2.5 text-slate-400">{item.cityId}</td>
                                <td className="p-2.5 text-slate-400">{item.cleanWhatsapp || '-'}</td>
                                <td className="p-2.5">
                                  {item.isDuplicate ? (
                                    <span className="text-amber-400 font-bold">Duplicata detectada</span>
                                  ) : item.errors.length > 0 ? (
                                    <span className="text-rose-400 font-bold">{item.errors.join(', ')}</span>
                                  ) : (
                                    <span className="text-emerald-400 font-bold">Pronto para importar</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setImportPreview(null);
                            setImportRows([]);
                          }}
                          className="px-4 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800 transition cursor-pointer"
                        >
                          Limpar
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            setImportLoading(true);
                            try {
                              const res = await fetch('/api/admin/companies/import/execute', {
                                method: 'POST',
                                headers: getAuthHeaders(),
                                body: JSON.stringify({
                                  items: importPreview.items,
                                  skipDuplicates
                                })
                              });
                              const data = await res.json();
                              if (!res.ok) throw new Error(data.error || 'Erro na execução.');
                              setImportExecutionResult(data);
                            } catch (err: any) {
                              alert(err.message || 'Falha ao executar importação.');
                            } finally {
                              setImportLoading(false);
                            }
                          }}
                          className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center gap-2 shadow-lg active:scale-95 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Executar Importação ({importPreview.validRows} empresas)</span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold cursor-pointer"
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
