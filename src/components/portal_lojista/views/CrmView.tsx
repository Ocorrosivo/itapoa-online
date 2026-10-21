/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Clientes (CRM Simples) — Contatos, Interesse, Situação, Próximo Contato e Anotações
 *
 * Requisitos estritos:
 * - Contatos reais com atalho direto para WhatsApp
 * - Campos: nome, contatos (fone/email), interesse, situação, próximo contato e anotações
 * - Zero simulação de vendas concluídas
 * - Persistência real e isolamento por empresa (tenant-scoped)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Plus, Search, Edit2, Trash2, X, Save, AlertCircle, Loader2,
  RefreshCw, Phone, Mail, MessageSquare, Calendar, Tag, FileText, CheckCircle2
} from 'lucide-react';
import { api } from '../../../lib/apiClient';
import { Company, CrmLead, CrmLeadStatus } from '../../../types';
import { maskPhone } from '../../../utils/validators';

const STATUS_LABELS: Record<CrmLeadStatus, string> = {
  new: 'Novo',
  contacted: 'Em Contato',
  proposal: 'Proposta Enviada',
  negotiation: 'Negociação',
  won: 'Ganho',
  lost: 'Perdido',
};

const STATUS_COLORS: Record<CrmLeadStatus, string> = {
  new: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  contacted: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  proposal: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  negotiation: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  won: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  lost: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
};

interface CrmViewProps {
  company: Company | null;
}

interface EnrichedLead extends CrmLead {
  company_id?: string;
  source?: string;
  interest?: string;
  next_contact_at?: string;
}

function CrmLeadModal({
  lead,
  companyId,
  onClose,
  onSaved,
}: {
  lead: EnrichedLead | null;
  companyId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!lead;
  const [name, setName] = useState(lead?.name ?? '');
  const [email, setEmail] = useState(lead?.email ?? '');
  const [phone, setPhone] = useState(lead?.phone ?? '');
  const [interest, setInterest] = useState(lead?.interest ?? '');
  const [status, setStatus] = useState<CrmLeadStatus>(lead?.status ?? 'new');
  const [nextContact, setNextContact] = useState(
    lead?.next_contact_at ? lead.next_contact_at.split('T')[0] : ''
  );
  const [notes, setNotes] = useState(lead?.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);

  const validate = () => {
    if (!name.trim()) return 'Nome do cliente é obrigatório.';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'E-mail em formato inválido.';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setBusy(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        company_id: companyId,
        companyId: companyId,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        interest: interest.trim(),
        status,
        next_contact_at: nextContact ? `${nextContact} 09:00:00` : null,
        notes: notes.trim(),
        source: lead?.source || 'direto',
      };
      if (isEdit) {
        await api.put(`/api/crm/leads/${lead!.id}`, payload);
      } else {
        await api.post('/api/crm/leads', payload);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'Não foi possível salvar o contato no CRM.');
    } finally {
      setBusy(false);
    }
  };

  const handleClose = () => {
    if (dirty && !confirm('Há alterações não salvas. Deseja fechar mesmo assim?')) return;
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-white">{isEdit ? 'Editar Contato' : 'Novo Contato no CRM'}</h2>
          </div>
          <button type="button" onClick={handleClose} className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-950/60 border border-red-800 rounded-xl text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}

          {/* Nome */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Nome do Cliente / Empresa <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={255}
              value={name}
              onChange={e => { setName(e.target.value); setDirty(true); }}
              placeholder="Ex: João da Silva ou Pousada Mar Azul"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Contatos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">WhatsApp / Telefone</label>
              <input
                type="tel"
                maxLength={15}
                value={phone}
                onChange={e => { setPhone(maskPhone(e.target.value)); setDirty(true); }}
                placeholder="(47) 99999-8888"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">E-mail</label>
              <input
                type="email"
                maxLength={255}
                value={email}
                onChange={e => { setEmail(e.target.value); setDirty(true); }}
                placeholder="cliente@exemplo.com"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>

          {/* Interesse & Próximo Contato */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Interesse</label>
              <input
                type="text"
                maxLength={255}
                value={interest}
                onChange={e => { setInterest(e.target.value); setDirty(true); }}
                placeholder="Ex: Orçamento de pintura, Almoço executivo"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Próximo Contato</label>
              <input
                type="date"
                value={nextContact}
                onChange={e => { setNextContact(e.target.value); setDirty(true); }}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>

          {/* Situação */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Situação do Contato</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(STATUS_LABELS) as CrmLeadStatus[]).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setStatus(s); setDirty(true); }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                    status === s ? STATUS_COLORS[s] + ' ring-1 ring-current font-black' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Anotações */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Anotações & Observações</label>
            <textarea
              rows={3}
              maxLength={2000}
              value={notes}
              onChange={e => { setNotes(e.target.value); setDirty(true); }}
              placeholder="Histórico da conversa, preferências, data de visita…"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition resize-y"
            />
          </div>
        </form>

        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-end gap-3 bg-slate-900">
          <button type="button" onClick={handleClose} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer">
            Cancelar
          </button>
          <button
            onClick={handleSubmit as any}
            disabled={busy}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-black rounded-xl transition shadow-lg cursor-pointer"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Contato
          </button>
        </div>
      </div>
    </div>
  );
}

