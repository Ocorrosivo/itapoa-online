/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Clientes (CRM Kanban) — Pipeline Comercial e Gestão de Oportunidades
 *
 * Requisitos estritos:
 * - Quadro Kanban com drag-and-drop fluido e persistência imediata no MariaDB
 * - 6 etapas: Novo, Em Contato, Em Negociação, Proposta Enviada, Fechado / Ganho, Perdido
 * - Cards ricos: nome, telefone/WhatsApp (atalho direto wa.me), e-mail, interesse, data, agendamento e anotações
 * - Seletor rápido de etapa no card (acessibilidade e mobile touch)
 * - Rollback otimista em caso de erro na API com notificação clara
 * - Alternância entre Quadro Kanban e Visão em Lista
 * - Tenant-scoped por empresa (isolamento rigoroso)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, Plus, Search, Edit2, Trash2, X, Save, AlertCircle, Loader2,
  RefreshCw, Phone, Mail, MessageSquare, Calendar, Tag, FileText,
  CheckCircle2, Kanban, List, ArrowRight, ArrowLeft
} from 'lucide-react';
import { api } from '../../../lib/apiClient';
import { Company, CrmLead, CrmLeadStatus } from '../../../types';
import { maskPhone } from '../../../utils/validators';
import { SuccessPopup } from '../../common/SuccessPopup';

export const PIPELINE_STAGES: CrmLeadStatus[] = [
  'new',
  'contacted',
  'negotiation',
  'proposal',
  'won',
  'lost',
];

export const STATUS_LABELS: Record<CrmLeadStatus, string> = {
  new: 'Novo',
  contacted: 'Em Contato',
  negotiation: 'Em Negociação',
  proposal: 'Proposta Enviada',
  won: 'Fechado / Ganho',
  lost: 'Perdido',
};

