/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Cupons & Promoções — CRUD completo do painel lojista
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Ticket, Plus, Search, Edit2, Trash2, X, Save, AlertCircle, Loader2,
  RefreshCw, CheckCircle2, ToggleLeft, ToggleRight, Calendar, Percent, DollarSign
} from 'lucide-react';
import { api } from '../../../lib/apiClient';
import { Company, Coupon } from '../../../types';

interface CouponsViewProps {
  company: Company | null;
}

function statusBadge(coupon: Coupon) {
  const now = new Date();
  const expiry = coupon.expiryDate ? new Date(coupon.expiryDate) : null;
  const expired = expiry && expiry < now;
  if (!coupon.isActive || expired) {
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-700 text-slate-400">{expired ? 'Expirado' : 'Inativo'}</span>;
  }
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600/20 text-emerald-400">Ativo</span>;
}

function CouponModal({
  coupon,
  companyId,
  onClose,
  onSaved,
}: {
  coupon: Coupon | null;
  companyId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!coupon;
  const [code, setCode] = useState(coupon?.code ?? '');
  const [description, setDescription] = useState(coupon?.description ?? '');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>(coupon?.discountType ?? 'percentage');
  const [discountValue, setDiscountValue] = useState(coupon?.discountValue != null ? String(coupon.discountValue) : '');
  const [expiryDate, setExpiryDate] = useState(coupon?.expiryDate ? coupon.expiryDate.split('T')[0] : '');
  const [isActive, setIsActive] = useState(coupon?.isActive ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!code.trim()) errs.code = 'Código é obrigatório.';
    if (code.trim().length > 50) errs.code = 'Código muito longo (máx 50).';
    if (!discountValue || isNaN(Number(discountValue))) errs.discountValue = 'Valor de desconto inválido.';
    if (Number(discountValue) <= 0) errs.discountValue = 'Desconto deve ser maior que zero.';
    if (discountType === 'percentage' && Number(discountValue) > 100) errs.discountValue = 'Percentual não pode exceder 100%.';
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setBusy(true);
    setError('');
    try {
      const payload = {
        companyId,
        code: code.trim().toUpperCase(),
        description: description.trim(),
        discountType,
        discountValue: Number(discountValue),
        expirationDate: expiryDate || null,
        isActive: isActive ? 1 : 0,
      };
      if (isEdit) {
        await api.put(`/api/coupons/${coupon!.id}`, payload);
      } else {
        await api.post('/api/coupons', payload);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.message ?? 'Não foi possível salvar o cupom.');
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
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Ticket className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-white">{isEdit ? 'Editar Cupom' : 'Novo Cupom'}</h2>
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
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Código do cupom <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={50}
              value={code}
              onChange={e => { setCode(e.target.value.toUpperCase()); setDirty(true); }}
              placeholder="EX: DESCONTO10"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-blue-500 transition"
            />
            {fieldErrors.code && <p className="text-xs text-red-400">{fieldErrors.code}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Descrição</label>
            <input
              type="text"
              maxLength={255}
              value={description}
              onChange={e => { setDescription(e.target.value); setDirty(true); }}
              placeholder="Ex: 10% de desconto em qualquer serviço"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Tipo de desconto</label>
              <select
                value={discountType}
                onChange={e => { setDiscountType(e.target.value as any); setDirty(true); }}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
              >
                <option value="percentage">Percentual (%)</option>
                <option value="fixed">Valor fixo (R$)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Valor <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                  {discountType === 'percentage' ? '%' : 'R$'}
                </span>
                <input
                  type="number"
                  min="0.01"
                  max={discountType === 'percentage' ? 100 : undefined}
                  step="0.01"
                  value={discountValue}
                  onChange={e => { setDiscountValue(e.target.value); setDirty(true); }}
                  placeholder="0"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
                />
              </div>
              {fieldErrors.discountValue && <p className="text-xs text-red-400">{fieldErrors.discountValue}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Validade</label>
            <input
              type="date"
              value={expiryDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => { setExpiryDate(e.target.value); setDirty(true); }}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-slate-700">
            <div>
              <span className="text-sm font-bold text-white block">Cupom ativo</span>
              <span className="text-xs text-slate-400">Cupons inativos não são aceitos no checkout.</span>
            </div>
            <button
              type="button"
              onClick={() => { setIsActive(!isActive); setDirty(true); }}
              className={`transition ${isActive ? 'text-emerald-400' : 'text-slate-500'}`}
            >
              {isActive ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
            </button>
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
            {isEdit ? 'Salvar' : 'Criar cupom'}
          </button>
        </div>
      </div>
    </div>
  );
}

export const CouponsView: React.FC<CouponsViewProps> = ({ company }) => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<Coupon | null | false>(false);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get<Coupon[]>(`/api/coupons?companyId=${encodeURIComponent(company.id)}&limit=200`);
      setCoupons(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setError(err?.message ?? 'Não foi possível carregar os cupons.');
    } finally {
      setLoading(false);
    }
  }, [company]);

  useEffect(() => { load(); }, [load]);

  const filtered = coupons.filter(c =>
    !search || c.code.toLowerCase().includes(search.toLowerCase()) ||
    (c.description ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteBusy(true);
    try {
      await api.del(`/api/coupons/${deleteTarget.id}`);
      load();
      setDeleteTarget(null);
    } catch (err: any) {
      setError(err?.message ?? 'Não foi possível excluir.');
    } finally {
      setDeleteBusy(false);
    }
  };

  if (!company) return null;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Cupons &amp; Promoções</h1>
          <p className="text-xs text-slate-400 mt-1">Crie e gerencie cupons de desconto para clientes.</p>
        </div>
        <button
          onClick={() => setModal(null)}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-lg shrink-0"
        >
          <Plus className="w-4 h-4" />
          Novo cupom
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cupom por código ou descrição…"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition"
          />
        </div>
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
            <Ticket className="w-8 h-8 text-slate-500" />
          </div>
          <p className="text-base font-bold text-white">{search ? 'Nenhum cupom encontrado' : 'Nenhum cupom cadastrado'}</p>
          <p className="text-xs text-slate-400">
            {search ? 'Tente outros termos.' : 'Crie seu primeiro cupom de desconto.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-900 border-b border-slate-800">
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase">Código</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase hidden sm:table-cell">Desconto</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase hidden md:table-cell">Validade</th>
                <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.map(coupon => (
                <tr key={coupon.id} className="bg-slate-900/50 hover:bg-slate-800/40 transition">
                  <td className="px-4 py-3">
                    <div>
                      <span className="font-mono font-bold text-white text-xs">{coupon.code}</span>
                      {coupon.description && (
                        <p className="text-[11px] text-slate-400 mt-0.5">{coupon.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <div className="flex items-center gap-1 text-emerald-400 font-bold text-xs">
                      {coupon.discountType === 'percentage' ? <Percent className="w-3.5 h-3.5" /> : <DollarSign className="w-3.5 h-3.5" />}
                      {coupon.discountType === 'percentage'
                        ? `${coupon.discountValue}% off`
                        : `R$ ${Number(coupon.discountValue).toFixed(2)} off`}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {coupon.expiryDate ? (
                      <div className="flex items-center gap-1 text-xs text-slate-300">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {new Date(coupon.expiryDate).toLocaleDateString('pt-BR')}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">Sem validade</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{statusBadge(coupon)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => setModal(coupon)} className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-600/10 rounded-xl transition">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteTarget(coupon)} className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-600/10 rounded-xl transition">
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
        <CouponModal coupon={modal} companyId={company.id} onClose={() => setModal(false)} onSaved={load} />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-red-900/40 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <h3 className="text-base font-bold text-white">Excluir cupom "{deleteTarget.code}"?</h3>
            <p className="text-sm text-slate-300">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteTarget(null)} className="px-5 py-2.5 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl">Cancelar</button>
              <button
                onClick={handleDelete}
                disabled={deleteBusy}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition"
              >
                {deleteBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
