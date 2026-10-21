/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * CRM de Clientes — cadastro, edição, histórico por empresa
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Plus, Search, Edit2, X, Save, AlertCircle, Loader2,
  RefreshCw, Phone, Mail, TrendingUp, Circle
} from 'lucide-react';
import { api } from '../../../lib/apiClient';
import { Company, CrmLead, CrmLeadStatus } from '../../../types';

const STATUS_LABELS: Record<CrmLeadStatus, string> = {
  new: 'Novo',
  contacted: 'Contatado',
  proposal: 'Proposta',
  negotiation: 'Negociação',
  won: 'Ganho',
  lost: 'Perdido',
};

const STATUS_COLORS: Record<CrmLeadStatus, string> = {
  new: 'bg-blue-500/20 text-blue-400',
  contacted: 'bg-amber-500/20 text-amber-400',
  proposal: 'bg-purple-500/20 text-purple-400',
  negotiation: 'bg-orange-500/20 text-orange-400',
  won: 'bg-emerald-500/20 text-emerald-400',
  lost: 'bg-red-500/20 text-red-400',
};

interface CrmViewProps {
  company: Company | null;
}

function CrmLeadModal({
  lead,
  companyId,
  onClose,
  onSaved,
}: {
  lead: CrmLead | null;
  companyId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!lead;
  const [name, setName] = useState(lead?.name ?? '');
  const [email, setEmail] = useState(lead?.email ?? '');
  const [phone, setPhone] = useState(lead?.phone ?? '');
  const [status, setStatus] = useState<CrmLeadStatus>(lead?.status ?? 'new');
  const [notes, setNotes] = useState(lead?.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);

  const validate = () => {
    if (!name.trim()) return 'Nome é obrigatório.';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'E-mail inválido.';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setBusy(true);
    setError('');
    try {
      const payload = {
        company_id: companyId,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        status,
        notes: notes.trim(),
        source: 'manual',
      };
      if (isEdit) {
        await api.put(`/api/crm/leads/${lead!.id}`, payload);
      } else {
        await api.post('/api/crm/leads', payload);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'Não foi possível salvar.');
    } finally {
      setBusy(false);
    }
  };

  const handleClose = () => {
    if (dirty && !confirm('Há alterações não salvas. Sair mesmo assim?')) return;
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-white">{isEdit ? 'Editar Contato' : 'Novo Contato'}</h2>
          </div>
          <button type="button" onClick={handleClose} className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-950/60 border border-red-800 rounded-xl text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Nome <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={255}
              value={name}
              onChange={e => { setName(e.target.value); setDirty(true); }}
              placeholder="Nome completo do cliente"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">E-mail</label>
              <input
                type="email"
                maxLength={255}
                value={email}
                onChange={e => { setEmail(e.target.value); setDirty(true); }}
                placeholder="email@exemplo.com"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Telefone</label>
              <input
                type="tel"
                maxLength={30}
                value={phone}
                onChange={e => { setPhone(e.target.value); setDirty(true); }}
                placeholder="(47) 9 0000-0000"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Status do contato</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(STATUS_LABELS) as CrmLeadStatus[]).map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setStatus(s); setDirty(true); }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition ${
                    status === s ? STATUS_COLORS[s] + ' ring-1 ring-current' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Anotações</label>
            <textarea
              rows={3}
              maxLength={2000}
              value={notes}
              onChange={e => { setNotes(e.target.value); setDirty(true); }}
              placeholder="Histórico, observações, necessidades do cliente…"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition resize-none"
            />
          </div>
        </form>

        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-end gap-3">
          <button type="button" onClick={handleClose} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition">
            Cancelar
          </button>
          <button
            onClick={handleSubmit as any}
            disabled={busy}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl transition shadow-lg"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? 'Salvar' : 'Cadastrar contato'}
          </button>
        </div>
      </div>
    </div>
  );
}

export const CrmView: React.FC<CrmViewProps> = ({ company }) => {
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<CrmLeadStatus | ''>('');
  const [modal, setModal] = useState<CrmLead | null | false>(false);

  const load = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get<CrmLead[]>('/api/crm/leads?limit=200');
      setLeads(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setError(err?.message ?? 'Não foi possível carregar os contatos.');
    } finally {
      setLoading(false);
    }
  }, [company]);

  useEffect(() => { load(); }, [load]);

  const filtered = leads.filter(l => {
    const matchSearch = !search ||
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      (l.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (l.phone ?? '').includes(search);
    const matchStatus = !filterStatus || l.status === filterStatus;
    return matchSearch && matchStatus;
  });

  if (!company) return null;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">CRM de Clientes</h1>
          <p className="text-xs text-slate-400 mt-1">Gerencie seus contatos e acompanhe o histórico de relacionamento.</p>
        </div>
        <button
          onClick={() => setModal(null)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-lg shrink-0"
        >
          <Plus className="w-4 h-4" />
          Novo contato
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, email ou telefone…"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as any)}
          className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition"
        >
          <option value="">Todos os status</option>
          {(Object.keys(STATUS_LABELS) as CrmLeadStatus[]).map(s => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <button onClick={load} className="p-2.5 bg-slate-800 border border-slate-700 text-slate-400 hover:text-white rounded-xl transition">
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
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center">
            <Users className="w-8 h-8 text-slate-500" />
          </div>
          <p className="text-base font-bold text-white">{search || filterStatus ? 'Nenhum contato encontrado' : 'Nenhum contato cadastrado'}</p>
          <p className="text-xs text-slate-400">Cadastre seus clientes e acompanhe as interações.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800">
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase hidden sm:table-cell">Contato</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase hidden md:table-cell">Data</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map(lead => (
                <tr key={lead.id} className="bg-slate-900/50 hover:bg-slate-800/40 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-slate-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                        {lead.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold text-white text-xs">{lead.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div className="space-y-0.5">
                      {lead.email && (
                        <div className="flex items-center gap-1 text-xs text-slate-300">
                          <Mail className="w-3 h-3 text-slate-500" />{lead.email}
                        </div>
                      )}
                      {lead.phone && (
                        <div className="flex items-center gap-1 text-xs text-slate-300">
                          <Phone className="w-3 h-3 text-slate-500" />{lead.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COLORS[lead.status]}`}>
                      {STATUS_LABELS[lead.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-xs text-slate-400">
                      {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('pt-BR') : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setModal(lead)}
                      className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-600/10 rounded-xl transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
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