export const STATUS_COLORS: Record<CrmLeadStatus, {
  badge: string;
  columnBorder: string;
  columnBg: string;
  dot: string;
}> = {
  new: {
    badge: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    columnBorder: 'border-blue-500/30',
    columnBg: 'bg-blue-950/10',
    dot: 'bg-blue-400',
  },
  contacted: {
    badge: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    columnBorder: 'border-amber-500/30',
    columnBg: 'bg-amber-950/10',
    dot: 'bg-amber-400',
  },
  negotiation: {
    badge: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
    columnBorder: 'border-orange-500/30',
    columnBg: 'bg-orange-950/10',
    dot: 'bg-orange-400',
  },
  proposal: {
    badge: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
    columnBorder: 'border-purple-500/30',
    columnBg: 'bg-purple-950/10',
    dot: 'bg-purple-400',
  },
  won: {
    badge: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    columnBorder: 'border-emerald-500/30',
    columnBg: 'bg-emerald-950/10',
    dot: 'bg-emerald-400',
  },
  lost: {
    badge: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
    columnBorder: 'border-rose-500/30',
    columnBg: 'bg-rose-950/10',
    dot: 'bg-rose-400',
  },
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
              placeholder="Ex: João da Silva / Restaurante Central"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Contatos: WhatsApp e Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                WhatsApp / Telefone
              </label>
              <input
                type="tel"
                maxLength={15}
                value={phone}
                onChange={e => { setPhone(maskPhone(e.target.value)); setDirty(true); }}
                placeholder="(47) 99999-8888"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                E-mail
              </label>
              <input
                type="email"
                maxLength={255}
                value={email}
                onChange={e => { setEmail(e.target.value); setDirty(true); }}
                placeholder="cliente@email.com"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>

          {/* Interesse e Situação */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Interesse / Serviço
              </label>
              <input
                type="text"
                maxLength={255}
                value={interest}
                onChange={e => { setInterest(e.target.value); setDirty(true); }}
                placeholder="Ex: Orçamento de refeição, reserva"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Etapa do Pipeline
              </label>
              <select
                value={status}
                onChange={e => { setStatus(e.target.value as CrmLeadStatus); setDirty(true); }}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold text-white focus:outline-none focus:border-blue-500 transition cursor-pointer"
              >
                {PIPELINE_STAGES.map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Próximo Contato */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Data do Próximo Contato / Retorno
            </label>
            <input
              type="date"
              value={nextContact}
              onChange={e => { setNextContact(e.target.value); setDirty(true); }}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          {/* Anotações */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Anotações e Histórico de Atendimento
            </label>
            <textarea
              rows={4}
              maxLength={2000}
              value={notes}
              onChange={e => { setNotes(e.target.value); setDirty(true); }}
              placeholder="Histórico da conversa, preferências do cliente, propostas feitas..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 transition resize-y"
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
  const [successMessage, setSuccessMessage] = useState('');
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [moving, setMoving] = useState(false);
  const [dragOverStage, setDragOverStage] = useState<CrmLeadStatus | null>(null);
  const [view, setView] = useState<'board' | 'list'>('board');

  const syncTimer = useRef<NodeJS.Timeout | null>(null);

  const moveLead = async (id: string, targetStatus: CrmLeadStatus) => {
    if (!id || !targetStatus || !PIPELINE_STAGES.includes(targetStatus)) return;
    const currentLead = leads.find(l => l.id === id);
    if (!currentLead || currentLead.status === targetStatus) return;

    const previousStatus = currentLead.status;

    // Atualização otimista imediata na interface
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: targetStatus } : l));
    setMoving(true);
    setSyncStatus(`Salvando etapa de ${currentLead.name}…`);
    setError('');

    try {
      await api.put(`/api/crm/leads/${encodeURIComponent(id)}`, { status: targetStatus });

      if (syncTimer.current) clearTimeout(syncTimer.current);
      setSyncStatus(`Etapa "${STATUS_LABELS[targetStatus]}" gravada com sucesso!`);
      syncTimer.current = setTimeout(() => {
        setSyncStatus(null);
      }, 3000);
    } catch (err: any) {
      // Rollback otimista em caso de erro da API
      setLeads(prev => prev.map(l => l.id === id ? { ...l, status: previousStatus } : l));
      setError(`Falha ao salvar no banco: ${err?.message || 'Erro de conexão'}. A etapa foi restaurada para "${STATUS_LABELS[previousStatus]}".`);
      setSyncStatus(null);
    } finally {
      setMoving(false);
      setDragOverStage(null);
    }
  };

  const load = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.get<EnrichedLead[]>('/api/crm/leads');
      // Filtra estritamente pelos leads da empresa ativa (isolamento multi-tenant)
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

  useEffect(() => {
    load();
    return () => {
      if (syncTimer.current) clearTimeout(syncTimer.current);
    };
  }, [load]);

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm('Deseja realmente remover este contato do CRM?')) return;
    try {
      await api.del(`/api/crm/leads/${leadId}`);
      await load();
      setSuccessMessage('Contato removido do CRM.');
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
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Pipeline de Clientes & Oportunidades
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {leads.length} {leads.length === 1 ? 'oportunidade' : 'oportunidades'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">CRM Kanban</h1>
          <p className="text-xs text-slate-400 mt-1">
            Arraste os cards entre as etapas para atualizar seu pipeline ou use o seletor no celular.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setModal(null)}
            className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition shadow-lg shrink-0 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Novo Contato
          </button>
        </div>
      </div>

      {/* Controles de Visualização, Busca e Filtro */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-2xl">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-pressed={view === 'board'}
            onClick={() => setView('board')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              view === 'board'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <Kanban className="w-3.5 h-3.5" />
            Quadro Kanban
          </button>
          <button
            type="button"
            aria-pressed={view === 'list'}
            onClick={() => setView('list')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              view === 'list'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <List className="w-3.5 h-3.5" />
            Visão em Lista
          </button>
        </div>

        <div className="flex flex-1 items-center gap-2 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome, telefone, interesse ou notas…"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as any)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-blue-500 transition cursor-pointer shrink-0"
          >
            <option value="">Todas as etapas</option>
            {PIPELINE_STAGES.map(s => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>

          <button
            onClick={load}
            title="Recarregar contatos"
            className="p-2 bg-slate-800 border border-slate-700 text-slate-400 hover:text-white rounded-xl transition cursor-pointer shrink-0"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Indicador de Sincronização / Status */}
      {syncStatus && (
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-950/60 border border-blue-800/80 rounded-xl text-blue-300 text-xs font-semibold animate-pulse">
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-blue-400" />
          <span>{syncStatus}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-950/60 border border-red-800 rounded-2xl text-red-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="text-center space-y-2">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Carregando oportunidades do CRM…</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center bg-slate-900 border border-slate-800 rounded-3xl p-8">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <p className="text-base font-bold text-white">
              {search || filterStatus ? 'Nenhum contato encontrado com estes filtros' : 'Nenhuma oportunidade no pipeline no momento'}
            </p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Cadastre seus clientes recebidos pelo guia ou WhatsApp para acompanhar negociações e agendar retornos.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModal(null)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            + Cadastrar Primeiro Contato
          </button>
        </div>
      ) : view === 'board' ? (
        /* QUADRO KANBAN */
        <div
          className="flex gap-4 overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent"
          aria-label="Pipeline de clientes"
        >
          {PIPELINE_STAGES.map(status => {
            const stageLeads = filtered.filter(l => l.status === status);
            const style = STATUS_COLORS[status];
            const isTarget = dragOverStage === status;

            return (
              <section
                key={status}
                aria-label={STATUS_LABELS[status]}
                className={`min-w-[280px] w-[300px] flex-shrink-0 flex flex-col bg-slate-900/90 border rounded-2xl p-3 transition duration-200 ${
                  isTarget
                    ? 'border-blue-400 ring-2 ring-blue-500/30 bg-slate-800/80'
                    : 'border-slate-800'
                }`}
                onDragOver={e => {
                  e.preventDefault();
                  if (dragOverStage !== status) setDragOverStage(status);
                }}
                onDragLeave={() => {
                  if (dragOverStage === status) setDragOverStage(null);
                }}
                onDrop={e => {
                  e.preventDefault();
                  setDragOverStage(null);
                  const leadId = e.dataTransfer.getData('text/plain');
                  if (leadId) void moveLead(leadId, status);
                }}
              >
                {/* Header da Coluna */}
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                    <h2 className="text-xs font-black text-white uppercase tracking-wider">
                      {STATUS_LABELS[status]}
                    </h2>
                  </div>
                  <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${style.badge}`}>
                    {stageLeads.length}
                  </span>
                </div>

                {/* Lista de Cards da Coluna */}
                <div className="space-y-3 flex-1 min-h-[350px]">
                  {stageLeads.length === 0 ? (
                    <div className="h-32 border-2 border-dashed border-slate-800/70 rounded-xl flex items-center justify-center text-center p-3 text-slate-500 text-[11px]">
                      Arraste um card para esta etapa
                    </div>
                  ) : (
                    stageLeads.map(lead => (
                      <article
                        key={lead.id}
                        draggable={!moving}
                        onDragStart={e => {
                          e.dataTransfer.setData('text/plain', lead.id);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        className="bg-slate-800/90 hover:bg-slate-800 border border-slate-700/70 hover:border-slate-600 rounded-xl p-3.5 space-y-2.5 text-xs text-slate-300 shadow-sm transition group cursor-grab active:cursor-grabbing"
                      >
                        {/* Nome do Cliente */}
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setModal(lead)}
                            className="font-bold text-white text-left hover:text-blue-400 transition cursor-pointer text-sm leading-tight flex-1"
                          >
                            {lead.name}
                          </button>
                          <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => setModal(lead)}
                              title="Editar contato"
                              className="p-1 hover:text-blue-400 transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteLead(lead.id)}
                              title="Excluir contato"
                              className="p-1 hover:text-rose-400 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Contatos: WhatsApp e Email */}
                        <div className="space-y-1 text-[11px]">
                          {lead.phone && (
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-slate-400 flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400" />
                                {lead.phone}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleOpenWhatsApp(lead.phone!, lead.name)}
                                title="Conversar no WhatsApp"
                                className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded text-[10px] font-bold flex items-center gap-1 transition"
                              >
                                <MessageSquare className="w-2.5 h-2.5" />
                                WhatsApp
                              </button>
                            </div>
                          )}
                          {lead.email && (
                            <p className="text-slate-400 truncate flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{lead.email}</span>
                            </p>
                          )}
                        </div>

                        {/* Interesse / Serviço */}
                        {lead.interest && (
                          <div className="flex items-center gap-1 text-[11px] text-blue-300 bg-blue-950/30 px-2 py-1 rounded-lg border border-blue-900/40">
                            <Tag className="w-3 h-3 shrink-0 text-blue-400" />
                            <span className="truncate">{lead.interest}</span>
                          </div>
                        )}

                        {/* Próximo Contato */}
                        {lead.next_contact_at && (
                          <div className="flex items-center gap-1 text-[11px] text-amber-400 bg-amber-950/20 px-2 py-0.5 rounded border border-amber-900/30">
                            <Calendar className="w-3 h-3 shrink-0" />
                            <span>Retorno: {new Date(lead.next_contact_at).toLocaleDateString('pt-BR')}</span>
                          </div>
                        )}

                        {/* Anotações Resumidas */}
                        {lead.notes && (
                          <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed bg-slate-900/40 p-2 rounded-lg border border-slate-800">
                            {lead.notes}
                          </p>
                        )}

                        {/* Seletor Rápido de Etapa (Mobile & Acessibilidade) */}
                        <div className="pt-1.5 border-t border-slate-700/50 flex items-center justify-between gap-2">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Mover para:
                          </label>
                          <select
                            disabled={moving}
                            value={lead.status}
                            onChange={e => void moveLead(lead.id, e.target.value as CrmLeadStatus)}
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] font-semibold text-white focus:outline-none focus:border-blue-500 transition cursor-pointer"
                          >
                            {PIPELINE_STAGES.map(s => (
                              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                            ))}
                          </select>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        /* VISÃO EM LISTA (TABELA) */
        <div className="overflow-x-auto rounded-3xl border border-slate-800 shadow-xl bg-slate-900">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 uppercase font-black tracking-wider text-[10px]">
                <th className="px-5 py-4">Contato / Cliente</th>
                <th className="px-5 py-4">Interesse</th>
                <th className="px-5 py-4">Etapa do Pipeline</th>
                <th className="px-5 py-4">Próximo Contato</th>
                <th className="px-5 py-4">Anotações</th>
                <th className="px-5 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-slate-900/60">
              {filtered.map(lead => (
                <tr key={lead.id} className="hover:bg-slate-800/40 transition">
                  <td className="px-5 py-4">
                    <div>
                      <button
                        type="button"
                        onClick={() => setModal(lead)}
                        className="font-bold text-white hover:text-blue-400 text-left text-xs"
                      >
                        {lead.name}
                      </button>
                      <div className="flex flex-col gap-0.5 mt-1 text-[11px] text-slate-400">
                        {lead.phone && <span>{lead.phone}</span>}
                        {lead.email && <span className="text-slate-500">{lead.email}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-slate-300 font-semibold">{lead.interest || '—'}</span>
                  </td>
                  <td className="px-5 py-4">
                    <select
                      disabled={moving}
                      value={lead.status}
                      onChange={e => void moveLead(lead.id, e.target.value as CrmLeadStatus)}
                      className={`text-[11px] font-bold rounded-lg px-2.5 py-1 border bg-slate-900 cursor-pointer ${STATUS_COLORS[lead.status].badge}`}
                    >
                      {PIPELINE_STAGES.map(s => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-4">
                    {lead.next_contact_at ? (
                      <span className="text-amber-400 font-mono text-[11px]">
                        {new Date(lead.next_contact_at).toLocaleDateString('pt-BR')}
                      </span>
                    ) : (
                      <span className="text-slate-500 italic">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 max-w-xs">
                    <p className="text-slate-300 text-[11px] line-clamp-2 leading-relaxed">
                      {lead.notes || <span className="text-slate-500 italic">Sem anotações</span>}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {lead.phone && (
                        <button
                          type="button"
                          onClick={() => handleOpenWhatsApp(lead.phone!, lead.name)}
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
        <CrmLeadModal
          lead={modal}
          companyId={company.id}
          onClose={() => setModal(false)}
          onSaved={() => {
            load();
            setSuccessMessage('Contato salvo com sucesso!');
          }}
        />
      )}

      {successMessage && (
        <SuccessPopup message={successMessage} onClose={() => setSuccessMessage('')} />
      )}
    </div>
  );
};
