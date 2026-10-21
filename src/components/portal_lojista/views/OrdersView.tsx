/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Pedidos & Agendamentos — listagem real de pedidos da empresa
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShoppingCart, Search, RefreshCw, AlertCircle, Loader2,
  ChevronDown, ChevronUp, Calendar, Package, X
} from 'lucide-react';
import { api } from '../../../lib/apiClient';
import { Company } from '../../../types';

interface Order {
  id: string;
  companyId?: string;
  company_id?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  items?: Array<{ name: string; qty: number; price?: number }>;
  total?: number;
  status?: string;
  type?: 'order' | 'appointment';
  scheduledAt?: string;
  createdAt?: string;
  notes?: string;
}

const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendente', color: 'bg-amber-500/20 text-amber-400' },
  confirmed: { label: 'Confirmado', color: 'bg-blue-500/20 text-blue-400' },
  completed: { label: 'Concluído', color: 'bg-emerald-500/20 text-emerald-400' },
  cancelled: { label: 'Cancelado', color: 'bg-red-500/20 text-red-400' },
  scheduled: { label: 'Agendado', color: 'bg-purple-500/20 text-purple-400' },
};

interface OrdersViewProps {
  company: Company | null;
}

function OrderCard({
  order,
  onStatusChange,
}: {
  order: Order;
  onStatusChange: (id: string, status: string) => void | Promise<void>;
  key?: React.Key;
}) {
  const [expanded, setExpanded] = useState(false);
  const [changing, setChanging] = useState(false);
  const si = ORDER_STATUS[order.status ?? 'pending'] ?? ORDER_STATUS.pending;

  const handleStatus = async (newStatus: string) => {
    setChanging(true);
    onStatusChange(order.id, newStatus);
    setChanging(false);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition">
      <button
        type="button"
        className="w-full p-4 flex items-start justify-between gap-4 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-white truncate">
              {order.customerName ?? `Pedido #${order.id.slice(-6)}`}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${si.color}`}>
              {si.label}
            </span>
            {order.type === 'appointment' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 bg-purple-500/20 text-purple-400">
                Agendamento
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            {order.scheduledAt && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(order.scheduledAt).toLocaleString('pt-BR')}
              </span>
            )}
            {order.total != null && (
              <span className="text-emerald-400 font-bold">R$ {Number(order.total).toFixed(2).replace('.', ',')}</span>
            )}
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-slate-800 space-y-4">
          {order.customerEmail && (
            <p className="text-xs text-slate-300">E-mail: <span className="text-white">{order.customerEmail}</span></p>
          )}
          {order.customerPhone && (
            <p className="text-xs text-slate-300">Telefone: <span className="text-white">{order.customerPhone}</span></p>
          )}
          {order.notes && (
            <p className="text-xs text-slate-300">Observações: <span className="text-white">{order.notes}</span></p>
          )}
          {(order.items ?? []).length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-bold text-slate-400 uppercase">Itens</p>
              {order.items!.map((item, i) => (
                <div key={i} className="flex justify-between text-xs text-slate-300">
                  <span>{item.name} × {item.qty}</span>
                  {item.price != null && <span>R$ {(item.price * item.qty).toFixed(2)}</span>}
                </div>
              ))}
            </div>
          )}

          {/* Status transitions */}
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase">Alterar status</p>
            <div className="flex flex-wrap gap-2">
              {['pending', 'confirmed', 'completed', 'cancelled'].map(s => (
                <button
                  key={s}
                  disabled={order.status === s || changing}
                  onClick={() => handleStatus(s)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition ${
                    order.status === s
                      ? ORDER_STATUS[s].color + ' ring-1 ring-current'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 disabled:opacity-40'
                  }`}
                >
                  {ORDER_STATUS[s].label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const OrdersView: React.FC<OrdersViewProps> = ({ company }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const load = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    setError('');
    try {
      // Try company-scoped orders endpoint
      const res = await api.get<Order[]>(`/api/orders?company_id=${encodeURIComponent(company.id)}&limit=100`);
      setOrders(Array.isArray(res) ? res : []);
    } catch (err: any) {
      if ((err as any)?.status === 404) {
        setOrders([]);
      } else {
        setError(err?.message ?? 'Não foi possível carregar os pedidos.');
      }
    } finally {
      setLoading(false);
    }
  }, [company]);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await api.put(`/api/orders/${id}`, { status });
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    } catch (err: any) {
      setError(err?.message ?? 'Não foi possível alterar o status.');
    }
  };

  const filtered = orders.filter(o => {
    const matchSearch = !search ||
      (o.customerName ?? '').toLowerCase().includes(search.toLowerCase()) ||
      o.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  if (!company) return null;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Pedidos &amp; Agendamentos</h1>
        <p className="text-xs text-slate-400 mt-1">Acompanhe e gerencie os pedidos e agendamentos dos clientes.</p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por cliente ou ID…"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition"
        >
          <option value="">Todos os status</option>
          {Object.entries(ORDER_STATUS).map(([v, { label }]) => (
            <option key={v} value={v}>{label}</option>
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
            <ShoppingCart className="w-8 h-8 text-slate-500" />
          </div>
          <p className="text-base font-bold text-white">
            {orders.length === 0
              ? 'Nenhum pedido recebido ainda'
              : 'Nenhum pedido encontrado com esses filtros'}
          </p>
          <p className="text-xs text-slate-400">
            {orders.length === 0
              ? 'Quando clientes fizerem pedidos ou agendamentos, eles aparecerão aqui.'
              : 'Tente ajustar os filtros.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => (
            <OrderCard key={order.id} order={order} onStatusChange={handleStatusChange} />
          ))}
        </div>
      )}
    </div>
  );
};