export const CrmView: React.FC<CrmViewProps> = ({ company }) => {
  const [leads, setLeads] = useState<EnrichedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<CrmLeadStatus | ''>('');
  const [modal, setModal] = useState<EnrichedLead | null | false>(false);

  const load = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.get<EnrichedLead[]>('/api/crm/leads');
      // Filtra estritamente pelos leads da empresa ativa
      const companyLeads = (data || []).filter(
        l => l.company_id === company.id || (l as any).companyId === company.id
      );
      setLeads(companyLeads);
    } catch (err: any) {
      setError(err?.message ?? 'Não foi possível carregar os contatos.');
    } finally {
      setLoading(false);
    }
  }, [company?.id]);

  useEffect(() => { load(); }, [load]);

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm('Deseja realmente remover este contato do CRM?')) return;
    try {
      await api.del(`/api/crm/leads/${leadId}`);
      await load();
    } catch (err: any) {
      alert(err?.message || 'Falha ao remover contato.');
    }
  };

  const handleOpenWhatsApp = (phoneStr: string, clientName: string) => {
    const clean = phoneStr.replace(/\D/g, '');
    const msg = encodeURIComponent(`Olá ${clientName}, tudo bem? Sou da equipe de ${company?.name || 'atendimento'}.`);
    window.open(`https://wa.me/55${clean}?text=${msg}`, '_blank');
  };

  const filtered = leads.filter(lead => {
    const q = search.toLowerCase();
    const matchQ = !q ||
      lead.name.toLowerCase().includes(q) ||
      (lead.email ?? '').toLowerCase().includes(q) ||
      (lead.phone ?? '').includes(q) ||
      (lead.interest ?? '').toLowerCase().includes(q) ||
      (lead.notes ?? '').toLowerCase().includes(q);
    const matchStatus = !filterStatus || lead.status === filterStatus;
    return matchQ && matchStatus;
  });

  if (!company) return null;

  return (
    <div className="p-4 sm:p-6 max-w-7xl space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Relacionamento com Clientes
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Clientes (CRM)</h1>
          <p className="text-xs text-slate-400 mt-1">
            Organize contatos, interesses, próximos retornos e histórico de atendimento.
          </p>
        </div>
        <button
          onClick={() => setModal(null)}
          className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition shadow-lg shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Novo Contato
        </button>
      </div>

      {/* Barra de Busca e Filtro por Situação */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, interesse, telefone ou anotações…"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as any)}
          className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-blue-500 transition cursor-pointer"
        >
          <option value="">Todas as situações</option>
          {(Object.keys(STATUS_LABELS) as CrmLeadStatus[]).map(s => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <button
          onClick={load}
          title="Recarregar contatos"
          className="p-2.5 bg-slate-800 border border-slate-700 text-slate-400 hover:text-white rounded-xl transition cursor-pointer shrink-0"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-950/60 border border-red-800 rounded-2xl text-red-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center bg-slate-900 border border-slate-800 rounded-3xl p-8">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <p className="text-base font-bold text-white">
              {search || filterStatus ? 'Nenhum contato encontrado com estes filtros' : 'Nenhum cliente cadastrado no momento'}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Cadastre seus contatos recebidos pelo guia ou WhatsApp para acompanhar negociações e agendar retornos.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModal(null)}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition"
          >
            + Cadastrar Primeiro Contato
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-slate-800 shadow-xl">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase font-black tracking-wider">
                <th className="px-5 py-4">Contato / Cliente</th>
                <th className="px-5 py-4">Interesse</th>
                <th className="px-5 py-4">Situação</th>
                <th className="px-5 py-4">Próximo Contato</th>
                <th className="px-5 py-4">Anotações</th>
                <th className="px-5 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-slate-900/60">
              {filtered.map(lead => (
                <tr key={lead.id} className="hover:bg-slate-800/40 transition">
                  {/* Nome e canais */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-black text-white shrink-0">
                        {lead.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-white block truncate">{lead.name}</span>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                          {lead.phone && (
                            <button
                              type="button"
                              onClick={() => handleOpenWhatsApp(lead.phone, lead.name)}
                              className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
                              title="Chamar no WhatsApp"
                            >
                              <Phone className="w-3 h-3" />
                              <span>{lead.phone}</span>
                            </button>
                          )}
                          {lead.email && (
                            <span className="text-slate-400 truncate max-w-[120px]">
                              {lead.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Interesse */}
                  <td className="px-5 py-4">
                    {lead.interest ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-[11px]">
                        <Tag className="w-3 h-3 text-blue-400" />
                        {lead.interest}
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">—</span>
                    )}
                  </td>

                  {/* Situação */}
                  <td className="px-5 py-4">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${STATUS_COLORS[lead.status]}`}>
                      {STATUS_LABELS[lead.status]}
                    </span>
                  </td>

                  {/* Próximo Contato */}
                  <td className="px-5 py-4">
                    {lead.next_contact_at ? (
                      <div className="flex items-center gap-1.5 text-slate-300 font-mono text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" />
                        <span>{new Date(lead.next_contact_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    ) : (
                      <span className="text-slate-500 italic">—</span>
                    )}
                  </td>

                  {/* Anotações */}
                  <td className="px-5 py-4 max-w-xs">
                    <p className="text-slate-300 text-[11px] line-clamp-2 leading-relaxed">
                      {lead.notes || <span className="text-slate-500 italic">Sem anotações</span>}
                    </p>
                  </td>

                  {/* Ações */}
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {lead.phone && (
                        <button
                          type="button"
                          onClick={() => handleOpenWhatsApp(lead.phone, lead.name)}
                          className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition cursor-pointer"
                          title="Abrir WhatsApp"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setModal(lead)}
                        className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-600/10 rounded-xl transition cursor-pointer"
                        title="Editar contato"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteLead(lead.id)}
                        className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-600/10 rounded-xl transition cursor-pointer"
                        title="Excluir contato"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal !== false && (
        <CrmLeadModal lead={modal} companyId={company.id} onClose={() => setModal(false)} onSaved={load} />
      )}
    </div>
  );
};
