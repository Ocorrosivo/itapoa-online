/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Avaliações & Reviews — visualização e resposta de avaliações reais
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Star, Search, RefreshCw, AlertCircle, Loader2, MessageSquare, ThumbsUp
} from 'lucide-react';
import { api } from '../../../lib/apiClient';
import { Company, Review } from '../../../types';

interface ReviewsViewProps {
  company: Company | null;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i <= rating ? 'text-amber-400 fill-current' : 'text-slate-600'}`}
        />
      ))}
    </div>
  );
}

export const ReviewsView: React.FC<ReviewsViewProps> = ({ company }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterRating, setFilterRating] = useState<number | ''>('');

  const load = useCallback(async () => {
    if (!company) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get<Review[]>(`/api/reviews?entityId=${encodeURIComponent(company.id)}&entityType=company&limit=100`);
      setReviews(Array.isArray(res) ? res : []);
    } catch (err: any) {
      setError(err?.message ?? 'Não foi possível carregar as avaliações.');
    } finally {
      setLoading(false);
    }
  }, [company]);

  useEffect(() => { load(); }, [load]);

  const filtered = reviews.filter(r => {
    const matchSearch = !search ||
      r.comment.toLowerCase().includes(search.toLowerCase()) ||
      r.userName.toLowerCase().includes(search.toLowerCase());
    const matchRating = !filterRating || r.rating === Number(filterRating);
    return matchSearch && matchRating;
  });

  const avgRating = reviews.length > 0
    ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
    : 0;

  const ratingDistrib = [5, 4, 3, 2, 1].map(n => ({
    rating: n,
    count: reviews.filter(r => r.rating === n).length,
    pct: reviews.length > 0 ? (reviews.filter(r => r.rating === n).length / reviews.length) * 100 : 0,
  }));

  if (!company) return null;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight">Avaliações &amp; Reviews</h1>
        <p className="text-xs text-slate-400 mt-1">
          Avaliações recebidas pelos clientes. Não é possível editar comentários de terceiros.
        </p>
      </div>

      {/* Summary */}
      {reviews.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="flex flex-col items-center justify-center gap-2 text-center">
            <div className="text-5xl font-black text-white">{avgRating.toFixed(1)}</div>
            <StarRating rating={Math.round(avgRating)} />
            <p className="text-xs text-slate-400">{reviews.length} avaliações no total</p>
          </div>
          <div className="space-y-2">
            {ratingDistrib.map(d => (
              <div key={d.rating} className="flex items-center gap-2">
                <span className="text-xs text-slate-400 w-4 text-right">{d.rating}</span>
                <Star className="w-3 h-3 text-amber-400 fill-current shrink-0" />
                <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all"
                    style={{ width: `${d.pct}%` }}
                  />
                </div>
                <span className="text-xs text-slate-400 w-4">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou comentário…"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition"
          />
        </div>
        <select
          value={filterRating}
          onChange={e => setFilterRating(e.target.value ? Number(e.target.value) : '')}
          className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 transition"
        >
          <option value="">Todas as notas</option>
          {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} estrelas</option>)}
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
            <Star className="w-8 h-8 text-slate-500" />
          </div>
          <p className="text-base font-bold text-white">
            {search || filterRating ? 'Nenhuma avaliação encontrada' : 'Nenhuma avaliação ainda'}
          </p>
          <p className="text-xs text-slate-400">
            {reviews.length === 0
              ? 'Quando clientes avaliarem sua empresa, as notas aparecerão aqui.'
              : 'Tente outros filtros.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(review => (
            <div key={review.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 hover:border-slate-700 transition">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-700 flex items-center justify-center text-sm font-bold text-white shrink-0">
                    {review.userName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-sm font-bold text-white block">{review.userName}</span>
                    <span className="text-[11px] text-slate-400">
                      {review.createdAt ? new Date(review.createdAt).toLocaleDateString('pt-BR') : ''}
                    </span>
                  </div>
                </div>
                <StarRating rating={review.rating} />
              </div>
              {review.comment && (
                <p className="text-sm text-slate-300 leading-relaxed">{review.comment}</p>
              )}
              {review.reply && (
                <div className="mt-2 p-3 bg-blue-900/20 border border-blue-800/40 rounded-xl">
                  <p className="text-[11px] font-bold text-blue-400 mb-1">Resposta da empresa</p>
                  <p className="text-xs text-slate-300">{review.reply}</p>
                </div>
              )}
              <div className="pt-1 border-t border-slate-800 flex items-center gap-3">
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <ThumbsUp className="w-3 h-3" />
                  Avaliação real de cliente — não pode ser editada
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
