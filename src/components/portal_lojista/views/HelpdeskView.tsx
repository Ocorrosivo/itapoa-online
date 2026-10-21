/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Central de Suporte — criar e acompanhar chamados
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  HelpCircle, Plus, Search, MessageSquare, Clock, CheckCircle2,
  AlertCircle, Loader2, RefreshCw, X, Save, ChevronDown, ChevronUp
} from 'lucide-react';
import { api } from '../../../lib/apiClient';
import { Company, SupportTicket } from '../../../types';

interface HelpdeskViewProps {
  company: Company | null;
}

const STATUS_INFO: Record<string, { label: string; color: string }> = {
  open: { label: 'Aberto', color: 'bg-blue-500/20 text-blue-400' },
  pending: { label: 'Aguardando resposta', color: 'bg-amber-500/20 text-amber-400' },
  resolved: { label: 'Resolvido', color: 'bg-emerald-500/20 text-emerald-400' },
  closed: { label: 'Fechado', color: 'bg-slate-600 text-slate-300' },
};

const CATEGORIES = [
  { value: 'payment', label: 'Pagamento / Faturamento' },
  { value: 'announcement', label: 'Anúncio / Visibilidade' },
  { value: 'technical', label: 'Problema Técnico' },
  { value: 'other', label: 'Outro' },
];

function NewTicketModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('technical');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);

  const handleClose = () => {
    if (dirty && !confirm('Há alterações não salvas. Sair mesmo assim?')) return;
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) { setError('Assunto é obrigatório.'); return; }
    if (!message.trim()) { setError('Descreva o problema.'); return; }
    setBusy(true);
    setError('');
    try {
      await api.post('/api/support/tickets', {
        subject: subject.trim(),
        message: message.trim(),
        category,
      });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'Não foi possível abrir o chamado.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <HelpCircle className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-white">Abrir Chamado de Suporte</h2>
          </div>
          <button type="button" onClick={handleClose} className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-950/60 border border-red-800 rounded-xl text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />{error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Categoria</label>
            <select
              value={category}
              onChange={e => { setCategory(e.target.value); setDirty(true); }}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
            >
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Assunto <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={255}
              value={subject}
              onChange={e => { setSubject(e.target.value); setDirty(true); }}
              placeholder="Resuma o problema em poucas palavras"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Descrição detalhada <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={5}
              required
              maxLength={5000}
              value={message}
              onChange={e => { setMessage(e.target.value); setDirty(true); }}
              placeholder="Descreva o problema com o máximo de detalhes possível…"
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
            Abrir chamado
          </button>
        </div>
      </div>
    </div>
  );
}

function TicketCard({ ticket }: { ticket: SupportTicket; key?: React.Key }) {
  const [expanded, setExpanded] = useState(false);
  const info = STATUS_INFO[ticket.status] ?? STATUS_INFO.open;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition">
      <button
        type="button"
        className="w-full p-4 flex items-start justify-between gap-4 text-left"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-white truncate">{ticket.subject}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${info.color}`}>
              {info.label}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            {CATEGORIES.find(c => c.value === (ticket as any).category)?.label ?? 'Outro'} ·{' '}
            {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString('pt-BR') : ''}
          </p>
        </div>
        <div className="shrink-0 text-slate-400">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-800 space-y-3">
          {(ticket.messages ?? []).map((msg, i) => (
            <div
              key={msg.id ?? i}
              className={`p-3 rounded-xl text-xs ${
                msg.senderRole === 'admin'
                  ? 'bg-blue-900/20 border border-blue-800/40'
                  : 'bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-1 mb-1">
                <span className={`font-bold ${msg.senderRole === 'admin' ? 'text-blue-400' : 'text-white'}`}>
                  {msg.senderRole === 'admin' ? 'Suporte Itapoá Online' : msg.senderName}
                </span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-500">{new Date(msg.createdAt).toLocaleDateString('pt-BR')}</span>
              </div>
              <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{msg.text}</p>
            </div>
          ))}
          {(!ticket.messages || ticket.messages.length === 0) && (
            <p className="text-xs text-slate-500 text-center py-2">Aguardando resposta da equipe de suporte.</p>
          )}
        </div>
      )}
    </div>
  );
}

export const HelpdeskView: React.FC<HelpdeskViewProps> = ({ company }) => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<SupportTicket[]>('/api/support/tickets?limit=50');
      setTickets(Array.isArray(res) ? res : []);
    } catch (err: any) {
      // Support endpoint might not be implemented yet — show helpful message
      if ((err as any)?.status === 404) {
        setTickets([]);
      } else {
        setError(err?.message ?? 'Não foi possível carregar os chamados.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = tickets.filter(t =>
    !search ||
    t.subject.toLowerCase().includes(search.toLowerCase()) ||
    (t.messages ?? []).some(m => m.text.toLowerCase().includes(search.toLowerCase()))
  );

  if (!company) return null;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Central de Suporte</h1>
          <p className="text-xs text-slate-400 mt-1">Abra e acompanhe chamados com a equipe do Itapoá Online.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-lg shrink-0"
        >
          <Plus className="w-4 h-4" />
          Abrir chamado
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar chamado…"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition"
          />
        </div>
        <button onClick={load} className="p-2.5 bg-slate-800 border border-slate-700 text-slate-400 hover:text-white rounded-xl transition">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-950/60 border border-red-800 rounded-2xl text-red-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
          <button onClick={load} className="ml-auto underline">Tentar novamente</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center">
            <MessageSquare className="w-8 h-8 text-slate-500" />
          </div>
          <p className="text-base font-bold text-white">
            {search ? 'Nenhum chamado encontrado' : 'Nenhum chamado aberto'}
          </p>
          <p className="text-xs text-slate-400">
            Precisa de ajuda? Abra um chamado e a equipe responderá em breve.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(ticket => <TicketCard key={ticket.id} ticket={ticket} />)}
        </div>
      )}

      {showModal && <NewTicketModal onClose={() => setShowModal(false)} onSaved={load} />}
    </div>
  );
};
