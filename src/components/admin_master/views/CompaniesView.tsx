/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Companies Management View - Search, Filter, Impersonate, Block, Export
 */

import React, { useState } from 'react';
import { 
  Building2, Search, Filter, Download, UserCheck, ShieldAlert, 
  Trash2, Edit3, Eye, CheckCircle2, XCircle, ArrowUpDown, Plus
} from 'lucide-react';
import { useCompany } from '../../../context/CompanyContext';
import { useAuth } from '../../../context/AuthContext';
import { CompanyRepository } from '../../../repositories/companyRepository';
import { Company, PlanLevel } from '../../../types';
import { PermissionButton } from '../../common/PermissionButton';

export const CompaniesView: React.FC<{ onNavigateCompany: (slug: string) => void }> = ({ onNavigateCompany }) => {
  const { companies, refreshData } = useCompany();
  const { impersonateCompany } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState<string>('todos');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  const filtered = companies.filter(comp => {
    const matchesSearch = comp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          comp.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = planFilter === 'todos' || comp.planLevel === planFilter;
    const matchesStatus = statusFilter === 'todos' || 
                          (statusFilter === 'ativas' && comp.isActive !== false) ||
                          (statusFilter === 'bloqueadas' && comp.isActive === false);
    return matchesSearch && matchesPlan && matchesStatus;
  });

  const handleToggleBlock = async (comp: Company) => {
    const newStatus = !(comp.isActive !== false);
    await CompanyRepository.save({ ...comp, isActive: newStatus });
    refreshData();
    alert(`Empresa ${comp.name} foi ${newStatus ? 'Desbloqueada/Ativada' : 'Bloqueada'} com sucesso.`);
  };

  const handleChangePlan = async (comp: Company, newPlan: PlanLevel) => {
    await CompanyRepository.save({ ...comp, planLevel: newPlan });
    refreshData();
    alert(`Plano da empresa ${comp.name} atualizado para ${newPlan.toUpperCase()}.`);
  };

  const handleImpersonate = async (comp: Company) => {
    const ok = await impersonateCompany(comp.id, comp.name);
    if (ok) {
      onNavigateCompany(comp.slug);
    }
  };

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "ID,Nome,Plano,Status,WhatsApp,Views\n"
      + filtered.map(e => `"${e.id}","${e.name}","${e.planLevel}","${e.isActive !== false ? 'Ativa' : 'Bloqueada'}","${e.whatsapp}","${e.views}"`).join("\n");
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
          <p className="text-xs text-slate-400 mt-1">Administre milhares de empresas, altere planos, assuma sessões (Impersonate) ou exporte relatórios.</p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
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
            className="w-full bg-slate-800 border border-slate-700/80 rounded-2xl pl-11 pr-4 py-3 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Plan Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={planFilter}
            onChange={e => setPlanFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white text-xs font-semibold rounded-xl px-3 py-2.5 focus:outline-none"
          >
            <option value="todos">Todos os Planos</option>
            <option value="bronze">Bronze</option>
            <option value="prata">Prata</option>
            <option value="ouro">Ouro</option>
            <option value="diamond">Diamond</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white text-xs font-semibold rounded-xl px-3 py-2.5 focus:outline-none"
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
                <th className="p-4">Plano SaaS</th>
                <th className="p-4">Status</th>
                <th className="p-4">Visualizações</th>
                <th className="p-4">WhatsApp</th>
                <th className="p-4 text-right">Ações Gerenciais</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.map(comp => (
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
                  <td className="p-4">
                    <select
                      value={comp.planLevel}
                      onChange={e => handleChangePlan(comp, e.target.value as PlanLevel)}
                      className="bg-slate-800 border border-slate-700 text-emerald-400 font-bold text-xs rounded-lg px-2.5 py-1 focus:outline-none"
                    >
                      <option value="bronze">Bronze</option>
                      <option value="prata">Prata</option>
                      <option value="ouro">Ouro</option>
                      <option value="diamond">Diamond</option>
                    </select>
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
