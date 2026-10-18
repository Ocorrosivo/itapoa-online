/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * CRM Administrative View Component - Leads & Sales Pipeline
 */

import React, { useState } from 'react';
import { Briefcase, Search, Plus, Filter, Phone, Mail, Calendar, CheckCircle2, Clock, XCircle, ArrowRight } from 'lucide-react';

export interface LeadItem {
  id: string;
  clientName: string;
  companyInterest: string;
  phone: string;
  email: string;
  status: 'new' | 'contacted' | 'proposal' | 'won' | 'lost';
  value: number;
  date: string;
}

export const CrmView: React.FC = () => {
  const [leads, setLeads] = useState<LeadItem[]>([
    {
      id: 'lead_1',
      clientName: 'Marcos Vinicius',
      companyInterest: 'Plano Premium VIP',
      phone: '(47) 99123-4567',
      email: 'marcos@marcoscontabilidade.com.br',
      status: 'new',
      value: 129.99,
      date: '2026-07-24'
    },
    {
      id: 'lead_2',
      clientName: 'Dra. Fernanda Lima',
      companyInterest: 'Plano Profissional',
      phone: '(47) 99876-5432',
      email: 'dra.fernanda@odonto.com.br',
      status: 'contacted',
      value: 49.99,
      date: '2026-07-23'
    },
    {
      id: 'lead_3',
      clientName: 'Supermercado Beira Mar',
      companyInterest: 'Plano Premium VIP',
      phone: '(47) 99222-3311',
      email: 'compras@beiramar.com.br',
      status: 'proposal',
      value: 129.99,
      date: '2026-07-22'
    },
    {
      id: 'lead_4',
      clientName: 'Pousada Sol & Mar',
      companyInterest: 'Plano Essencial',
      phone: '(47) 99444-8899',
      email: 'reserva@pousadasolemar.com.br',
      status: 'won',
      value: 19.99,
      date: '2026-07-20'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newLead, setNewLead] = useState({ clientName: '', companyInterest: 'Plano Profissional', phone: '', email: '', value: 49.99 });

  const handleAddLead = (e: React.FormEvent) => {
    e.preventDefault();
    const created: LeadItem = {
      id: `lead_${Date.now()}`,
      clientName: newLead.clientName,
      companyInterest: newLead.companyInterest,
      phone: newLead.phone,
      email: newLead.email,
      status: 'new',
      value: newLead.value,
      date: new Date().toISOString().split('T')[0]
    };
    setLeads([created, ...leads]);
    setIsAddOpen(false);
    setNewLead({ clientName: '', companyInterest: 'Plano Profissional', phone: '', email: '', value: 49.99 });
  };

  const updateLeadStatus = (id: string, status: LeadItem['status']) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
  };

  return (
    <div className="space-y-6 p-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">CRM Executivo de Leads & Vendas SaaS</h1>
          <p className="text-xs text-slate-400 mt-1">
            Pipeline de prospeção de novas empresas, conversão de planos e acompanhamento de propostas.
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 cursor-pointer shadow-lg"
        >
          <Plus className="w-4 h-4" />
          <span>Adicionar Lead</span>
        </button>
      </div>

      {/* Kanban Pipeline Columns */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Column: Novos Leads */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">🔥 Novos Leads</span>
            <span className="text-xs font-mono font-bold bg-blue-950 text-blue-300 px-2 py-0.5 rounded-md">
              {leads.filter(l => l.status === 'new').length}
            </span>
          </div>

          {leads.filter(l => l.status === 'new').map(lead => (
            <div key={lead.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md hover:border-blue-500/50 transition">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400">{lead.date}</span>
                <span className="text-xs font-bold text-emerald-400">R$ {lead.value}</span>
              </div>
              <h4 className="text-xs font-black text-white">{lead.clientName}</h4>
              <p className="text-[11px] text-slate-400">{lead.companyInterest}</p>
              <div className="pt-2 border-t border-slate-900 flex items-center justify-between">
                <button onClick={() => updateLeadStatus(lead.id, 'contacted')} className="text-[10px] text-blue-400 font-bold hover:underline flex items-center gap-1">
                  Em Contato <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Column: Em Contato */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">📞 Em Contato</span>
            <span className="text-xs font-mono font-bold bg-amber-950 text-amber-300 px-2 py-0.5 rounded-md">
              {leads.filter(l => l.status === 'contacted').length}
            </span>
          </div>

          {leads.filter(l => l.status === 'contacted').map(lead => (
            <div key={lead.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md hover:border-amber-500/50 transition">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400">{lead.date}</span>
                <span className="text-xs font-bold text-emerald-400">R$ {lead.value}</span>
              </div>
              <h4 className="text-xs font-black text-white">{lead.clientName}</h4>
              <p className="text-[11px] text-slate-400">{lead.companyInterest}</p>
              <div className="pt-2 border-t border-slate-900 flex items-center justify-between">
                <button onClick={() => updateLeadStatus(lead.id, 'proposal')} className="text-[10px] text-amber-400 font-bold hover:underline flex items-center gap-1">
                  Enviar Proposta <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Column: Proposta Enviada */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">📄 Proposta Enviada</span>
            <span className="text-xs font-mono font-bold bg-purple-950 text-purple-300 px-2 py-0.5 rounded-md">
              {leads.filter(l => l.status === 'proposal').length}
            </span>
          </div>

          {leads.filter(l => l.status === 'proposal').map(lead => (
            <div key={lead.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md hover:border-purple-500/50 transition">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400">{lead.date}</span>
                <span className="text-xs font-bold text-emerald-400">R$ {lead.value}</span>
              </div>
              <h4 className="text-xs font-black text-white">{lead.clientName}</h4>
              <p className="text-[11px] text-slate-400">{lead.companyInterest}</p>
              <div className="pt-2 border-t border-slate-900 flex items-center justify-between">
                <button onClick={() => updateLeadStatus(lead.id, 'won')} className="text-[10px] text-emerald-400 font-bold hover:underline flex items-center gap-1">
                  Fechar Negócio ✔
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Column: Fechados (Ganhos) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">🎉 Convertidos</span>
            <span className="text-xs font-mono font-bold bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded-md">
              {leads.filter(l => l.status === 'won').length}
            </span>
          </div>

          {leads.filter(l => l.status === 'won').map(lead => (
            <div key={lead.id} className="bg-slate-950 border border-emerald-900/50 rounded-2xl p-4 space-y-3 shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400">{lead.date}</span>
                <span className="text-xs font-bold text-emerald-400">R$ {lead.value}/mês</span>
              </div>
              <h4 className="text-xs font-black text-white">{lead.clientName}</h4>
              <p className="text-[11px] text-emerald-300 font-semibold">{lead.companyInterest}</p>
            </div>
          ))}
        </div>

      </div>

      {/* Modal Adicionar Lead */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 space-y-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Cadastrar Novo Lead</h3>
            
            <form onSubmit={handleAddLead} className="space-y-4 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nome do Contato / Empresa</label>
                <input
                  type="text"
                  value={newLead.clientName}
                  onChange={e => setNewLead({ ...newLead, clientName: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">E-mail</label>
                <input
                  type="email"
                  value={newLead.email}
                  onChange={e => setNewLead({ ...newLead, email: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">WhatsApp</label>
                <input
                  type="text"
                  value={newLead.phone}
                  onChange={e => setNewLead({ ...newLead, phone: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#C8102E]"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
                >
                  Criar Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
