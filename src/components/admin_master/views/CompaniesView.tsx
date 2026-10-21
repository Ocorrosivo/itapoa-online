/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Companies Management View - Search, Filter, Impersonate, Block, Export & Admin Plan Grants
 */

import React, { useState } from 'react';
import { 
  Building2, Search, Filter, Download, UserCheck, ShieldAlert, 
  Trash2, Edit3, Eye, CheckCircle2, XCircle, ArrowUpDown, Plus,
  Award, Zap, Sparkles, Calendar, RotateCcw, Ban, History, X, AlertCircle
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

  const getAuthHeaders = () => {
    const activeToken = token || localStorage.getItem('itpoa_auth_token') || '';
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${activeToken}`
    };
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

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 text-xs font-bold transition shadow-sm"
        >
          <Download className="w-4 h-4 text-emerald-400" />
          <span>Exportar CSV</span>
        </button>
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

    </div>
  );
};
